use json_formatter::{
    format_json_impl as format_json, json_to_class_impl as json_to_class,
    json_to_proto_impl as json_to_proto, json_to_string_impl as json_to_string,
    minify_json_impl as minify_json, proto_to_json_impl as proto_to_json,
    string_to_json_impl as string_to_json,
};
use serde_json::Value;

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
fn test_string_to_json_escaped_without_wrapper_quotes() {
    let input = r#"{\"name\":\"John\",\"age\":30}"#.to_string();
    let result = string_to_json(input).unwrap();
    let parsed: Value = serde_json::from_str(&result).unwrap();
    assert_eq!(parsed["name"], "John");
    assert_eq!(parsed["age"], 30);
}

#[test]
fn test_string_to_json_with_one_sided_quote() {
    let input = r#"{\"name\":\"John\"}""#.to_string();
    let result = string_to_json(input).unwrap();
    let parsed: Value = serde_json::from_str(&result).unwrap();
    assert_eq!(parsed["name"], "John");
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
}"#
    .to_string();
    let result = proto_to_json(input).unwrap();
    let parsed: Value = serde_json::from_str(&result).unwrap();
    assert!(parsed.get("tags").is_some());
    assert!(parsed["tags"].is_array());
}

#[test]
fn test_proto_to_json_empty_input() {
    let input = "".to_string();
    assert!(proto_to_json(input).is_err());
}
