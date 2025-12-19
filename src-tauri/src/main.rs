// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{debug, error, info, warn};
use serde_json::Value;

/// Minify JSON by removing all unnecessary whitespace
#[tauri::command]
fn minify_json(input: String) -> Result<String, String> {
    info!("minify_json called - input_len: {}", input.len());

    if input.trim().is_empty() {
        warn!("minify_json: Input is empty");
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input).map_err(|e| {
        error!("minify_json: Invalid JSON - {}", e);
        format!("Invalid JSON: {}", e)
    })?;

    let result = serde_json::to_string(&parsed).map_err(|e| {
        error!("minify_json: Failed to minify - {}", e);
        format!("Failed to minify: {}", e)
    })?;

    info!("minify_json: Success - output_len: {}", result.len());
    Ok(result)
}

/// Format JSON with pretty printing (indented)
#[tauri::command]
fn format_json(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input).map_err(|e| format!("Invalid JSON: {}", e))?;

    serde_json::to_string_pretty(&parsed).map_err(|e| format!("Failed to format: {}", e))
}

/// Convert JSON to an escaped string (as a JSON string literal)
#[tauri::command]
fn json_to_string(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    // Validate that input is valid JSON first
    let _: Value = serde_json::from_str(&input).map_err(|e| format!("Invalid JSON: {}", e))?;

    // Convert the JSON to an escaped string
    let escaped = serde_json::to_string(&input).map_err(|e| format!("Failed to convert: {}", e))?;

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
    Err(
        "Input must be a JSON string literal (enclosed in double quotes with escaped content)"
            .to_string(),
    )
}

/// Convert JSON to Protocol Buffers (proto3) schema
#[tauri::command]
fn json_to_proto(input: String) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input).map_err(|e| format!("Invalid JSON: {}", e))?;

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

fn infer_proto_type(
    value: &Value,
    field_name: &str,
    counter: &mut i32,
) -> (String, Option<String>) {
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

fn to_camel_case(s: &str) -> String {
    let pascal = to_pascal_case(s);
    let mut chars = pascal.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

/// Convert JSON to class definition in various programming languages
#[tauri::command]
fn json_to_class(input: String, language: String, name: String) -> Result<String, String> {
    info!(
        "json_to_class called - language: {}, class_name: '{}', input_len: {}",
        language,
        name,
        input.len()
    );

    if input.trim().is_empty() {
        warn!("json_to_class: Input is empty");
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&input).map_err(|e| {
        error!("json_to_class: Failed to parse JSON - {}", e);
        format!("Invalid JSON: {}", e)
    })?;

    let final_class_name = if name.is_empty() {
        "Root".to_string()
    } else {
        name
    };

    info!(
        "json_to_class: Converting to {} with class name '{}'",
        language, final_class_name
    );

    let result = match language.to_lowercase().as_str() {
        "typescript" => generate_typescript_class(&parsed, &final_class_name),
        "javascript" => generate_javascript_class(&parsed, &final_class_name),
        "python" => generate_python_class(&parsed, &final_class_name),
        "rust" => generate_rust_struct(&parsed, &final_class_name),
        "java" => generate_java_class(&parsed, &final_class_name),
        "csharp" | "c#" => generate_csharp_class(&parsed, &final_class_name),
        "go" => generate_go_struct(&parsed, &final_class_name),
        "kotlin" => generate_kotlin_class(&parsed, &final_class_name),
        "swift" => generate_swift_struct(&parsed, &final_class_name),
        _ => {
            error!("json_to_class: Unsupported language: {}", language);
            Err(format!("Unsupported language: {}", language))
        }
    };

    match &result {
        Ok(output) => {
            info!(
                "json_to_class: Successfully generated {} code ({} chars)",
                language,
                output.len()
            );
            debug!("Generated code:\n{}", output);
        }
        Err(e) => {
            error!(
                "json_to_class: Failed to generate {} code - {}",
                language, e
            );
        }
    }

    result
}

fn generate_typescript_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = format!("interface {} {{\n", class_name);
        let mut nested_interfaces = Vec::new();

        for (key, val) in map {
            let ts_type = infer_typescript_type(val, key, &mut nested_interfaces);
            output.push_str(&format!("  {}: {};\n", key, ts_type));
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_interfaces {
            output.push('\n');
            output.push_str(&generate_typescript_class(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_typescript_type(
    value: &Value,
    field_name: &str,
    nested: &mut Vec<(String, Value)>,
) -> String {
    match value {
        Value::Null => "any".to_string(),
        Value::Bool(_) => "boolean".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "number".to_string()
            } else {
                "number".to_string()
            }
        }
        Value::String(_) => "string".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "any[]".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("{}[]", nested_name)
                } else {
                    format!("{}[]", infer_typescript_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_javascript_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = format!("class {} {{\n", class_name);
        output.push_str("  constructor(data) {\n");

        for (key, _) in map {
            output.push_str(&format!("    this.{} = data.{};\n", key, key));
        }

        output.push_str("  }\n");
        output.push_str("}\n");

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn generate_python_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from(
            "from dataclasses import dataclass\nfrom typing import List, Optional, Any\n\n",
        );
        let mut nested_classes = Vec::new();

        output.push_str("@dataclass\n");
        output.push_str(&format!("class {}:\n", class_name));

        for (key, val) in map {
            let py_type = infer_python_type(val, key, &mut nested_classes);
            output.push_str(&format!("    {}: {}\n", to_snake_case(key), py_type));
        }

        for (name, nested_val) in nested_classes {
            output.push('\n');
            output.push_str(&generate_python_class(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_python_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "Optional[Any]".to_string(),
        Value::Bool(_) => "bool".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "float".to_string()
            } else {
                "int".to_string()
            }
        }
        Value::String(_) => "str".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "List[Any]".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("List[{}]", nested_name)
                } else {
                    format!("List[{}]", infer_python_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_rust_struct(value: &Value, struct_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from("use serde::{Deserialize, Serialize};\n\n");
        let mut nested_structs = Vec::new();

        output.push_str("#[derive(Debug, Serialize, Deserialize)]\n");
        output.push_str(&format!("pub struct {} {{\n", struct_name));

        for (key, val) in map {
            let rust_type = infer_rust_type(val, key, &mut nested_structs);
            output.push_str(&format!("    pub {}: {},\n", to_snake_case(key), rust_type));
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_structs {
            output.push('\n');
            output.push_str(&generate_rust_struct(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_rust_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "Option<String>".to_string(),
        Value::Bool(_) => "bool".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "f64".to_string()
            } else {
                "i64".to_string()
            }
        }
        Value::String(_) => "String".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "Vec<serde_json::Value>".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("Vec<{}>", nested_name)
                } else {
                    format!("Vec<{}>", infer_rust_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_java_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from(
            "import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;\n\n",
        );
        let mut nested_classes = Vec::new();

        output.push_str(&format!("public class {} {{\n", class_name));

        for (key, val) in map {
            let java_type = infer_java_type(val, key, &mut nested_classes);
            output.push_str(&format!("    @JsonProperty(\"{}\")\n", key));
            output.push_str(&format!(
                "    private {} {};\n\n",
                java_type,
                to_camel_case(key)
            ));
        }

        // Generate getters and setters
        for (key, val) in map {
            let java_type = infer_java_type(val, key, &mut Vec::new());
            let field_name = to_camel_case(key);
            let getter_name = format!("get{}", to_pascal_case(key));
            let setter_name = format!("set{}", to_pascal_case(key));

            output.push_str(&format!("    public {} {}() {{\n", java_type, getter_name));
            output.push_str(&format!("        return {};\n", field_name));
            output.push_str("    }\n\n");

            output.push_str(&format!(
                "    public void {}({} {}) {{\n",
                setter_name, java_type, field_name
            ));
            output.push_str(&format!("        this.{} = {};\n", field_name, field_name));
            output.push_str("    }\n\n");
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_classes {
            output.push('\n');
            output.push_str(&generate_java_class(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_java_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "Object".to_string(),
        Value::Bool(_) => "Boolean".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "Double".to_string()
            } else {
                "Integer".to_string()
            }
        }
        Value::String(_) => "String".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "List<Object>".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("List<{}>", nested_name)
                } else {
                    format!("List<{}>", infer_java_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_csharp_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output =
            String::from("using System.Collections.Generic;\nusing Newtonsoft.Json;\n\n");
        let mut nested_classes = Vec::new();

        output.push_str(&format!("public class {}\n{{\n", class_name));

        for (key, val) in map {
            let cs_type = infer_csharp_type(val, key, &mut nested_classes);
            output.push_str(&format!("    [JsonProperty(\"{}\")]\n", key));
            output.push_str(&format!(
                "    public {} {} {{ get; set; }}\n\n",
                cs_type,
                to_pascal_case(key)
            ));
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_classes {
            output.push('\n');
            output.push_str(&generate_csharp_class(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_csharp_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "object".to_string(),
        Value::Bool(_) => "bool".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "double".to_string()
            } else {
                "int".to_string()
            }
        }
        Value::String(_) => "string".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "List<object>".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("List<{}>", nested_name)
                } else {
                    format!("List<{}>", infer_csharp_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_go_struct(value: &Value, struct_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from("package main\n\n");
        let mut nested_structs = Vec::new();

        output.push_str(&format!("type {} struct {{\n", struct_name));

        for (key, val) in map {
            let go_type = infer_go_type(val, key, &mut nested_structs);
            output.push_str(&format!(
                "    {} {} `json:\"{}\"`\n",
                to_pascal_case(key),
                go_type,
                key
            ));
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_structs {
            output.push('\n');
            output.push_str(&generate_go_struct(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_go_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "interface{}".to_string(),
        Value::Bool(_) => "bool".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "float64".to_string()
            } else {
                "int".to_string()
            }
        }
        Value::String(_) => "string".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "[]interface{}".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("[]{}", nested_name)
                } else {
                    format!("[]{}", infer_go_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_kotlin_class(value: &Value, class_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from("import com.google.gson.annotations.SerializedName\n\n");
        let mut nested_classes = Vec::new();

        output.push_str(&format!("data class {}(\n", class_name));

        let entries: Vec<_> = map.iter().collect();
        for (i, (key, val)) in entries.iter().enumerate() {
            let kt_type = infer_kotlin_type(val, key, &mut nested_classes);
            output.push_str(&format!("    @SerializedName(\"{}\")\n", key));
            output.push_str(&format!("    val {}: {}", to_camel_case(key), kt_type));
            if i < entries.len() - 1 {
                output.push(',');
            }
            output.push('\n');
        }

        output.push_str(")\n");

        for (name, nested_val) in nested_classes {
            output.push('\n');
            output.push_str(&generate_kotlin_class(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_kotlin_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "Any?".to_string(),
        Value::Bool(_) => "Boolean".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "Double".to_string()
            } else {
                "Int".to_string()
            }
        }
        Value::String(_) => "String".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "List<Any>".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("List<{}>", nested_name)
                } else {
                    format!("List<{}>", infer_kotlin_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn generate_swift_struct(value: &Value, struct_name: &str) -> Result<String, String> {
    if let Value::Object(map) = value {
        let mut output = String::from("import Foundation\n\n");
        let mut nested_structs = Vec::new();

        output.push_str(&format!("struct {}: Codable {{\n", struct_name));

        for (key, val) in map {
            let swift_type = infer_swift_type(val, key, &mut nested_structs);
            output.push_str(&format!("    let {}: {}\n", to_camel_case(key), swift_type));
        }

        output.push_str("}\n");

        for (name, nested_val) in nested_structs {
            output.push('\n');
            output.push_str(&generate_swift_struct(&nested_val, &name)?);
        }

        Ok(output)
    } else {
        Err("Input must be a JSON object".to_string())
    }
}

fn infer_swift_type(value: &Value, field_name: &str, nested: &mut Vec<(String, Value)>) -> String {
    match value {
        Value::Null => "Any?".to_string(),
        Value::Bool(_) => "Bool".to_string(),
        Value::Number(n) => {
            if n.is_f64() {
                "Double".to_string()
            } else {
                "Int".to_string()
            }
        }
        Value::String(_) => "String".to_string(),
        Value::Array(arr) => {
            if arr.is_empty() {
                "[Any]".to_string()
            } else {
                let first = &arr[0];
                if first.is_object() {
                    let nested_name = to_pascal_case(field_name);
                    nested.push((nested_name.clone(), first.clone()));
                    format!("[{}]", nested_name)
                } else {
                    format!("[{}]", infer_swift_type(first, field_name, nested))
                }
            }
        }
        Value::Object(_) => {
            let nested_name = to_pascal_case(field_name);
            nested.push((nested_name.clone(), value.clone()));
            nested_name
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            minify_json,
            format_json,
            json_to_string,
            string_to_json,
            json_to_proto,
            json_to_class
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
}"#
        .to_string();
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
}"#
        .to_string();
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
}"#
        .to_string();
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
}"#
        .to_string();
        let result = json_to_proto(input).unwrap();
        assert!(result.contains("repeated string tags"));
    }

    #[test]
    fn test_json_to_typescript_class() {
        let input = r#"{
  "name": "John",
  "age": 30,
  "isActive": true
}"#
        .to_string();
        let result = json_to_class(input, "typescript".to_string(), "User".to_string()).unwrap();
        assert!(result.contains("interface User"));
        assert!(result.contains("name: string;"));
        assert!(result.contains("age: number;"));
        assert!(result.contains("isActive: boolean;"));
    }

    #[test]
    fn test_json_to_python_class() {
        let input = r#"{
  "name": "John",
  "age": 30
}"#
        .to_string();
        let result = json_to_class(input, "python".to_string(), "User".to_string()).unwrap();
        assert!(result.contains("class User:"));
        assert!(result.contains("name: str"));
        assert!(result.contains("age: int"));
    }

    #[test]
    fn test_json_to_rust_struct() {
        let input = r#"{
  "name": "John",
  "age": 30
}"#
        .to_string();
        let result = json_to_class(input, "rust".to_string(), "User".to_string()).unwrap();
        assert!(result.contains("pub struct User"));
        assert!(result.contains("pub name: String"));
        assert!(result.contains("pub age: i64"));
    }

    #[test]
    fn test_json_to_java_class() {
        let input = r#"{
  "name": "John"
}"#
        .to_string();
        let result = json_to_class(input, "java".to_string(), "User".to_string()).unwrap();
        assert!(result.contains("public class User"));
        assert!(result.contains("private String name;"));
        assert!(result.contains("public String getName()"));
    }

    #[test]
    fn test_json_to_class_nested() {
        let input = r#"{
  "user": {
    "name": "John",
    "id": 123
  }
}"#
        .to_string();
        let result = json_to_class(input, "typescript".to_string(), "Root".to_string()).unwrap();
        assert!(result.contains("interface Root"));
        assert!(result.contains("interface User"));
        assert!(result.contains("name: string;"));
    }
}
