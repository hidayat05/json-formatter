use crate::db::{self, DbManager};

#[test]
fn test_db_manager_crud() {
    let temp_db = std::env::temp_dir().join(format!("test_{}.db", uuid::Uuid::new_v4()));
    let db = DbManager::new(temp_db.clone()).unwrap();

    // 1. Config test
    let config = db.get_config("REST").unwrap();
    assert_eq!(config.port, 8080);

    // 2. REST Rule CRUD
    let rules = db.get_rest_rules().unwrap();
    assert!(!rules.is_empty());

    let new_rule = db::RestMockRule {
        id: "test-rule-1".to_string(),
        name: "Test Endpoint".to_string(),
        enabled: true,
        method: "GET".to_string(),
        path: "/api/test".to_string(),
        status_code: 201,
        delay_ms: 50,
        response_headers: "{}".to_string(),
        response_body: r#"{"ok": true}"#.to_string(),
        created_at: 1234567,
    };
    db.save_rest_rule(&new_rule).unwrap();

    let updated_rules = db.get_rest_rules().unwrap();
    assert!(updated_rules.iter().any(|r| r.id == "test-rule-1"));

    db.toggle_rest_rule("test-rule-1", false).unwrap();
    let toggled = db
        .get_rest_rules()
        .unwrap()
        .into_iter()
        .find(|r| r.id == "test-rule-1")
        .unwrap();
    assert!(!toggled.enabled);

    db.delete_rest_rule("test-rule-1").unwrap();
    let after_del = db.get_rest_rules().unwrap();
    assert!(!after_del.iter().any(|r| r.id == "test-rule-1"));

    // 3. Traffic log test
    let log_entry = db::TrafficLogEntry {
        id: "log-1".to_string(),
        timestamp: 1000,
        server_type: "REST".to_string(),
        method_or_rpc: "GET".to_string(),
        path_or_service: "/api/test".to_string(),
        status_code: 200,
        is_mocked: true,
        duration_ms: 12,
        request_headers: None,
        request_body: None,
        response_headers: None,
        response_body: Some("ok".to_string()),
    };
    db.add_traffic_log(&log_entry).unwrap();
    let logs = db.get_traffic_logs(10).unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].path_or_service, "/api/test");

    db.clear_traffic_logs().unwrap();
    assert_eq!(db.get_traffic_logs(10).unwrap().len(), 0);

    // Delete sample proto files and test re-seeding
    db.delete_proto_file("proto-sample-user").unwrap();
    db.delete_proto_file("proto-1").unwrap();
    let reopened_db = db::DbManager::new(temp_db.clone()).unwrap();
    assert!(reopened_db.get_proto_files().unwrap().len() >= 1);

    let _ = std::fs::remove_file(temp_db);
}

#[test]
fn test_sqlite_migration_versioning() {
    let temp_db = std::env::temp_dir().join(format!("migration_test_{}.db", uuid::Uuid::new_v4()));
    let db = DbManager::new(temp_db.clone()).unwrap();

    // Check current migration version
    let version = db.get_current_db_version().unwrap();
    assert!(version >= 2);

    // Check applied migration history records
    let migrations = db.get_applied_migrations().unwrap();
    assert_eq!(migrations.len(), 2);
    assert_eq!(migrations[0].version, 1);
    assert_eq!(migrations[0].name, "20260901_001_initial_schema");
    assert_eq!(migrations[1].version, 2);
    assert_eq!(
        migrations[1].name,
        "20260901_002_grpc_metadata_and_performance_indexes"
    );

    // Re-running migrations should be idempotent (0 new migrations)
    let newly_applied = db.run_migrations().unwrap();
    assert_eq!(newly_applied, 0);

    let _ = std::fs::remove_file(&temp_db);
}
