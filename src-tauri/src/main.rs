// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;

/// Minify JSON by removing all unnecessary whitespace
#[tauri::command]
fn minify_json(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    serde_json::to_string(&parsed)
        .map_err(|e| format!("Failed to minify: {}", e))
}

/// Format JSON with pretty printing (indented)
#[tauri::command]
fn format_json(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    serde_json::to_string_pretty(&parsed)
        .map_err(|e| format!("Failed to format: {}", e))
}

/// Convert JSON to an escaped string (as a JSON string literal)
#[tauri::command]
fn json_to_string(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    // Validate that input is valid JSON first
    let _: Value = serde_json::from_str(&input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Convert the JSON to an escaped string
    let escaped = serde_json::to_string(&input)
        .map_err(|e| format!("Failed to convert: {}", e))?;

    Ok(escaped)
}

/// Convert an escaped string back to JSON (parse JSON string literal)
#[tauri::command]
fn string_to_json(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    // Try to parse as a JSON string literal first
    if input.starts_with('"') && input.ends_with('"') {
        let unescaped: String = serde_json::from_str(&input)
            .map_err(|e| format!("Invalid JSON string literal: {}", e))?;

        // Validate that the unescaped content is valid JSON
        let parsed: Value = serde_json::from_str(&unescaped)
            .map_err(|e| format!("Unescaped content is not valid JSON: {}", e))?;

        // Return it formatted
        return serde_json::to_string_pretty(&parsed)
            .map_err(|e| format!("Failed to format: {}", e));
    }

    // If not a JSON string literal, return error with helpful message
    Err("Input must be a JSON string literal (enclosed in double quotes with escaped content)".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            minify_json,
            format_json,
            json_to_string,
            string_to_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minify_json() {
        let input = r#"{
  "name": "John",
  "age": 30
}"#.to_string();
        let result = minify_json(input).unwrap();
        assert!(result.contains("\"name\":\"John\""));
        assert!(result.contains("\"age\":30"));
        assert!(!result.contains("\n"));
    }

    #[test]
    fn test_format_json() {
        let input = r#"{"name":"John","age":30}"#.to_string();
        let result = format_json(input).unwrap();
        assert!(result.contains("  \"name\""));
        assert!(result.contains("  \"age\""));
    }

    #[test]
    fn test_json_to_string() {
        let input = r#"{"name":"John"}"#.to_string();
        let result = json_to_string(input).unwrap();
        assert_eq!(result, r#""{\"name\":\"John\"}""#);
    }

    #[test]
    fn test_string_to_json() {
        let input = r#""{\"name\":\"John\"}""#.to_string();
        let result = string_to_json(input).unwrap();
        assert!(result.contains("\"name\""));
        assert!(result.contains("\"John\""));
    }

    #[test]
    fn test_invalid_json() {
        let input = "not valid json".to_string();
        assert!(minify_json(input.clone()).is_err());
        assert!(format_json(input).is_err());
    }

    #[test]
    fn test_empty_input() {
        assert!(minify_json("".to_string()).is_err());
        assert!(format_json("".to_string()).is_err());
    }
}

