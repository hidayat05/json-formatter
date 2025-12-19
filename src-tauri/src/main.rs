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

/// Convert JSON to Protocol Buffers (proto3) schema
#[tauri::command]
fn json_to_proto(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let mut proto = String::from("syntax = \"proto3\";\n\n");
    let mut message_counter = 0;

    match &parsed {
        Value::Object(_) => {
            generate_proto_message(&parsed, "Root", &mut proto, &mut message_counter, 0);
        }
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                if first.is_object() {
                    generate_proto_message(first, "Root", &mut proto, &mut message_counter, 0);
                } else {
                    return Err("Array must contain objects to generate proto schema".to_string());
                }
            } else {
                return Err("Cannot generate proto schema from empty array".to_string());
            }
        }
        _ => {
            return Err("Input must be a JSON object or array of objects".to_string());
        }
    }

    Ok(proto)
}

fn generate_proto_message(
    value: &Value,
    message_name: &str,
    output: &mut String,
    counter: &mut i32,
    indent: usize,
) {
    let indent_str = "  ".repeat(indent);

    if let Value::Object(map) = value {
        output.push_str(&format!("{}message {} {{\n", indent_str, message_name));

        let mut field_number = 1;
        let mut nested_messages = Vec::new();

        for (key, val) in map {
            let field_name = to_snake_case(key);
            let (field_type, nested_msg) = infer_proto_type(val, key, counter);

            output.push_str(&format!(
                "{}  {} {} = {};\n",
                indent_str, field_type, field_name, field_number
            ));

            if let Some(msg) = nested_msg {
                nested_messages.push((msg, val.clone()));
            }

            field_number += 1;
        }

        output.push_str(&format!("{}}}\n", indent_str));

        // Generate nested messages
        for (msg_name, msg_value) in nested_messages {
            output.push('\n');
            if msg_value.is_object() {
                generate_proto_message(&msg_value, &msg_name, output, counter, indent);
            } else if let Value::Array(arr) = msg_value {
                if let Some(first) = arr.first() {
                    if first.is_object() {
                        generate_proto_message(first, &msg_name, output, counter, indent);
                    }
                }
            }
        }
    }
}

fn infer_proto_type(value: &Value, field_name: &str, counter: &mut i32) -> (String, Option<String>) {
    match value {
        Value::Null => ("string".to_string(), None),
        Value::Bool(_) => ("bool".to_string(), None),
        Value::Number(n) => {
            if n.is_f64() {
                ("double".to_string(), None)
            } else if n.is_i64() {
                let num = n.as_i64().unwrap();
                if num >= i32::MIN as i64 && num <= i32::MAX as i64 {
                    ("int32".to_string(), None)
                } else {
                    ("int64".to_string(), None)
                }
            } else {
                ("uint64".to_string(), None)
            }
        }
        Value::String(_) => ("string".to_string(), None),
        Value::Array(arr) => {
            if arr.is_empty() {
                ("repeated string".to_string(), None)
            } else {
                let first = &arr[0];
                if first.is_object() {
                    *counter += 1;
                    let nested_name = to_pascal_case(field_name);
                    (format!("repeated {}", nested_name), Some(nested_name))
                } else {
                    let (inner_type, _) = infer_proto_type(first, field_name, counter);
                    let base_type = inner_type.replace("repeated ", "");
                    (format!("repeated {}", base_type), None)
                }
            }
        }
        Value::Object(_) => {
            *counter += 1;
            let nested_name = to_pascal_case(field_name);
            (nested_name.clone(), Some(nested_name))
        }
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let mut prev_is_upper = false;

    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 && !prev_is_upper {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
            prev_is_upper = true;
        } else {
            result.push(c);
            prev_is_upper = false;
        }
    }

    result
}

fn to_pascal_case(s: &str) -> String {
    let s = s.replace('_', " ");
    s.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            minify_json,
            format_json,
            json_to_string,
            string_to_json,
            json_to_proto
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

    #[test]
    fn test_json_to_proto() {
        let input = r#"{
  "name": "John",
  "age": 30,
  "isActive": true,
  "email": "john@example.com"
}"#.to_string();
        let result = json_to_proto(input).unwrap();
        assert!(result.contains("syntax = \"proto3\""));
        assert!(result.contains("message Root"));
        assert!(result.contains("string name"));
        assert!(result.contains("int32 age"));
        assert!(result.contains("bool is_active"));
        assert!(result.contains("string email"));
    }

    #[test]
    fn test_json_to_proto_nested() {
        let input = r#"{
  "user": {
    "name": "John",
    "id": 123
  },
  "count": 5
}"#.to_string();
        let result = json_to_proto(input).unwrap();
        assert!(result.contains("syntax = \"proto3\""));
        assert!(result.contains("message Root"));
        assert!(result.contains("User user"));
        assert!(result.contains("message User"));
        assert!(result.contains("string name"));
        assert!(result.contains("int32 id"));
    }

    #[test]
    fn test_json_to_proto_array() {
        let input = r#"{
  "tags": ["rust", "tauri", "json"]
}"#.to_string();
        let result = json_to_proto(input).unwrap();
        assert!(result.contains("repeated string tags"));
    }
}

