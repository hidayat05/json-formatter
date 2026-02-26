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
const converterSection = document.getElementById("converterSection");
const compareSection = document.getElementById("compareSection");
const mermaidSection = document.getElementById("mermaidSection");
const imageResizerSection = document.getElementById("imageResizerSection");

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

  converterSection.classList.toggle("hidden", !isConverter);
  compareSection.classList.toggle("hidden", !isCompare);
  mermaidSection.classList.toggle("hidden", !isMermaid);
  imageResizerSection.classList.toggle("hidden", !isImageResizer);

  converterTabBtn.classList.toggle("active", isConverter);
  compareTabBtn.classList.toggle("active", isCompare);
  mermaidTabBtn.classList.toggle("active", isMermaid);
  imageResizerTabBtn.classList.toggle("active", isImageResizer);
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
  showStatus("Mermaid editor cleared!");
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
imageResizerTabBtn.addEventListener("click", () =>
  setActiveTab("imageResizer"),
);

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

setActiveTab("converter");
renderDiffHtml(EMPTY_DIFF_HTML);
