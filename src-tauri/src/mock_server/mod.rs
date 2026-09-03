pub mod grpc;
pub mod rest;

use crate::db::{
    DbManager, GrpcMockRule, GrpcProtoFile, MockConfig, RestMockRule, TrafficLogEntry,
};
use grpc::{ProtoParsedInfo, RunningGrpcServer};
use rest::RunningRestServer;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockServersStatus {
    pub is_rest_running: bool,
    pub rest_port: u16,
    pub is_grpc_running: bool,
    pub grpc_port: u16,
}

pub struct MockServerAppState {
    pub db: DbManager,
    pub running_rest: Arc<Mutex<Option<RunningRestServer>>>,
    pub running_grpc: Arc<Mutex<Option<RunningGrpcServer>>>,
}

impl MockServerAppState {
    pub fn new(db: DbManager) -> Self {
        Self {
            db,
            running_rest: Arc::new(Mutex::new(None)),
            running_grpc: Arc::new(Mutex::new(None)),
        }
    }
}

// -------------------------------------------------------------
// Tauri Commands
// -------------------------------------------------------------

#[tauri::command]
pub fn get_mock_config(
    state: State<'_, MockServerAppState>,
    server_type: String,
) -> Result<MockConfig, String> {
    state
        .db
        .get_config(&server_type)
        .map_err(|e| format!("Failed to get config: {}", e))
}

#[tauri::command]
pub fn save_mock_config(
    state: State<'_, MockServerAppState>,
    config: MockConfig,
) -> Result<(), String> {
    state
        .db
        .save_config(&config)
        .map_err(|e| format!("Failed to save config: {}", e))
}

#[tauri::command]
pub fn get_rest_rules(state: State<'_, MockServerAppState>) -> Result<Vec<RestMockRule>, String> {
    state
        .db
        .get_rest_rules()
        .map_err(|e| format!("Failed to get REST rules: {}", e))
}

#[tauri::command]
pub fn save_rest_rule(
    state: State<'_, MockServerAppState>,
    rule: RestMockRule,
) -> Result<(), String> {
    state
        .db
        .save_rest_rule(&rule)
        .map_err(|e| format!("Failed to save REST rule: {}", e))
}

#[tauri::command]
pub fn delete_rest_rule(state: State<'_, MockServerAppState>, id: String) -> Result<(), String> {
    state
        .db
        .delete_rest_rule(&id)
        .map_err(|e| format!("Failed to delete REST rule: {}", e))
}

#[tauri::command]
pub fn toggle_rest_rule(
    state: State<'_, MockServerAppState>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    state
        .db
        .toggle_rest_rule(&id, enabled)
        .map_err(|e| format!("Failed to toggle REST rule: {}", e))
}

#[tauri::command]
pub fn start_rest_mock(
    app: AppHandle,
    state: State<'_, MockServerAppState>,
    port: u16,
) -> Result<String, String> {
    let mut running = state.running_rest.lock().unwrap();
    if running.is_some() {
        return Ok(format!("REST server is already running on port {}", port));
    }

    let running_srv = rest::start_server(port, state.db.clone(), Some(app))?;
    *running = Some(running_srv);
    Ok(format!("REST server started on port {}", port))
}

#[tauri::command]
pub fn stop_rest_mock(state: State<'_, MockServerAppState>) -> Result<String, String> {
    let mut running = state.running_rest.lock().unwrap();
    if let Some(srv) = running.take() {
        let _ = srv.shutdown_tx.send(());
        Ok("REST server stopped".to_string())
    } else {
        Ok("REST server was not running".to_string())
    }
}

#[tauri::command]
pub fn get_grpc_rules(state: State<'_, MockServerAppState>) -> Result<Vec<GrpcMockRule>, String> {
    state
        .db
        .get_grpc_rules()
        .map_err(|e| format!("Failed to get gRPC rules: {}", e))
}

#[tauri::command]
pub fn save_grpc_rule(
    state: State<'_, MockServerAppState>,
    rule: GrpcMockRule,
) -> Result<(), String> {
    state
        .db
        .save_grpc_rule(&rule)
        .map_err(|e| format!("Failed to save gRPC rule: {}", e))
}

#[tauri::command]
pub fn delete_grpc_rule(state: State<'_, MockServerAppState>, id: String) -> Result<(), String> {
    state
        .db
        .delete_grpc_rule(&id)
        .map_err(|e| format!("Failed to delete gRPC rule: {}", e))
}

#[tauri::command]
pub fn get_proto_files(state: State<'_, MockServerAppState>) -> Result<Vec<GrpcProtoFile>, String> {
    state
        .db
        .get_proto_files()
        .map_err(|e| format!("Failed to get proto files: {}", e))
}

#[tauri::command]
pub fn save_proto_file(
    state: State<'_, MockServerAppState>,
    proto: GrpcProtoFile,
) -> Result<(), String> {
    state
        .db
        .save_proto_file(&proto)
        .map_err(|e| format!("Failed to save proto file: {}", e))
}

#[tauri::command]
pub fn save_proto_files_batch(
    state: State<'_, MockServerAppState>,
    files: Vec<GrpcProtoFile>,
) -> Result<usize, String> {
    let mut count = 0;
    for file in files {
        if state.db.save_proto_file(&file).is_ok() {
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
pub fn delete_proto_file(state: State<'_, MockServerAppState>, id: String) -> Result<(), String> {
    state
        .db
        .delete_proto_file(&id)
        .map_err(|e| format!("Failed to delete proto file: {}", e))
}

#[tauri::command]
pub fn delete_all_proto_files(state: State<'_, MockServerAppState>) -> Result<usize, String> {
    state
        .db
        .delete_all_proto_files()
        .map_err(|e| format!("Failed to clear all proto files: {}", e))
}

#[tauri::command]
pub fn parse_proto_schema(
    state: State<'_, MockServerAppState>,
    proto_content: String,
) -> Result<ProtoParsedInfo, String> {
    let extra_protos = state.db.get_proto_files().unwrap_or_default();
    grpc::parse_proto_content_with_includes(&proto_content, &extra_protos)
}

#[tauri::command]
pub fn start_grpc_mock(
    app: AppHandle,
    state: State<'_, MockServerAppState>,
    port: u16,
) -> Result<String, String> {
    let mut running = state.running_grpc.lock().unwrap();
    if running.is_some() {
        return Ok(format!("gRPC server is already running on port {}", port));
    }

    let running_srv = grpc::start_server(port, state.db.clone(), Some(app))?;
    *running = Some(running_srv);
    Ok(format!("gRPC server started on port {}", port))
}

#[tauri::command]
pub fn stop_grpc_mock(state: State<'_, MockServerAppState>) -> Result<String, String> {
    let mut running = state.running_grpc.lock().unwrap();
    if let Some(srv) = running.take() {
        let _ = srv.shutdown_tx.send(());
        Ok("gRPC server stopped".to_string())
    } else {
        Ok("gRPC server was not running".to_string())
    }
}

#[tauri::command]
pub fn get_traffic_logs(
    state: State<'_, MockServerAppState>,
    limit: Option<u32>,
) -> Result<Vec<TrafficLogEntry>, String> {
    state
        .db
        .get_traffic_logs(limit.unwrap_or(100))
        .map_err(|e| format!("Failed to get traffic logs: {}", e))
}

#[tauri::command]
pub fn clear_traffic_logs(state: State<'_, MockServerAppState>) -> Result<(), String> {
    state
        .db
        .clear_traffic_logs()
        .map_err(|e| format!("Failed to clear traffic logs: {}", e))
}

#[tauri::command]
pub fn get_mock_servers_status(
    state: State<'_, MockServerAppState>,
) -> Result<MockServersStatus, String> {
    let running_rest = state.running_rest.lock().unwrap();
    let running_grpc = state.running_grpc.lock().unwrap();

    let rest_config = state.db.get_config("REST").unwrap_or_else(|_| MockConfig {
        server_type: "REST".to_string(),
        port: 8080,
        is_forwarder_enabled: false,
        origin_url: None,
        record_traffic: true,
    });

    let grpc_config = state.db.get_config("GRPC").unwrap_or_else(|_| MockConfig {
        server_type: "GRPC".to_string(),
        port: 50051,
        is_forwarder_enabled: false,
        origin_url: None,
        record_traffic: true,
    });

    Ok(MockServersStatus {
        is_rest_running: running_rest.is_some(),
        rest_port: running_rest
            .as_ref()
            .map(|s| s.port)
            .unwrap_or(rest_config.port),
        is_grpc_running: running_grpc.is_some(),
        grpc_port: running_grpc
            .as_ref()
            .map(|s| s.port)
            .unwrap_or(grpc_config.port),
    })
}

#[tauri::command]
pub fn convert_log_to_mock_rule(
    state: State<'_, MockServerAppState>,
    log_id: String,
) -> Result<RestMockRule, String> {
    let logs = state
        .db
        .get_traffic_logs(500)
        .map_err(|e| format!("Failed to get traffic logs: {}", e))?;

    let log = logs
        .into_iter()
        .find(|l| l.id == log_id)
        .ok_or_else(|| format!("Log entry with ID {} not found", log_id))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let path = if let Some(idx) = log.path_or_service.find('?') {
        log.path_or_service[..idx].to_string()
    } else {
        log.path_or_service.clone()
    };

    let name = format!("{} {}", log.method_or_rpc, path);
    let rule = RestMockRule {
        id: format!(
            "rule-rec-{}",
            uuid::Uuid::new_v4().to_string()[..8].to_string()
        ),
        name,
        enabled: true,
        method: log.method_or_rpc,
        path,
        status_code: log.status_code,
        delay_ms: 0,
        response_headers: log
            .response_headers
            .unwrap_or_else(|| r#"{"Content-Type": "application/json"}"#.to_string()),
        response_body: log.response_body.unwrap_or_default(),
        created_at: now,
    };

    state
        .db
        .save_rest_rule(&rule)
        .map_err(|e| format!("Failed to save new rule: {}", e))?;

    Ok(rule)
}

#[tauri::command]
pub fn get_db_version_info(
    state: State<'_, MockServerAppState>,
) -> Result<Vec<crate::db::SchemaMigrationRecord>, String> {
    state
        .db
        .get_applied_migrations()
        .map_err(|e| format!("Failed to get database migration info: {}", e))
}
