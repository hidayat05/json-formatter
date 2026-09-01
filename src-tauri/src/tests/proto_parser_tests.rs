use crate::db;
use crate::mock_server;

#[test]
fn test_proto_parser() {
    let proto_src = r#"syntax = "proto3";
package payments;

service PaymentService {
  rpc ProcessPayment (PaymentRequest) returns (PaymentResponse);
}

message PaymentRequest {
  string order_id = 1;
  int64 amount = 2;
}

message PaymentResponse {
  string transaction_id = 1;
  bool success = 2;
}
"#;

    let parsed = mock_server::grpc::parse_proto_content(proto_src).unwrap();
    assert_eq!(parsed.package.as_deref(), Some("payments"));
    assert_eq!(parsed.services.len(), 1);
    assert_eq!(parsed.services[0].name, "PaymentService");
    assert_eq!(parsed.services[0].methods.len(), 1);
    assert_eq!(parsed.services[0].methods[0].name, "ProcessPayment");
    assert!(parsed.services[0].methods[0].default_response_json.contains("transaction_id"));
    assert!(parsed.services[0].methods[0].default_response_json.contains("success"));
}

#[test]
fn test_proto_parser_with_imports() {
    let proto_src = r#"syntax = "proto3";
package users;

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";
import "google/api/annotations.proto";
import "validate/validate.proto";

service UserService {
  rpc GetTimestamp (google.protobuf.Empty) returns (TimestampResponse) {
    option (google.api.http) = {
      get: "/v1/timestamp"
    };
  }
}

message TimestampResponse {
  google.protobuf.Timestamp created_at = 1;
  string message = 2 [(validate.rules).string.min_len = 1];
}
"#;

    let res = mock_server::grpc::parse_proto_content(proto_src).unwrap();
    assert_eq!(res.services.len(), 1);
    assert_eq!(res.services[0].name, "UserService");
}

#[test]
fn test_proto_parser_cross_file_imports() {
    let common_proto = db::GrpcProtoFile {
        id: "p1".to_string(),
        filename: "common/types.proto".to_string(),
        content: r#"syntax = "proto3";
package common;

message UserRef {
  string user_id = 1;
  string username = 2;
}
"#
        .to_string(),
        created_at: 100,
    };

    let service_proto = r#"syntax = "proto3";
package order;

import "common/types.proto";

service OrderService {
  rpc CreateOrder (OrderRequest) returns (OrderResponse);
}

message OrderRequest {
  common.UserRef user = 1;
  double amount = 2;
}

message OrderResponse {
  string order_id = 1;
  bool success = 2;
}
"#;

    let res = mock_server::grpc::parse_proto_content_with_includes(service_proto, &[common_proto]).unwrap();
    assert_eq!(res.services.len(), 1);
    assert_eq!(res.services[0].name, "OrderService");
    assert_eq!(res.services[0].methods[0].name, "CreateOrder");
}

#[test]
fn test_proto_parser_enterprise_and_missing_imports() {
    let complex_proto = r#"syntax = "proto3";
package enterprise.api.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/rpc/status.proto";
import "buf/validate/validate.proto";
import "protoc-gen-openapiv2/options/annotations.proto";
import "unprovided/legacy/stub_file.proto";

service ProductService {
  rpc GetProduct (GetProductRequest) returns (GetProductResponse) {
    option (google.api.http) = {
      get: "/v1/products/{product_id}"
    };
  }
}

message GetProductRequest {
  string product_id = 1 [(google.api.field_behavior) = REQUIRED];
}

message GetProductResponse {
  string product_id = 1;
  string title = 2;
  google.rpc.Status status = 3;
}
"#;

    let res = mock_server::grpc::parse_proto_content(complex_proto).unwrap();
    assert_eq!(res.services.len(), 1);
    assert_eq!(res.services[0].name, "ProductService");
    assert_eq!(res.services[0].methods[0].name, "GetProduct");
}
