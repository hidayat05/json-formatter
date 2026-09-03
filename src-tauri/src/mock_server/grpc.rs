use crate::db::{DbManager, MockConfig, TrafficLogEntry};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty};
use hyper::body::{Body, Bytes, Frame, Incoming, SizeHint};
use hyper::server::conn::http2;
use hyper::service::service_fn;
use hyper::{HeaderMap, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use log::{error, info, warn};
use prost_reflect::prost::Message;
use prost_reflect::{DescriptorPool, DynamicMessage, MessageDescriptor};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedMethodInfo {
    pub name: String,
    pub full_name: String,
    pub input_type: String,
    pub output_type: String,
    pub default_request_json: String,
    pub default_response_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedServiceInfo {
    pub name: String,
    pub full_name: String,
    pub methods: Vec<ParsedMethodInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtoParsedInfo {
    pub services: Vec<ParsedServiceInfo>,
    pub package: Option<String>,
}

pub struct RunningGrpcServer {
    pub port: u16,
    pub shutdown_tx: oneshot::Sender<()>,
}

#[allow(dead_code)]
pub fn parse_proto_content(proto_content: &str) -> Result<ProtoParsedInfo, String> {
    parse_proto_content_with_includes(proto_content, &[])
}

pub fn parse_proto_content_with_includes(
    proto_content: &str,
    extra_protos: &[crate::db::GrpcProtoFile],
) -> Result<ProtoParsedInfo, String> {
    let temp_dir = std::env::temp_dir().join(format!("palugada_proto_{}", uuid::Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&temp_dir);

    // 1. Inject common enterprise proto stubs (google/api/annotations, validate, gogo, etc.)
    inject_common_proto_stubs(&temp_dir);

    // 2. Write all other saved proto files to temp_dir so cross-file imports succeed
    for extra in extra_protos {
        let extra_path = temp_dir.join(&extra.filename);
        if let Some(parent) = extra_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&extra_path, &extra.content);
    }

    // 3. Auto-generate stubs for any missing relative imports so compilation doesn't fail on missing dependencies
    if let Ok(re) = regex::Regex::new(r#"import\s*(?:public|weak)?\s*"([^"]+)";"#) {
        for cap in re.captures_iter(proto_content) {
            if let Some(import_match) = cap.get(1) {
                let import_str = import_match.as_str();
                if import_str.starts_with("google/protobuf/") {
                    // google/protobuf/* is provided natively by protox compiler
                    continue;
                }
                let stub_path = temp_dir.join(import_str);
                if !stub_path.exists() {
                    if let Some(parent) = stub_path.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    let _ = std::fs::write(&stub_path, "syntax = \"proto3\";\n");
                }
            }
        }
    }

    let temp_file = temp_dir.join("main_schema.proto");
    std::fs::write(&temp_file, proto_content)
        .map_err(|e| format!("Failed to write temp proto: {}", e))?;

    let file_desc_set = protox::compile([&temp_file], [&temp_dir])
        .map_err(|e| format!("Protobuf compilation error: {}", e))?;

    let _ = std::fs::remove_dir_all(&temp_dir);

    let pool = DescriptorPool::from_file_descriptor_set(file_desc_set)
        .map_err(|e| format!("Failed to load descriptor pool: {}", e))?;

    let mut services = Vec::new();
    let mut package = None;

    for s in pool.services() {
        let full_name = s.full_name().to_string();
        let name = s.name().to_string();

        if package.is_none() {
            let parent = s.parent_file();
            let pkg = parent.package_name();
            if !pkg.is_empty() {
                package = Some(pkg.to_string());
            }
        }

        let mut methods = Vec::new();
        for m in s.methods() {
            let input_desc = m.input();
            let output_desc = m.output();

            let default_request_json = generate_default_json(&input_desc);
            let default_response_json = generate_default_json(&output_desc);

            methods.push(ParsedMethodInfo {
                name: m.name().to_string(),
                full_name: m.full_name().to_string(),
                input_type: input_desc.full_name().to_string(),
                output_type: output_desc.full_name().to_string(),
                default_request_json,
                default_response_json,
            });
        }

        services.push(ParsedServiceInfo {
            name,
            full_name,
            methods,
        });
    }

    Ok(ProtoParsedInfo { services, package })
}

pub fn inject_common_proto_stubs(temp_dir: &std::path::Path) {
    let google_api_dir = temp_dir.join("google").join("api");
    let _ = std::fs::create_dir_all(&google_api_dir);

    let http_proto = r#"syntax = "proto3";
package google.api;

message Http {
  repeated HttpRule rules = 1;
  bool fully_decode_reserved_expansion = 2;
}

message HttpRule {
  string selector = 1;
  oneof pattern {
    string get = 2;
    string put = 3;
    string post = 4;
    string delete = 5;
    string patch = 6;
    CustomHttpPattern custom = 8;
  }
  string body = 7;
  string response_body = 12;
  repeated HttpRule additional_bindings = 11;
}

message CustomHttpPattern {
  string kind = 1;
  string path = 2;
}
"#;
    let _ = std::fs::write(google_api_dir.join("http.proto"), http_proto);

    let annotations_proto = r#"syntax = "proto3";
package google.api;
import "google/api/http.proto";
import "google/protobuf/descriptor.proto";

extend google.protobuf.MethodOptions {
  HttpRule http = 72295728;
}
"#;
    let _ = std::fs::write(google_api_dir.join("annotations.proto"), annotations_proto);

    let field_behavior_proto = r#"syntax = "proto3";
package google.api;
import "google/protobuf/descriptor.proto";

enum FieldBehavior {
  FIELD_BEHAVIOR_UNSPECIFIED = 0;
  OPTIONAL = 1;
  REQUIRED = 2;
  OUTPUT_ONLY = 3;
  INPUT_ONLY = 4;
  IMMUTABLE = 5;
  UNORDERED_LIST = 6;
  NON_EMPTY_DEFAULT = 7;
}

extend google.protobuf.FieldOptions {
  repeated FieldBehavior field_behavior = 1052;
}
"#;
    let _ = std::fs::write(
        google_api_dir.join("field_behavior.proto"),
        field_behavior_proto,
    );

    let resource_proto = r#"syntax = "proto3";
package google.api;
import "google/protobuf/descriptor.proto";

extend google.protobuf.FieldOptions {
  ResourceReference resource_reference = 1055;
}
extend google.protobuf.FileOptions {
  repeated ResourceDescriptor resource_definition = 1053;
}
extend google.protobuf.MessageOptions {
  ResourceDescriptor resource = 1053;
}

message ResourceDescriptor {
  string type = 1;
  repeated string pattern = 2;
  string name_field = 3;
  string history = 4;
  string plural = 5;
  string singular = 6;
}

message ResourceReference {
  string type = 1;
  string child_type = 2;
}
"#;
    let _ = std::fs::write(google_api_dir.join("resource.proto"), resource_proto);

    let httpbody_proto = r#"syntax = "proto3";
package google.api;
import "google/protobuf/any.proto";

message HttpBody {
  string content_type = 1;
  bytes data = 2;
  repeated google.protobuf.Any extensions = 3;
}
"#;
    let _ = std::fs::write(google_api_dir.join("httpbody.proto"), httpbody_proto);

    let google_rpc_dir = temp_dir.join("google").join("rpc");
    let _ = std::fs::create_dir_all(&google_rpc_dir);

    let rpc_status_proto = r#"syntax = "proto3";
package google.rpc;
import "google/protobuf/any.proto";

message Status {
  int32 code = 1;
  string message = 2;
  repeated google.protobuf.Any details = 3;
}
"#;
    let _ = std::fs::write(google_rpc_dir.join("status.proto"), rpc_status_proto);

    let rpc_code_proto = r#"syntax = "proto3";
package google.rpc;

enum Code {
  OK = 0;
  CANCELLED = 1;
  UNKNOWN = 2;
  INVALID_ARGUMENT = 3;
  DEADLINE_EXCEEDED = 4;
  NOT_FOUND = 5;
  ALREADY_EXISTS = 6;
  PERMISSION_DENIED = 7;
  UNAUTHENTICATED = 16;
  RESOURCE_EXHAUSTED = 8;
  FAILED_PRECONDITION = 9;
  ABORTED = 10;
  OUT_OF_RANGE = 11;
  UNIMPLEMENTED = 12;
  INTERNAL = 13;
  UNAVAILABLE = 14;
  DATA_LOSS = 15;
}
"#;
    let _ = std::fs::write(google_rpc_dir.join("code.proto"), rpc_code_proto);

    let rpc_error_details_proto = r#"syntax = "proto3";
package google.rpc;
import "google/protobuf/duration.proto";

message RetryInfo {
  google.protobuf.Duration retry_delay = 1;
}
message DebugInfo {
  repeated string stack_entries = 1;
  string detail = 2;
}
message QuotaFailure {
  message Violation {
    string subject = 1;
    string description = 2;
  }
  repeated Violation violations = 1;
}
message ErrorInfo {
  string reason = 1;
  string domain = 2;
  map<string, string> metadata = 3;
}
message BadRequest {
  message FieldViolation {
    string field = 1;
    string description = 2;
  }
  repeated FieldViolation field_violations = 1;
}
message RequestInfo {
  string request_id = 1;
  string serving_data = 2;
}
message ResourceInfo {
  string resource_type = 1;
  string resource_name = 2;
  string owner = 3;
  string description = 4;
}
message Help {
  message Link {
    string description = 1;
    string url = 2;
  }
  repeated Link links = 1;
}
message LocalizedMessage {
  string locale = 1;
  string message = 2;
}
"#;
    let _ = std::fs::write(
        google_rpc_dir.join("error_details.proto"),
        rpc_error_details_proto,
    );

    let validate_dir = temp_dir.join("validate");
    let _ = std::fs::create_dir_all(&validate_dir);
    let validate_proto = r#"syntax = "proto3";
package validate;
import "google/protobuf/descriptor.proto";

extend google.protobuf.FieldOptions {
  FieldRules rules = 1071;
}

message FieldRules {
  optional MessageRules message = 17;
  optional StringRules string = 14;
  optional Int32Rules int32 = 3;
  optional Int64Rules int64 = 4;
  optional UInt32Rules uint32 = 5;
  optional UInt64Rules uint64 = 6;
  optional BoolRules bool = 13;
  optional BytesRules bytes = 15;
  optional RepeatedRules repeated = 18;
  optional MapRules map = 19;
  optional AnyRules any = 20;
  optional FloatRules float = 1;
  optional DoubleRules double = 2;
}

message MessageRules {
  optional bool skip = 1;
  optional bool required = 2;
}

message StringRules {
  optional uint64 min_len = 1;
  optional uint64 max_len = 2;
  optional string pattern = 3;
  optional string prefix = 4;
  optional string suffix = 5;
  optional string contains = 6;
  optional bool email = 7;
  optional bool uri = 8;
  optional bool uuid = 9;
  optional bool ip = 10;
  optional bool ipv4 = 11;
  optional bool ipv6 = 12;
}

message Int32Rules {
  optional int32 const = 1;
  optional int32 lt = 2;
  optional int32 lte = 3;
  optional int32 gt = 4;
  optional int32 gte = 5;
  repeated int32 in = 6;
  repeated int32 not_in = 7;
}

message Int64Rules {
  optional int64 const = 1;
  optional int64 lt = 2;
  optional int64 lte = 3;
  optional int64 gt = 4;
  optional int64 gte = 5;
  repeated int64 in = 6;
  repeated int64 not_in = 7;
}

message UInt32Rules {}
message UInt64Rules {}
message BoolRules {
  optional bool const = 1;
}
message BytesRules {}
message RepeatedRules {
  optional uint64 min_items = 1;
  optional uint64 max_items = 2;
  optional bool unique = 3;
}
message MapRules {}
message AnyRules {}
message FloatRules {}
message DoubleRules {}
"#;
    let _ = std::fs::write(validate_dir.join("validate.proto"), validate_proto);

    let buf_validate_dir = temp_dir.join("buf").join("validate");
    let _ = std::fs::create_dir_all(&buf_validate_dir);
    let buf_validate_proto = r#"syntax = "proto3";
package buf.validate;
import "google/protobuf/descriptor.proto";

extend google.protobuf.FieldOptions {
  FieldConstraints field = 1159;
}
extend google.protobuf.MessageOptions {
  MessageConstraints message = 1159;
}

message FieldConstraints {
  bool required = 1;
}
message MessageConstraints {
  bool disabled = 1;
}
"#;
    let _ = std::fs::write(buf_validate_dir.join("validate.proto"), buf_validate_proto);

    let openapiv2_dir = temp_dir.join("protoc-gen-openapiv2").join("options");
    let _ = std::fs::create_dir_all(&openapiv2_dir);
    let openapi_annotations = r#"syntax = "proto3";
package grpc.gateway.protoc_gen_openapiv2.options;
import "google/protobuf/descriptor.proto";

extend google.protobuf.FileOptions {
  Swagger openapiv2_swagger = 1042;
}
extend google.protobuf.MethodOptions {
  Operation openapiv2_operation = 1042;
}
extend google.protobuf.MessageOptions {
  Schema openapiv2_schema = 1042;
}
extend google.protobuf.FieldOptions {
  JSONSchema openapiv2_field = 1042;
}

message Swagger {
  string swagger = 1;
  string host = 3;
  string base_path = 4;
}
message Operation {
  repeated string tags = 1;
  string summary = 2;
  string description = 3;
}
message Schema {
  JSONSchema json_schema = 1;
}
message JSONSchema {
  string title = 24;
  string description = 25;
}
"#;
    let _ = std::fs::write(openapiv2_dir.join("annotations.proto"), openapi_annotations);
    let _ = std::fs::write(openapiv2_dir.join("openapiv2.proto"), openapi_annotations);

    let gogo_dir = temp_dir.join("gogoproto");
    let _ = std::fs::create_dir_all(&gogo_dir);
    let gogo_proto = r#"syntax = "proto2";
package gogoproto;
import "google/protobuf/descriptor.proto";

extend google.protobuf.EnumOptions {
  optional bool goproto_enum_prefix = 62001;
}
extend google.protobuf.FileOptions {
  optional bool goproto_getters_all = 63001;
}
extend google.protobuf.MessageOptions {
  optional bool goproto_getters = 64001;
}
extend google.protobuf.FieldOptions {
  optional bool nullable = 65001;
}
"#;
    let _ = std::fs::write(gogo_dir.join("gogo.proto"), gogo_proto);
}

fn generate_default_json(msg_desc: &MessageDescriptor) -> String {
    let mut map = serde_json::Map::new();

    for field in msg_desc.fields() {
        let name = field.name().to_string();
        if field.is_list() {
            map.insert(name, serde_json::Value::Array(Vec::new()));
        } else if field.is_map() {
            map.insert(name, serde_json::Value::Object(serde_json::Map::new()));
        } else {
            let val = match field.kind() {
                prost_reflect::Kind::Double | prost_reflect::Kind::Float => {
                    serde_json::json!(0.0)
                }
                prost_reflect::Kind::Int32
                | prost_reflect::Kind::Int64
                | prost_reflect::Kind::Uint32
                | prost_reflect::Kind::Uint64
                | prost_reflect::Kind::Sint32
                | prost_reflect::Kind::Sint64
                | prost_reflect::Kind::Fixed32
                | prost_reflect::Kind::Fixed64
                | prost_reflect::Kind::Sfixed32
                | prost_reflect::Kind::Sfixed64 => serde_json::json!(0),
                prost_reflect::Kind::Bool => serde_json::json!(false),
                prost_reflect::Kind::String => serde_json::json!(""),
                prost_reflect::Kind::Bytes => serde_json::json!(""),
                prost_reflect::Kind::Enum(_) => serde_json::json!(0),
                prost_reflect::Kind::Message(_) => {
                    serde_json::Value::Object(serde_json::Map::new())
                }
            };
            map.insert(name, val);
        }
    }

    serde_json::to_string_pretty(&Value::Object(map)).unwrap_or_else(|_| "{}".to_string())
}

#[derive(Clone)]
pub struct GrpcServerContext {
    pub db: DbManager,
    pub app_handle: Option<AppHandle>,
    pub descriptor_pool: Arc<tokio::sync::RwLock<Option<DescriptorPool>>>,
}

pub fn start_server(
    port: u16,
    db: DbManager,
    app_handle: Option<AppHandle>,
) -> Result<RunningGrpcServer, String> {
    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    let proto_files = db.get_proto_files().unwrap_or_default();
    let mut pool_opt = None;

    if !proto_files.is_empty() {
        let temp_dir = std::env::temp_dir().join(format!("palugada_grpc_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);
        inject_common_proto_stubs(&temp_dir);
        let mut paths = Vec::new();

        for file in &proto_files {
            let path = temp_dir.join(&file.filename);
            if let Some(parent) = path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            if std::fs::write(&path, &file.content).is_ok() {
                paths.push(path);
            }
        }

        if let Ok(file_desc_set) = protox::compile(&paths, [&temp_dir]) {
            if let Ok(p) = DescriptorPool::from_file_descriptor_set(file_desc_set) {
                pool_opt = Some(p);
            }
        }

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    let ctx = GrpcServerContext {
        db,
        app_handle,
        descriptor_pool: Arc::new(tokio::sync::RwLock::new(pool_opt)),
    };

    let std_listener = std::net::TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port)))
        .map_err(|e| format!("Failed to bind gRPC server to port {}: {}", port, e))?;
    std_listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set non-blocking: {}", e))?;
    let bound_port = std_listener.local_addr().map_err(|e| e.to_string())?.port();

    tauri::async_runtime::spawn(async move {
        info!(
            "Starting gRPC Mock Server on http://127.0.0.1:{}",
            bound_port
        );

        let listener = match TcpListener::from_std(std_listener) {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to create async gRPC listener: {}", e);
                return;
            }
        };

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    info!("gRPC server received shutdown signal");
                    break;
                }
                accept_res = listener.accept() => {
                    match accept_res {
                        Ok((stream, _)) => {
                            let io = TokioIo::new(stream);
                            let ctx_clone = ctx.clone();

                            tauri::async_runtime::spawn(async move {
                                let service = service_fn(move |req| {
                                    let ctx = ctx_clone.clone();
                                    async move {
                                        handle_grpc_request(ctx, req).await
                                    }
                                });

                                if let Err(err) = http2::Builder::new(hyper_util::rt::TokioExecutor::new())
                                    .serve_connection(io, service)
                                    .await
                                {
                                    info!("gRPC connection closed: {}", err);
                                }
                            });
                        }
                        Err(e) => {
                            warn!("gRPC failed to accept TCP connection: {}", e);
                        }
                    }
                }
            }
        }
    });

    Ok(RunningGrpcServer {
        port: bound_port,
        shutdown_tx,
    })
}

pub struct GrpcBody {
    data: Option<Bytes>,
    trailers: Option<HeaderMap>,
}

impl Body for GrpcBody {
    type Data = Bytes;
    type Error = hyper::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        if let Some(data) = self.data.take() {
            return Poll::Ready(Some(Ok(Frame::data(data))));
        }
        if let Some(trailers) = self.trailers.take() {
            return Poll::Ready(Some(Ok(Frame::trailers(trailers))));
        }
        Poll::Ready(None)
    }

    fn is_end_stream(&self) -> bool {
        self.data.is_none() && self.trailers.is_none()
    }

    fn size_hint(&self) -> SizeHint {
        if let Some(data) = &self.data {
            SizeHint::with_exact(data.len() as u64)
        } else {
            SizeHint::with_exact(0)
        }
    }
}

fn grpc_body(bytes: Vec<u8>, trailers: HeaderMap) -> BoxBody<Bytes, hyper::Error> {
    GrpcBody {
        data: Some(Bytes::from(bytes)),
        trailers: Some(trailers),
    }
    .boxed()
}

fn empty_body() -> BoxBody<Bytes, hyper::Error> {
    Empty::<Bytes>::new()
        .map_err(|never: Infallible| match never {})
        .boxed()
}

async fn handle_grpc_request(
    ctx: GrpcServerContext,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, hyper::Error>>, hyper::Error> {
    let start_time = Instant::now();
    let now_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let path = req.uri().path().to_string(); // e.g. "/user.UserService/GetUser"
    let full_rpc_path = path.trim_start_matches('/');
    let parts: Vec<&str> = full_rpc_path.split('/').collect();

    let (service_name, method_name) = if parts.len() == 2 {
        (parts[0], parts[1])
    } else {
        ("", "")
    };

    let req_method = req.method().clone();
    let req_headers = req.headers().clone();
    let mut req_headers_map = serde_json::Map::new();
    for (k, v) in req_headers.iter() {
        req_headers_map.insert(
            k.as_str().to_string(),
            serde_json::json!(v.to_str().unwrap_or("")),
        );
    }
    let req_headers_json = serde_json::to_string(&req_headers_map).unwrap_or_default();

    let body_bytes = req.into_body().collect().await?.to_bytes();

    let pool_guard = ctx.descriptor_pool.read().await;
    let mut req_json_str = None;

    if let Some(pool) = pool_guard.as_ref() {
        if let Some(service_desc) = pool.get_service_by_name(service_name) {
            if let Some(method_desc) = service_desc.methods().find(|m| m.name() == method_name) {
                let input_desc = method_desc.input();
                if body_bytes.len() >= 5 {
                    let msg_payload = &body_bytes[5..];
                    if let Ok(dyn_msg) = DynamicMessage::decode(input_desc, msg_payload) {
                        if let Ok(json_val) = serde_json::to_value(&dyn_msg) {
                            req_json_str = Some(
                                serde_json::to_string_pretty(&json_val)
                                    .unwrap_or_else(|_| json_val.to_string()),
                            );
                        }
                    }
                }
            }
        }
    }

    let rules = ctx.db.get_grpc_rules().unwrap_or_default();
    let config = ctx.db.get_config("GRPC").unwrap_or_else(|_| MockConfig {
        server_type: "GRPC".to_string(),
        port: 50051,
        is_forwarder_enabled: false,
        origin_url: None,
        record_traffic: true,
    });

    let matched_rule = rules
        .into_iter()
        .find(|r| r.service_name == service_name && r.method_name == method_name);

    if let Some(rule) = matched_rule {
        if rule.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay_ms)).await;
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;
        let status_code_str = rule.status_code.to_string();
        let grpc_msg = if !rule.grpc_message.is_empty() {
            rule.grpc_message.clone()
        } else if rule.status_code == 0 {
            "OK".to_string()
        } else {
            "Mocked gRPC Error".to_string()
        };

        let mut resp_headers_map = serde_json::Map::new();
        resp_headers_map.insert(
            "content-type".to_string(),
            serde_json::json!("application/grpc"),
        );
        resp_headers_map.insert(
            "grpc-status".to_string(),
            serde_json::json!(&status_code_str),
        );
        resp_headers_map.insert("grpc-message".to_string(), serde_json::json!(&grpc_msg));

        // Parse custom response metadata / headers
        let mut custom_metadata_pairs = Vec::new();
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&rule.response_metadata) {
            for (k, v) in map {
                let v_str = match v {
                    Value::String(s) => s,
                    other => other.to_string(),
                };
                resp_headers_map.insert(k.clone(), serde_json::json!(&v_str));
                custom_metadata_pairs.push((k, v_str));
            }
        }

        // Parse custom response trailers
        let mut custom_trailers_pairs = Vec::new();
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&rule.response_trailers) {
            for (k, v) in map {
                let v_str = match v {
                    Value::String(s) => s,
                    other => other.to_string(),
                };
                resp_headers_map.insert(format!("trailer:{}", k), serde_json::json!(&v_str));
                custom_trailers_pairs.push((k, v_str));
            }
        }

        if rule.status_code == 0 {
            let mut resp_payload_bytes = Vec::new();

            if let Some(pool) = pool_guard.as_ref() {
                if let Some(service_desc) = pool.get_service_by_name(service_name) {
                    if let Some(method_desc) =
                        service_desc.methods().find(|m| m.name() == method_name)
                    {
                        let output_desc = method_desc.output();
                        if let Ok(json_val) = serde_json::from_str::<Value>(&rule.response_json) {
                            if let Ok(dyn_msg) = DynamicMessage::deserialize(output_desc, json_val)
                            {
                                let encoded = dyn_msg.encode_to_vec();
                                resp_payload_bytes.push(0u8);
                                resp_payload_bytes
                                    .extend_from_slice(&(encoded.len() as u32).to_be_bytes());
                                resp_payload_bytes.extend_from_slice(&encoded);
                            }
                        }
                    }
                }
            }

            if resp_payload_bytes.is_empty() {
                resp_payload_bytes = vec![0, 0, 0, 0, 0];
            }

            if config.record_traffic {
                let log_entry = TrafficLogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: now_ts,
                    server_type: "GRPC".to_string(),
                    method_or_rpc: format!("{}/{}", service_name, method_name),
                    path_or_service: path.clone(),
                    status_code: 0,
                    is_mocked: true,
                    duration_ms,
                    request_headers: Some(r#"{"content-type": "application/grpc"}"#.to_string()),
                    request_body: req_json_str,
                    response_headers: Some(
                        serde_json::to_string(&resp_headers_map).unwrap_or_default(),
                    ),
                    response_body: Some(rule.response_json.clone()),
                };
                let _ = ctx.db.add_traffic_log(&log_entry);
                if let Some(app) = &ctx.app_handle {
                    let _ = app.emit("mock_traffic_event", &log_entry);
                }
            }

            let mut builder = Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "application/grpc");

            for (k, v) in &custom_metadata_pairs {
                builder = builder.header(k.as_str(), v.as_str());
            }

            let mut trailers = HeaderMap::new();
            trailers.insert("grpc-status", "0".parse().unwrap());
            if let Ok(msg_val) = grpc_msg.parse() {
                trailers.insert("grpc-message", msg_val);
            }
            for (k, v) in &custom_trailers_pairs {
                if let Ok(hname) = hyper::header::HeaderName::from_bytes(k.as_bytes()) {
                    if let Ok(hval) = hyper::header::HeaderValue::from_str(v.as_str()) {
                        trailers.insert(hname, hval);
                    }
                }
            }

            let resp = builder
                .body(grpc_body(resp_payload_bytes, trailers))
                .unwrap();
            return Ok(resp);
        } else {
            if config.record_traffic {
                let log_entry = TrafficLogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: now_ts,
                    server_type: "GRPC".to_string(),
                    method_or_rpc: format!("{}/{}", service_name, method_name),
                    path_or_service: path.clone(),
                    status_code: rule.status_code as u16,
                    is_mocked: true,
                    duration_ms,
                    request_headers: Some(r#"{"content-type": "application/grpc"}"#.to_string()),
                    request_body: req_json_str,
                    response_headers: Some(
                        serde_json::to_string(&resp_headers_map).unwrap_or_default(),
                    ),
                    response_body: Some(rule.response_json.clone()),
                };
                let _ = ctx.db.add_traffic_log(&log_entry);
                if let Some(app) = &ctx.app_handle {
                    let _ = app.emit("mock_traffic_event", &log_entry);
                }
            }

            let mut builder = Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "application/grpc")
                .header("grpc-status", &status_code_str)
                .header("grpc-message", &grpc_msg);

            for (k, v) in &custom_metadata_pairs {
                builder = builder.header(k.as_str(), v.as_str());
            }
            for (k, v) in &custom_trailers_pairs {
                builder = builder.header(k.as_str(), v.as_str());
            }

            let resp = builder.body(empty_body()).unwrap();
            return Ok(resp);
        }
    }

    if config.is_forwarder_enabled {
        if let Some(origin) = &config.origin_url {
            let origin_clean = origin.trim_end_matches('/');
            if !origin_clean.is_empty() {
                let target_url = format!("{}{}", origin_clean, path);
                info!("Forwarding gRPC request to origin: {}", target_url);

                match forward_grpc_to_origin(
                    &req_method,
                    &target_url,
                    &req_headers,
                    body_bytes.clone(),
                )
                .await
                {
                    Ok((origin_status, origin_headers, origin_resp_body)) => {
                        let duration_ms = start_time.elapsed().as_millis() as u64;
                        let mut origin_headers_map = serde_json::Map::new();
                        for (k, v) in origin_headers.iter() {
                            origin_headers_map.insert(
                                k.as_str().to_string(),
                                serde_json::json!(v.to_str().unwrap_or("")),
                            );
                        }

                        let mut origin_resp_json_str =
                            format!("<Binary gRPC payload, {} bytes>", origin_resp_body.len());
                        if let Some(pool) = pool_guard.as_ref() {
                            if let Some(service_desc) = pool.get_service_by_name(service_name) {
                                if let Some(method_desc) =
                                    service_desc.methods().find(|m| m.name() == method_name)
                                {
                                    let output_desc = method_desc.output();
                                    if origin_resp_body.len() >= 5 {
                                        let msg_payload = &origin_resp_body[5..];
                                        if let Ok(dyn_msg) =
                                            DynamicMessage::decode(output_desc, msg_payload)
                                        {
                                            if let Ok(json_val) = serde_json::to_value(&dyn_msg) {
                                                origin_resp_json_str =
                                                    serde_json::to_string_pretty(&json_val)
                                                        .unwrap_or_else(|_| json_val.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if config.record_traffic {
                            let log_entry = TrafficLogEntry {
                                id: uuid::Uuid::new_v4().to_string(),
                                timestamp: now_ts,
                                server_type: "GRPC".to_string(),
                                method_or_rpc: format!("{}/{}", service_name, method_name),
                                path_or_service: path.clone(),
                                status_code: origin_status.as_u16(),
                                is_mocked: false,
                                duration_ms,
                                request_headers: Some(req_headers_json.clone()),
                                request_body: req_json_str.clone(),
                                response_headers: Some(
                                    serde_json::to_string(&origin_headers_map).unwrap_or_default(),
                                ),
                                response_body: Some(origin_resp_json_str),
                            };
                            let _ = ctx.db.add_traffic_log(&log_entry);
                            if let Some(app) = &ctx.app_handle {
                                let _ = app.emit("mock_traffic_event", &log_entry);
                            }
                        }

                        let mut builder = Response::builder().status(origin_status);
                        let mut trailers = hyper::HeaderMap::new();

                        for (k, v) in origin_headers.iter() {
                            let k_str = k.as_str();
                            if k_str.eq_ignore_ascii_case("grpc-status")
                                || k_str.eq_ignore_ascii_case("grpc-message")
                            {
                                trailers.insert(k.clone(), v.clone());
                            } else if !k_str.eq_ignore_ascii_case("transfer-encoding")
                                && !k_str.eq_ignore_ascii_case("content-length")
                            {
                                builder = builder.header(k, v);
                            }
                        }

                        let resp = builder.body(grpc_body(origin_resp_body, trailers)).unwrap();
                        return Ok(resp);
                    }
                    Err(err_msg) => {
                        warn!("gRPC Forwarder error to {}: {}", target_url, err_msg);
                        let duration_ms = start_time.elapsed().as_millis() as u64;
                        if config.record_traffic {
                            let log_entry = TrafficLogEntry {
                                id: uuid::Uuid::new_v4().to_string(),
                                timestamp: now_ts,
                                server_type: "GRPC".to_string(),
                                method_or_rpc: format!("{}/{}", service_name, method_name),
                                path_or_service: path.clone(),
                                status_code: 502,
                                is_mocked: false,
                                duration_ms,
                                request_headers: Some(req_headers_json.clone()),
                                request_body: req_json_str.clone(),
                                response_headers: Some(r#"{"grpc-status": "14"}"#.to_string()),
                                response_body: Some(err_msg),
                            };
                            let _ = ctx.db.add_traffic_log(&log_entry);
                            if let Some(app) = &ctx.app_handle {
                                let _ = app.emit("mock_traffic_event", &log_entry);
                            }
                        }

                        let resp = Response::builder()
                            .status(StatusCode::OK)
                            .header("content-type", "application/grpc")
                            .header("grpc-status", "14")
                            .header("grpc-message", "Proxy Forwarder Bad Gateway")
                            .body(empty_body())
                            .unwrap();
                        return Ok(resp);
                    }
                }
            }
        }
    }
    let duration_ms = start_time.elapsed().as_millis() as u64;
    if config.record_traffic {
        let log_entry = TrafficLogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: now_ts,
            server_type: "GRPC".to_string(),
            method_or_rpc: format!("{}/{}", service_name, method_name),
            path_or_service: path.clone(),
            status_code: 12,
            is_mocked: true,
            duration_ms,
            request_headers: Some(r#"{"content-type": "application/grpc"}"#.to_string()),
            request_body: req_json_str,
            response_headers: Some(r#"{"grpc-status": "12"}"#.to_string()),
            response_body: Some(r#"{"error": "Method not mocked in Palugada"}"#.to_string()),
        };
        let _ = ctx.db.add_traffic_log(&log_entry);
        if let Some(app) = &ctx.app_handle {
            let _ = app.emit("mock_traffic_event", &log_entry);
        }
    }

    let resp = Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "application/grpc")
        .header("grpc-status", "12")
        .header(
            "grpc-message",
            "Method not implemented in Palugada mock server",
        )
        .body(empty_body())
        .unwrap();

    Ok(resp)
}

async fn forward_grpc_to_origin(
    method: &hyper::Method,
    target_url: &str,
    headers: &hyper::HeaderMap,
    body_bytes: Bytes,
) -> Result<(StatusCode, hyper::HeaderMap, Vec<u8>), String> {
    let builder = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(tokio::time::Duration::from_secs(30));

    let client = if target_url.starts_with("http://") {
        builder.http2_prior_knowledge().build()
    } else {
        builder.build()
    }
    .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let reqwest_method = reqwest::Method::from_bytes(method.as_str().as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req_builder = client.request(reqwest_method, target_url);

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
    let mut resp_headers = hyper::HeaderMap::new();

    for (k, v) in resp.headers().iter() {
        if let (Ok(name), Ok(val)) = (
            hyper::header::HeaderName::from_bytes(k.as_str().as_bytes()),
            hyper::header::HeaderValue::from_bytes(v.as_bytes()),
        ) {
            resp_headers.insert(name, val);
        }
    }

    if !resp_headers.contains_key("grpc-status") && status.is_success() {
        if let Ok(zero_val) = hyper::header::HeaderValue::from_str("0") {
            resp_headers.insert("grpc-status", zero_val);
        }
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok((status, resp_headers, bytes.to_vec()))
}
