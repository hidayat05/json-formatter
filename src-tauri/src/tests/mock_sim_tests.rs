use crate::db::{self, DbManager};
use crate::mock_server;

#[tokio::test]
async fn test_simulate_rest_mock_and_proxy_full_flow() {
    println!("\n==================================================================");
    println!("🚀 [E2E SIMULATION 1] REST Mock & Transparent Proxy Flow");
    println!("==================================================================");

    let temp_db = std::env::temp_dir().join(format!("rest_sim_{}.db", uuid::Uuid::new_v4()));
    let db = DbManager::new(temp_db.clone()).unwrap();

    // 1. Start mock upstream server to simulate real backend
    let upstream_router = axum::Router::new().route(
        "/api/v1/backend-user",
        axum::routing::get(|| async {
            (
                axum::http::StatusCode::OK,
                [("content-type", "application/json")],
                r#"{"source":"upstream_backend","name":"Real Backend User"}"#,
            )
        }),
    );
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = upstream_listener.local_addr().unwrap().port();
    println!("📡 1. Upstream Real Backend running on: http://127.0.0.1:{}", upstream_port);
    tokio::spawn(async move {
        let _ = axum::serve(upstream_listener, upstream_router).await;
    });

    // 2. Configure REST Mock rules
    let rule_mocked = db::RestMockRule {
        id: "rule-1".to_string(),
        name: "Mocked User Info".to_string(),
        method: "GET".to_string(),
        path: "/api/v1/mocked-user".to_string(),
        status_code: 200,
        delay_ms: 10,
        response_headers: r#"{"X-Mock-Engine":"Palugada","Content-Type":"application/json"}"#.to_string(),
        response_body: r#"{"id":"usr_001","name":"Mocked Alice","role":"tester"}"#.to_string(),
        enabled: true,
        created_at: 1000,
    };
    db.save_rest_rule(&rule_mocked).unwrap();

    let rule_post = db::RestMockRule {
        id: "rule-2".to_string(),
        name: "Mock Order Creation".to_string(),
        method: "POST".to_string(),
        path: "/api/v1/orders".to_string(),
        status_code: 201,
        delay_ms: 0,
        response_headers: r#"{"Content-Type":"application/json"}"#.to_string(),
        response_body: r#"{"order_id":"ORD-8888","status":"CONFIRMED"}"#.to_string(),
        enabled: true,
        created_at: 1001,
    };
    db.save_rest_rule(&rule_post).unwrap();

    // 3. Configure Forwarding/Proxy config pointing to upstream
    db.save_config(&db::MockConfig {
        server_type: "REST".to_string(),
        port: 0,
        is_forwarder_enabled: true,
        origin_url: Some(format!("http://127.0.0.1:{}", upstream_port)),
        record_traffic: true,
    })
    .unwrap();

    // 4. Start Mock & Proxy Server on dynamic port
    let mock_server = mock_server::rest::start_server(0, db.clone(), None).unwrap();
    println!("⚡ 2. Palugada REST Mock & Proxy Server started on: http://127.0.0.1:{}", mock_server.port);
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    let client = reqwest::Client::new();
    let base_url = format!("http://127.0.0.1:{}", mock_server.port);

    // Test A: Direct Mock Rule match (GET /api/v1/mocked-user)
    println!("\n👉 [Step A] Client calling Mocked Endpoint: GET /api/v1/mocked-user");
    let resp_mock = client
        .get(format!("{}/api/v1/mocked-user", base_url))
        .send()
        .await
        .unwrap();
    println!("   Status Code: {}", resp_mock.status());
    assert_eq!(resp_mock.status(), 200);
    assert_eq!(
        resp_mock.headers().get("x-mock-engine").unwrap(),
        "Palugada"
    );
    let body_mock: serde_json::Value = resp_mock.json().await.unwrap();
    println!("   Response Body: {}", body_mock);
    assert_eq!(body_mock["name"], "Mocked Alice");
    assert_eq!(body_mock["role"], "tester");

    // Test B: POST Mock Rule match (POST /api/v1/orders)
    println!("\n👉 [Step B] Client calling POST Mocked Endpoint: POST /api/v1/orders");
    let resp_post = client
        .post(format!("{}/api/v1/orders", base_url))
        .json(&serde_json::json!({"item": "Laptop", "quantity": 1}))
        .send()
        .await
        .unwrap();
    println!("   Status Code: {}", resp_post.status());
    assert_eq!(resp_post.status(), 201);
    let body_post: serde_json::Value = resp_post.json().await.unwrap();
    println!("   Response Body: {}", body_post);
    assert_eq!(body_post["order_id"], "ORD-8888");
    assert_eq!(body_post["status"], "CONFIRMED");

    // Test C: Proxy / Forwarding mode to Upstream (GET /api/v1/backend-user)
    println!("\n👉 [Step C] Client calling Unmocked Endpoint (Proxy Forward): GET /api/v1/backend-user");
    let resp_proxy = client
        .get(format!("{}/api/v1/backend-user", base_url))
        .send()
        .await
        .unwrap();
    println!("   Status Code: {}", resp_proxy.status());
    assert_eq!(resp_proxy.status(), 200);
    let body_proxy: serde_json::Value = resp_proxy.json().await.unwrap();
    println!("   Forwarded Response Body: {}", body_proxy);
    assert_eq!(body_proxy["source"], "upstream_backend");
    assert_eq!(body_proxy["name"], "Real Backend User");

    // Test D: Verify SQLite Traffic Logs
    println!("\n👉 [Step D] Verifying SQLite Traffic Logs Perekaman...");
    let logs = db.get_traffic_logs(10).unwrap();
    for log in &logs {
        println!("   [LOG] {} {} -> Status {} (Mocked: {}, Latency: {}ms)", log.method_or_rpc, log.path_or_service, log.status_code, log.is_mocked, log.duration_ms);
    }
    assert_eq!(logs.len(), 3);
    assert!(logs.iter().any(|l| l.path_or_service.contains("/api/v1/mocked-user") && l.is_mocked));
    assert!(logs.iter().any(|l| l.path_or_service.contains("/api/v1/orders") && l.is_mocked));
    assert!(logs.iter().any(|l| l.path_or_service.contains("/api/v1/backend-user") && !l.is_mocked));

    // Test E: Convert traffic log to mock rule
    println!("\n👉 [Step E] Converting Forwarded Log to New Mock Rule (Record to Mock)...");
    let forwarded_log = logs.iter().find(|l| l.path_or_service.contains("/api/v1/backend-user")).unwrap();
    let new_rule = db::RestMockRule {
        id: format!("rule-from-log-{}", forwarded_log.id),
        name: "Mocked from log".to_string(),
        method: forwarded_log.method_or_rpc.clone(),
        path: forwarded_log.path_or_service.clone(),
        status_code: forwarded_log.status_code,
        delay_ms: 0,
        response_headers: forwarded_log.response_headers.clone().unwrap_or_default(),
        response_body: forwarded_log.response_body.clone().unwrap_or_default(),
        enabled: true,
        created_at: 2000,
    };
    db.save_rest_rule(&new_rule).unwrap();
    println!("   ✓ Converted and saved new mock rule. Total rules now: {}", db.get_rest_rules().unwrap().len());
    assert_eq!(db.get_rest_rules().unwrap().len(), 6);

    // Shutdown mock server
    let _ = mock_server.shutdown_tx.send(());
    let _ = std::fs::remove_file(&temp_db);
    println!("✅ [E2E SIMULATION 1] Finished Successfully.\n");
}

#[tokio::test]
async fn test_simulate_grpc_mock_full_flow() {
    println!("\n==================================================================");
    println!("🚀 [E2E SIMULATION 2] gRPC Mocking with Protobuf & Trailers Flow");
    println!("==================================================================");

    let temp_db = std::env::temp_dir().join(format!("grpc_sim_{}.db", uuid::Uuid::new_v4()));
    let db = DbManager::new(temp_db.clone()).unwrap();

    let proto_content = r#"syntax = "proto3";
package bank;

service BankAccountService {
  rpc GetInquiry (InquiryRequest) returns (InquiryResponse);
  rpc Transfer (TransferRequest) returns (TransferResponse);
}

message InquiryRequest {
  string account_no = 1;
}

message InquiryResponse {
  string account_no = 1;
  string account_holder = 2;
  double balance = 3;
}

message TransferRequest {
  string from_acc = 1;
  string to_acc = 2;
  double amount = 3;
}

message TransferResponse {
  string ref_number = 1;
  bool success = 2;
}
"#;

    // 1. Save proto file
    let proto_file = db::GrpcProtoFile {
        id: "proto-bank".to_string(),
        filename: "bank/service.proto".to_string(),
        content: proto_content.to_string(),
        created_at: 1000,
    };
    db.save_proto_file(&proto_file).unwrap();
    println!("📜 1. Protobuf schema saved: bank/service.proto");

    // 2. Save custom gRPC mock rule for GetInquiry
    let grpc_mock = db::GrpcMockRule {
        id: "grpc-rule-inquiry".to_string(),
        service_name: "bank.BankAccountService".to_string(),
        method_name: "GetInquiry".to_string(),
        status_code: 0,
        grpc_message: "OK".to_string(),
        delay_ms: 10,
        response_metadata: r#"{"x-trace-id":"trc_bank_9999"}"#.to_string(),
        response_trailers: r#"{"x-rate-limit-remaining":"250"}"#.to_string(),
        response_json: r#"{"account_no":"1234567890","account_holder":"Budi Hidayat","balance":75000000.0}"#.to_string(),
        created_at: 1000,
    };
    db.save_grpc_rule(&grpc_mock).unwrap();
    println!("⚙️ 2. Custom gRPC Mock Rule configured for: bank.BankAccountService/GetInquiry");

    // 3. Start gRPC Mock server on ephemeral port
    let grpc_server = mock_server::grpc::start_server(0, db.clone(), None).unwrap();
    println!("⚡ 3. Palugada gRPC Mock Server running on port: {}", grpc_server.port);
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    let client = reqwest::Client::builder()
        .http2_prior_knowledge()
        .build()
        .unwrap();

    // 4. Test A: Send gRPC request to mocked RPC (bank.BankAccountService/GetInquiry)
    println!("\n👉 [Step A] Client sending HTTP/2 gRPC Frame to: /bank.BankAccountService/GetInquiry");
    let mut proto_req = vec![0x0a, 0x0a];
    proto_req.extend_from_slice(b"1234567890");

    let mut grpc_frame = vec![0u8, 0, 0, 0, proto_req.len() as u8];
    grpc_frame.extend(proto_req);

    let grpc_url = format!("http://127.0.0.1:{}/bank.BankAccountService/GetInquiry", grpc_server.port);
    let resp = client
        .post(&grpc_url)
        .header("content-type", "application/grpc")
        .header("te", "trailers")
        .body(grpc_frame)
        .send()
        .await
        .unwrap();

    println!("   HTTP Status: {}", resp.status());
    assert_eq!(resp.status(), 200);
    let resp_headers = resp.headers().clone();
    println!("   Response Content-Type: {:?}", resp_headers.get("content-type"));
    println!("   Response Metadata [x-trace-id]: {:?}", resp_headers.get("x-trace-id"));
    println!("   Response Trailers [x-rate-limit-remaining]: {:?}", resp_headers.get("x-rate-limit-remaining"));
    println!("   gRPC Status: {:?}", resp_headers.get("grpc-status"));

    assert!(resp_headers.get("content-type").unwrap().to_str().unwrap().contains("application/grpc"));
    assert_eq!(resp_headers.get("x-trace-id").unwrap(), "trc_bank_9999");
    assert_eq!(resp_headers.get("x-rate-limit-remaining").unwrap(), "250");
    assert_eq!(resp_headers.get("grpc-status").unwrap(), "0");

    let resp_bytes = resp.bytes().await.unwrap();
    println!("   Payload Frame Received: {} bytes", resp_bytes.len());
    assert!(resp_bytes.len() >= 5);

    // 5. Test B: Send gRPC request to unmocked RPC (bank.BankAccountService/Transfer)
    println!("\n👉 [Step B] Client sending gRPC request to Unmocked RPC: /bank.BankAccountService/Transfer");
    let unmocked_url = format!("http://127.0.0.1:{}/bank.BankAccountService/Transfer", grpc_server.port);
    let resp_unmocked = client
        .post(&unmocked_url)
        .header("content-type", "application/grpc")
        .header("te", "trailers")
        .body(vec![0u8, 0, 0, 0, 0])
        .send()
        .await
        .unwrap();

    println!("   gRPC Status Code: {:?}", resp_unmocked.headers().get("grpc-status"));
    assert_eq!(resp_unmocked.status(), 200);
    assert_eq!(resp_unmocked.headers().get("grpc-status").unwrap(), "12");

    // 6. Test C: Check SQLite Traffic Logs recorded both gRPC calls
    println!("\n👉 [Step C] Verifying SQLite gRPC Traffic Logs...");
    let logs = db.get_traffic_logs(10).unwrap();
    for log in &logs {
        println!("   [gRPC LOG] {} -> Status {} (Mocked: {})", log.method_or_rpc, log.status_code, log.is_mocked);
    }
    assert_eq!(logs.len(), 2);
    assert!(logs.iter().any(|l| l.server_type == "GRPC" && l.method_or_rpc.contains("GetInquiry") && l.is_mocked));
    assert!(logs.iter().any(|l| l.server_type == "GRPC" && l.method_or_rpc.contains("Transfer")));

    // Shutdown
    let _ = grpc_server.shutdown_tx.send(());
    let _ = std::fs::remove_file(&temp_db);
    println!("✅ [E2E SIMULATION 2] Finished Successfully.\n");
}

#[tokio::test]
async fn test_live_public_api_mock_and_proxy_forwarding() {
    println!("\n==================================================================");
    println!("🚀 [E2E SIMULATION 3] Live Public Internet API Proxy & Mock Flow");
    println!("   Target Public API: https://jsonplaceholder.typicode.com");
    println!("==================================================================");

    let temp_db = std::env::temp_dir().join(format!("public_api_test_{}.db", uuid::Uuid::new_v4()));
    let db = DbManager::new(temp_db.clone()).unwrap();

    // 1. Create a Mock Rule for /todos/1
    let mock_todo = db::RestMockRule {
        id: "mock-todo-1".to_string(),
        name: "Mocked Todo #1".to_string(),
        method: "GET".to_string(),
        path: "/todos/1".to_string(),
        status_code: 200,
        delay_ms: 10,
        response_headers: r#"{"X-Mocked-By":"Palugada","Content-Type":"application/json"}"#.to_string(),
        response_body: r#"{"userId":1,"id":1,"title":"MOCKED: Learn gRPC & REST in Palugada","completed":true}"#.to_string(),
        enabled: true,
        created_at: 1000,
    };
    db.save_rest_rule(&mock_todo).unwrap();
    println!("⚙️ 1. Mock Rule Created: GET /todos/1 -> Local Mock Payload");

    // 2. Set Proxy Origin to real public API: https://jsonplaceholder.typicode.com
    db.save_config(&db::MockConfig {
        server_type: "REST".to_string(),
        port: 0,
        is_forwarder_enabled: true,
        origin_url: Some("https://jsonplaceholder.typicode.com".to_string()),
        record_traffic: true,
    })
    .unwrap();
    println!("🌐 2. Proxy Forwarder Enabled -> Origin: https://jsonplaceholder.typicode.com");

    // 3. Start Mock & Proxy server
    let server = mock_server::rest::start_server(0, db.clone(), None).unwrap();
    println!("⚡ 3. Palugada Mock & Proxy Server running on port: {}", server.port);
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    let client = reqwest::Client::new();
    let base_url = format!("http://127.0.0.1:{}", server.port);

    // Test 1: GET /todos/1 -> MUST return local Mock response
    println!("\n👉 [Step 1] Requesting MOCKED endpoint: GET /todos/1");
    let resp_mock = client
        .get(format!("{}/todos/1", base_url))
        .send()
        .await
        .unwrap();
    println!("   Status Code: {}", resp_mock.status());
    println!("   X-Mocked-By Header: {:?}", resp_mock.headers().get("x-mocked-by"));
    assert_eq!(resp_mock.status(), 200);
    assert_eq!(resp_mock.headers().get("x-mocked-by").unwrap(), "Palugada");
    let body_mock: serde_json::Value = resp_mock.json().await.unwrap();
    println!("   Local Mock Body: {}", body_mock);
    assert_eq!(body_mock["title"], "MOCKED: Learn gRPC & REST in Palugada");
    assert_eq!(body_mock["completed"], true);

    // Test 2: GET /posts/1 -> NOT mocked locally -> MUST transparently forward to real public internet API https://jsonplaceholder.typicode.com/posts/1
    println!("\n👉 [Step 2] Requesting UNMOCKED endpoint (Forward to Public API): GET /posts/1");
    let resp_real = client
        .get(format!("{}/posts/1", base_url))
        .send()
        .await
        .unwrap();
    println!("   Status Code: {}", resp_real.status());
    assert_eq!(resp_real.status(), 200);
    assert!(resp_real.headers().get("x-mocked-by").is_none());
    let body_real: serde_json::Value = resp_real.json().await.unwrap();
    println!("   Public Internet Response Body: {}", body_real);
    assert_eq!(body_real["id"], 1);
    assert!(body_real["title"].as_str().unwrap().len() > 0);
    assert!(body_real["body"].as_str().unwrap().len() > 0);

    // Test 3: Check SQLite Traffic Logs
    println!("\n👉 [Step 3] Checking Traffic Logs Recorded in SQLite...");
    let logs = db.get_traffic_logs(10).unwrap();
    for log in &logs {
        println!("   [LOG] {} {} -> Status {} (Mocked: {}, Latency: {}ms)", log.method_or_rpc, log.path_or_service, log.status_code, log.is_mocked, log.duration_ms);
    }
    assert_eq!(logs.len(), 2);
    let mocked_log = logs.iter().find(|l| l.path_or_service == "/todos/1").unwrap();
    let forwarded_log = logs.iter().find(|l| l.path_or_service == "/posts/1").unwrap();

    assert!(mocked_log.is_mocked);
    assert_eq!(mocked_log.status_code, 200);

    assert!(!forwarded_log.is_mocked);
    assert_eq!(forwarded_log.status_code, 200);
    assert!(forwarded_log.response_body.as_ref().unwrap().contains("sunt aut facere"));

    // Shutdown
    let _ = server.shutdown_tx.send(());
    let _ = std::fs::remove_file(&temp_db);
    println!("✅ [E2E SIMULATION 3] Finished Successfully.\n");
}
