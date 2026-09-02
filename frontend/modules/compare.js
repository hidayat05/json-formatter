import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";
import { normalizedJson, sortKeys } from "./json-utils.js";
import { buildLineDiff, serializeDiff } from "./compare-diff.js";

function renderDiffToDOM(container, entries) {
  if (!container) return;
  container.replaceChildren();

  const headerLeft = document.createElement("div");
  headerLeft.className = "diff-header";
  headerLeft.textContent = "Left";

  const headerRight = document.createElement("div");
  headerRight.className = "diff-header";
  headerRight.textContent = "Right";

  container.append(headerLeft, headerRight);

  if (!entries || entries.length === 0) return;

  for (const entry of entries) {
    const leftVal = entry.left || "";
    const rightVal = entry.right || "";

    const leftCell = document.createElement("div");
    leftCell.className = `diff-cell ${leftVal ? "" : "diff-empty"}`;
    leftCell.textContent = leftVal || " ";

    const rightCell = document.createElement("div");
    rightCell.className = `diff-cell ${rightVal ? "" : "diff-empty"}`;
    rightCell.textContent = rightVal || " ";

    const row = document.createElement("div");
    row.className = `diff-row diff-${entry.type}`;
    row.append(leftCell, rightCell);

    container.appendChild(row);
  }
}

export function initCompare() {
  const compareLeft = document.querySelector("#compareLeft");
  const compareRight = document.querySelector("#compareRight");
  const diffContainer = document.querySelector("#diffContainer");

  let lastDiffText = "";

  function handleBeautifyCompare(side) {
    try {
      if (side === "left") {
        compareLeft.value = normalizedJson(compareLeft.value);
        showStatus("✓ Left JSON beautified");
      } else {
        compareRight.value = normalizedJson(compareRight.value);
        showStatus("✓ Right JSON beautified");
      }
    } catch (error) {
      showStatus(`Error: ${error}`, true);
    }
  }

  function handleSortKeysCompare(side) {
    try {
      if (side === "left") {
        const sorted = sortKeys(JSON.parse(compareLeft.value));
        compareLeft.value = JSON.stringify(sorted, null, 2);
        showStatus("✓ Left JSON keys sorted recursively");
      } else {
        const sorted = sortKeys(JSON.parse(compareRight.value));
        compareRight.value = JSON.stringify(sorted, null, 2);
        showStatus("✓ Right JSON keys sorted recursively");
      }
    } catch (error) {
      showStatus(`Error: ${error}`, true);
    }
  }

  function handleCompare() {
    try {
      const leftFormatted = normalizedJson(compareLeft.value);
      const rightFormatted = normalizedJson(compareRight.value);

      compareLeft.value = leftFormatted;
      compareRight.value = rightFormatted;

      const diff = buildLineDiff(
        leftFormatted.split("\n"),
        rightFormatted.split("\n"),
      );
      lastDiffText = serializeDiff(diff);
      renderDiffToDOM(diffContainer, diff);
      showStatus("✓ Comparison complete");
    } catch (error) {
      lastDiffText = "";
      renderDiffToDOM(diffContainer, []);
      showStatus(`Error: ${error}`, true);
    }
  }

  function handleCompareClear() {
    compareLeft.value = "";
    compareRight.value = "";
    lastDiffText = "";
    renderDiffToDOM(diffContainer, []);
  }

  document
    .querySelector("#beautifyLeftBtn")
    ?.addEventListener("click", () => handleBeautifyCompare("left"));
  document
    .querySelector("#beautifyRightBtn")
    ?.addEventListener("click", () => handleBeautifyCompare("right"));
  document
    .querySelector("#sortKeysLeftBtn")
    ?.addEventListener("click", () => handleSortKeysCompare("left"));
  document
    .querySelector("#sortKeysRightBtn")
    ?.addEventListener("click", () => handleSortKeysCompare("right"));
  document
    .querySelector("#compareBtn")
    ?.addEventListener("click", handleCompare);
  document
    .querySelector("#clearCompareBtn")
    ?.addEventListener("click", handleCompareClear);

  document
    .querySelector("#copyLeftCompareBtn")
    ?.addEventListener("click", () => {
      copyText(compareLeft.value, "Left input");
    });
  document
    .querySelector("#copyRightCompareBtn")
    ?.addEventListener("click", () => {
      copyText(compareRight.value, "Right input");
    });
  document.querySelector("#copyDiffBtn")?.addEventListener("click", () => {
    if (!lastDiffText) {
      showStatus("No diff to copy", true);
      return;
    }
    copyText(lastDiffText, "Diff");
  });

  renderDiffToDOM(diffContainer, []);
}
