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
const imageResizerTabBtn = document.getElementById("imageResizerTabBtn");
const opensslTabBtn = document.getElementById("opensslTabBtn");
const tracerouteTabBtn = document.getElementById("tracerouteTabBtn");
const jsonHtmlTabBtn = document.getElementById("jsonHtmlTabBtn");
const urlTabBtn = document.getElementById("urlTabBtn");
const converterSection = document.getElementById("converterSection");
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
  const isCompare = tab === "compare";
  const isMermaid = tab === "mermaid";
  const isImageResizer = tab === "imageResizer";
  const isOpenssl = tab === "openssl";
  const isTraceroute = tab === "traceroute";
  const isJsonHtml = tab === "jsonHtml";
  const isUrl = tab === "url";

  converterSection.classList.toggle("hidden", !isConverter);
  compareSection.classList.toggle("hidden", !isCompare);
  mermaidSection.classList.toggle("hidden", !isMermaid);
  imageResizerSection.classList.toggle("hidden", !isImageResizer);
  opensslSection.classList.toggle("hidden", !isOpenssl);
  tracerouteSection.classList.toggle("hidden", !isTraceroute);
  jsonHtmlSection.classList.toggle("hidden", !isJsonHtml);
  urlSection.classList.toggle("hidden", !isUrl);

  converterTabBtn.classList.toggle("active", isConverter);
  compareTabBtn.classList.toggle("active", isCompare);
  mermaidTabBtn.classList.toggle("active", isMermaid);
  imageResizerTabBtn.classList.toggle("active", isImageResizer);
  opensslTabBtn.classList.toggle("active", isOpenssl);
  tracerouteTabBtn.classList.toggle("active", isTraceroute);
  jsonHtmlTabBtn.classList.toggle("active", isJsonHtml);
  urlTabBtn.classList.toggle("active", isUrl);
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

setActiveTab("converter");
renderDiffHtml(EMPTY_DIFF_HTML);
setTracerouteLoadingState(false);
