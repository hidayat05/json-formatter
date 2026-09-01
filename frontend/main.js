// Import Tauri API - v2 uses window.__TAURI_INTERNALS__
const invoke = window.__TAURI_INTERNALS__.invoke;

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const statusMessage = document.getElementById("statusMessage");
const language = document.getElementById("languageSelect");
const classNameInput = document.getElementById("classNameInputText");

const converterTabBtn = document.getElementById("converterTabBtn");
const jsonEditorTabBtn = document.getElementById("jsonEditorTabBtn");
const compareTabBtn = document.getElementById("compareTabBtn");
const mermaidTabBtn = document.getElementById("mermaidTabBtn");
const imageResizerTabBtn = document.getElementById("imageResizerTabBtn");
const opensslTabBtn = document.getElementById("opensslTabBtn");
const tracerouteTabBtn = document.getElementById("tracerouteTabBtn");
const jsonHtmlTabBtn = document.getElementById("jsonHtmlTabBtn");
const urlTabBtn = document.getElementById("urlTabBtn");
const converterSection = document.getElementById("converterSection");
const jsonEditorSection = document.getElementById("jsonEditorSection");
const compareSection = document.getElementById("compareSection");
const mermaidSection = document.getElementById("mermaidSection");
const imageResizerSection = document.getElementById("imageResizerSection");
const opensslSection = document.getElementById("opensslSection");
const tracerouteSection = document.getElementById("tracerouteSection");
const jsonHtmlSection = document.getElementById("jsonHtmlSection");
const urlSection = document.getElementById("urlSection");

const compareLeft = document.getElementById("compareLeft");
const compareRight = document.getElementById("compareRight");
const diffContainer = document.getElementById("diffContainer");

const opensslInput = document.getElementById("opensslInput");
const opensslOutput = document.getElementById("opensslOutput");
const opensslUrlInput = document.getElementById("opensslUrlInput");
const opensslChainMode = document.getElementById("opensslChainMode");
const tracerouteUrlInput = document.getElementById("tracerouteUrlInput");
const tracerouteOutput = document.getElementById("tracerouteOutput");
const tracerouteLoading = document.getElementById("tracerouteLoading");
const runTracerouteBtn = document.getElementById("runTracerouteBtn");
const clearTracerouteBtn = document.getElementById("clearTracerouteBtn");
const copyTracerouteOutputBtn = document.getElementById("copyTracerouteOutputBtn");

// JSON to HTML elements
const jsonHtmlInput = document.getElementById("jsonHtmlInput");
const htmlTemplate = document.getElementById("htmlTemplate");
const htmlResult = document.getElementById("htmlResult");
const renderHtmlBtn = document.getElementById("renderHtmlBtn");
const formatJsonHtmlBtn = document.getElementById("formatJsonHtmlBtn");
const copyHtmlResultBtn = document.getElementById("copyHtmlResultBtn");
const clearHtmlBtn = document.getElementById("clearHtmlBtn");
const copyJsonHtmlBtn = document.getElementById("copyJsonHtmlBtn");
const copyTemplateBtn = document.getElementById("copyTemplateBtn");
const copyResultHtmlBtn = document.getElementById("copyResultHtmlBtn");

// URL Beautifier elements
const urlInput = document.getElementById("urlInput");
const urlProtocol = document.getElementById("urlProtocol");
const urlHostname = document.getElementById("urlHostname");
const urlPort = document.getElementById("urlPort");
const urlPathname = document.getElementById("urlPathname");
const urlHash = document.getElementById("urlHash");
const urlParamsList = document.getElementById("urlParamsList");
const urlAddParamBtn = document.getElementById("urlAddParamBtn");
const urlBeautifyBtn = document.getElementById("urlBeautifyBtn");
const urlEncodeBtn = document.getElementById("urlEncodeBtn");
const urlDecodeBtn = document.getElementById("urlDecodeBtn");
const urlReconstructBtn = document.getElementById("urlReconstructBtn");
const urlClearBtn = document.getElementById("urlClearBtn");
const copyUrlInputBtn = document.getElementById("copyUrlInputBtn");
 
// JSON Editor elements
const jsonEditorRawInput = document.getElementById("jsonEditorRawInput");
const jsonEditorTreeContainer = document.getElementById("jsonEditorTreeContainer");
const jsonEditorSearchInput = document.getElementById("jsonEditorSearchInput");
const jsonEditorStats = document.getElementById("jsonEditorStats");
const jsonEditorErrorBanner = document.getElementById("jsonEditorErrorBanner");
const jsonEditorSampleSelect = document.getElementById("jsonEditorSampleSelect");
const jsonEditorCaseSelect = document.getElementById("jsonEditorCaseSelect");
const jsonEditorFormatBtn = document.getElementById("jsonEditorFormatBtn");
const jsonEditorMinifyBtn = document.getElementById("jsonEditorMinifyBtn");
const jsonEditorAutoFixBtn = document.getElementById("jsonEditorAutoFixBtn");
const jsonEditorUnpackAllBtn = document.getElementById("jsonEditorUnpackAllBtn");
const jsonEditorMaskPiiBtn = document.getElementById("jsonEditorMaskPiiBtn");
const jsonEditorExpandAllBtn = document.getElementById("jsonEditorExpandAllBtn");
const jsonEditorCollapseAllBtn = document.getElementById("jsonEditorCollapseAllBtn");
const jsonEditorCopyBtn = document.getElementById("jsonEditorCopyBtn");
const jsonEditorDownloadBtn = document.getElementById("jsonEditorDownloadBtn");
const jsonEditorClearBtn = document.getElementById("jsonEditorClearBtn");
const copyJsonEditorRawBtn = document.getElementById("copyJsonEditorRawBtn");

// Mermaid elements
const mermaidInput = document.getElementById("mermaidInput");
const mermaidPreview = document.getElementById("mermaidPreview");
const mermaidTemplateSelect = document.getElementById("mermaidTemplateSelect");
const mermaidThemeSelect = document.getElementById("mermaidThemeSelect");
const mermaidSyntaxWarning = document.getElementById("mermaidSyntaxWarning");
const zoomFitBtn = document.getElementById("zoomFitBtn");

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

// Image Resizer elements
const imageFileInput = document.getElementById("imageFileInput");
const selectImageBtn = document.getElementById("selectImageBtn");
const convertToPngBtn = document.getElementById("convertToPngBtn");
const removeBackgroundBtn = document.getElementById("removeBackgroundBtn");
const downloadResizedBtn = document.getElementById("downloadResizedBtn");
const clearImageBtn = document.getElementById("clearImageBtn");
const applyResizeBtn = document.getElementById("applyResizeBtn");
const resizeMode = document.getElementById("resizeMode");
const resizePercentage = document.getElementById("resizePercentage");
const percentageValue = document.getElementById("percentageValue");
const percentageControls = document.getElementById("percentageControls");
const dimensionControls = document.getElementById("dimensionControls");
const resizeWidth = document.getElementById("resizeWidth");
const resizeHeight = document.getElementById("resizeHeight");
const maintainAspectRatio = document.getElementById("maintainAspectRatio");
const imageQuality = document.getElementById("imageQuality");
const qualityValue = document.getElementById("qualityValue");
const outputFormat = document.getElementById("outputFormat");
const originalImagePreview = document.getElementById("originalImagePreview");
const resizedImagePreview = document.getElementById("resizedImagePreview");
const originalImageInfo = document.getElementById("originalImageInfo");
const resizedImageInfo = document.getElementById("resizedImageInfo");
const bgTolerance = document.getElementById("bgTolerance");
const toleranceValue = document.getElementById("toleranceValue");

// Image Resizer state
let originalImage = null;
let originalImageData = null;
let resizedImageData = null;
let isRemovingBackground = false;

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

// Clean and format Mermaid diagram source code
function formatMermaid(code) {
  const lines = code.split("\n");
  let indentLevel = 0;
  let formattedLines = [];

  const diagramHeaders = [
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|requirementDiagram|C4Context|C4Container|C4Component|kanban|architecture)/i
  ];

  let hasSeenHeader = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line === "") {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    const isHeader = diagramHeaders.some(regex => regex.test(line));
    const isClosingBlock = /^(end|else|opt|loop|alt|par|critical)/i.test(line) && !/^end[a-zA-Z0-9]/i.test(line);

    if (isClosingBlock && indentLevel > 0) {
      indentLevel--;
    }

    const currentIndent = isHeader ? 0 : (indentLevel + (hasSeenHeader ? 1 : 0)) * 2;
    const indentSpace = " ".repeat(currentIndent);

    // Standardize arrows/connectors spacing for readability, matching longer arrows first to prevent prefix conflicts
    let formattedLine = line.replace(
      /\s*(-->>|-\.->|->>|-->|---|==>|===|--x|--\)|\-\.\-|->|-x|-\)|==)\s*/g,
      " $1 "
    );

    formattedLines.push(indentSpace + formattedLine);

    if (isHeader) {
      hasSeenHeader = true;
    }

    const isOpeningBlock = /^(subgraph|alt|opt|loop|par|critical|rect)/i.test(line) && !/(\s+end\s*|;)$/i.test(line);
    if (isOpeningBlock) {
      indentLevel++;
    }
  }

  if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
    formattedLines.pop();
  }

  return formattedLines.join("\n");
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
  const isJsonEditor = tab === "jsonEditor";
  const isCompare = tab === "compare";
  const isMermaid = tab === "mermaid";
  const isImageResizer = tab === "imageResizer";
  const isOpenssl = tab === "openssl";
  const isTraceroute = tab === "traceroute";
  const isJsonHtml = tab === "jsonHtml";
  const isUrl = tab === "url";

  converterSection.classList.toggle("hidden", !isConverter);
  jsonEditorSection.classList.toggle("hidden", !isJsonEditor);
  compareSection.classList.toggle("hidden", !isCompare);
  mermaidSection.classList.toggle("hidden", !isMermaid);
  imageResizerSection.classList.toggle("hidden", !isImageResizer);
  opensslSection.classList.toggle("hidden", !isOpenssl);
  tracerouteSection.classList.toggle("hidden", !isTraceroute);
  jsonHtmlSection.classList.toggle("hidden", !isJsonHtml);
  urlSection.classList.toggle("hidden", !isUrl);

  converterTabBtn.classList.toggle("active", isConverter);
  jsonEditorTabBtn.classList.toggle("active", isJsonEditor);
  compareTabBtn.classList.toggle("active", isCompare);
  mermaidTabBtn.classList.toggle("active", isMermaid);
  imageResizerTabBtn.classList.toggle("active", isImageResizer);
  opensslTabBtn.classList.toggle("active", isOpenssl);
  tracerouteTabBtn.classList.toggle("active", isTraceroute);
  jsonHtmlTabBtn.classList.toggle("active", isJsonHtml);
  urlTabBtn.classList.toggle("active", isUrl);

  if (isJsonEditor && !jsonEditorInitialized) {
    initJsonEditor();
  }
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

function handleSortKeys() {
  try {
    const parsed = JSON.parse(inputText.value);
    const sorted = sortKeys(parsed);
    outputText.value = JSON.stringify(sorted, null, 2);
    showStatus("✓ JSON keys sorted recursively");
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
  handleClearOpenssl();
  handleClearTraceroute();
}

async function handleOpensslDetail() {
  try {
    const result = await invoke("openssl_cert_detail", {
      certInput: opensslInput.value,
    });
    opensslOutput.value = result;
    const certCount = (opensslInput.value.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
    const label = certCount > 1 ? `${certCount} certificates` : "certificate";
    showStatus(`✓ Certificate detail generated successfully (${label || "1 certificate"})`);
  } catch (error) {
    opensslOutput.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

async function handleOpensslDetailFromUrl() {
  const urlInput = opensslUrlInput.value.trim();
  if (!urlInput) {
    showStatus("Please enter a URL to check SSL detail", true);
    return;
  }

  try {
    const result = await invoke("openssl_cert_detail_from_url", {
      urlInput,
      chainMode: opensslChainMode.value,
    });
    opensslInput.value = result.pem;
    opensslOutput.value = result.detail;
    showStatus(
      `✓ SSL detail fetched from URL successfully (${opensslChainMode.value} mode)`
    );
  } catch (error) {
    opensslInput.value = "";
    opensslOutput.value = "";
    showStatus(`Error: ${error}`, true);
  }
}

function handleClearOpenssl() {
  opensslUrlInput.value = "";
  opensslInput.value = "";
  opensslOutput.value = "";
  opensslChainMode.value = "full";
}

function setTracerouteLoadingState(isLoading) {
  tracerouteLoading.classList.toggle("hidden", !isLoading);
  tracerouteOutput.classList.toggle("hidden", isLoading);
  tracerouteUrlInput.disabled = isLoading;
  runTracerouteBtn.disabled = isLoading;
  clearTracerouteBtn.disabled = isLoading;
  copyTracerouteOutputBtn.disabled = isLoading || !tracerouteOutput.value;
  runTracerouteBtn.textContent = isLoading ? "Running..." : "Run Traceroute";
}

async function handleTraceroute() {
  const urlInput = tracerouteUrlInput.value.trim();
  if (!urlInput) {
    showStatus("Please enter a URL or host for traceroute", true);
    return;
  }

  tracerouteOutput.value = "";
  setTracerouteLoadingState(true);

  try {
    const result = await invoke("run_traceroute", { urlInput });
    tracerouteOutput.value = result;
    showStatus("✓ Traceroute completed successfully");
  } catch (error) {
    tracerouteOutput.value = "";
    showStatus(`Error: ${error}`, true);
  } finally {
    setTracerouteLoadingState(false);
  }
}

function handleClearTraceroute() {
  tracerouteUrlInput.value = "";
  tracerouteOutput.value = "";
  setTracerouteLoadingState(false);
}

async function handleCopyTracerouteOutput() {
  if (!tracerouteOutput.value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tracerouteOutput.value);
      showStatus("✓ Traceroute output copied to clipboard");
    } else {
      await invoke("plugin:clipboard-manager|write_text", {
        text: tracerouteOutput.value,
      });
      showStatus("✓ Traceroute output copied to clipboard");
    }
  } catch (error) {
    showStatus(`Error: Failed to copy - ${error}`, true);
  }
}

async function handleCopyOpensslInput() {
  if (!opensslInput.value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(opensslInput.value);
      showStatus("✓ Certificate input copied to clipboard");
    } else {
      await invoke("plugin:clipboard-manager|write_text", {
        text: opensslInput.value,
      });
      showStatus("✓ Certificate input copied to clipboard");
    }
  } catch (error) {
    showStatus(`Error: Failed to copy - ${error}`, true);
  }
}

async function handleCopyOpensslOutput() {
  if (!opensslOutput.value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(opensslOutput.value);
      showStatus("✓ Certificate detail copied to clipboard");
    } else {
      await invoke("plugin:clipboard-manager|write_text", {
        text: opensslOutput.value,
      });
      showStatus("✓ Certificate detail copied to clipboard");
    }
  } catch (error) {
    showStatus(`Error: Failed to copy - ${error}`, true);
  }
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

function handleZoomFit() {
  const svgElement = mermaidPreview.querySelector("svg");
  if (!svgElement) return;

  panX = 0;
  panY = 0;

  // Calculate scaling to fit container
  const containerWidth = mermaidPreview.clientWidth - 32; // padding
  const containerHeight = mermaidPreview.clientHeight - 32;

  // Get SVG viewbox dimensions
  const viewBox = svgElement.viewBox.baseVal;
  let svgWidth = viewBox.width || svgElement.clientWidth || svgElement.getBoundingClientRect().width;
  let svgHeight = viewBox.height || svgElement.clientHeight || svgElement.getBoundingClientRect().height;

  if (svgWidth && svgHeight) {
    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    const optimalScale = Math.min(scaleX, scaleY, 1.5); // cap at 150% zoom
    currentZoom = Math.max(Math.round(optimalScale * 100), 20); // min 20%
  } else {
    currentZoom = 100;
  }

  zoomLevelDisplay.textContent = `${currentZoom}%`;
  const content = mermaidPreview.querySelector(".mermaid-preview-content");
  if (content) {
    content.style.transform = `scale(${currentZoom / 100}) translate(0px, 0px)`;
  }
  showStatus("✓ Diagram fit to screen");
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

// Mermaid templates library
const MERMAID_TEMPLATES = {
  flowchart: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`,
  sequence: `sequenceDiagram
    autonumber
    Alice->>Bob: Hello Bob, how are you?
    activate Bob
    Bob-->>Alice: Great, thanks!
    deactivate Bob
    Note right of Bob: Bob is in a good mood
    
    Alice->>+John: How about you, John?
    John-->>-Alice: I'm doing fine!`,
  class: `classDiagram
    class Vehicle {
      +String make
      +String model
      +int year
      +start()
      +stop()
    }
    class Car {
      +int doors
      +honk()
    }
    Vehicle <|-- Car`,
  state: `stateDiagram-v2
    [*] --> Off
    Off --> On : Turn On
    On --> Active : Start Action
    Active --> On : Finish Action
    On --> Off : Turn Off`,
  er: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
      string id
      string name
      string email
    }
    ORDER {
      int id
      string status
      date created_at
    }
    LINE_ITEM {
      int order_id
      int product_id
      int quantity
      float price
    }`,
  git: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,
  pie: `pie title Tech Stack Usage
    "Rust" : 45
    "JavaScript" : 30
    "HTML/CSS" : 15
    "Python" : 10`
};

// Mermaid functions
async function handleRenderMermaid() {
  const code = mermaidInput.value.trim();

  if (!code) {
    mermaidPreview.innerHTML =
      '<div class="mermaid-placeholder">Enter Mermaid code and click "Render Diagram" to preview</div>';
    mermaidSyntaxWarning.classList.add("hidden");
    return;
  }

  try {
    // Validate syntax first
    try {
      await mermaid.parse(code);
      mermaidSyntaxWarning.classList.add("hidden");
    } catch (parseError) {
      mermaidSyntaxWarning.textContent = `⚠️ Syntax Error:\n${parseError.message || String(parseError)}`;
      mermaidSyntaxWarning.classList.remove("hidden");
      // Keep the last valid render if one exists, otherwise render error
      if (!mermaidPreview.querySelector("svg")) {
        mermaidPreview.innerHTML = `<div class="mermaid-error">Syntax Error:<br>${escapeHtml(parseError.message || String(parseError))}</div>`;
      }
      return;
    }

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
  showStatus("Mermaid editor cleared!");
}

function handleFormatMermaid() {
  const code = mermaidInput.value;
  if (!code.trim()) {
    showStatus("Please enter Mermaid code", true);
    return;
  }
  const formatted = formatMermaid(code);
  mermaidInput.value = formatted;
  showStatus("✓ Mermaid code formatted successfully");
}

// Image Resizer Functions
function handleSelectImage() {
  imageFileInput.click();
}

function handleImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showStatus("Please select a valid image file", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      originalImageData = e.target.result;

      // Display original image with scrollable container
      originalImagePreview.classList.add("has-image");
      originalImagePreview.innerHTML = `<div class="image-preview-content"><img src="${originalImageData}" alt="Original Image"></div>`;
      originalImageInfo.textContent = `${img.width} × ${img.height} px | ${formatFileSize(file.size)}`;

      // Set dimension inputs to original size
      resizeWidth.value = img.width;
      resizeHeight.value = img.height;

      // Enable buttons
      applyResizeBtn.disabled = false;
      convertToPngBtn.disabled = false;
      removeBackgroundBtn.disabled = false;

      // Clear resized preview
      resizedImagePreview.classList.remove("has-image", "transparent-bg");
      resizedImagePreview.innerHTML =
        '<div class="image-placeholder">Click "Apply Changes" to resize</div>';
      resizedImageInfo.textContent = "";
      downloadResizedBtn.disabled = true;
      resizedImageData = null;

      showStatus("Image loaded successfully!");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function handleResizeModeChange() {
  const mode = resizeMode.value;
  percentageControls.classList.toggle("hidden", mode === "dimensions");
  dimensionControls.classList.toggle("hidden", mode !== "dimensions");
}

function handlePercentageChange() {
  percentageValue.textContent = resizePercentage.value + "%";
  if (originalImage && resizeMode.value === "percentage") {
    const scale = resizePercentage.value / 100;
    resizeWidth.value = Math.round(originalImage.width * scale);
    resizeHeight.value = Math.round(originalImage.height * scale);
  }
}

function handleQualityChange() {
  qualityValue.textContent = imageQuality.value + "%";
}

function handleWidthChange() {
  if (maintainAspectRatio.checked && originalImage) {
    const aspectRatio = originalImage.height / originalImage.width;
    resizeHeight.value = Math.round(resizeWidth.value * aspectRatio);
  }
}

function handleHeightChange() {
  if (maintainAspectRatio.checked && originalImage) {
    const aspectRatio = originalImage.width / originalImage.height;
    resizeWidth.value = Math.round(resizeHeight.value * aspectRatio);
  }
}

function handleApplyResize() {
  if (!originalImage) {
    showStatus("Please select an image first", true);
    return;
  }

  let newWidth, newHeight;

  if (resizeMode.value === "percentage") {
    const scale = resizePercentage.value / 100;
    newWidth = Math.round(originalImage.width * scale);
    newHeight = Math.round(originalImage.height * scale);
  } else if (resizeMode.value === "dimensions") {
    newWidth = parseInt(resizeWidth.value) || originalImage.width;
    newHeight = parseInt(resizeHeight.value) || originalImage.height;
  } else {
    // Quality only mode - keep original dimensions
    newWidth = originalImage.width;
    newHeight = originalImage.height;
  }

  // Create canvas for resizing
  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw resized image
  ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

  // Get output format and quality
  const format = outputFormat.value;
  const quality = imageQuality.value / 100;

  let mimeType;
  switch (format) {
    case "png":
      mimeType = "image/png";
      break;
    case "webp":
      mimeType = "image/webp";
      break;
    default:
      mimeType = "image/jpeg";
  }

  // Convert to data URL
  resizedImageData = canvas.toDataURL(mimeType, quality);

  // Display resized image with scrollable container
  resizedImagePreview.classList.add("has-image");
  resizedImagePreview.classList.remove("transparent-bg");
  resizedImagePreview.innerHTML = `<div class="image-preview-content"><img src="${resizedImageData}" alt="Resized Image"></div>`;

  // Calculate approximate file size
  const base64Length =
    resizedImageData.length - resizedImageData.indexOf(",") - 1;
  const approximateSize = Math.round((base64Length * 3) / 4);

  resizedImageInfo.textContent = `${newWidth} × ${newHeight} px | ~${formatFileSize(approximateSize)}`;

  downloadResizedBtn.disabled = false;
  showStatus("Image resized successfully!");
}

function handleDownloadResized() {
  if (!resizedImageData) {
    showStatus("No resized image to download", true);
    return;
  }

  const format = outputFormat.value;
  const extension = format === "jpeg" ? "jpg" : format;

  const link = document.createElement("a");
  link.download = `resized-image.${extension}`;
  link.href = resizedImageData;
  link.click();

  showStatus("Image downloaded!");
}

function handleConvertToPng() {
  if (!originalImage) {
    showStatus("Please select an image first", true);
    return;
  }

  // Create canvas with original dimensions
  const canvas = document.createElement("canvas");
  canvas.width = originalImage.width;
  canvas.height = originalImage.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(originalImage, 0, 0);

  // Convert to PNG (lossless)
  resizedImageData = canvas.toDataURL("image/png");

  // Display converted image with scrollable container
  resizedImagePreview.classList.add("has-image");
  resizedImagePreview.classList.remove("transparent-bg");
  resizedImagePreview.innerHTML = `<div class="image-preview-content"><img src="${resizedImageData}" alt="PNG Image"></div>`;

  // Calculate approximate file size
  const base64Length =
    resizedImageData.length - resizedImageData.indexOf(",") - 1;
  const approximateSize = Math.round((base64Length * 3) / 4);

  resizedImageInfo.textContent = `${originalImage.width} × ${originalImage.height} px | PNG | ~${formatFileSize(approximateSize)}`;

  // Set output format to PNG for download
  outputFormat.value = "png";

  downloadResizedBtn.disabled = false;
  showStatus("Image converted to PNG successfully!");
}

async function handleRemoveBackground() {
  if (!originalImage) {
    showStatus("Please select an image first", true);
    return;
  }

  if (isRemovingBackground) {
    showStatus("Background removal already in progress...", true);
    return;
  }

  isRemovingBackground = true;
  removeBackgroundBtn.disabled = true;
  removeBackgroundBtn.textContent = "⏳ Processing...";

  resizedImagePreview.classList.remove("has-image", "transparent-bg");
  resizedImagePreview.innerHTML =
    '<div class="image-placeholder">Removing background... This may take a moment.</div>';

  try {
    // Get tolerance from slider
    const tolerance = parseInt(bgTolerance.value) || 30;

    // Call Rust backend for background removal
    const result = await invoke("remove_background", {
      imageData: originalImageData,
      tolerance: tolerance,
    });

    resizedImageData = result;

    // Display result with transparent background indicator
    resizedImagePreview.classList.add("has-image", "transparent-bg");
    resizedImagePreview.innerHTML = `<div class="image-preview-content"><img src="${resizedImageData}" alt="Background Removed"></div>`;

    // Calculate approximate file size
    const base64Length =
      resizedImageData.length - resizedImageData.indexOf(",") - 1;
    const approximateSize = Math.round((base64Length * 3) / 4);

    resizedImageInfo.textContent = `${originalImage.width} × ${originalImage.height} px | PNG | ~${formatFileSize(approximateSize)}`;

    // Set output format to PNG (required for transparency)
    outputFormat.value = "png";

    downloadResizedBtn.disabled = false;
    showStatus("Background removed successfully!");
  } catch (error) {
    console.error("Background removal error:", error);
    resizedImagePreview.innerHTML =
      '<div class="image-placeholder">Failed to remove background. Please try again.</div>';
    showStatus(`Error: ${error || "Failed to remove background"}`, true);
  } finally {
    isRemovingBackground = false;
    removeBackgroundBtn.disabled = false;
    removeBackgroundBtn.textContent = "✂️ Remove Background";
  }
}

function handleClearImage() {
  originalImage = null;
  originalImageData = null;
  resizedImageData = null;

  originalImagePreview.classList.remove("has-image", "transparent-bg");
  originalImagePreview.innerHTML =
    '<div class="image-placeholder">Click "Select Image" to load an image</div>';

  resizedImagePreview.classList.remove("has-image", "transparent-bg");
  resizedImagePreview.innerHTML =
    '<div class="image-placeholder">Resized image will appear here</div>';

  originalImageInfo.textContent = "";
  resizedImageInfo.textContent = "";

  applyResizeBtn.disabled = true;
  downloadResizedBtn.disabled = true;
  convertToPngBtn.disabled = true;
  removeBackgroundBtn.disabled = true;

  resizePercentage.value = 100;
  percentageValue.textContent = "100%";
  imageQuality.value = 90;
  qualityValue.textContent = "90%";
  bgTolerance.value = 30;
  toleranceValue.textContent = "30";
  resizeWidth.value = "";
  resizeHeight.value = "";

  imageFileInput.value = "";

  showStatus("Image resizer cleared!");
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

// JSON to HTML Render Functions
function renderJsonToHtml() {
  const jsonText = jsonHtmlInput.value.trim();
  const templateText = htmlTemplate.value.trim();

  if (!jsonText) {
    showStatus("Please enter JSON data", true);
    return;
  }

  if (!templateText) {
    showStatus("Please enter an HTML template", true);
    return;
  }

  try {
    // Parse JSON
    const jsonData = JSON.parse(jsonText);

    // Replace {{key}} placeholders with JSON values
    let resultHtml = templateText;

    // Recursive function to handle nested objects
    const replaceValues = (obj, text) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          // For nested objects, replace with flattened dot notation or direct replacement
          text = text.replace(
            new RegExp(`{{\\s*${key}\\s*}}`, "g"),
            escapeHtml(JSON.stringify(value))
          );
          // Also try nested replacements like {{key.subkey}}
          text = replaceValues(value, text);
        } else if (Array.isArray(value)) {
          // For arrays, convert to string or JSON
          text = text.replace(
            new RegExp(`{{\\s*${key}\\s*}}`, "g"),
            escapeHtml(JSON.stringify(value))
          );
        } else {
          // For simple values, just replace
          text = text.replace(
            new RegExp(`{{\\s*${key}\\s*}}`, "g"),
            escapeHtml(String(value))
          );
        }
      }
      return text;
    };

    resultHtml = replaceValues(jsonData, resultHtml);

    // Display result
    htmlResult.innerHTML = resultHtml;
    showStatus("✓ HTML rendered successfully!");
  } catch (error) {
    showStatus(`Error: ${error.message}`, true);
    htmlResult.innerHTML = `<div class="placeholder"><span style="color: red;">Error: ${escapeHtml(error.message)}</span></div>`;
  }
}

function handleRenderHtml() {
  renderJsonToHtml();
}

async function handleFormatJsonHtml() {
  const jsonText = jsonHtmlInput.value.trim();

  if (!jsonText) {
    showStatus("Please enter JSON data", true);
    return;
  }

  try {
    const result = await invoke("format_json", { input: jsonText });
    jsonHtmlInput.value = result;
    showStatus("✓ JSON data formatted successfully");
  } catch (error) {
    showStatus(`Error: ${error}`, true);
  }
}

function handleClearHtml() {
  jsonHtmlInput.value = "";
  htmlTemplate.value = "";
  htmlResult.innerHTML =
    '<div class="placeholder">Result will appear here after rendering</div>';
  showStatus("JSON to HTML cleared!");
}

async function handleCopyJsonHtml() {
  if (jsonHtmlInput.value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonHtmlInput.value);
        showStatus("✓ JSON data copied to clipboard");
      } else {
        await invoke("plugin:clipboard-manager|write_text", {
          text: jsonHtmlInput.value,
        });
        showStatus("✓ JSON data copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

async function handleCopyTemplate() {
  if (htmlTemplate.value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(htmlTemplate.value);
        showStatus("✓ HTML template copied to clipboard");
      } else {
        await invoke("plugin:clipboard-manager|write_text", {
          text: htmlTemplate.value,
        });
        showStatus("✓ HTML template copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

async function handleCopyResultHtml() {
  if (htmlResult.innerHTML && htmlResult.innerHTML !== '<div class="placeholder">Result will appear here after rendering</div>') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(htmlResult.innerHTML);
        showStatus("✓ HTML result copied to clipboard");
      } else {
        await invoke("plugin:clipboard-manager|write_text", {
          text: htmlResult.innerHTML,
        });
        showStatus("✓ HTML result copied to clipboard");
      }
    } catch (error) {
      showStatus(`Error: Failed to copy - ${error}`, true);
    }
  }
}

async function handleCopyHtmlResult() {
  await handleCopyResultHtml();
}

// Event listeners
document.getElementById("minifyBtn").addEventListener("click", handleMinify);
document.getElementById("formatBtn").addEventListener("click", handleFormat);
document.getElementById("sortKeysBtn").addEventListener("click", handleSortKeys);
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
document
  .getElementById("sortKeysLeftBtn")
  .addEventListener("click", () => handleSortKeysCompare("left"));
document
  .getElementById("sortKeysRightBtn")
  .addEventListener("click", () => handleSortKeysCompare("right"));
document.getElementById("compareBtn").addEventListener("click", handleCompare);
converterTabBtn.addEventListener("click", () => setActiveTab("converter"));
compareTabBtn.addEventListener("click", () => setActiveTab("compare"));
mermaidTabBtn.addEventListener("click", () => setActiveTab("mermaid"));
imageResizerTabBtn.addEventListener("click", () =>
  setActiveTab("imageResizer"),
);
opensslTabBtn.addEventListener("click", () => setActiveTab("openssl"));
tracerouteTabBtn.addEventListener("click", () => setActiveTab("traceroute"));
jsonHtmlTabBtn.addEventListener("click", () => setActiveTab("jsonHtml"));

// Mermaid event listeners
document
  .getElementById("renderMermaidBtn")
  .addEventListener("click", handleRenderMermaid);
document
  .getElementById("formatMermaidBtn")
  .addEventListener("click", handleFormatMermaid);
document
  .getElementById("downloadMermaidBtn")
  .addEventListener("click", handleDownloadMermaidPng);
document
  .getElementById("clearMermaidBtn")
  .addEventListener("click", handleClearMermaid);
document
  .getElementById("copyMermaidBtn")
  .addEventListener("click", handleCopyMermaid);

// JSON to HTML event listeners
document
  .getElementById("renderHtmlBtn")
  .addEventListener("click", handleRenderHtml);
formatJsonHtmlBtn.addEventListener("click", handleFormatJsonHtml);
document
  .getElementById("clearHtmlBtn")
  .addEventListener("click", handleClearHtml);
document
  .getElementById("copyJsonHtmlBtn")
  .addEventListener("click", handleCopyJsonHtml);
document
  .getElementById("copyTemplateBtn")
  .addEventListener("click", handleCopyTemplate);
document
  .getElementById("copyResultHtmlBtn")
  .addEventListener("click", handleCopyResultHtml);
document
  .getElementById("copyHtmlResultBtn")
  .addEventListener("click", handleCopyHtmlResult);

// Auto-render on Enter key for JSON input
jsonHtmlInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    handleRenderHtml();
  }
});

// Auto-render on Enter key for template input
htmlTemplate.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    handleRenderHtml();
  }
});

// Zoom event listeners
zoomInBtn.addEventListener("click", handleZoomIn);
zoomOutBtn.addEventListener("click", handleZoomOut);
zoomResetBtn.addEventListener("click", handleZoomReset);

// Drag/Pan event listeners
dragToggleBtn.addEventListener("click", toggleDragMode);
mermaidPreview.addEventListener("mousedown", handleDragStart);
document.addEventListener("mousemove", handleDragMove);
document.addEventListener("mouseup", handleDragEnd);

// Image Resizer event listeners
selectImageBtn.addEventListener("click", handleSelectImage);
imageFileInput.addEventListener("change", handleImageSelected);
convertToPngBtn.addEventListener("click", handleConvertToPng);
removeBackgroundBtn.addEventListener("click", handleRemoveBackground);
downloadResizedBtn.addEventListener("click", handleDownloadResized);
clearImageBtn.addEventListener("click", handleClearImage);
applyResizeBtn.addEventListener("click", handleApplyResize);
resizeMode.addEventListener("change", handleResizeModeChange);
resizePercentage.addEventListener("input", handlePercentageChange);
imageQuality.addEventListener("input", handleQualityChange);
resizeWidth.addEventListener("input", handleWidthChange);
resizeHeight.addEventListener("input", handleHeightChange);
bgTolerance.addEventListener("input", () => {
  toleranceValue.textContent = bgTolerance.value;
});

document
  .getElementById("opensslDetailBtn")
  .addEventListener("click", handleOpensslDetail);
document
  .getElementById("opensslUrlDetailBtn")
  .addEventListener("click", handleOpensslDetailFromUrl);
document
  .getElementById("clearOpensslBtn")
  .addEventListener("click", handleClearOpenssl);
document
  .getElementById("copyOpensslInputBtn")
  .addEventListener("click", handleCopyOpensslInput);
document
  .getElementById("copyOpensslOutputBtn")
  .addEventListener("click", handleCopyOpensslOutput);
document
  runTracerouteBtn
  .addEventListener("click", handleTraceroute);
document
  clearTracerouteBtn
  .addEventListener("click", handleClearTraceroute);
document
  copyTracerouteOutputBtn
  .addEventListener("click", handleCopyTracerouteOutput);

opensslUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleOpensslDetailFromUrl();
  }
});

tracerouteUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleTraceroute();
  }
});

// Tab key support for Mermaid editor
mermaidInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = mermaidInput.selectionStart;
    const end = mermaidInput.selectionEnd;

    if (e.shiftKey) {
      // Shift+Tab: Remove indentation
      const lineStart = mermaidInput.value.lastIndexOf("\n", start - 1) + 1;
      const lineText = mermaidInput.value.substring(lineStart, start);

      // Check if line starts with spaces
      const spacesToRemove = lineText.match(/^( {1,2})/);
      if (spacesToRemove) {
        const removeCount = spacesToRemove[1].length;
        mermaidInput.value =
          mermaidInput.value.substring(0, lineStart) +
          mermaidInput.value.substring(lineStart + removeCount);

        // Adjust cursor position
        mermaidInput.selectionStart = mermaidInput.selectionEnd = Math.max(
          lineStart,
          start - removeCount,
        );
      }
    } else {
      // Tab: Insert indentation (2 spaces)
      const spaces = "  ";
      mermaidInput.value =
        mermaidInput.value.substring(0, start) +
        spaces +
        mermaidInput.value.substring(end);

      // Move cursor after the inserted spaces
      mermaidInput.selectionStart = mermaidInput.selectionEnd =
        start + spaces.length;
    }
  }
});

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

// Clean smart/curly quotes to straight quotes on input to prevent quote replacement issues
document.querySelectorAll("textarea, input[type='text']").forEach((inputEl) => {
  inputEl.addEventListener("input", (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const val = e.target.value;

    const cleaned = val
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036”“”„‟″‟❝❞]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035‘’‚‛′‟❛❜]/g, "'");

    if (val !== cleaned) {
      e.target.value = cleaned;
      if (start !== null && end !== null) {
        e.target.setSelectionRange(start, end);
      }
    }
  });
});

// Mermaid Editor Splitter logic
const mermaidContainer = document.querySelector(".mermaid-container");
const mermaidEditorSection = document.querySelector(".mermaid-editor-section");
const mermaidSplitter = document.getElementById("mermaidSplitter");

let isDraggingSplitter = false;

if (mermaidSplitter && mermaidContainer && mermaidEditorSection) {
  mermaidSplitter.addEventListener("mousedown", (e) => {
    isDraggingSplitter = true;
    mermaidSplitter.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingSplitter) return;

    const containerRect = mermaidContainer.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;

    const minWidth = 300;
    const maxWidth = containerRect.width - minWidth - 8; // 8px splitter width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      mermaidEditorSection.style.flex = "none";
      mermaidEditorSection.style.width = `${newWidth}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDraggingSplitter) {
      isDraggingSplitter = false;
      mermaidSplitter.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  window.addEventListener("resize", () => {
    if (mermaidEditorSection.style.flex === "none") {
      const containerRect = mermaidContainer.getBoundingClientRect();
      const currentWidth = parseFloat(mermaidEditorSection.style.width);
      const minWidth = 300;
      const maxWidth = containerRect.width - minWidth - 8;
      if (currentWidth > maxWidth) {
        mermaidEditorSection.style.width = `${Math.max(minWidth, maxWidth)}px`;
      }
    }
  });
}

// Fullscreen mode logic for Mermaid preview
const mermaidFullscreenBtn = document.getElementById("mermaidFullscreenBtn");
const mermaidPreviewSection = document.querySelector(".mermaid-preview-section");

if (mermaidFullscreenBtn && mermaidPreviewSection) {
  mermaidFullscreenBtn.addEventListener("click", () => {
    const isFullscreen = mermaidPreviewSection.classList.toggle("fullscreen");
    if (isFullscreen) {
      mermaidFullscreenBtn.innerHTML = "✕";
      mermaidFullscreenBtn.title = "Exit Full Screen";
    } else {
      mermaidFullscreenBtn.innerHTML = "⛶";
      mermaidFullscreenBtn.title = "Toggle Full Screen";
    }
  });

  // Support exiting fullscreen using the Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mermaidPreviewSection.classList.contains("fullscreen")) {
      mermaidPreviewSection.classList.remove("fullscreen");
      mermaidFullscreenBtn.innerHTML = "⛶";
      mermaidFullscreenBtn.title = "Toggle Full Screen";
    }
  });
}

// Auto-render Mermaid code on input (500ms debounce)
let autoRenderTimeout = null;
if (mermaidInput) {
  mermaidInput.addEventListener("input", () => {
    if (autoRenderTimeout) {
      clearTimeout(autoRenderTimeout);
    }
    autoRenderTimeout = setTimeout(() => {
      handleRenderMermaid();
    }, 500);
  });
}

// Template selection listener
if (mermaidTemplateSelect) {
  mermaidTemplateSelect.addEventListener("change", () => {
    const templateKey = mermaidTemplateSelect.value;
    if (templateKey && MERMAID_TEMPLATES[templateKey]) {
      mermaidInput.value = formatMermaid(MERMAID_TEMPLATES[templateKey]);
      handleRenderMermaid();
      // Reset dropdown select placeholder
      mermaidTemplateSelect.value = "";
    }
  });
}

// Theme selection listener
if (mermaidThemeSelect) {
  mermaidThemeSelect.addEventListener("change", () => {
    const selectedTheme = mermaidThemeSelect.value || "default";
    mermaid.initialize({
      startOnLoad: false,
      theme: selectedTheme,
      securityLevel: "loose",
      fontFamily: "JetBrains Mono, monospace",
    });
    handleRenderMermaid();
  });
}

// Zoom Fit button listener
if (zoomFitBtn) {
  zoomFitBtn.addEventListener("click", handleZoomFit);
}

// URL Beautifier functions

function parseUrl(urlStr) {
  try {
    let cleanUrl = urlStr.trim();
    if (!/^[a-zA-Z]+:\/\//.test(cleanUrl) && !cleanUrl.startsWith("//")) {
      cleanUrl = "http://" + cleanUrl;
    }

    const parsed = new URL(cleanUrl);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      username: parsed.username,
      password: parsed.password
    };
  } catch (e) {
    throw new Error("Invalid URL format: " + e.message);
  }
}

function renderUrlComponents(components) {
  urlProtocol.value = components.protocol || "";
  urlHostname.value = components.hostname || "";
  urlPort.value = components.port || "";
  urlPathname.value = components.pathname || "";
  urlHash.value = components.hash || "";

  // Parse search params
  const searchParams = new URLSearchParams(components.search);
  urlParamsList.innerHTML = "";

  let count = 0;
  for (const [key, value] of searchParams.entries()) {
    addParamRow(key, value);
    count++;
  }

  if (count === 0) {
    urlParamsList.innerHTML = '<div class="params-placeholder">No query parameters found</div>';
  }
}

function addParamRow(key = "", value = "") {
  const placeholder = urlParamsList.querySelector(".params-placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  const row = document.createElement("div");
  row.className = "url-param-row";
  row.innerHTML = `
    <input type="text" class="param-key" placeholder="Key" value="${escapeHtml(key)}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" />
    <input type="text" class="param-value" placeholder="Value" value="${escapeHtml(value)}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" />
    <button class="copy-mini-btn" title="Copy Value">📋</button>
    <button class="delete-mini-btn" title="Delete Parameter">✕</button>
  `;

  row.querySelector(".copy-mini-btn").addEventListener("click", async () => {
    const keyText = row.querySelector(".param-key").value.trim();
    const valText = row.querySelector(".param-value").value;
    if (valText) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(valText);
          showStatus(`✓ Value of parameter "${keyText || "unnamed"}" copied`);
        } else {
          await invoke("plugin:clipboard-manager|write_text", { text: valText });
          showStatus(`✓ Value of parameter "${keyText || "unnamed"}" copied`);
        }
      } catch (e) {
        showStatus("Failed to copy parameter value", true);
      }
    }
  });

  row.querySelector(".delete-mini-btn").addEventListener("click", () => {
    row.remove();
    if (urlParamsList.children.length === 0) {
      urlParamsList.innerHTML = '<div class="params-placeholder">No query parameters found</div>';
    }
  });

  urlParamsList.appendChild(row);
}

function handleUrlBeautify() {
  const urlStr = urlInput.value.trim();
  if (!urlStr) {
    showStatus("Please enter a URL", true);
    return;
  }

  try {
    const components = parseUrl(urlStr);
    renderUrlComponents(components);
    showStatus("✓ URL parsed and beautified successfully");
  } catch (err) {
    showStatus(err.message, true);
  }
}

function handleUrlEncode() {
  const urlStr = urlInput.value.trim();
  if (!urlStr) return;
  urlInput.value = encodeURI(urlStr);
  showStatus("✓ Entire URL encoded");
}

function handleUrlDecode() {
  const urlStr = urlInput.value.trim();
  if (!urlStr) return;
  try {
    urlInput.value = decodeURI(urlStr);
    showStatus("✓ Entire URL decoded");
  } catch (e) {
    showStatus("Error decoding URL", true);
  }
}

function handleUrlReconstruct() {
  try {
    const protocol = urlProtocol.value.trim();
    const hostname = urlHostname.value.trim();
    const port = urlPort.value.trim();
    const pathname = urlPathname.value.trim();
    const hash = urlHash.value.trim();

    if (!hostname) {
      showStatus("Hostname is required to reconstruct URL", true);
      return;
    }

    // Build base URL
    let url = "";
    if (protocol) {
      url += protocol;
      if (!protocol.endsWith(":")) {
        url += ":";
      }
      url += "//";
    } else {
      url += "http://";
    }

    url += hostname;
    if (port) {
      url += ":" + port;
    }

    if (pathname) {
      if (!pathname.startsWith("/")) {
        url += "/";
      }
      url += pathname;
    }

    // Build query params
    const params = [];
    const rows = urlParamsList.querySelectorAll(".url-param-row");
    rows.forEach(row => {
      const key = row.querySelector(".param-key").value.trim();
      const val = row.querySelector(".param-value").value.trim();
      if (key) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    if (hash) {
      if (!hash.startsWith("#")) {
        url += "#";
      }
      url += hash;
    }

    urlInput.value = url;
    showStatus("✓ URL reconstructed from components");
  } catch (err) {
    showStatus("Failed to reconstruct: " + err.message, true);
  }
}

function handleUrlClear() {
  urlInput.value = "";
  urlProtocol.value = "";
  urlHostname.value = "";
  urlPort.value = "";
  urlPathname.value = "";
  urlHash.value = "";
  urlParamsList.innerHTML = '<div class="params-placeholder">No query parameters found</div>';
  showStatus("URL fields cleared");
}

async function handleCopyUrlInput() {
  if (urlInput.value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlInput.value);
        showStatus("✓ URL copied to clipboard");
      } else {
        await invoke("plugin:clipboard-manager|write_text", { text: urlInput.value });
        showStatus("✓ URL copied to clipboard");
      }
    } catch (e) {
      showStatus("Failed to copy URL", true);
    }
  }
}

// URL tab listeners
urlTabBtn.addEventListener("click", () => setActiveTab("url"));

// URL Beautifier event listeners
document.getElementById("urlBeautifyBtn").addEventListener("click", handleUrlBeautify);
document.getElementById("urlEncodeBtn").addEventListener("click", handleUrlEncode);
document.getElementById("urlDecodeBtn").addEventListener("click", handleUrlDecode);
document.getElementById("urlReconstructBtn").addEventListener("click", handleUrlReconstruct);
document.getElementById("urlClearBtn").addEventListener("click", handleUrlClear);
document.getElementById("urlAddParamBtn").addEventListener("click", () => addParamRow("", ""));
document.getElementById("copyUrlInputBtn").addEventListener("click", handleCopyUrlInput);

// ==========================================================================
// JSON Editor Implementation
// ==========================================================================

let jsonEditorData = null;
let jsonEditorCollapsedPaths = new Set();
let jsonEditorSearchTerm = "";
let jsonEditorInitialized = false;
let jsonEditorSyncDebounce = null;

const JSON_EDITOR_SAMPLES = {
  stringified_api: {
    event_id: "evt_984321",
    timestamp: "2026-09-01T12:00:00Z",
    source: "kafka.orders.events",
    retry_count: 0,
    headers: {
      "x-correlation-id": "corr-4491-aa",
      "x-auth-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    },
    raw_payload: "{\"order_id\":\"ORD-9912\",\"customer_name\":\"Budi Santoso\",\"email\":\"budi.santoso@example.com\",\"items\":[{\"product_id\":\"PROD-1\",\"name\":\"Mechanical Keyboard\",\"qty\":1,\"price\":750000}],\"payment\":{\"method\":\"qris\",\"paid\":true,\"amount\":750000}}",
    meta_info: "{\"ip_address\":\"192.168.1.1\",\"user_agent\":\"Mozilla/5.0\"}"
  },
  ecommerce: {
    store_name: "Toko Palugada Official",
    currency: "IDR",
    total_products: 2,
    categories: ["Electronics", "Accessories"],
    products: [
      {
        id: 101,
        name: "Wireless Noise-Cancelling Headphones",
        brand: "SonicMaster",
        price: 1250000,
        in_stock: true,
        stock_count: 45,
        rating: 4.8,
        tags: ["bluetooth", "audio", "sale"],
        specifications: {
          battery_hours: 30,
          weight_grams: 250,
          warranty_months: 12
        }
      },
      {
        id: 102,
        name: "Ergonomic Aluminium Laptop Stand",
        brand: "FlexiDesk",
        price: 350000,
        in_stock: true,
        stock_count: 120,
        rating: 4.9,
        tags: ["desk", "ergonomics"],
        specifications: {
          material: "Aluminium Alloy",
          weight_grams: 450,
          warranty_months: 6
        }
      }
    ]
  },
  user_profile: {
    user_id: 2184,
    username: "johndoe",
    email: "john.doe@example.com",
    role: "administrator",
    is_active: true,
    profile: {
      first_name: "John",
      last_name: "Doe",
      phone: "+6281234567890",
      avatar_url: "https://avatar.iran.liara.run/public/boy",
      bio: "Fullstack Engineer & Palugada Power User"
    },
    preferences: {
      theme: "dark",
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      languages: ["en", "id"]
    },
    login_history: [
      { ip: "103.20.18.5", timestamp: "2026-09-01T08:30:00Z", success: true },
      { ip: "103.20.18.5", timestamp: "2026-08-31T14:15:00Z", success: true }
    ]
  }
};

function initJsonEditor() {
  jsonEditorInitialized = true;
  if (!jsonEditorRawInput.value.trim()) {
    jsonEditorData = JSON.parse(JSON.stringify(JSON_EDITOR_SAMPLES.ecommerce));
    updateJsonEditorRawFromData();
  } else {
    updateJsonEditorDataFromRaw(true);
  }
}

function getValueType(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")))) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === "object") {
      return parsed;
    }
  } catch (e) {}
  return null;
}

function unpackAllStringifiedJson(data) {
  if (typeof data === "string") {
    const parsed = tryParseJsonString(data);
    if (parsed !== null) {
      return unpackAllStringifiedJson(parsed);
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => unpackAllStringifiedJson(item));
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      res[k] = unpackAllStringifiedJson(v);
    }
    return res;
  }
  return data;
}

function generateDefaultFromSchema(sample) {
  if (sample === null || sample === undefined) return null;
  if (Array.isArray(sample)) {
    if (sample.length === 0) return [];
    return [generateDefaultFromSchema(sample[0])];
  }
  if (typeof sample === "object") {
    const res = {};
    for (const k of Object.keys(sample)) {
      res[k] = generateDefaultFromSchema(sample[k]);
    }
    return res;
  }
  if (typeof sample === "string") return "";
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
}

function getDefaultValueForType(type) {
  switch (type) {
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "null": return null;
    case "array": return [];
    case "object": return {};
    default: return "";
  }
}

function getValueAtPath(data, path) {
  let curr = data;
  for (const seg of path) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[seg];
  }
  return curr;
}

function setValueAtPath(data, path, value) {
  if (path.length === 0) {
    jsonEditorData = value;
    return;
  }
  let curr = data;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]];
  }
  curr[path[path.length - 1]] = value;
}

function deleteValueAtPath(data, path) {
  if (path.length === 0) {
    jsonEditorData = {};
    return;
  }
  let curr = data;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]];
  }
  const lastKey = path[path.length - 1];
  if (Array.isArray(curr)) {
    curr.splice(Number(lastKey), 1);
  } else if (curr && typeof curr === "object") {
    delete curr[lastKey];
  }
}

function renameKeyAtPath(data, parentPath, oldKey, newKey) {
  if (oldKey === newKey) return;
  const parent = parentPath.length === 0 ? data : getValueAtPath(data, parentPath);
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return;

  const entries = Object.entries(parent);
  const newObj = {};
  for (const [k, v] of entries) {
    if (k === oldKey) {
      newObj[newKey] = v;
    } else {
      newObj[k] = v;
    }
  }
  if (parentPath.length === 0) {
    jsonEditorData = newObj;
  } else {
    setValueAtPath(data, parentPath, newObj);
  }
}

function autoFixMalformedJsonText(text) {
  if (!text || !text.trim()) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
  cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (m, content) => {
    return '"' + content.replace(/"/g, '\\"') + '"';
  });
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
}

function convertKeyCase(str, targetCase) {
  const words = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/);
  if (words.length === 0 || words[0] === '') return str;

  switch (targetCase) {
    case "camel":
      return words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case "snake":
      return words.join('_');
    case "kebab":
      return words.join('-');
    case "pascal":
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    default:
      return str;
  }
}

function convertAllKeysCase(data, targetCase) {
  if (Array.isArray(data)) {
    return data.map(item => convertAllKeysCase(item, targetCase));
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      const newKey = convertKeyCase(k, targetCase);
      res[newKey] = convertAllKeysCase(v, targetCase);
    }
    return res;
  }
  return data;
}

function maskPiiData(data) {
  if (typeof data === "string") {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const parts = data.split('@');
      const name = parts[0];
      const maskedName = name.length > 2 ? name.slice(0, 2) + "***" : "***";
      return `${maskedName}@${parts[1]}`;
    }
    if (/^\+?[0-9\s\-()]{8,20}$/.test(data) && /\d{4,}/.test(data)) {
      return data.slice(0, 3) + "****" + data.slice(-2);
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(maskPiiData);
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      const lowerKey = k.toLowerCase();
      if (lowerKey.includes("password") || lowerKey.includes("secret") || lowerKey.includes("token") || lowerKey.includes("api_key") || lowerKey.includes("auth")) {
        res[k] = "********";
      } else {
        res[k] = maskPiiData(v);
      }
    }
    return res;
  }
  return data;
}

function formatJsonPath(path) {
  if (path.length === 0) return "$";
  let str = "$";
  for (const seg of path) {
    if (typeof seg === "number" || /^\d+$/.test(seg)) {
      str += `[${seg}]`;
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      str += `.${seg}`;
    } else {
      str += `["${seg}"]`;
    }
  }
  return str;
}

function updateJsonEditorRawFromData() {
  try {
    const formatted = JSON.stringify(jsonEditorData, null, 2);
    jsonEditorRawInput.value = formatted;
    jsonEditorErrorBanner.classList.add("hidden");
    jsonEditorErrorBanner.textContent = "";
    jsonEditorStats.className = "editor-stats-badge";
    const bytes = new Blob([formatted]).size;
    jsonEditorStats.textContent = `Valid JSON • ${bytes} B`;
    renderJsonEditorTree();
  } catch (err) {
    jsonEditorErrorBanner.classList.remove("hidden");
    jsonEditorErrorBanner.textContent = "Error updating JSON: " + err.message;
    jsonEditorStats.className = "editor-stats-badge error";
    jsonEditorStats.textContent = "Parse Error";
  }
}

function updateJsonEditorDataFromRaw(renderTree = true) {
  const raw = jsonEditorRawInput.value.trim();
  if (!raw) {
    jsonEditorData = {};
    jsonEditorErrorBanner.classList.add("hidden");
    jsonEditorStats.className = "editor-stats-badge";
    jsonEditorStats.textContent = "Empty";
    if (renderTree) renderJsonEditorTree();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    jsonEditorData = parsed;
    jsonEditorErrorBanner.classList.add("hidden");
    jsonEditorErrorBanner.textContent = "";
    jsonEditorStats.className = "editor-stats-badge";
    const bytes = new Blob([raw]).size;
    jsonEditorStats.textContent = `Valid JSON • ${bytes} B`;
    if (renderTree) renderJsonEditorTree();
  } catch (err) {
    jsonEditorErrorBanner.classList.remove("hidden");
    jsonEditorErrorBanner.textContent = "Invalid JSON: " + err.message;
    jsonEditorStats.className = "editor-stats-badge error";
    jsonEditorStats.textContent = "Syntax Error";
  }
}

function renderJsonEditorTree() {
  jsonEditorTreeContainer.innerHTML = "";
  if (jsonEditorData === null || jsonEditorData === undefined) {
    jsonEditorTreeContainer.innerHTML = `
      <div class="tree-empty-placeholder">
        <p>No JSON data loaded</p>
        <button class="primary" id="treeLoadSampleBtn">Load Sample JSON</button>
      </div>
    `;
    const loadSampleBtn = document.getElementById("treeLoadSampleBtn");
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener("click", () => {
        jsonEditorData = JSON.parse(JSON.stringify(JSON_EDITOR_SAMPLES.ecommerce));
        updateJsonEditorRawFromData();
      });
    }
    return;
  }

  const rootEl = createTreeNode(jsonEditorData, [], null, true);
  jsonEditorTreeContainer.appendChild(rootEl);
}

function createTreeNode(data, path, keyName = null, isRoot = false) {
  const nodeEl = document.createElement("div");
  nodeEl.className = `tree-node ${isRoot ? "root-node" : ""}`;
  const pathStr = path.join(".");
  const isCollapsed = jsonEditorCollapsedPaths.has(pathStr);
  const type = getValueType(data);
  const isContainer = type === "object" || type === "array";

  const rowEl = document.createElement("div");
  rowEl.className = "tree-row";

  // Check search match
  if (jsonEditorSearchTerm) {
    const term = jsonEditorSearchTerm.toLowerCase();
    const keyMatch = keyName !== null && String(keyName).toLowerCase().includes(term);
    const valMatch = !isContainer && data !== null && String(data).toLowerCase().includes(term);
    if (keyMatch || valMatch) {
      rowEl.classList.add("highlight-match");
    }
  }

  // 1. Toggle icon for object/array
  if (isContainer) {
    const toggleEl = document.createElement("span");
    toggleEl.className = `tree-toggle ${isCollapsed ? "collapsed" : ""}`;
    toggleEl.textContent = "▼";
    toggleEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (jsonEditorCollapsedPaths.has(pathStr)) {
        jsonEditorCollapsedPaths.delete(pathStr);
      } else {
        jsonEditorCollapsedPaths.add(pathStr);
      }
      renderJsonEditorTree();
    });
    rowEl.appendChild(toggleEl);
  } else {
    const spacer = document.createElement("span");
    spacer.style.width = "14px";
    spacer.style.display = "inline-block";
    rowEl.appendChild(spacer);
  }

  // 2. Key input or Array Index
  if (!isRoot) {
    const parentPath = path.slice(0, -1);
    const parentVal = parentPath.length === 0 ? jsonEditorData : getValueAtPath(jsonEditorData, parentPath);
    const parentIsArray = Array.isArray(parentVal);

    if (parentIsArray) {
      const indexBadge = document.createElement("span");
      indexBadge.className = "tree-array-index";
      indexBadge.textContent = `[${keyName}]`;
      rowEl.appendChild(indexBadge);
    } else {
      const keyInput = document.createElement("input");
      keyInput.type = "text";
      keyInput.className = "tree-key-input";
      keyInput.value = keyName;
      keyInput.spellcheck = false;
      keyInput.addEventListener("change", (e) => {
        const newKey = e.target.value.trim();
        if (newKey && newKey !== keyName) {
          renameKeyAtPath(jsonEditorData, parentPath, keyName, newKey);
          updateJsonEditorRawFromData();
        } else {
          e.target.value = keyName;
        }
      });
      rowEl.appendChild(keyInput);
    }

    const colon = document.createElement("span");
    colon.className = "tree-colon";
    colon.textContent = ":";
    rowEl.appendChild(colon);
  } else {
    const rootBadge = document.createElement("span");
    rootBadge.className = "tree-array-index";
    rootBadge.textContent = "root";
    rowEl.appendChild(rootBadge);

    const colon = document.createElement("span");
    colon.className = "tree-colon";
    colon.textContent = ":";
    rowEl.appendChild(colon);
  }

  // 3. Value editor
  let stringifiedJsonParsed = null;
  if (type === "string") {
    stringifiedJsonParsed = tryParseJsonString(data);
    const valInput = document.createElement("input");
    valInput.type = "text";
    valInput.className = "tree-value-input";
    valInput.value = data;
    valInput.spellcheck = false;
    valInput.addEventListener("change", (e) => {
      setValueAtPath(jsonEditorData, path, e.target.value);
      updateJsonEditorRawFromData();
    });
    rowEl.appendChild(valInput);
  } else if (type === "number") {
    const valInput = document.createElement("input");
    valInput.type = "number";
    valInput.step = "any";
    valInput.className = "tree-value-input";
    valInput.value = data;
    valInput.spellcheck = false;
    valInput.addEventListener("change", (e) => {
      const num = Number(e.target.value);
      setValueAtPath(jsonEditorData, path, isNaN(num) ? 0 : num);
      updateJsonEditorRawFromData();
    });
    rowEl.appendChild(valInput);
  } else if (type === "boolean") {
    const boolSelect = document.createElement("select");
    boolSelect.className = "tree-bool-select";
    boolSelect.innerHTML = `
      <option value="true" ${data === true ? "selected" : ""}>true</option>
      <option value="false" ${data === false ? "selected" : ""}>false</option>
    `;
    boolSelect.addEventListener("change", (e) => {
      setValueAtPath(jsonEditorData, path, e.target.value === "true");
      updateJsonEditorRawFromData();
    });
    rowEl.appendChild(boolSelect);
  } else if (type === "null") {
    const nullSpan = document.createElement("span");
    nullSpan.className = "tree-null-value";
    nullSpan.textContent = "null";
    rowEl.appendChild(nullSpan);
  } else if (type === "object") {
    const keysCount = Object.keys(data || {}).length;
    const objSpan = document.createElement("span");
    objSpan.innerHTML = `<span class="tree-bracket">{ }</span> <span class="tree-items-count">${keysCount} ${keysCount === 1 ? 'key' : 'keys'}</span>`;
    rowEl.appendChild(objSpan);
  } else if (type === "array") {
    const itemsCount = (data || []).length;
    const arrSpan = document.createElement("span");
    arrSpan.innerHTML = `<span class="tree-bracket">[ ]</span> <span class="tree-items-count">${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}</span>`;
    rowEl.appendChild(arrSpan);
  }

  // 4. Type Badge / Type Switcher
  const typeBadge = document.createElement("span");
  typeBadge.className = `tree-type-badge type-${type}`;
  typeBadge.textContent = type;
  rowEl.appendChild(typeBadge);

  const typeSelect = document.createElement("select");
  typeSelect.className = "tree-type-select";
  typeSelect.innerHTML = `
    <option value="string" ${type === "string" ? "selected" : ""}>str</option>
    <option value="number" ${type === "number" ? "selected" : ""}>num</option>
    <option value="boolean" ${type === "boolean" ? "selected" : ""}>bool</option>
    <option value="null" ${type === "null" ? "selected" : ""}>null</option>
    <option value="object" ${type === "object" ? "selected" : ""}>obj</option>
    <option value="array" ${type === "array" ? "selected" : ""}>arr</option>
  `;
  typeSelect.addEventListener("change", (e) => {
    const newType = e.target.value;
    if (newType !== type) {
      const defaultVal = getDefaultValueForType(newType);
      setValueAtPath(jsonEditorData, path, defaultVal);
      updateJsonEditorRawFromData();
    }
  });
  rowEl.appendChild(typeSelect);

  // 5. Action Buttons Toolbar
  const actionsEl = document.createElement("div");
  actionsEl.className = "tree-actions";

  // If stringified JSON is detected, show glowing Unpack button
  if (stringifiedJsonParsed !== null) {
    const unpackBtn = document.createElement("button");
    unpackBtn.className = "tree-btn tree-btn-unpack";
    unpackBtn.innerHTML = "🔄 Unpack JSON";
    unpackBtn.title = "Parse this string into a nested JSON structure";
    unpackBtn.addEventListener("click", () => {
      setValueAtPath(jsonEditorData, path, stringifiedJsonParsed);
      updateJsonEditorRawFromData();
      showStatus("✓ Stringified JSON unpacked into object/array");
    });
    actionsEl.appendChild(unpackBtn);
  }

  // If Object: Add Property / Sub-Object / Sub-Array
  if (type === "object") {
    const addPropBtn = document.createElement("button");
    addPropBtn.className = "tree-btn tree-btn-add";
    addPropBtn.textContent = "+ Key";
    addPropBtn.title = "Add new property";
    addPropBtn.addEventListener("click", () => {
      let keyIndex = 1;
      while (data.hasOwnProperty(`newKey${keyIndex}`)) keyIndex++;
      data[`newKey${keyIndex}`] = "";
      updateJsonEditorRawFromData();
    });
    actionsEl.appendChild(addPropBtn);

    const addObjBtn = document.createElement("button");
    addObjBtn.className = "tree-btn tree-btn-add";
    addObjBtn.textContent = "+ {}";
    addObjBtn.title = "Add nested object";
    addObjBtn.addEventListener("click", () => {
      let keyIndex = 1;
      while (data.hasOwnProperty(`newObject${keyIndex}`)) keyIndex++;
      data[`newObject${keyIndex}`] = {};
      updateJsonEditorRawFromData();
    });
    actionsEl.appendChild(addObjBtn);

    const addArrBtn = document.createElement("button");
    addArrBtn.className = "tree-btn tree-btn-add";
    addArrBtn.textContent = "+ []";
    addArrBtn.title = "Add nested array";
    addArrBtn.addEventListener("click", () => {
      let keyIndex = 1;
      while (data.hasOwnProperty(`newArray${keyIndex}`)) keyIndex++;
      data[`newArray${keyIndex}`] = [];
      updateJsonEditorRawFromData();
    });
    actionsEl.appendChild(addArrBtn);

    if (!isRoot) {
      const stringifyBtn = document.createElement("button");
      stringifyBtn.className = "tree-btn";
      stringifyBtn.textContent = "📦 Stringify";
      stringifyBtn.title = "Convert this object into an escaped JSON string";
      stringifyBtn.addEventListener("click", () => {
        setValueAtPath(jsonEditorData, path, JSON.stringify(data));
        updateJsonEditorRawFromData();
        showStatus("✓ Object converted to JSON string");
      });
      actionsEl.appendChild(stringifyBtn);
    }
  }

  // If Array: Smart Add Item with Default Schema, Add Empty, Duplicate, Reorder
  if (type === "array") {
    const addDefaultBtn = document.createElement("button");
    addDefaultBtn.className = "tree-btn tree-btn-add-default";
    addDefaultBtn.innerHTML = "✨ + Add Item (Default)";
    addDefaultBtn.title = "Add new item duplicating the schema with default empty values";
    addDefaultBtn.addEventListener("click", () => {
      let newItem;
      if (data.length > 0) {
        newItem = generateDefaultFromSchema(data[0]);
      } else {
        newItem = { id: 0, name: "", active: false };
      }
      data.push(newItem);
      updateJsonEditorRawFromData();
      showStatus("✓ Added new list item with default values");
    });
    actionsEl.appendChild(addDefaultBtn);

    const addEmptyBtn = document.createElement("button");
    addEmptyBtn.className = "tree-btn tree-btn-add";
    addEmptyBtn.textContent = "+ Item";
    addEmptyBtn.title = "Add empty primitive item";
    addEmptyBtn.addEventListener("click", () => {
      data.push("");
      updateJsonEditorRawFromData();
    });
    actionsEl.appendChild(addEmptyBtn);

    if (!isRoot) {
      const stringifyBtn = document.createElement("button");
      stringifyBtn.className = "tree-btn";
      stringifyBtn.textContent = "📦 Stringify";
      stringifyBtn.title = "Convert this array into an escaped JSON string";
      stringifyBtn.addEventListener("click", () => {
        setValueAtPath(jsonEditorData, path, JSON.stringify(data));
        updateJsonEditorRawFromData();
        showStatus("✓ Array converted to JSON string");
      });
      actionsEl.appendChild(stringifyBtn);
    }
  }

  // If parent is Array: Allow Duplicate, Move Up, Move Down
  if (!isRoot) {
    const parentPath = path.slice(0, -1);
    const parentVal = parentPath.length === 0 ? jsonEditorData : getValueAtPath(jsonEditorData, parentPath);
    if (Array.isArray(parentVal)) {
      const currentIndex = Number(path[path.length - 1]);

      const dupBtn = document.createElement("button");
      dupBtn.className = "tree-btn tree-btn-dup";
      dupBtn.textContent = "📋 Dup";
      dupBtn.title = "Duplicate this item";
      dupBtn.addEventListener("click", () => {
        const cloned = JSON.parse(JSON.stringify(data));
        parentVal.splice(currentIndex + 1, 0, cloned);
        updateJsonEditorRawFromData();
      });
      actionsEl.appendChild(dupBtn);

      if (currentIndex > 0) {
        const moveUpBtn = document.createElement("button");
        moveUpBtn.className = "tree-btn tree-btn-move";
        moveUpBtn.textContent = "⬆";
        moveUpBtn.title = "Move Up";
        moveUpBtn.addEventListener("click", () => {
          const temp = parentVal[currentIndex];
          parentVal[currentIndex] = parentVal[currentIndex - 1];
          parentVal[currentIndex - 1] = temp;
          updateJsonEditorRawFromData();
        });
        actionsEl.appendChild(moveUpBtn);
      }

      if (currentIndex < parentVal.length - 1) {
        const moveDownBtn = document.createElement("button");
        moveDownBtn.className = "tree-btn tree-btn-move";
        moveDownBtn.textContent = "⬇";
        moveDownBtn.title = "Move Down";
        moveDownBtn.addEventListener("click", () => {
          const temp = parentVal[currentIndex];
          parentVal[currentIndex] = parentVal[currentIndex + 1];
          parentVal[currentIndex + 1] = temp;
          updateJsonEditorRawFromData();
        });
        actionsEl.appendChild(moveDownBtn);
      }
    }

    // Delete Node Button
    const delBtn = document.createElement("button");
    delBtn.className = "tree-btn tree-btn-del";
    delBtn.textContent = "🗑";
    delBtn.title = "Delete this node";
    delBtn.addEventListener("click", () => {
      deleteValueAtPath(jsonEditorData, path);
      updateJsonEditorRawFromData();
    });
    actionsEl.appendChild(delBtn);

    // Copy JSON Path
    const copyPathBtn = document.createElement("button");
    copyPathBtn.className = "tree-btn tree-btn-copy-path";
    copyPathBtn.textContent = "🔗 Path";
    copyPathBtn.title = "Copy JSON Path";
    copyPathBtn.addEventListener("click", async () => {
      const fullPath = formatJsonPath(path);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullPath);
        } else {
          await invoke("plugin:clipboard-manager|write_text", { text: fullPath });
        }
        showStatus(`✓ Copied path: ${fullPath}`);
      } catch (e) {
        showStatus(`Path: ${fullPath}`);
      }
    });
    actionsEl.appendChild(copyPathBtn);
  }

  rowEl.appendChild(actionsEl);
  nodeEl.appendChild(rowEl);

  // 6. Recursively render children if object/array and not collapsed
  if (isContainer && !isCollapsed) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    if (type === "object") {
      for (const [k, v] of Object.entries(data || {})) {
        const childNode = createTreeNode(v, [...path, k], k, false);
        childrenContainer.appendChild(childNode);
      }
    } else if (type === "array") {
      (data || []).forEach((item, idx) => {
        const childNode = createTreeNode(item, [...path, idx], idx, false);
        childrenContainer.appendChild(childNode);
      });
    }

    nodeEl.appendChild(childrenContainer);
  }

  return nodeEl;
}

// JSON Editor Event Listeners
jsonEditorTabBtn.addEventListener("click", () => setActiveTab("jsonEditor"));

jsonEditorRawInput.addEventListener("input", () => {
  clearTimeout(jsonEditorSyncDebounce);
  jsonEditorSyncDebounce = setTimeout(() => {
    updateJsonEditorDataFromRaw(true);
  }, 300);
});

jsonEditorSearchInput.addEventListener("input", (e) => {
  jsonEditorSearchTerm = e.target.value.trim();
  renderJsonEditorTree();
});

jsonEditorFormatBtn.addEventListener("click", () => {
  try {
    const raw = jsonEditorRawInput.value.trim();
    if (raw) {
      jsonEditorData = JSON.parse(raw);
      updateJsonEditorRawFromData();
      showStatus("✓ JSON formatted");
    }
  } catch (err) {
    showStatus("Format failed: " + err.message, true);
  }
});

jsonEditorMinifyBtn.addEventListener("click", () => {
  try {
    const raw = jsonEditorRawInput.value.trim();
    if (raw) {
      const minified = JSON.stringify(JSON.parse(raw));
      jsonEditorRawInput.value = minified;
      jsonEditorData = JSON.parse(minified);
      jsonEditorStats.textContent = `Valid JSON • ${new Blob([minified]).size} B`;
      renderJsonEditorTree();
      showStatus("✓ JSON minified");
    }
  } catch (err) {
    showStatus("Minify failed: " + err.message, true);
  }
});

jsonEditorAutoFixBtn.addEventListener("click", () => {
  const raw = jsonEditorRawInput.value;
  if (!raw.trim()) {
    showStatus("JSON is empty", true);
    return;
  }
  try {
    const fixedText = autoFixMalformedJsonText(raw);
    const parsed = JSON.parse(fixedText);
    jsonEditorData = parsed;
    updateJsonEditorRawFromData();
    showStatus("✓ Auto-repaired malformed JSON successfully!");
  } catch (err) {
    showStatus("Auto-fix could not parse: " + err.message, true);
  }
});

jsonEditorUnpackAllBtn.addEventListener("click", () => {
  if (jsonEditorData) {
    jsonEditorData = unpackAllStringifiedJson(jsonEditorData);
    updateJsonEditorRawFromData();
    showStatus("✓ All stringified JSONs unpacked into nested objects!");
  }
});

jsonEditorCaseSelect.addEventListener("change", (e) => {
  const targetCase = e.target.value;
  if (targetCase && jsonEditorData) {
    jsonEditorData = convertAllKeysCase(jsonEditorData, targetCase);
    updateJsonEditorRawFromData();
    showStatus(`✓ Keys converted to ${targetCase}Case`);
    e.target.value = "";
  }
});

jsonEditorMaskPiiBtn.addEventListener("click", () => {
  if (jsonEditorData) {
    jsonEditorData = maskPiiData(jsonEditorData);
    updateJsonEditorRawFromData();
    showStatus("✓ Sensitive PII data masked!");
  }
});

jsonEditorSampleSelect.addEventListener("change", (e) => {
  const sampleKey = e.target.value;
  if (sampleKey && JSON_EDITOR_SAMPLES[sampleKey]) {
    jsonEditorData = JSON.parse(JSON.stringify(JSON_EDITOR_SAMPLES[sampleKey]));
    jsonEditorCollapsedPaths.clear();
    updateJsonEditorRawFromData();
    showStatus(`✓ Loaded ${sampleKey} sample`);
    e.target.value = "";
  }
});

jsonEditorExpandAllBtn.addEventListener("click", () => {
  jsonEditorCollapsedPaths.clear();
  renderJsonEditorTree();
  showStatus("All nodes expanded");
});

function collectAllObjectPaths(data, path = []) {
  if (data && typeof data === "object") {
    if (path.length > 0) {
      jsonEditorCollapsedPaths.add(path.join("."));
    }
    if (Array.isArray(data)) {
      data.forEach((item, idx) => collectAllObjectPaths(item, [...path, idx]));
    } else {
      for (const [k, v] of Object.entries(data)) {
        collectAllObjectPaths(v, [...path, k]);
      }
    }
  }
}

jsonEditorCollapseAllBtn.addEventListener("click", () => {
  jsonEditorCollapsedPaths.clear();
  collectAllObjectPaths(jsonEditorData);
  renderJsonEditorTree();
  showStatus("All nodes collapsed");
});

async function handleCopyJsonEditor() {
  const text = jsonEditorRawInput.value;
  if (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        await invoke("plugin:clipboard-manager|write_text", { text });
      }
      showStatus("✓ JSON copied to clipboard");
    } catch (e) {
      showStatus("Failed to copy JSON", true);
    }
  }
}

jsonEditorCopyBtn.addEventListener("click", handleCopyJsonEditor);
copyJsonEditorRawBtn.addEventListener("click", handleCopyJsonEditor);

jsonEditorDownloadBtn.addEventListener("click", () => {
  const text = jsonEditorRawInput.value;
  if (!text) {
    showStatus("Nothing to download", true);
    return;
  }
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("✓ JSON file downloaded");
});

jsonEditorClearBtn.addEventListener("click", () => {
  jsonEditorRawInput.value = "";
  jsonEditorData = {};
  jsonEditorCollapsedPaths.clear();
  updateJsonEditorRawFromData();
  showStatus("JSON Editor cleared");
});

setActiveTab("converter");
renderDiffHtml(EMPTY_DIFF_HTML);
setTracerouteLoadingState(false);
initJsonEditor();

