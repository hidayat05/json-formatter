use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockConfig {
    pub server_type: String, // "REST" or "GRPC"
    pub port: u16,
    pub is_forwarder_enabled: bool,
    pub origin_url: Option<String>,
    pub record_traffic: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestMockRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub method: String, // "GET", "POST", "PUT", "DELETE", "PATCH", "*"
    pub path: String,   // e.g. "/api/v1/users" or "/api/v1/users/:id"
    pub status_code: u16,
    pub delay_ms: u64,
    pub response_headers: String, // JSON map e.g. {"Content-Type": "application/json"}
    pub response_body: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcMockRule {
    pub id: String,
    pub service_name: String, // e.g. "user.UserService"
    pub method_name: String,  // e.g. "GetUser"
    pub status_code: u32,     // 0 = OK, etc.
    #[serde(default)]
    pub grpc_message: String,
    pub delay_ms: u64,
    #[serde(default = "default_json_object")]
    pub response_metadata: String,
    #[serde(default = "default_json_object")]
    pub response_trailers: String,
    pub response_json: String,
    pub created_at: i64,
}

fn default_json_object() -> String {
    "{}".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcProtoFile {
    pub id: String,
    pub filename: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficLogEntry {
    pub id: String,
    pub timestamp: i64,
    pub server_type: String, // "REST" or "GRPC"
    pub method_or_rpc: String,
    pub path_or_service: String,
    pub status_code: u16,
    pub is_mocked: bool, // true = served from mock rule, false = forwarded to origin
    pub duration_ms: u64,
    pub request_headers: Option<String>,
    pub request_body: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaMigrationRecord {
    pub version: i32,
    pub name: String,
    pub applied_at: i64,
}

pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub sql: &'static str,
}

/// Ordered list of all SQLite database migrations.
/// Whenever adding new features or tables in the future, append a new Migration struct here!
pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            name: "20260901_001_initial_schema",
            sql: "
                CREATE TABLE IF NOT EXISTS mock_configs (
                    server_type TEXT PRIMARY KEY,
                    port INTEGER NOT NULL,
                    is_forwarder_enabled INTEGER NOT NULL DEFAULT 0,
                    origin_url TEXT,
                    record_traffic INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS rest_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status_code INTEGER NOT NULL DEFAULT 200,
                    delay_ms INTEGER NOT NULL DEFAULT 0,
                    response_headers TEXT NOT NULL DEFAULT '{}',
                    response_body TEXT NOT NULL DEFAULT '',
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS grpc_rules (
                    id TEXT PRIMARY KEY,
                    service_name TEXT NOT NULL,
                    method_name TEXT NOT NULL,
                    status_code INTEGER NOT NULL DEFAULT 0,
                    grpc_message TEXT NOT NULL DEFAULT '',
                    delay_ms INTEGER NOT NULL DEFAULT 0,
                    response_metadata TEXT NOT NULL DEFAULT '{}',
                    response_trailers TEXT NOT NULL DEFAULT '{}',
                    response_json TEXT NOT NULL DEFAULT '{}',
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS grpc_proto_files (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS traffic_logs (
                    id TEXT PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    server_type TEXT NOT NULL,
                    method_or_rpc TEXT NOT NULL,
                    path_or_service TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    is_mocked INTEGER NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    request_headers TEXT,
                    request_body TEXT,
                    response_headers TEXT,
                    response_body TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic_logs(timestamp DESC);
            ",
        },
        Migration {
            version: 2,
            name: "20260901_002_grpc_metadata_and_performance_indexes",
            sql: "
                CREATE INDEX IF NOT EXISTS idx_grpc_proto_filename ON grpc_proto_files(filename);
                CREATE INDEX IF NOT EXISTS idx_rest_rules_path ON rest_rules(path);
                CREATE INDEX IF NOT EXISTS idx_grpc_rules_service ON grpc_rules(service_name, method_name);
            ",
        },
    ]
}

#[derive(Clone)]
pub struct DbManager {
    conn: Arc<Mutex<Connection>>,
}

impl DbManager {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)?;
        let manager = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.run_migrations()?;
        manager.seed_defaults()?;
        Ok(manager)
    }

    /// Executes any unapplied database migrations sequentially within transactions.
    pub fn run_migrations(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();

        // 1. Create migration ledger table if it doesn't exist
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS _schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at INTEGER NOT NULL
            );",
        )?;

        // 2. Fetch applied migration versions
        let mut stmt = conn.prepare("SELECT version FROM _schema_migrations")?;
        let applied_versions: std::collections::HashSet<i32> = stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|res| res.ok())
            .collect();

        // 3. Backward-compatibility: ensure columns exist for legacy databases
        let _ = conn.execute(
            "ALTER TABLE grpc_rules ADD COLUMN grpc_message TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE grpc_rules ADD COLUMN response_metadata TEXT NOT NULL DEFAULT '{}'",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE grpc_rules ADD COLUMN response_trailers TEXT NOT NULL DEFAULT '{}'",
            [],
        );

        let mut applied_count = 0;
        let migrations = get_migrations();

        for m in migrations {
            if !applied_versions.contains(&m.version) {
                log::info!("Applying SQLite migration v{}: {}", m.version, m.name);
                conn.execute_batch(m.sql)?;

                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;

                conn.execute(
                    "INSERT INTO _schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
                    params![m.version, m.name, now],
                )?;

                let _ = conn.execute(&format!("PRAGMA user_version = {}", m.version), []);
                applied_count += 1;
                log::info!("✓ Migration v{} applied successfully", m.version);
            }
        }

        Ok(applied_count)
    }

    #[allow(dead_code)]
    pub fn get_current_db_version(&self) -> Result<i32> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT COALESCE(MAX(version), 0) FROM _schema_migrations")?;
        let version: i32 = stmt.query_row([], |row| row.get(0))?;
        Ok(version)
    }

    pub fn get_applied_migrations(&self) -> Result<Vec<SchemaMigrationRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT version, name, applied_at FROM _schema_migrations ORDER BY version ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(SchemaMigrationRecord {
                version: row.get(0)?,
                name: row.get(1)?,
                applied_at: row.get(2)?,
            })
        })?;

        let mut records = Vec::new();
        for r in rows {
            records.push(r?);
        }
        Ok(records)
    }

    fn seed_defaults(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Seed default config for REST if not exists
        conn.execute(
            "INSERT OR IGNORE INTO mock_configs (server_type, port, is_forwarder_enabled, origin_url, record_traffic)
             VALUES ('REST', 8080, 0, 'https://httpbin.org', 1)",
            [],
        )?;

        // Seed default config for GRPC if not exists
        conn.execute(
            "INSERT OR IGNORE INTO mock_configs (server_type, port, is_forwarder_enabled, origin_url, record_traffic)
             VALUES ('GRPC', 50051, 0, '', 1)",
            [],
        )?;

        // Check if rest_rules is empty, if so add sample rules
        let mut count_stmt = conn.prepare("SELECT COUNT(*) FROM rest_rules")?;
        let count: i64 = count_stmt.query_row([], |row| row.get(0))?;

        if count == 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            conn.execute(
                "INSERT OR IGNORE INTO rest_rules (id, name, enabled, method, path, status_code, delay_ms, response_headers, response_body, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "rule-sample-users",
                    "Get User Profile",
                    1,
                    "GET",
                    "/api/v1/user/profile",
                    200,
                    150,
                    r#"{"Content-Type": "application/json"}"#,
                    r#"{"id": "usr_9981", "name": "Budi Pratama", "email": "budi@example.com", "role": "Senior Engineer", "status": "active"}"#,
                    now
                ],
            )?;

            conn.execute(
                "INSERT OR IGNORE INTO rest_rules (id, name, enabled, method, path, status_code, delay_ms, response_headers, response_body, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "rule-sample-login",
                    "Auth Login Success",
                    1,
                    "POST",
                    "/api/v1/auth/login",
                    200,
                    250,
                    r#"{"Content-Type": "application/json"}"#,
                    r#"{"access_token": "mock_jwt_token_xyz123456", "token_type": "Bearer", "expires_in": 3600}"#,
                    now
                ],
            )?;

            conn.execute(
                "INSERT OR IGNORE INTO rest_rules (id, name, enabled, method, path, status_code, delay_ms, response_headers, response_body, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "rule-sample-items",
                    "Get Item By ID (Wildcard)",
                    1,
                    "GET",
                    "/api/v1/items/:id",
                    200,
                    50,
                    r#"{"Content-Type": "application/json"}"#,
                    r#"{"item_id": ":id", "item_name": "Premium Keyboard", "price": 1250000, "stock": 42}"#,
                    now
                ],
            )?;
        }

        // Check if proto file is empty, seed sample proto
        let mut proto_count_stmt = conn.prepare("SELECT COUNT(*) FROM grpc_proto_files")?;
        let proto_count: i64 = proto_count_stmt.query_row([], |row| row.get(0))?;

        if proto_count == 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let sample_proto = r#"syntax = "proto3";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc UpdateUser (UpdateUserRequest) returns (GetUserResponse);
}

message GetUserRequest {
  string user_id = 1;
}

message UpdateUserRequest {
  string user_id = 1;
  string name = 2;
  string email = 3;
}

message GetUserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
  string role = 4;
}
"#;

            conn.execute(
                "INSERT OR IGNORE INTO grpc_proto_files (id, filename, content, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params!["proto-sample-user", "user_service.proto", sample_proto, now],
            )?;

            conn.execute(
                "INSERT OR IGNORE INTO grpc_rules (id, service_name, method_name, status_code, grpc_message, delay_ms, response_metadata, response_trailers, response_json, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "grpc-rule-getuser",
                    "user.UserService",
                    "GetUser",
                    0,
                    "OK",
                    100,
                    r#"{"x-trace-id": "trc_sample_8821"}"#,
                    r#"{"x-rate-limit-remaining": "100"}"#,
                    r#"{"id": "usr_9981", "name": "Budi Pratama", "email": "budi@example.com", "role": "Senior Engineer"}"#,
                    now
                ],
            )?;
        }

        Ok(())
    }

    // --- Config CRUD ---
    pub fn get_config(&self, server_type: &str) -> Result<MockConfig> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT server_type, port, is_forwarder_enabled, origin_url, record_traffic
             FROM mock_configs WHERE server_type = ?1",
        )?;

        stmt.query_row(params![server_type], |row| {
            let forwarder_int: i32 = row.get(2)?;
            let record_int: i32 = row.get(4)?;
            Ok(MockConfig {
                server_type: row.get(0)?,
                port: row.get(1)?,
                is_forwarder_enabled: forwarder_int == 1,
                origin_url: row.get(3)?,
                record_traffic: record_int == 1,
            })
        })
    }

    pub fn save_config(&self, config: &MockConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO mock_configs (server_type, port, is_forwarder_enabled, origin_url, record_traffic)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(server_type) DO UPDATE SET
                port = excluded.port,
                is_forwarder_enabled = excluded.is_forwarder_enabled,
                origin_url = excluded.origin_url,
                record_traffic = excluded.record_traffic",
            params![
                config.server_type,
                config.port,
                if config.is_forwarder_enabled { 1 } else { 0 },
                config.origin_url,
                if config.record_traffic { 1 } else { 0 }
            ],
        )?;
        Ok(())
    }

    // --- REST Rules CRUD ---
    pub fn get_rest_rules(&self) -> Result<Vec<RestMockRule>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, enabled, method, path, status_code, delay_ms, response_headers, response_body, created_at
             FROM rest_rules ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let enabled_int: i32 = row.get(2)?;
            Ok(RestMockRule {
                id: row.get(0)?,
                name: row.get(1)?,
                enabled: enabled_int == 1,
                method: row.get(3)?,
                path: row.get(4)?,
                status_code: row.get(5)?,
                delay_ms: row.get(6)?,
                response_headers: row.get(7)?,
                response_body: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        let mut rules = Vec::new();
        for r in rows {
            rules.push(r?);
        }
        Ok(rules)
    }

    pub fn save_rest_rule(&self, rule: &RestMockRule) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO rest_rules (id, name, enabled, method, path, status_code, delay_ms, response_headers, response_body, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                enabled = excluded.enabled,
                method = excluded.method,
                path = excluded.path,
                status_code = excluded.status_code,
                delay_ms = excluded.delay_ms,
                response_headers = excluded.response_headers,
                response_body = excluded.response_body",
            params![
                rule.id,
                rule.name,
                if rule.enabled { 1 } else { 0 },
                rule.method,
                rule.path,
                rule.status_code,
                rule.delay_ms,
                rule.response_headers,
                rule.response_body,
                rule.created_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_rest_rule(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM rest_rules WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn toggle_rest_rule(&self, id: &str, enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE rest_rules SET enabled = ?1 WHERE id = ?2",
            params![if enabled { 1 } else { 0 }, id],
        )?;
        Ok(())
    }

    // --- gRPC Rules CRUD ---
    pub fn get_grpc_rules(&self) -> Result<Vec<GrpcMockRule>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, service_name, method_name, status_code, grpc_message, delay_ms, response_metadata, response_trailers, response_json, created_at
             FROM grpc_rules ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(GrpcMockRule {
                id: row.get(0)?,
                service_name: row.get(1)?,
                method_name: row.get(2)?,
                status_code: row.get(3)?,
                grpc_message: row.get(4).unwrap_or_default(),
                delay_ms: row.get(5)?,
                response_metadata: row.get(6).unwrap_or_else(|_| "{}".to_string()),
                response_trailers: row.get(7).unwrap_or_else(|_| "{}".to_string()),
                response_json: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        let mut rules = Vec::new();
        for r in rows {
            rules.push(r?);
        }
        Ok(rules)
    }

    pub fn save_grpc_rule(&self, rule: &GrpcMockRule) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO grpc_rules (id, service_name, method_name, status_code, grpc_message, delay_ms, response_metadata, response_trailers, response_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                service_name = excluded.service_name,
                method_name = excluded.method_name,
                status_code = excluded.status_code,
                grpc_message = excluded.grpc_message,
                delay_ms = excluded.delay_ms,
                response_metadata = excluded.response_metadata,
                response_trailers = excluded.response_trailers,
                response_json = excluded.response_json",
            params![
                rule.id,
                rule.service_name,
                rule.method_name,
                rule.status_code,
                rule.grpc_message,
                rule.delay_ms,
                rule.response_metadata,
                rule.response_trailers,
                rule.response_json,
                rule.created_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_grpc_rule(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM grpc_rules WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Proto Files CRUD ---
    pub fn get_proto_files(&self) -> Result<Vec<GrpcProtoFile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, filename, content, created_at
             FROM grpc_proto_files ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(GrpcProtoFile {
                id: row.get(0)?,
                filename: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?;

        let mut files = Vec::new();
        for f in rows {
            files.push(f?);
        }
        Ok(files)
    }

    pub fn save_proto_file(&self, proto: &GrpcProtoFile) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO grpc_proto_files (id, filename, content, created_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
                filename = excluded.filename,
                content = excluded.content",
            params![proto.id, proto.filename, proto.content, proto.created_at],
        )?;
        Ok(())
    }

    pub fn delete_proto_file(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM grpc_proto_files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_all_proto_files(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM grpc_proto_files", [])?;
        Ok(count)
    }

    // --- Traffic Logs CRUD ---
    pub fn add_traffic_log(&self, entry: &TrafficLogEntry) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO traffic_logs (id, timestamp, server_type, method_or_rpc, path_or_service, status_code, is_mocked, duration_ms, request_headers, request_body, response_headers, response_body)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                entry.id,
                entry.timestamp,
                entry.server_type,
                entry.method_or_rpc,
                entry.path_or_service,
                entry.status_code,
                if entry.is_mocked { 1 } else { 0 },
                entry.duration_ms,
                entry.request_headers,
                entry.request_body,
                entry.response_headers,
                entry.response_body
            ],
        )?;

        // Auto-cleanup: keep newest 500 records
        conn.execute(
            "DELETE FROM traffic_logs WHERE id NOT IN (
                SELECT id FROM traffic_logs ORDER BY timestamp DESC LIMIT 500
             )",
            [],
        )?;

        Ok(())
    }

    pub fn get_traffic_logs(&self, limit: u32) -> Result<Vec<TrafficLogEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, timestamp, server_type, method_or_rpc, path_or_service, status_code, is_mocked, duration_ms, request_headers, request_body, response_headers, response_body
             FROM traffic_logs ORDER BY timestamp DESC LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit], |row| {
            let is_mocked_int: i32 = row.get(6)?;
            Ok(TrafficLogEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                server_type: row.get(2)?,
                method_or_rpc: row.get(3)?,
                path_or_service: row.get(4)?,
                status_code: row.get(5)?,
                is_mocked: is_mocked_int == 1,
                duration_ms: row.get(7)?,
                request_headers: row.get(8)?,
                request_body: row.get(9)?,
                response_headers: row.get(10)?,
                response_body: row.get(11)?,
            })
        })?;

        let mut logs = Vec::new();
        for l in rows {
            logs.push(l?);
        }
        Ok(logs)
    }

    pub fn clear_traffic_logs(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM traffic_logs", [])?;
        Ok(())
    }
}
