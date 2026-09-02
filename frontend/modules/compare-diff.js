import { escapeHtml } from "./json-utils.js";

const EMPTY_DIFF_HTML =
  '<div class="diff-header">Left</div><div class="diff-header">Right</div>';

export function buildLineDiff(leftLines, rightLines) {
  const m = leftLines.length;
  const n = rightLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawDiff = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      rawDiff.push({
        type: "same",
        left: leftLines[i - 1],
        right: rightLines[j - 1],
      });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: "added", left: "", right: rightLines[j - 1] });
      j -= 1;
    } else {
      rawDiff.push({ type: "removed", left: leftLines[i - 1], right: "" });
      i -= 1;
    }
  }

  const diff = rawDiff.toReversed
    ? rawDiff.toReversed()
    : [...rawDiff].reverse();

  const merged = [];
  for (let k = 0; k < diff.length; k += 1) {
    const current = diff[k];
    const next = diff[k + 1];
    if (
      current &&
      current.type === "removed" &&
      next &&
      next.type === "added"
    ) {
      merged.push({ type: "changed", left: current.left, right: next.right });
      k += 1;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

export function buildDiffHtml(entries) {
  if (!entries.length) {
    return EMPTY_DIFF_HTML;
  }

  const rows = entries
    .map((entry) => {
      const leftVal = entry.left || "";
      const rightVal = entry.right || "";
      const leftCell = `<div class="diff-cell ${leftVal ? "" : "diff-empty"}">${escapeHtml(leftVal || " ")}</div>`;
      const rightCell = `<div class="diff-cell ${rightVal ? "" : "diff-empty"}">${escapeHtml(rightVal || " ")}</div>`;
      return `<div class="diff-row diff-${entry.type}">${leftCell}${rightCell}</div>`;
    })
    .join("");

  return `<div class="diff-header">Left</div><div class="diff-header">Right</div>${rows}`;
}

export function serializeDiff(entries) {
  return entries
    .map((entry) => {
      switch (entry.type) {
        case "same":
          return `  ${entry.left}`;
        case "added":
          return `+ ${entry.right}`;
        case "removed":
          return `- ${entry.left}`;
        case "changed":
          return `- ${entry.left}\n+ ${entry.right}`;
        default:
          return "";
      }
    })
    .join("\n");
}
