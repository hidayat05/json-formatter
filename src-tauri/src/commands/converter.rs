use json_formatter::{
    format_json_impl, json_to_class_impl, json_to_proto_impl, json_to_string_impl,
    minify_json_impl, proto_to_json_impl, string_to_json_impl,
};

/// Minify JSON by removing all unnecessary whitespace
#[tauri::command]
pub fn minify_json(input: String) -> Result<String, String> {
    minify_json_impl(input)
}

/// Format JSON with pretty printing (indented)
#[tauri::command]
pub fn format_json(input: String) -> Result<String, String> {
    format_json_impl(input)
}

/// Convert JSON to an escaped string (as a JSON string literal)
#[tauri::command]
pub fn json_to_string(input: String) -> Result<String, String> {
    json_to_string_impl(input)
}

/// Convert an escaped string back to JSON (parse JSON string literal)
#[tauri::command]
pub fn string_to_json(input: String) -> Result<String, String> {
    string_to_json_impl(input)
}

/// Convert JSON to Protocol Buffers (proto3) schema
#[tauri::command]
pub fn json_to_proto(input: String) -> Result<String, String> {
    json_to_proto_impl(input)
}

/// Convert Protocol Buffers (proto3) schema to JSON sample
#[tauri::command]
pub fn proto_to_json(input: String) -> Result<String, String> {
    proto_to_json_impl(input)
}

/// Convert JSON to class definition in various programming languages
#[tauri::command]
pub fn json_to_class(input: String, language: String, name: String) -> Result<String, String> {
    json_to_class_impl(input, language, name)
}
