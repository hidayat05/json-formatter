import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, sortKeys, normalizedJson } from "../modules/json-utils.js";

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    assert.equal(
      escapeHtml("<script>alert(\"xss\" & 'test')</script>"),
      "&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;",
    );
  });

  it("handles non-string inputs safely", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(123), "");
  });
});

describe("sortKeys", () => {
  it("sorts top-level keys alphabetically", () => {
    const input = { z: 1, a: 2, m: 3 };
    assert.deepEqual(Object.keys(sortKeys(input)), ["a", "m", "z"]);
  });

  it("sorts nested object keys recursively", () => {
    const input = { b: 1, a: { y: 10, x: 20 } };
    const res = sortKeys(input);
    assert.deepEqual(Object.keys(res), ["a", "b"]);
    assert.deepEqual(Object.keys(res.a), ["x", "y"]);
  });

  it("handles arrays of objects", () => {
    const input = [{ z: 1, a: 2 }];
    const res = sortKeys(input);
    assert.deepEqual(Object.keys(res[0]), ["a", "z"]);
  });

  it("passes primitive values through unchanged", () => {
    assert.equal(sortKeys(42), 42);
    assert.equal(sortKeys("test"), "test");
    assert.equal(sortKeys(null), null);
    assert.equal(sortKeys(true), true);
  });
});

describe("normalizedJson", () => {
  it("formats and recursively sorts keys in JSON string", () => {
    const input = '{"b":2,"a":1}';
    const expected = '{\n  "a": 1,\n  "b": 2\n}';
    assert.equal(normalizedJson(input), expected);
  });

  it("returns raw text on invalid JSON without throwing", () => {
    const invalid = "{invalid json}";
    assert.equal(normalizedJson(invalid), invalid);
  });
});
