// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{GenericImageView, ImageFormat, Rgba};
use log::{debug, error, info, warn};
use serde_json::Value;
use std::collections::VecDeque;
use std::io::Cursor;

/// Remove background using flood-fill algorithm from edges
#[tauri::command]
fn remove_background(image_data: String, tolerance: u32) -> Result<String, String> {
    info!("remove_background called with tolerance: {}", tolerance);

    // Decode base64 image
    let image_data_str = if image_data.contains(',') {
        image_data.split(',').nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    let image_bytes = BASE64
        .decode(image_data_str)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Load image
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (width, height) = img.dimensions();
    info!("Image size: {}x{}", width, height);

    let mut rgba_img = img.to_rgba8();
    let tolerance_sq = (tolerance as f64).powi(2) * 3.0; // Squared tolerance for RGB

    // Create a mask to track which pixels to make transparent
    let mut mask: Vec<Vec<bool>> = vec![vec![false; width as usize]; height as usize];

    // Get background color samples from all edges
    let mut bg_colors: Vec<(u8, u8, u8)> = Vec::new();

    // Sample top and bottom edges
    for x in 0..width {
        let top_pixel = rgba_img.get_pixel(x, 0);
        let bottom_pixel = rgba_img.get_pixel(x, height - 1);
        bg_colors.push((top_pixel[0], top_pixel[1], top_pixel[2]));
        bg_colors.push((bottom_pixel[0], bottom_pixel[1], bottom_pixel[2]));
    }

    // Sample left and right edges
    for y in 0..height {
        let left_pixel = rgba_img.get_pixel(0, y);
        let right_pixel = rgba_img.get_pixel(width - 1, y);
        bg_colors.push((left_pixel[0], left_pixel[1], left_pixel[2]));
        bg_colors.push((right_pixel[0], right_pixel[1], right_pixel[2]));
    }

    // Calculate average background color
    let total = bg_colors.len() as f64;
    let avg_r: f64 = bg_colors.iter().map(|c| c.0 as f64).sum::<f64>() / total;
    let avg_g: f64 = bg_colors.iter().map(|c| c.1 as f64).sum::<f64>() / total;
    let avg_b: f64 = bg_colors.iter().map(|c| c.2 as f64).sum::<f64>() / total;

    info!(
        "Average background color: R={:.0}, G={:.0}, B={:.0}",
        avg_r, avg_g, avg_b
    );

    // Helper function to check if a pixel is similar to background
    let is_background = |pixel: &Rgba<u8>| -> bool {
        let dr = pixel[0] as f64 - avg_r;
        let dg = pixel[1] as f64 - avg_g;
        let db = pixel[2] as f64 - avg_b;
        let dist_sq = dr * dr + dg * dg + db * db;
        dist_sq < tolerance_sq
    };

    // Flood fill from all edge pixels using BFS
    let mut queue: VecDeque<(u32, u32)> = VecDeque::new();

    // Add all edge pixels that match background color
    for x in 0..width {
        // Top edge
        if is_background(rgba_img.get_pixel(x, 0)) {
            queue.push_back((x, 0));
            mask[0][x as usize] = true;
        }
        // Bottom edge
        if is_background(rgba_img.get_pixel(x, height - 1)) {
            queue.push_back((x, height - 1));
            mask[(height - 1) as usize][x as usize] = true;
        }
    }

    for y in 0..height {
        // Left edge
        if is_background(rgba_img.get_pixel(0, y)) && !mask[y as usize][0] {
            queue.push_back((0, y));
            mask[y as usize][0] = true;
        }
        // Right edge
        if is_background(rgba_img.get_pixel(width - 1, y))
            && !mask[y as usize][(width - 1) as usize]
        {
            queue.push_back((width - 1, y));
            mask[y as usize][(width - 1) as usize] = true;
        }
    }

    // BFS flood fill
    let directions: [(i32, i32); 8] = [
        (-1, -1),
        (-1, 0),
        (-1, 1),
        (0, -1),
        (0, 1),
        (1, -1),
        (1, 0),
        (1, 1),
    ];

    while let Some((x, y)) = queue.pop_front() {
        for (dx, dy) in directions.iter() {
            let nx = x as i32 + dx;
            let ny = y as i32 + dy;

            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                let nx = nx as u32;
                let ny = ny as u32;

                if !mask[ny as usize][nx as usize] {
                    let pixel = rgba_img.get_pixel(nx, ny);
                    if is_background(pixel) {
                        mask[ny as usize][nx as usize] = true;
                        queue.push_back((nx, ny));
                    }
                }
            }
        }
    }

    // Apply mask with edge feathering
    let feather_radius = 2;
    for y in 0..height {
        for x in 0..width {
            if mask[y as usize][x as usize] {
                // Check distance to nearest non-background pixel for feathering
                let mut min_dist = feather_radius as f64 + 1.0;

                for fy in (y.saturating_sub(feather_radius))..=(y + feather_radius).min(height - 1)
                {
                    for fx in
                        (x.saturating_sub(feather_radius))..=(x + feather_radius).min(width - 1)
                    {
                        if !mask[fy as usize][fx as usize] {
                            let dist = (((x as i32 - fx as i32).pow(2)
                                + (y as i32 - fy as i32).pow(2))
                                as f64)
                                .sqrt();
                            min_dist = min_dist.min(dist);
                        }
                    }
                }

                let pixel = rgba_img.get_pixel_mut(x, y);
                if min_dist <= feather_radius as f64 {
                    // Feather edge
                    let alpha = ((min_dist / feather_radius as f64) * 255.0) as u8;
                    pixel[3] = alpha.min(pixel[3]);
                } else {
                    // Fully transparent
                    pixel[3] = 0;
                }
            }
        }
    }

    // Encode result as PNG base64
    let mut output_bytes = Vec::new();
    let mut cursor = Cursor::new(&mut output_bytes);
    rgba_img
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode result: {}", e))?;

    let result_base64 = format!("data:image/png;base64,{}", BASE64.encode(&output_bytes));

    info!("remove_background: Success");
    Ok(result_base64)
}

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

/// Convert Protocol Buffers (proto3) schema to JSON sample
#[tauri::command]
fn proto_to_json(input: String) -> Result<String, String> {
    info!("proto_to_json called - input_len: {}", input.len());

    if input.trim().is_empty() {
        warn!("proto_to_json: Input is empty");
        return Err("Input is empty".to_string());
    }

    let messages = parse_proto_messages(&input)?;

    if messages.is_empty() {
        return Err("No message definitions found in proto file".to_string());
    }

    // Find the root message (first non-nested message or one named "Root")
    let root_message = messages
        .iter()
        .find(|m| m.name == "Root")
        .or_else(|| messages.first())
        .ok_or("No messages found")?;

    let json_value = proto_message_to_json(root_message, &messages)?;
    let formatted = serde_json::to_string_pretty(&json_value)
        .map_err(|e| format!("Failed to format JSON: {}", e))?;

    info!("proto_to_json: Success - output_len: {}", formatted.len());
    Ok(formatted)
}

#[derive(Debug, Clone)]
struct ProtoMessage {
    name: String,
    fields: Vec<ProtoField>,
}

#[derive(Debug, Clone)]
struct ProtoField {
    field_type: String,
    name: String,
    #[allow(dead_code)]
    number: i32,
    is_repeated: bool,
}

fn parse_proto_messages(input: &str) -> Result<Vec<ProtoMessage>, String> {
    let mut messages = Vec::new();
    let lines: Vec<&str> = input.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();

        // Look for message definitions
        if line.starts_with("message ") {
            let message_name = line
                .trim_start_matches("message ")
                .trim_end_matches(" {")
                .trim_end_matches('{')
                .trim()
                .to_string();

            let mut fields = Vec::new();
            i += 1;

            // Parse fields until we hit the closing brace
            while i < lines.len() {
                let field_line = lines[i].trim();

                if field_line == "}" {
                    break;
                }

                if !field_line.is_empty()
                    && !field_line.starts_with("//")
                    && !field_line.starts_with("syntax")
                {
                    if let Some(field) = parse_proto_field(field_line) {
                        fields.push(field);
                    }
                }

                i += 1;
            }

            messages.push(ProtoMessage {
                name: message_name,
                fields,
            });
        }

        i += 1;
    }

    Ok(messages)
}

fn parse_proto_field(line: &str) -> Option<ProtoField> {
    // Format: [repeated] type name = number;
    let parts: Vec<&str> = line.split_whitespace().collect();

    if parts.len() < 4 {
        return None;
    }

    let mut idx = 0;
    let is_repeated = parts[idx] == "repeated";
    if is_repeated {
        idx += 1;
    }

    if parts.len() < idx + 3 {
        return None;
    }

    let field_type = parts[idx].to_string();
    let name = parts[idx + 1].to_string();

    // Parse field number (format: "= number;")
    let number_str = parts.get(idx + 3)?.trim_end_matches(';').trim();
    let number = number_str.parse::<i32>().ok()?;

    Some(ProtoField {
        field_type,
        name,
        number,
        is_repeated,
    })
}

fn proto_message_to_json(
    message: &ProtoMessage,
    all_messages: &[ProtoMessage],
) -> Result<Value, String> {
    let mut map = serde_json::Map::new();

    for field in &message.fields {
        let value = proto_field_to_json_value(&field, all_messages)?;
        map.insert(field.name.clone(), value);
    }

    Ok(Value::Object(map))
}

fn proto_field_to_json_value(
    field: &ProtoField,
    all_messages: &[ProtoMessage],
) -> Result<Value, String> {
    let base_value = match field.field_type.as_str() {
        "string" => Value::String("".to_string()),
        "int32" | "int64" | "uint32" | "uint64" | "sint32" | "sint64" | "fixed32" | "fixed64"
        | "sfixed32" | "sfixed64" => Value::Number(serde_json::Number::from(0)),
        "float" | "double" => Value::Number(serde_json::Number::from_f64(0.0).unwrap()),
        "bool" => Value::Bool(false),
        "bytes" => Value::String("".to_string()),
        _ => {
            // Check if it's a nested message type
            if let Some(nested_msg) = all_messages.iter().find(|m| m.name == field.field_type) {
                proto_message_to_json(nested_msg, all_messages)?
            } else {
                Value::Null
            }
        }
    };

    if field.is_repeated {
        Ok(Value::Array(vec![base_value]))
    } else {
        Ok(base_value)
    }
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
            proto_to_json,
            json_to_class,
            remove_background
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

    #[test]
    fn test_proto_to_json_simple() {
        let input = r#"syntax = "proto3";

message Root {
  string name = 1;
  int32 age = 2;
  bool is_active = 3;
}"#
        .to_string();
        let result = proto_to_json(input).unwrap();
        assert!(result.contains("\"name\""));
        assert!(result.contains("\"age\""));
        assert!(result.contains("\"is_active\""));
        assert!(result.contains("0"));
        assert!(result.contains("false"));
    }

    #[test]
    fn test_proto_to_json_nested() {
        let input = r#"syntax = "proto3";

message Root {
  string name = 1;
  User user = 2;
}

message User {
  string name = 1;
  int32 id = 2;
}"#
        .to_string();
        let result = proto_to_json(input).unwrap();
        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert!(parsed.get("user").is_some());
        assert!(parsed["user"].get("name").is_some());
        assert!(parsed["user"].get("id").is_some());
    }

    #[test]
    fn test_proto_to_json_repeated() {
        let input = r#"syntax = "proto3";

message Root {
  repeated string tags = 1;
  repeated int32 numbers = 2;
}"#
        .to_string();
        let result = proto_to_json(input).unwrap();
        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert!(parsed["tags"].is_array());
        assert!(parsed["numbers"].is_array());
    }

    #[test]
    fn test_proto_to_json_empty_input() {
        let result = proto_to_json("".to_string());
        assert!(result.is_err());
    }
}
