// Import Tauri API - v2 uses window.__TAURI_INTERNALS__
const invoke = window.__TAURI_INTERNALS__.invoke;

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const statusMessage = document.getElementById("statusMessage");
const language = document.getElementById("languageSelect");
const classNameInput = document.getElementById("classNameInputText");

const converterTabBtn = document.getElementById("converterTabBtn");
const compareTabBtn = document.getElementById("compareTabBtn");
const mermaidTabBtn = document.getElementById("mermaidTabBtn");
const converterSection = document.getElementById("converterSection");
const compareSection = document.getElementById("compareSection");
const mermaidSection = document.getElementById("mermaidSection");

const compareLeft = document.getElementById("compareLeft");
const compareRight = document.getElementById("compareRight");
const diffContainer = document.getElementById("diffContainer");

// Mermaid elements
const mermaidInput = document.getElementById("mermaidInput");
const mermaidPreview = document.getElementById("mermaidPreview");

// Zoom controls
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomLevelDisplay = document.getElementById("zoomLevel");
const dragToggleBtn = document.getElementById("dragToggleBtn");

let currentZoom = 100;
const ZOOM_STEP = 10;
const ZOOM_MIN = 10;
const ZOOM_MAX = 300;

// Drag/Pan state
let isDragMode = false;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panX = 0;
let panY = 0;

let lastDiffText = "";
let lastDiffHtml = "";
const EMPTY_DIFF_HTML =
  '<div class="diff-header">Left</div><div class="diff-header">Right</div>';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "JetBrains Mono, monospace",
});

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function normalizedJson(text) {
  const parsed = JSON.parse(text);
  return JSON.stringify(sortKeys(parsed), null, 2);
}

function buildLineDiff(leftLines, rightLines) {
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

  const diff = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({
        type: "same",
        left: leftLines[i - 1],
        right: rightLines[j - 1],
      });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "added", left: "", right: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "removed", left: leftLines[i - 1], right: "" });
      i -= 1;
    }
  }

  diff.reverse();

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

function buildDiffHtml(entries) {
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

function serializeDiff(entries) {
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

function setActiveTab(tab) {
  const isConverter = tab === "converter";
  const isCompare = tab === "compare";
  const isMermaid = tab === "mermaid";

  converterSection.classList.toggle("hidden", !isConverter);
  compareSection.classList.toggle("hidden", !isCompare);
  mermaidSection.classList.toggle("hidden", !isMermaid);

  converterTabBtn.classList.toggle("active", isConverter);
  compareTabBtn.classList.toggle("active", isCompare);
  mermaidTabBtn.classList.toggle("active", isMermaid);
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${isError ? "error" : "success"}`;
  setTimeout(() => {
    statusMessage.className = "status-message hidden";
  }, 3000);
}

function renderDiffHtml(html) {
  if (diffContainer) {
    diffContainer.innerHTML = html;
  }
}

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
    lastDiffHtml = buildDiffHtml(diff);
    lastDiffText = serializeDiff(diff);
    renderDiffHtml(lastDiffHtml);
    showStatus("✓ Comparison complete");
  } catch (error) {
    lastDiffText = "";
    lastDiffHtml = "";
    renderDiffHtml(EMPTY_DIFF_HTML);
    showStatus(`Error: ${error}`, true);
  }
}

async function handleMinify() {
  try {
    const result = await invoke("minify_json", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ JSON minified successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleFormat() {
  try {
    const result = await invoke("format_json", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ JSON formatted successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleJsonToString() {
  try {
    const result = await invoke("json_to_string", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ JSON converted to string successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleStringToJson() {
  try {
    const result = await invoke("string_to_json", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ String converted to JSON successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleJsonToProto() {
  try {
    const result = await invoke("json_to_proto", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ JSON converted to Proto schema successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleProtoToJson() {
  try {
    const result = await invoke("proto_to_json", { input: inputText.value });
    outputText.value = result;
    showStatus("✓ Proto schema converted to JSON successfully");
  } catch (error) {
    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleJsonToClass() {
  try {
    const languageSelected = language.value;
    const className = classNameInput.value.trim() || "Root";

    const result = await invoke("json_to_class", {
      input: inputText.value,
      language: languageSelected,
      name: className, // Use snake_case to match Rust parameter
    });

    outputText.value = result;
    showStatus(`✓ JSON converted to ${languageSelected} class successfully`);
  } catch (error) {
    console.timeEnd("Conversion Time");
    console.error("❌ Conversion Failed:", error);
    console.groupEnd();

    outputText.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

function handleCompareClear() {
  compareLeft.value = "";
  compareRight.value = "";
  lastDiffText = "";
  lastDiffHtml = "";
  renderDiffHtml(EMPTY_DIFF_HTML);
  statusMessage.className = "status-message hidden";
}

function handleClear() {
  inputText.value = "";
  outputText.value = "";
  classNameInput.value = "";
  handleCompareClear();
}

async function handleCopyInput() {
  if (inputText.value) {
    try {
      // Try using native clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inputText.value);
        showStatus("✓ Input copied to clipboard");
      } else {
        // Fallback to Tauri clipboard plugin
        await invoke("plugin:clipboard-manager|write_text", {
          text: inputText.value,
        });
        showStatus("✓ Input copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

async function handleCopyCompare(side) {
  const value = side === "left" ? compareLeft.value : compareRight.value;
  if (!value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      showStatus(`✓ ${side === "left" ? "Left" : "Right"} input copied`);
    } else {
      await invoke("plugin:clipboard-manager|write_text", { text: value });
      showStatus(`✓ ${side === "left" ? "Left" : "Right"} input copied`);
    }
  } catch (error) {
    showStatus(`Error: Failed to copy - ${error}`, true);
  }
}

async function handleCopyDiff() {
  if (!lastDiffText) {
    showStatus("No diff to copy", true);
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(lastDiffText);
      showStatus("✓ Diff copied to clipboard");
    } else {
      await invoke("plugin:clipboard-manager|write_text", {
        text: lastDiffText,
      });
      showStatus("✓ Diff copied to clipboard");
    }
  } catch (error) {
    showStatus(`Error: Failed to copy diff - ${error}`, true);
  }
}

async function handleCopyOutput() {
  if (outputText.value) {
    try {
      // Try using native clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(outputText.value);
        showStatus("✓ Output copied to clipboard");
      } else {
        // Fallback to Tauri clipboard plugin
        await invoke("plugin:clipboard-manager|write_text", {
          text: outputText.value,
        });
        showStatus("✓ Output copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

// Zoom functions
function updateZoom() {
  const content = mermaidPreview.querySelector(".mermaid-preview-content");
  if (content) {
    content.style.transform = `scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)`;
  }
  zoomLevelDisplay.textContent = `${currentZoom}%`;
}

function handleZoomIn() {
  if (currentZoom < ZOOM_MAX) {
    currentZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
    updateZoom();
  }
}

function handleZoomOut() {
  if (currentZoom > ZOOM_MIN) {
    currentZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);
    updateZoom();
  }
}

function handleZoomReset() {
  currentZoom = 100;
  panX = 0;
  panY = 0;
  updateZoom();
}

// Drag/Pan functions
function toggleDragMode() {
  isDragMode = !isDragMode;
  dragToggleBtn.classList.toggle("active", isDragMode);
  mermaidPreview.classList.toggle("drag-mode", isDragMode);
}

function handleDragStart(e) {
  if (!isDragMode) return;

  const content = mermaidPreview.querySelector(".mermaid-preview-content");
  if (!content) return;

  isDragging = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;

  content.classList.add("dragging");
  mermaidPreview.classList.add("dragging");
}

function handleDragMove(e) {
  if (!isDragging) return;

  e.preventDefault();
  panX = e.clientX - dragStartX;
  panY = e.clientY - dragStartY;

  const content = mermaidPreview.querySelector(".mermaid-preview-content");
  if (content) {
    content.style.transform = `scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)`;
  }
}

function handleDragEnd() {
  if (!isDragging) return;

  isDragging = false;

  const content = mermaidPreview.querySelector(".mermaid-preview-content");
  if (content) {
    content.classList.remove("dragging");
  }
  mermaidPreview.classList.remove("dragging");
}

// Mermaid functions
async function handleRenderMermaid() {
  const code = mermaidInput.value.trim();

  if (!code) {
    mermaidPreview.innerHTML =
      '<div class="mermaid-placeholder">Enter Mermaid code and click "Render Diagram" to preview</div>';
    return;
  }

  try {
    // Clear previous content
    mermaidPreview.innerHTML = "";

    // Generate unique ID for each render
    const id = "mermaid-diagram-" + Date.now();

    // Render the diagram
    const { svg } = await mermaid.render(id, code);

    // Wrap SVG in a container for zoom and pan functionality
    mermaidPreview.innerHTML = `<div class="mermaid-preview-content" style="transform: scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)">${svg}</div>`;
    showStatus("✓ Diagram rendered successfully");
  } catch (error) {
    mermaidPreview.innerHTML = `<div class="mermaid-error">Error rendering diagram:<br>${escapeHtml(error.message || String(error))}</div>`;
    showStatus("Error rendering Mermaid diagram", true);
  }
}

async function handleDownloadMermaidPng() {
  const svgElement = mermaidPreview.querySelector("svg");

  if (!svgElement) {
    showStatus("No diagram to download. Please render a diagram first.", true);
    return;
  }

  try {
    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create a canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Create an image from the SVG
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function () {
      // Set canvas size with some padding
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image centered
      ctx.drawImage(img, padding, padding);

      // Create download link
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `mermaid-diagram-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Cleanup
      URL.revokeObjectURL(url);

      showStatus("✓ PNG downloaded successfully");
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      showStatus("Error creating image for download", true);
    };

    img.src = url;
  } catch (error) {
    showStatus(`Error downloading PNG: ${error}`, true);
  }
}

function handleClearMermaid() {
  mermaidInput.value = "";
  mermaidPreview.innerHTML =
    '<div class="mermaid-placeholder">Enter Mermaid code and click "Render Diagram" to preview</div>';
  currentZoom = 100;
  panX = 0;
  panY = 0;
  zoomLevelDisplay.textContent = "100%";
  showStatus("✓ Mermaid editor cleared");
}

async function handleCopyMermaid() {
  if (mermaidInput.value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mermaidInput.value);
        showStatus("✓ Mermaid code copied to clipboard");
      } else {
        await invoke("plugin:clipboard-manager|write_text", {
          text: mermaidInput.value,
        });
        showStatus("✓ Mermaid code copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

// Event listeners
document.getElementById("minifyBtn").addEventListener("click", handleMinify);
document.getElementById("formatBtn").addEventListener("click", handleFormat);
document
  .getElementById("jsonToStringBtn")
  .addEventListener("click", handleJsonToString);
document
  .getElementById("stringToJsonBtn")
  .addEventListener("click", handleStringToJson);
document
  .getElementById("jsonToProtoBtn")
  .addEventListener("click", handleJsonToProto);
document
  .getElementById("protoToJsonBtn")
  .addEventListener("click", handleProtoToJson);
document
  .getElementById("jsonToClassBtn")
  .addEventListener("click", handleJsonToClass);
document.getElementById("clearBtn").addEventListener("click", handleClear);
document
  .getElementById("clearCompareBtn")
  .addEventListener("click", handleCompareClear);
document
  .getElementById("copyInputBtn")
  .addEventListener("click", handleCopyInput);
document
  .getElementById("copyOutputBtn")
  .addEventListener("click", handleCopyOutput);
document
  .getElementById("copyLeftCompareBtn")
  .addEventListener("click", () => handleCopyCompare("left"));
document
  .getElementById("copyRightCompareBtn")
  .addEventListener("click", () => handleCopyCompare("right"));
document
  .getElementById("copyDiffBtn")
  .addEventListener("click", handleCopyDiff);
document
  .getElementById("beautifyLeftBtn")
  .addEventListener("click", () => handleBeautifyCompare("left"));
document
  .getElementById("beautifyRightBtn")
  .addEventListener("click", () => handleBeautifyCompare("right"));
document.getElementById("compareBtn").addEventListener("click", handleCompare);
converterTabBtn.addEventListener("click", () => setActiveTab("converter"));
compareTabBtn.addEventListener("click", () => setActiveTab("compare"));
mermaidTabBtn.addEventListener("click", () => setActiveTab("mermaid"));

// Mermaid event listeners
document
  .getElementById("renderMermaidBtn")
  .addEventListener("click", handleRenderMermaid);
document
  .getElementById("downloadMermaidBtn")
  .addEventListener("click", handleDownloadMermaidPng);
document
  .getElementById("clearMermaidBtn")
  .addEventListener("click", handleClearMermaid);
document
  .getElementById("copyMermaidBtn")
  .addEventListener("click", handleCopyMermaid);

// Zoom event listeners
zoomInBtn.addEventListener("click", handleZoomIn);
zoomOutBtn.addEventListener("click", handleZoomOut);
zoomResetBtn.addEventListener("click", handleZoomReset);

// Drag/Pan event listeners
dragToggleBtn.addEventListener("click", toggleDragMode);
mermaidPreview.addEventListener("mousedown", handleDragStart);
document.addEventListener("mousemove", handleDragMove);
document.addEventListener("mouseup", handleDragEnd);

// Mouse wheel zoom on preview
mermaidPreview.addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "m":
        e.preventDefault();
        handleMinify();
        break;
      case "f":
        e.preventDefault();
        handleFormat();
        break;
    }
  }
});

setActiveTab("converter");
renderDiffHtml(EMPTY_DIFF_HTML);
