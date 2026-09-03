// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod mock_server;

#[cfg(test)]
mod tests;

use db::DbManager;
use mock_server::MockServerAppState;
use std::path::PathBuf;
use tauri::Manager;

fn main() {
    let db_path = if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
            .join(".palugada")
            .join("palugada_mock.db")
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        PathBuf::from(userprofile)
            .join(".palugada")
            .join("palugada_mock.db")
    } else {
        PathBuf::from("palugada_mock.db")
    };

    let db = DbManager::new(db_path).expect("Failed to initialize SQLite database");
    let mock_app_state = MockServerAppState::new(db);

    tauri::Builder::default()
        .manage(mock_app_state)
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Converters & Code Generators
            commands::minify_json,
            commands::format_json,
            commands::json_to_string,
            commands::string_to_json,
            commands::json_to_proto,
            commands::proto_to_json,
            commands::json_to_class,
            // Image Processing
            commands::remove_background,
            // Network & SSL Diagnostics
            commands::openssl_cert_detail,
            commands::openssl_cert_detail_from_url,
            commands::run_traceroute,
            // Mock & Proxy Engine Commands
            mock_server::get_mock_config,
            mock_server::save_mock_config,
            mock_server::get_rest_rules,
            mock_server::save_rest_rule,
            mock_server::delete_rest_rule,
            mock_server::toggle_rest_rule,
            mock_server::start_rest_mock,
            mock_server::stop_rest_mock,
            mock_server::get_grpc_rules,
            mock_server::save_grpc_rule,
            mock_server::delete_grpc_rule,
            mock_server::get_proto_files,
            mock_server::save_proto_file,
            mock_server::save_proto_files_batch,
            mock_server::delete_proto_file,
            mock_server::delete_all_proto_files,
            mock_server::parse_proto_schema,
            mock_server::start_grpc_mock,
            mock_server::stop_grpc_mock,
            mock_server::get_traffic_logs,
            mock_server::clear_traffic_logs,
            mock_server::get_mock_servers_status,
            mock_server::convert_log_to_mock_rule,
            mock_server::get_db_version_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
