import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseUrl,
  formatFileSize,
  reconstructUrl,
} from "../modules/url-parser.js";

describe("parseUrl", () => {
  it("parses valid standard URL components", () => {
    const res = parseUrl("https://example.com:8080/api/v1?user=john#bio");
    assert.equal(res.protocol, "https:");
    assert.equal(res.hostname, "example.com");
    assert.equal(res.port, "8080");
    assert.equal(res.pathname, "/api/v1");
    assert.equal(res.search, "?user=john");
    assert.equal(res.hash, "#bio");
  });

  it("adds http:// fallback if scheme missing", () => {
    const res = parseUrl("example.com/test");
    assert.equal(res.protocol, "http:");
    assert.equal(res.hostname, "example.com");
  });

  it("throws on empty string", () => {
    assert.throws(() => parseUrl(""), /cannot be empty/);
  });
});

describe("formatFileSize", () => {
  it("formats bytes, KB, and MB properly", () => {
    assert.equal(formatFileSize(500), "500 B");
    assert.equal(formatFileSize(2048), "2.0 KB");
    assert.equal(formatFileSize(1048576 * 2.5), "2.5 MB");
  });

  it("handles negative or non-number inputs", () => {
    assert.equal(formatFileSize(-10), "0 B");
    assert.equal(formatFileSize(NaN), "0 B");
    assert.equal(formatFileSize(null), "0 B");
  });
});

describe("reconstructUrl", () => {
  it("reconstructs URL from parameters", () => {
    const url = reconstructUrl({
      protocol: "https:",
      hostname: "api.site.com",
      port: "3000",
      pathname: "/users",
      hash: "#top",
      params: [
        ["page", "1"],
        ["filter", "active"],
      ],
    });
    assert.equal(
      url,
      "https://api.site.com:3000/users?page=1&filter=active#top",
    );
  });
});
