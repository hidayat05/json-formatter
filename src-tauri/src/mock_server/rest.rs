use crate::db::{DbManager, MockConfig, RestMockRule, TrafficLogEntry};
use axum::{
    body::{Body, Bytes},
    extract::State,
    http::{HeaderMap, HeaderName, HeaderValue, Method, Response, StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use log::{error, info, warn};
use regex::Regex;
use serde_json::Value;
use std::net::SocketAddr;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct RestServerState {
    pub db: DbManager,
    pub app_handle: Option<AppHandle>,
}

pub struct RunningRestServer {
    pub port: u16,
    pub shutdown_tx: oneshot::Sender<()>,
}

pub fn start_server(
    port: u16,
    db: DbManager,
    app_handle: Option<AppHandle>,
) -> Result<RunningRestServer, String> {
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let state = RestServerState { db, app_handle };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let router = Router::new()
        .fallback(handle_all_requests)
        .layer(cors)
        .with_state(state);

    let std_listener = std::net::TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port)))
        .map_err(|e| format!("Failed to bind REST server to port {}: {}", port, e))?;
    std_listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set non-blocking: {}", e))?;
    let bound_port = std_listener.local_addr().map_err(|e| e.to_string())?.port();

    tauri::async_runtime::spawn(async move {
        info!(
            "Starting REST Mock & Proxy Server on http://127.0.0.1:{}",
            bound_port
        );

        let listener = match tokio::net::TcpListener::from_std(std_listener) {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to create async listener: {}", e);
                return;
            }
        };

        if let Err(e) = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
                info!("REST Mock server shutting down gracefully");
            })
            .await
        {
            error!("REST server error: {}", e);
        }
    });

    Ok(RunningRestServer {
        port: bound_port,
        shutdown_tx,
    })
}

async fn handle_all_requests(
    State(state): State<RestServerState>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    req_body: Bytes,
) -> Response<Body> {
    let start_time = Instant::now();
    let now_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let path = uri.path();
    let query_str = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let full_path = format!("{}{}", path, query_str);

    let req_body_str = String::from_utf8(req_body.to_vec())
        .ok()
        .map(|s| format_json_str(&s));
    let req_headers_json = serialize_headers(&headers);

    // 1. Check if mock rules exist in DB
    let rules = state.db.get_rest_rules().unwrap_or_default();
    let config = state.db.get_config("REST").unwrap_or_else(|_| MockConfig {
        server_type: "REST".to_string(),
        port: 8080,
        is_forwarder_enabled: false,
        origin_url: None,
        record_traffic: true,
    });

    // 2. Find matching rule
    let matched_rule = rules
        .into_iter()
        .filter(|r| r.enabled)
        .find(|r| is_rule_matched(r, &method, path));

    if let Some(rule) = matched_rule {
        // --- MATCHED MOCK RULE ---
        if rule.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay_ms)).await;
        }

        let status = StatusCode::from_u16(rule.status_code).unwrap_or(StatusCode::OK);
        let mut resp_builder = Response::builder().status(status);

        // Apply custom headers from rule
        let mut content_type_set = false;
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&rule.response_headers) {
            for (k, v) in map {
                if let Some(val_str) = v.as_str() {
                    if k.eq_ignore_ascii_case("content-type") {
                        content_type_set = true;
                    }
                    if let (Ok(name), Ok(val)) = (
                        HeaderName::from_bytes(k.as_bytes()),
                        HeaderValue::from_str(val_str),
                    ) {
                        resp_builder = resp_builder.header(name, val);
                    }
                }
            }
        }

        if !content_type_set {
            resp_builder = resp_builder.header("Content-Type", "application/json; charset=utf-8");
        }

        let resp_body = format_json_str(&rule.response_body);
        let duration_ms = start_time.elapsed().as_millis() as u64;

        // Log traffic
        if config.record_traffic {
            let log_entry = TrafficLogEntry {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: now_ts,
                server_type: "REST".to_string(),
                method_or_rpc: method.to_string(),
                path_or_service: full_path.clone(),
                status_code: rule.status_code,
                is_mocked: true,
                duration_ms,
                request_headers: Some(req_headers_json),
                request_body: req_body_str,
                response_headers: Some(rule.response_headers.clone()),
                response_body: Some(resp_body.clone()),
            };

            let _ = state.db.add_traffic_log(&log_entry);
            if let Some(app) = &state.app_handle {
                let _ = app.emit("mock_traffic_event", &log_entry);
            }
        }

        return resp_builder
            .body(Body::from(resp_body))
            .unwrap_or_else(|_| {
                (StatusCode::INTERNAL_SERVER_ERROR, "Error building response").into_response()
            });
    }

    // --- NO MATCH FOUND ---
    // Check if origin forwarder is enabled
    if config.is_forwarder_enabled {
        if let Some(origin) = &config.origin_url {
            let origin_clean = origin.trim_end_matches('/');
            if !origin_clean.is_empty() {
                let target_url = format!("{}{}{}", origin_clean, path, query_str);
                info!("Forwarding request to origin: {}", target_url);

                match forward_to_origin(&method, &target_url, &headers, req_body.clone()).await {
                    Ok((origin_status, origin_headers, origin_resp_body)) => {
                        let duration_ms = start_time.elapsed().as_millis() as u64;
                        let origin_headers_json = serialize_headers(&origin_headers);
                        let origin_resp_body_str = String::from_utf8(origin_resp_body.clone())
                            .ok()
                            .map(|s| format_json_str(&s));

                        if config.record_traffic {
                            let log_entry = TrafficLogEntry {
                                id: uuid::Uuid::new_v4().to_string(),
                                timestamp: now_ts,
                                server_type: "REST".to_string(),
                                method_or_rpc: method.to_string(),
                                path_or_service: full_path.clone(),
                                status_code: origin_status.as_u16(),
                                is_mocked: false,
                                duration_ms,
                                request_headers: Some(req_headers_json),
                                request_body: req_body_str,
                                response_headers: Some(origin_headers_json),
                                response_body: origin_resp_body_str,
                            };

                            let _ = state.db.add_traffic_log(&log_entry);
                            if let Some(app) = &state.app_handle {
                                let _ = app.emit("mock_traffic_event", &log_entry);
                            }
                        }

                        let mut resp_builder = Response::builder().status(origin_status);
                        for (k, v) in origin_headers.iter() {
                            // Don't forward transfer-encoding or content-length to avoid framing conflicts
                            if !k.as_str().eq_ignore_ascii_case("transfer-encoding")
                                && !k.as_str().eq_ignore_ascii_case("content-length")
                            {
                                resp_builder = resp_builder.header(k, v);
                            }
                        }

                        return resp_builder
                            .body(Body::from(origin_resp_body))
                            .unwrap_or_else(|_| {
                                (
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    "Error creating proxy response",
                                )
                                    .into_response()
                            });
                    }
                    Err(err_msg) => {
                        warn!("Forwarder error to {}: {}", target_url, err_msg);
                        let duration_ms = start_time.elapsed().as_millis() as u64;
                        let err_body = serde_json::json!({
                            "error": "Bad Gateway / Proxy Error",
                            "target_url": target_url,
                            "message": err_msg
                        })
                        .to_string();

                        if config.record_traffic {
                            let log_entry = TrafficLogEntry {
                                id: uuid::Uuid::new_v4().to_string(),
                                timestamp: now_ts,
                                server_type: "REST".to_string(),
                                method_or_rpc: method.to_string(),
                                path_or_service: full_path.clone(),
                                status_code: 502,
                                is_mocked: false,
                                duration_ms,
                                request_headers: Some(req_headers_json),
                                request_body: req_body_str,
                                response_headers: Some(
                                    r#"{"Content-Type": "application/json"}"#.to_string(),
                                ),
                                response_body: Some(err_body.clone()),
                            };
                            let _ = state.db.add_traffic_log(&log_entry);
                            if let Some(app) = &state.app_handle {
                                let _ = app.emit("mock_traffic_event", &log_entry);
                            }
                        }

                        return Response::builder()
                            .status(StatusCode::BAD_GATEWAY)
                            .header("Content-Type", "application/json")
                            .body(Body::from(err_body))
                            .unwrap();
                    }
                }
            }
        }
    }

    // Default 404 if no match and forwarder is disabled
    let duration_ms = start_time.elapsed().as_millis() as u64;
    let not_found_json = serde_json::json!({
        "error": "Not Found",
        "message": "No mock rule matched this request and Origin Forwarder is disabled",
        "method": method.to_string(),
        "path": path,
        "hint": "Add a mock rule in Palugada or enable 'Forward unhandled requests to Origin' in settings"
    }).to_string();

    if config.record_traffic {
        let log_entry = TrafficLogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: now_ts,
            server_type: "REST".to_string(),
            method_or_rpc: method.to_string(),
            path_or_service: full_path.clone(),
            status_code: 404,
            is_mocked: true,
            duration_ms,
            request_headers: Some(req_headers_json),
            request_body: req_body_str,
            response_headers: Some(r#"{"Content-Type": "application/json"}"#.to_string()),
            response_body: Some(not_found_json.clone()),
        };
        let _ = state.db.add_traffic_log(&log_entry);
        if let Some(app) = &state.app_handle {
            let _ = app.emit("mock_traffic_event", &log_entry);
        }
    }

    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header("Content-Type", "application/json")
        .body(Body::from(not_found_json))
        .unwrap()
}

fn is_rule_matched(rule: &RestMockRule, req_method: &Method, req_path: &str) -> bool {
    // 1. Method check
    let rule_method = rule.method.to_uppercase();
    if rule_method != "*" && rule_method != "ALL" && rule_method != req_method.as_str() {
        return false;
    }

    // 2. Path check
    let clean_rule_path = rule.path.trim();
    if clean_rule_path == req_path {
        return true;
    }

    // Convert route parameters /api/users/:id or wildcard /api/users/* to Regex
    if clean_rule_path.contains(':') || clean_rule_path.contains('*') {
        let mut regex_pattern = String::from("^");
        let segments = clean_rule_path.split('/');
        for (i, seg) in segments.enumerate() {
            if i > 0 {
                regex_pattern.push('/');
            }
            if seg == "*" {
                regex_pattern.push_str(".*");
            } else if seg.starts_with(':') {
                regex_pattern.push_str("[^/]+");
            } else {
                regex_pattern.push_str(&regex::escape(seg));
            }
        }
        regex_pattern.push('$');

        if let Ok(re) = Regex::new(&regex_pattern) {
            if re.is_match(req_path) {
                return true;
            }
        }
    }

    false
}

async fn forward_to_origin(
    method: &Method,
    target_url: &str,
    headers: &HeaderMap,
    body_bytes: Bytes,
) -> Result<(StatusCode, HeaderMap, Vec<u8>), String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(tokio::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let reqwest_method = reqwest::Method::from_bytes(method.as_str().as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req_builder = client.request(reqwest_method, target_url);

    // Forward original headers (excluding host and content-length)
    for (k, v) in headers.iter() {
        let key_str = k.as_str();
        if !key_str.eq_ignore_ascii_case("host") && !key_str.eq_ignore_ascii_case("content-length")
        {
            if let Ok(val_bytes) = reqwest::header::HeaderValue::from_bytes(v.as_bytes()) {
                if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(key_str.as_bytes())
                {
                    req_builder = req_builder.header(header_name, val_bytes);
                }
            }
        }
    }

    if !body_bytes.is_empty() {
        req_builder = req_builder.body(body_bytes);
    }

    let resp = req_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = StatusCode::from_u16(resp.status().as_u16()).unwrap_or(StatusCode::OK);
    let mut resp_headers = HeaderMap::new();
    for (k, v) in resp.headers().iter() {
        if let (Ok(name), Ok(val)) = (
            HeaderName::from_bytes(k.as_str().as_bytes()),
            HeaderValue::from_bytes(v.as_bytes()),
        ) {
            resp_headers.insert(name, val);
        }
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok((status, resp_headers, bytes.to_vec()))
}

pub fn serialize_headers(headers: &hyper::HeaderMap) -> String {
    let mut map = serde_json::Map::new();
    for (k, v) in headers.iter() {
        if let Ok(v_str) = v.to_str() {
            map.insert(
                k.as_str().to_string(),
                serde_json::Value::String(v_str.to_string()),
            );
        }
    }
    serde_json::to_string_pretty(&serde_json::Value::Object(map))
        .unwrap_or_else(|_| "{}".to_string())
}

fn format_json_str(s: &str) -> String {
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(s) {
        if let Ok(pretty) = serde_json::to_string_pretty(&val) {
            return pretty;
        }
    }
    s.to_string()
}
