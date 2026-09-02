import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLineDiff,
  buildDiffHtml,
  serializeDiff,
} from "../modules/compare-diff.js";

describe("buildLineDiff", () => {
  it("detects identical lines", () => {
    const res = buildLineDiff(["a", "b"], ["a", "b"]);
    assert.equal(res.length, 2);
    assert.equal(res[0].type, "same");
    assert.equal(res[1].type, "same");
  });

  it("detects added lines", () => {
    const res = buildLineDiff(["a"], ["a", "b"]);
    assert.equal(res[1].type, "added");
    assert.equal(res[1].right, "b");
  });

  it("detects removed lines", () => {
    const res = buildLineDiff(["a", "b"], ["a"]);
    assert.equal(res[1].type, "removed");
    assert.equal(res[1].left, "b");
  });

  it("merges contiguous removed and added into changed", () => {
    const res = buildLineDiff(["old"], ["new"]);
    assert.equal(res.length, 1);
    assert.equal(res[0].type, "changed");
    assert.equal(res[0].left, "old");
    assert.equal(res[0].right, "new");
  });
});

describe("serializeDiff", () => {
  it("formats lines with standard diff prefixes", () => {
    const diff = [
      { type: "same", left: "line1" },
      { type: "added", right: "line2" },
      { type: "removed", left: "line3" },
      { type: "changed", left: "old", right: "new" },
    ];
    const out = serializeDiff(diff);
    assert.equal(out, "  line1\n+ line2\n- line3\n- old\n+ new");
  });
});

describe("buildDiffHtml", () => {
  it("returns placeholder when entries empty", () => {
    const out = buildDiffHtml([]);
    assert.ok(out.includes("diff-header"));
  });

  it("renders diff cells for entries", () => {
    const out = buildDiffHtml([{ type: "same", left: "a", right: "a" }]);
    assert.ok(out.includes("diff-row diff-same"));
  });
});
