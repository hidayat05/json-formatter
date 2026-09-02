import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";
import { formatMermaid } from "./mermaid-formatter.js";

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
    "Python" : 10`,
};

let mermaidLoadPromise = null;

function configureMermaid() {
  if (typeof window.mermaid === "undefined") {
    throw new Error("Mermaid library did not expose a global API");
  }
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "JetBrains Mono, monospace",
  });
}

async function ensureMermaidLoaded() {
  if (typeof window.mermaid !== "undefined") {
    configureMermaid();
    return;
  }
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      try {
        configureMermaid();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => reject(new Error("Failed to load Mermaid from CDN"));
    document.head.append(script);
  }).catch((error) => {
    mermaidLoadPromise = null;
    throw error;
  });

  return mermaidLoadPromise;
}

export async function initMermaid() {
  const mermaidInput = document.querySelector("#mermaidInput");
  const mermaidPreview = document.querySelector("#mermaidPreview");
  const mermaidTemplateSelect = document.querySelector(
    "#mermaidTemplateSelect",
  );
  const mermaidThemeSelect = document.querySelector("#mermaidThemeSelect");
  const mermaidSyntaxWarning = document.querySelector("#mermaidSyntaxWarning");
  const zoomFitBtn = document.querySelector("#zoomFitBtn");
  const zoomInBtn = document.querySelector("#zoomInBtn");
  const zoomOutBtn = document.querySelector("#zoomOutBtn");
  const zoomResetBtn = document.querySelector("#zoomResetBtn");
  const zoomLevelDisplay = document.querySelector("#zoomLevel");
  const dragToggleBtn = document.querySelector("#dragToggleBtn");
  const mermaidFullscreenBtn = document.querySelector("#mermaidFullscreenBtn");
  const mermaidPreviewSection = document.querySelector(
    ".mermaid-preview-section",
  );
  const mermaidContainer = document.querySelector(".mermaid-container");
  const mermaidEditorSection = document.querySelector(
    ".mermaid-editor-section",
  );
  const mermaidSplitter = document.querySelector("#mermaidSplitter");

  let currentZoom = 100;
  const ZOOM_STEP = 10;
  const ZOOM_MIN = 10;
  const ZOOM_MAX = 300;

  let isDragMode = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panX = 0;
  let panY = 0;

  function updateZoom() {
    const content = mermaidPreview?.querySelector(".mermaid-preview-content");
    if (content) {
      content.style.transform = `scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)`;
    }
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${currentZoom}%`;
    }
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
    const svgElement = mermaidPreview?.querySelector("svg");
    if (!svgElement || !mermaidPreview) return;

    panX = 0;
    panY = 0;

    const containerWidth = mermaidPreview.clientWidth - 32;
    const containerHeight = mermaidPreview.clientHeight - 32;

    const viewBox = svgElement.viewBox?.baseVal;
    const svgWidth =
      viewBox?.width ||
      svgElement.clientWidth ||
      svgElement.getBoundingClientRect().width;
    const svgHeight =
      viewBox?.height ||
      svgElement.clientHeight ||
      svgElement.getBoundingClientRect().height;

    if (svgWidth && svgHeight) {
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const optimalScale = Math.min(scaleX, scaleY, 1.5);
      currentZoom = Math.max(Math.round(optimalScale * 100), 20);
    } else {
      currentZoom = 100;
    }

    if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${currentZoom}%`;
    const content = mermaidPreview.querySelector(".mermaid-preview-content");
    if (content) {
      content.style.transform = `scale(${currentZoom / 100}) translate(0px, 0px)`;
    }
    showStatus("✓ Diagram fit to screen");
  }

  function toggleDragMode() {
    isDragMode = !isDragMode;
    dragToggleBtn?.classList.toggle("active", isDragMode);
    mermaidPreview?.classList.toggle("drag-mode", isDragMode);
  }

  function handleDragStart(e) {
    if (!isDragMode) return;
    const content = mermaidPreview?.querySelector(".mermaid-preview-content");
    if (!content) return;

    isDragging = true;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;

    content.classList.add("dragging");
    mermaidPreview?.classList.add("dragging");
  }

  function handleDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;

    const content = mermaidPreview?.querySelector(".mermaid-preview-content");
    if (content) {
      content.style.transform = `scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)`;
    }
  }

  function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const content = mermaidPreview?.querySelector(".mermaid-preview-content");
    if (content) {
      content.classList.remove("dragging");
    }
    mermaidPreview?.classList.remove("dragging");
  }

  async function handleRenderMermaid() {
    const code = mermaidInput?.value.trim() || "";

    if (!code) {
      if (mermaidPreview) {
        mermaidPreview.replaceChildren();
        const ph = document.createElement("div");
        ph.className = "mermaid-placeholder";
        ph.textContent =
          'Enter Mermaid code and click "Render Diagram" to preview';
        mermaidPreview.append(ph);
      }
      mermaidSyntaxWarning?.classList.add("hidden");
      return;
    }

    try {
      await ensureMermaidLoaded();
      try {
        await window.mermaid.parse(code);
        mermaidSyntaxWarning?.classList.add("hidden");
      } catch (parseError) {
        if (mermaidSyntaxWarning) {
          mermaidSyntaxWarning.textContent = `⚠️ Syntax Error:\n${parseError.message || String(parseError)}`;
          mermaidSyntaxWarning.classList.remove("hidden");
        }
        return;
      }

      const id = `mermaid-diagram-${Date.now()}`;
      const { svg } = await window.mermaid.render(id, code);

      if (mermaidPreview) {
        mermaidPreview.replaceChildren();
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-preview-content";
        wrapper.style.transform = `scale(${currentZoom / 100}) translate(${panX}px, ${panY}px)`;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        if (doc.documentElement) {
          wrapper.append(doc.documentElement);
        }
        mermaidPreview.append(wrapper);
      }
      showStatus("✓ Diagram rendered successfully");
    } catch (error) {
      if (mermaidPreview) {
        mermaidPreview.replaceChildren();
        const errDiv = document.createElement("div");
        errDiv.className = "mermaid-error";
        errDiv.textContent = `Error rendering diagram: ${error.message || String(error)}`;
        mermaidPreview.append(errDiv);
      }
      showStatus("Error rendering Mermaid diagram", true);
    }
  }

  async function handleDownloadMermaidPng() {
    const svgElement = mermaidPreview?.querySelector("svg");
    if (!svgElement) {
      showStatus(
        "No diagram to download. Please render a diagram first.",
        true,
      );
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const padding = 40;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, padding, padding);
        }

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `mermaid-diagram-${Date.now()}.png`;
        document.body.append(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(url);
        showStatus("✓ PNG downloaded successfully");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        showStatus("Error creating image for download", true);
      };

      img.src = url;
    } catch (error) {
      showStatus(`Error downloading PNG: ${error}`, true);
    }
  }

  function handleClearMermaid() {
    if (mermaidInput) mermaidInput.value = "";
    if (mermaidPreview) {
      mermaidPreview.replaceChildren();
      const ph = document.createElement("div");
      ph.className = "mermaid-placeholder";
      ph.textContent =
        'Enter Mermaid code and click "Render Diagram" to preview';
      mermaidPreview.append(ph);
    }
    currentZoom = 100;
    panX = 0;
    panY = 0;
    if (zoomLevelDisplay) zoomLevelDisplay.textContent = "100%";
    showStatus("Mermaid editor cleared!");
  }

  function handleFormatMermaidCode() {
    const code = mermaidInput?.value || "";
    if (!code.trim()) {
      showStatus("Please enter Mermaid code", true);
      return;
    }
    const formatted = formatMermaid(code);
    if (mermaidInput) mermaidInput.value = formatted;
    showStatus("✓ Mermaid code formatted successfully");
  }

  document
    .querySelector("#renderMermaidBtn")
    ?.addEventListener("click", handleRenderMermaid);
  document
    .querySelector("#formatMermaidBtn")
    ?.addEventListener("click", handleFormatMermaidCode);
  document
    .querySelector("#downloadMermaidBtn")
    ?.addEventListener("click", handleDownloadMermaidPng);
  document
    .querySelector("#clearMermaidBtn")
    ?.addEventListener("click", handleClearMermaid);
  document.querySelector("#copyMermaidBtn")?.addEventListener("click", () => {
    copyText(mermaidInput?.value || "", "Mermaid code");
  });

  zoomInBtn?.addEventListener("click", handleZoomIn);
  zoomOutBtn?.addEventListener("click", handleZoomOut);
  zoomResetBtn?.addEventListener("click", handleZoomReset);
  zoomFitBtn?.addEventListener("click", handleZoomFit);
  dragToggleBtn?.addEventListener("click", toggleDragMode);

  mermaidPreview?.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  mermaidTemplateSelect?.addEventListener("change", () => {
    const templateKey = mermaidTemplateSelect.value;
    if (templateKey && MERMAID_TEMPLATES[templateKey]) {
      if (mermaidInput) {
        mermaidInput.value = formatMermaid(MERMAID_TEMPLATES[templateKey]);
      }
      handleRenderMermaid();
      mermaidTemplateSelect.value = "";
    }
  });

  mermaidThemeSelect?.addEventListener("change", async () => {
    await ensureMermaidLoaded();
    const selectedTheme = mermaidThemeSelect.value || "default";
    window.mermaid.initialize({
      startOnLoad: false,
      theme: selectedTheme,
      securityLevel: "loose",
      fontFamily: "JetBrains Mono, monospace",
    });
    handleRenderMermaid();
  });

  if (mermaidFullscreenBtn && mermaidPreviewSection) {
    mermaidFullscreenBtn.addEventListener("click", () => {
      const isFullscreen = mermaidPreviewSection.classList.toggle("fullscreen");
      mermaidFullscreenBtn.textContent = isFullscreen ? "✕" : "⛶";
      mermaidFullscreenBtn.title = isFullscreen
        ? "Exit Full Screen"
        : "Toggle Full Screen";
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        mermaidPreviewSection.classList.contains("fullscreen")
      ) {
        mermaidPreviewSection.classList.remove("fullscreen");
        mermaidFullscreenBtn.textContent = "⛶";
        mermaidFullscreenBtn.title = "Toggle Full Screen";
      }
    });
  }

  let isDraggingSplitter = false;
  if (mermaidSplitter && mermaidContainer && mermaidEditorSection) {
    mermaidSplitter.addEventListener("mousedown", () => {
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
      const maxWidth = containerRect.width - minWidth - 8;
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
  }
}
