import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMermaid } from "../modules/mermaid-formatter.js";

describe("formatMermaid", () => {
  it("formats diagram headers without indentation", () => {
    const code = "   graph TD\n   A-->B";
    const out = formatMermaid(code);
    assert.ok(out.startsWith("graph TD"));
  });

  it("normalizes arrow spacing", () => {
    const code = "graph TD\nA-->B\nC ==> D";
    const out = formatMermaid(code);
    assert.ok(out.includes("A --> B"));
    assert.ok(out.includes("C ==> D"));
  });

  it("indents subgraphs and nested blocks", () => {
    const code = "graph TD\nsubgraph SG\nA-->B\nend";
    const out = formatMermaid(code);
    assert.ok(out.includes("  subgraph SG"));
    assert.ok(out.includes("    A --> B"));
    assert.ok(out.includes("  end"));
  });

  it("returns empty string on non-string inputs", () => {
    assert.equal(formatMermaid(null), "");
    assert.equal(formatMermaid(123), "");
  });
});
