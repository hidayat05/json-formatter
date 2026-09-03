import { showStatus } from "./status.js";
const invoke = window.__TAURI_INTERNALS__?.invoke;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ==========================================================================
// Mock & Proxy Server Module
// ==========================================================================

let mockServerInitialized = false;
let activeMockSubTab = "rest";
let activeRestEditorTab = "body";
let activeRestMethodFilter = "ALL";
let currentMockStatus = {
  is_rest_running: false,
  is_grpc_running: false,
  rest_port: 8080,
  grpc_port: 50051,
};
let mockRestRules = [];
let selectedRestRuleId = null;
let mockProtoFiles = [];
let selectedProtoId = null;
let parsedProtoInfo = null;
let selectedRpcMethod = null;
let mockGrpcRules = [];
let mockTrafficLogs = [];
let selectedTrafficLogId = null;
let trafficAutoRefreshTimer = null;

// DOM Elements - Navigation & Server Bar
const mockRestSubTabBtn = document.getElementById("mockRestSubTabBtn");
const mockGrpcSubTabBtn = document.getElementById("mockGrpcSubTabBtn");
const mockTrafficSubTabBtn = document.getElementById("mockTrafficSubTabBtn");
const mockRestPanel = document.getElementById("mockRestPanel");
const mockGrpcPanel = document.getElementById("mockGrpcPanel");
const mockTrafficPanel = document.getElementById("mockTrafficPanel");

const mockServerStatusLed = document.getElementById("mockServerStatusLed");
const mockServerStatusText = document.getElementById("mockServerStatusText");
const mockPortInput = document.getElementById("mockPortInput");
const toggleMockServerBtn = document.getElementById("toggleMockServerBtn");
const mockBaseUrlDisplay = document.getElementById("mockBaseUrlDisplay");
const copyMockBaseUrlBtn = document.getElementById("copyMockBaseUrlBtn");

// Forwarder / Proxy Drawer
const toggleForwarderDrawerBtn = document.getElementById("toggleForwarderDrawerBtn");
const closeForwarderDrawerBtn = document.getElementById("closeForwarderDrawerBtn");
const mockForwarderDrawer = document.getElementById("mockForwarderDrawer");
const forwarderActiveDot = document.getElementById("forwarderActiveDot");
const mockForwarderEnabledCheck = document.getElementById("mockForwarderEnabledCheck");
const mockOriginUrlInput = document.getElementById("mockOriginUrlInput");
const mockRecordTrafficCheck = document.getElementById("mockRecordTrafficCheck");
const saveMockConfigBtn = document.getElementById("saveMockConfigBtn");

// Export / Import Elements
const exportMockCollectionBtn = document.getElementById("exportMockCollectionBtn");
const importMockCollectionBtn = document.getElementById("importMockCollectionBtn");
const importMockFileInput = document.getElementById("importMockFileInput");

// REST Elements
const restRuleCount = document.getElementById("restRuleCount");
const newRestRuleBtn = document.getElementById("newRestRuleBtn");
const restRuleSearchInput = document.getElementById("restRuleSearchInput");
const clearRestSearchBtn = document.getElementById("clearRestSearchBtn");
const restRulesList = document.getElementById("restRulesList");
const restRuleNameInput = document.getElementById("restRuleNameInput");
const restRuleMethodSelect = document.getElementById("restRuleMethodSelect");
const restRulePathInput = document.getElementById("restRulePathInput");
const restRuleStatusInput = document.getElementById("restRuleStatusInput");
const restRuleDelayInput = document.getElementById("restRuleDelayInput");
const restRuleHeadersInput = document.getElementById("restRuleHeadersInput");
const restRuleBodyInput = document.getElementById("restRuleBodyInput");
const saveRestRuleBtn = document.getElementById("saveRestRuleBtn");
const deleteRestRuleBtn = document.getElementById("deleteRestRuleBtn");
const duplicateRestRuleBtn = document.getElementById("duplicateRestRuleBtn");
const formatRestBodyBtn = document.getElementById("formatRestBodyBtn");
const minifyRestBodyBtn = document.getElementById("minifyRestBodyBtn");
const copyRestCurlBtn = document.getElementById("copyRestCurlBtn");
const copyCurlBoxBtn = document.getElementById("copyCurlBoxBtn");
const restCurlPreviewBox = document.getElementById("restCurlPreviewBox");

const restTabBodyBtn = document.getElementById("restTabBodyBtn");
const restTabHeadersBtn = document.getElementById("restTabHeadersBtn");
const restTabCurlBtn = document.getElementById("restTabCurlBtn");
const restEditorBodySection = document.getElementById("restEditorBodySection");
const restEditorHeadersSection = document.getElementById("restEditorHeadersSection");
const restEditorCurlSection = document.getElementById("restEditorCurlSection");

// gRPC Elements
let activeGrpcEditorTab = "payload";
const grpcProtoCount = document.getElementById("grpcProtoCount");
const newProtoFileBtn = document.getElementById("newProtoFileBtn");
const uploadProtoFileBtn = document.getElementById("uploadProtoFileBtn");
const uploadProtoFolderBtn = document.getElementById("uploadProtoFolderBtn");
const protoFileInput = document.getElementById("protoFileInput");
const protoFolderInput = document.getElementById("protoFolderInput");
const newProtoInlineBox = document.getElementById("newProtoInlineBox");
const newProtoFilenameInput = document.getElementById("newProtoFilenameInput");
const confirmNewProtoBtn = document.getElementById("confirmNewProtoBtn");
const cancelNewProtoBtn = document.getElementById("cancelNewProtoBtn");
const grpcProtoFileSelect = document.getElementById("grpcProtoFileSelect");
const deleteProtoFileBtn = document.getElementById("deleteProtoFileBtn");
const modalDeleteProtoBtn = document.getElementById("modalDeleteProtoBtn");
const clearAllProtosBtn = document.getElementById("clearAllProtosBtn");
const grpcServiceTree = document.getElementById("grpcServiceTree");
const grpcEditorTitle = document.getElementById("grpcEditorTitle");
const grpcSelectedRpcSubtitle = document.getElementById("grpcSelectedRpcSubtitle");
const toggleProtoViewBtn = document.getElementById("toggleProtoViewBtn");
const closeProtoSourceBtn = document.getElementById("closeProtoSourceBtn");
const saveGrpcRuleBtn = document.getElementById("saveGrpcRuleBtn");
const copyGrpcurlBtn = document.getElementById("copyGrpcurlBtn");
const copyGrpcurlBoxBtn = document.getElementById("copyGrpcurlBoxBtn");
const grpcCurlPreviewBox = document.getElementById("grpcCurlPreviewBox");
const protoSourceContainer = document.getElementById("protoSourceContainer");
const protoSourceEditor = document.getElementById("protoSourceEditor");
const protoSourceFilenameLabel = document.getElementById("protoSourceFilenameLabel");
const expandProtoViewBtn = document.getElementById("expandProtoViewBtn");
const insertSampleServiceBtn = document.getElementById("insertSampleServiceBtn");
const protoEditorCharCount = document.getElementById("protoEditorCharCount");
const compileProtoBtn = document.getElementById("compileProtoBtn");
const grpcStatusCodeSelect = document.getElementById("grpcStatusCodeSelect");
const grpcStatusMessageInput = document.getElementById("grpcStatusMessageInput");
const grpcDelayInput = document.getElementById("grpcDelayInput");
const grpcResponseBodyInput = document.getElementById("grpcResponseBodyInput");
const grpcResponseMetadataInput = document.getElementById("grpcResponseMetadataInput");
const grpcResponseTrailersInput = document.getElementById("grpcResponseTrailersInput");
const grpcTabPayloadBtn = document.getElementById("grpcTabPayloadBtn");
const grpcTabTrailersBtn = document.getElementById("grpcTabTrailersBtn");
const grpcTabGrpcurlBtn = document.getElementById("grpcTabGrpcurlBtn");
const grpcEditorPayloadSection = document.getElementById("grpcEditorPayloadSection");
const grpcEditorTrailersSection = document.getElementById("grpcEditorTrailersSection");
const grpcEditorGrpcurlSection = document.getElementById("grpcEditorGrpcurlSection");
let activeGrpcMethodFilter = "ALL";
const grpcFilterAllBtn = document.getElementById("grpcFilterAllBtn");
const grpcFilterMockedBtn = document.getElementById("grpcFilterMockedBtn");
const grpcMethodSearchInput = document.getElementById("grpcMethodSearchInput");
const clearGrpcSearchBtn = document.getElementById("clearGrpcSearchBtn");
const deleteGrpcRuleBtn = document.getElementById("deleteGrpcRuleBtn");
const generateGrpcTemplateBtn = document.getElementById("generateGrpcTemplateBtn");
const formatGrpcBodyBtn = document.getElementById("formatGrpcBodyBtn");
const minifyGrpcBodyBtn = document.getElementById("minifyGrpcBodyBtn");

// Traffic Elements
const trafficBadgeCount = document.getElementById("trafficBadgeCount");
const trafficFilterType = document.getElementById("trafficFilterType");
const trafficFilterSource = document.getElementById("trafficFilterSource");
const trafficFilterSearch = document.getElementById("trafficFilterSearch");
const refreshTrafficLogsBtn = document.getElementById("refreshTrafficLogsBtn");
const clearTrafficLogsBtn = document.getElementById("clearTrafficLogsBtn");
const trafficLogsTableBody = document.getElementById("trafficLogsTableBody");
const trafficDetailContent = document.getElementById("trafficDetailContent");
const detailDrawerSubtitle = document.getElementById("detailDrawerSubtitle");
const closeDetailDrawerBtn = document.getElementById("closeDetailDrawerBtn");

export async function initMockServer() {
  if (mockServerInitialized) return;
  mockServerInitialized = true;
  setupMockEventListeners();
  try {
    await refreshMockServerUI();
  } catch (e) {
    console.error("Error refreshing mock server UI:", e);
  }

  // Listen to Tauri traffic event stream if available
  try {
    if (window.__TAURI_EVENT__ && window.__TAURI_EVENT__.listen) {
      window.__TAURI_EVENT__.listen("mock_traffic_event", (event) => {
        handleIncomingTrafficEvent(event.payload);
      });
    } else {
      console.log("Tauri event listener not found, starting global polling");
      startTrafficPolling();
    }
  } catch (e) {
    console.log("Tauri event listener fallback to polling");
    startTrafficPolling();
  }
}

function setupMockEventListeners() {
  // Subtabs switching
  mockRestSubTabBtn.addEventListener("click", () => setMockSubTab("rest"));
  mockGrpcSubTabBtn.addEventListener("click", () => setMockSubTab("grpc"));
  mockTrafficSubTabBtn.addEventListener("click", () => setMockSubTab("traffic"));

  // Server toggle & configs
  toggleMockServerBtn.addEventListener("click", handleToggleMockServer);
  saveMockConfigBtn.addEventListener("click", handleSaveMockConfig);
  copyMockBaseUrlBtn.addEventListener("click", handleCopyMockBaseUrl);

  // Forwarder Drawer toggle
  toggleForwarderDrawerBtn.addEventListener("click", () => {
    mockForwarderDrawer.classList.toggle("hidden");
  });
  if (closeForwarderDrawerBtn) {
    closeForwarderDrawerBtn.addEventListener("click", () => {
      mockForwarderDrawer.classList.add("hidden");
    });
  }

  // Collection Export & Import
  exportMockCollectionBtn.addEventListener("click", handleExportCollection);
  importMockCollectionBtn.addEventListener("click", () => importMockFileInput.click());
  importMockFileInput.addEventListener("change", handleImportCollection);

  // REST rule actions
  newRestRuleBtn.addEventListener("click", handleNewRestRule);
  saveRestRuleBtn.addEventListener("click", handleSaveRestRule);
  deleteRestRuleBtn.addEventListener("click", handleDeleteRestRule);
  duplicateRestRuleBtn.addEventListener("click", handleDuplicateRestRule);
  
  restRuleSearchInput.addEventListener("input", () => {
    clearRestSearchBtn.classList.toggle("hidden", !restRuleSearchInput.value);
    renderRestRulesList();
  });
  clearRestSearchBtn.addEventListener("click", () => {
    restRuleSearchInput.value = "";
    clearRestSearchBtn.classList.add("hidden");
    renderRestRulesList();
  });

  // REST Method filter chips
  document.querySelectorAll(".method-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".method-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeRestMethodFilter = chip.dataset.method;
      renderRestRulesList();
    });
  });

  // REST Editor subtabs (Body / Headers / cURL)
  restTabBodyBtn.addEventListener("click", () => setRestEditorTab("body"));
  restTabHeadersBtn.addEventListener("click", () => setRestEditorTab("headers"));
  restTabCurlBtn.addEventListener("click", () => setRestEditorTab("curl"));

  // Delay Preset Chips
  document.querySelectorAll(".delay-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".delay-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      restRuleDelayInput.value = chip.dataset.delay;
    });
  });
  restRuleDelayInput.addEventListener("input", () => {
    document.querySelectorAll(".delay-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.delay === restRuleDelayInput.value);
    });
  });

  // Status Presets
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      restRuleStatusInput.value = btn.dataset.status;
    });
  });

  // Header Presets
  document.querySelectorAll(".header-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      restRuleHeadersInput.value = btn.dataset.header;
    });
  });

  // Body Format & Minify
  formatRestBodyBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(restRuleBodyInput.value || "{}");
      restRuleBodyInput.value = JSON.stringify(obj, null, 2);
      showStatus("✓ Formatted JSON response");
    } catch (e) {
      showStatus("Invalid JSON syntax in response body", true);
    }
  });

  minifyRestBodyBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(restRuleBodyInput.value || "{}");
      restRuleBodyInput.value = JSON.stringify(obj);
      showStatus("✓ Minified JSON response");
    } catch (e) {
      showStatus("Invalid JSON syntax in response body", true);
    }
  });

  // Copy cURL
  copyRestCurlBtn.addEventListener("click", handleCopyRestCurl);
  copyCurlBoxBtn.addEventListener("click", handleCopyRestCurl);

  // Address Bar live sync to cURL preview
  restRuleMethodSelect.addEventListener("change", updateRestCurlPreview);
  restRulePathInput.addEventListener("input", updateRestCurlPreview);
  restRuleBodyInput.addEventListener("input", updateRestCurlPreview);
  restRuleHeadersInput.addEventListener("input", updateRestCurlPreview);

  // gRPC actions
  newProtoFileBtn.addEventListener("click", () => {
    newProtoInlineBox.classList.toggle("hidden");
    if (!newProtoInlineBox.classList.contains("hidden")) {
      newProtoFilenameInput.focus();
      newProtoFilenameInput.select();
    }
  });
  if (confirmNewProtoBtn) {
    confirmNewProtoBtn.addEventListener("click", handleConfirmCreateNewProto);
  }
  if (cancelNewProtoBtn) {
    cancelNewProtoBtn.addEventListener("click", () => {
      newProtoInlineBox.classList.add("hidden");
    });
  }
  if (newProtoFilenameInput) {
    newProtoFilenameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleConfirmCreateNewProto();
      if (e.key === "Escape") newProtoInlineBox.classList.add("hidden");
    });
  }
  if (uploadProtoFileBtn) {
    uploadProtoFileBtn.addEventListener("click", () => protoFileInput.click());
  }
  if (protoFileInput) {
    protoFileInput.addEventListener("change", handleUploadProtoFile);
  }
  if (uploadProtoFolderBtn) {
    uploadProtoFolderBtn.addEventListener("click", () => protoFolderInput.click());
  }
  if (protoFolderInput) {
    protoFolderInput.addEventListener("change", handleUploadProtoFolder);
  }

  if (deleteProtoFileBtn) {
    deleteProtoFileBtn.addEventListener("click", handleDeleteProtoFile);
  }
  if (modalDeleteProtoBtn) {
    modalDeleteProtoBtn.addEventListener("click", handleDeleteProtoFile);
  }
  if (clearAllProtosBtn) {
    clearAllProtosBtn.addEventListener("click", handleClearAllProtos);
  }
  grpcProtoFileSelect.addEventListener("change", handleSelectProtoFile);
  toggleProtoViewBtn.addEventListener("click", () => {
    protoSourceContainer.classList.toggle("hidden");
    if (!protoSourceContainer.classList.contains("hidden")) {
      protoSourceEditor.focus();
      updateProtoEditorStats();
    }
  });
  if (closeProtoSourceBtn) {
    closeProtoSourceBtn.addEventListener("click", () => {
      protoSourceContainer.classList.add("hidden");
      protoSourceContainer.classList.remove("fullscreen-mode");
      if (expandProtoViewBtn) expandProtoViewBtn.textContent = "⛶ Fullscreen";
    });
  }
  if (expandProtoViewBtn) {
    expandProtoViewBtn.addEventListener("click", () => {
      protoSourceContainer.classList.toggle("fullscreen-mode");
      const isFull = protoSourceContainer.classList.contains("fullscreen-mode");
      expandProtoViewBtn.textContent = isFull ? "🗗 Minimize" : "⛶ Fullscreen";
      protoSourceEditor.focus();
    });
  }
  if (insertSampleServiceBtn) {
    insertSampleServiceBtn.addEventListener("click", handleInsertSampleServiceBoilerplate);
  }
  if (protoSourceEditor) {
    protoSourceEditor.addEventListener("input", updateProtoEditorStats);
    protoSourceEditor.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleCompileProtoSource();
      }
      if (e.key === "Escape") {
        if (protoSourceContainer.classList.contains("fullscreen-mode")) {
          protoSourceContainer.classList.remove("fullscreen-mode");
          if (expandProtoViewBtn) expandProtoViewBtn.textContent = "⛶ Fullscreen";
        } else {
          protoSourceContainer.classList.add("hidden");
        }
      }
    });
  }
  // gRPC Editor subtabs
  if (grpcTabPayloadBtn) grpcTabPayloadBtn.addEventListener("click", () => setGrpcEditorTab("payload"));
  if (grpcTabTrailersBtn) grpcTabTrailersBtn.addEventListener("click", () => setGrpcEditorTab("trailers"));
  if (grpcTabGrpcurlBtn) grpcTabGrpcurlBtn.addEventListener("click", () => setGrpcEditorTab("grpcurl"));

  // gRPC Metadata and Trailer Presets
  document.querySelectorAll(".grpc-meta-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      grpcResponseMetadataInput.value = btn.dataset.preset;
      updateGrpcCurlPreview();
    });
  });

  document.querySelectorAll(".grpc-trailer-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      grpcResponseTrailersInput.value = btn.dataset.preset;
    });
  });

  if (grpcStatusCodeSelect) {
    grpcStatusCodeSelect.addEventListener("change", () => {
      const code = grpcStatusCodeSelect.value;
      if (!grpcStatusMessageInput.value || grpcStatusMessageInput.value === "OK") {
        if (code === "0") grpcStatusMessageInput.value = "OK";
        else if (code === "5") grpcStatusMessageInput.value = "Resource not found";
        else if (code === "16") grpcStatusMessageInput.value = "Unauthorized token";
        else if (code === "3") grpcStatusMessageInput.value = "Invalid argument provided";
        else if (code === "7") grpcStatusMessageInput.value = "Permission denied";
        else grpcStatusMessageInput.value = `gRPC error status ${code}`;
      }
      updateGrpcCurlPreview();
    });
  }

  if (grpcStatusMessageInput) grpcStatusMessageInput.addEventListener("input", updateGrpcCurlPreview);
  if (grpcResponseMetadataInput) grpcResponseMetadataInput.addEventListener("input", updateGrpcCurlPreview);
  if (grpcResponseBodyInput) grpcResponseBodyInput.addEventListener("input", updateGrpcCurlPreview);

  if (minifyGrpcBodyBtn) {
    minifyGrpcBodyBtn.addEventListener("click", () => {
      try {
        const obj = JSON.parse(grpcResponseBodyInput.value || "{}");
        grpcResponseBodyInput.value = JSON.stringify(obj);
        showStatus("✓ Minified gRPC JSON schema");
      } catch (e) {
        showStatus("Invalid JSON in response body", true);
      }
    });
  }

  if (copyGrpcurlBoxBtn) {
    copyGrpcurlBoxBtn.addEventListener("click", handleCopyGrpcurl);
  }

  if (grpcFilterAllBtn) {
    grpcFilterAllBtn.addEventListener("click", () => {
      activeGrpcMethodFilter = "ALL";
      grpcFilterAllBtn.classList.add("active");
      if (grpcFilterMockedBtn) grpcFilterMockedBtn.classList.remove("active");
      if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
    });
  }

  if (grpcFilterMockedBtn) {
    grpcFilterMockedBtn.addEventListener("click", () => {
      activeGrpcMethodFilter = "MOCKED";
      grpcFilterMockedBtn.classList.add("active");
      if (grpcFilterAllBtn) grpcFilterAllBtn.classList.remove("active");
      if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
    });
  }

  if (grpcMethodSearchInput) {
    grpcMethodSearchInput.addEventListener("input", () => {
      if (clearGrpcSearchBtn) {
        clearGrpcSearchBtn.classList.toggle("hidden", !grpcMethodSearchInput.value);
      }
      if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
    });
  }

  if (clearGrpcSearchBtn) {
    clearGrpcSearchBtn.addEventListener("click", () => {
      grpcMethodSearchInput.value = "";
      clearGrpcSearchBtn.classList.add("hidden");
      if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
    });
  }

  if (deleteGrpcRuleBtn) {
    deleteGrpcRuleBtn.addEventListener("click", handleDeleteGrpcMockRule);
  }

  compileProtoBtn.addEventListener("click", handleCompileProtoSource);
  saveGrpcRuleBtn.addEventListener("click", handleSaveGrpcRule);
  copyGrpcurlBtn.addEventListener("click", handleCopyGrpcurl);
  generateGrpcTemplateBtn.addEventListener("click", handleGenerateGrpcTemplate);
  formatGrpcBodyBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(grpcResponseBodyInput.value || "{}");
      grpcResponseBodyInput.value = JSON.stringify(obj, null, 2);
      showStatus("✓ Formatted gRPC JSON schema");
    } catch (e) {
      showStatus("Invalid JSON in response body", true);
    }
  });

  // gRPC Delay Chips
  document.querySelectorAll(".grpc-delay-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".grpc-delay-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      grpcDelayInput.value = chip.dataset.delay;
    });
  });

  // Traffic actions
  refreshTrafficLogsBtn.addEventListener("click", loadTrafficLogs);
  clearTrafficLogsBtn.addEventListener("click", handleClearTrafficLogs);
  trafficFilterType.addEventListener("change", renderTrafficLogsTable);
  trafficFilterSource.addEventListener("change", renderTrafficLogsTable);
  trafficFilterSearch.addEventListener("input", renderTrafficLogsTable);
  if (closeDetailDrawerBtn) {
    closeDetailDrawerBtn.addEventListener("click", () => {
      trafficDetailContent.innerHTML = `<div class="detail-empty-placeholder">Select a request from the left table to inspect full headers, body payloads, and record it as a mock rule.</div>`;
      selectedTrafficLogId = null;
      renderTrafficLogsTable();
    });
  }
}

function setMockSubTab(subTab) {
  activeMockSubTab = subTab;
  mockRestSubTabBtn.classList.toggle("active", subTab === "rest");
  mockGrpcSubTabBtn.classList.toggle("active", subTab === "grpc");
  mockTrafficSubTabBtn.classList.toggle("active", subTab === "traffic");

  mockRestPanel.classList.toggle("hidden", subTab !== "rest");
  mockGrpcPanel.classList.toggle("hidden", subTab !== "grpc");
  mockTrafficPanel.classList.toggle("hidden", subTab !== "traffic");

  const headerActions = document.querySelector(".mock-header-actions-group");
  if (headerActions) {
    headerActions.classList.toggle("hidden", subTab === "traffic");
  }

  updateServerControlBar();

  if (subTab === "traffic") {
    mockForwarderDrawer.classList.add("hidden");
    loadTrafficLogs(false);
  } else {
    loadMockConfig();
  }
}

function setRestEditorTab(tab) {
  activeRestEditorTab = tab;
  restTabBodyBtn.classList.toggle("active", tab === "body");
  restTabHeadersBtn.classList.toggle("active", tab === "headers");
  restTabCurlBtn.classList.toggle("active", tab === "curl");

  restEditorBodySection.classList.toggle("hidden", tab !== "body");
  restEditorHeadersSection.classList.toggle("hidden", tab !== "headers");
  restEditorCurlSection.classList.toggle("hidden", tab !== "curl");

  if (tab === "curl") {
    updateRestCurlPreview();
  }
}

function startTrafficPolling() {
  stopTrafficPolling();
  trafficAutoRefreshTimer = setInterval(() => {
    loadTrafficLogs(false);
  }, 2000);
}

function stopTrafficPolling() {
  if (trafficAutoRefreshTimer) {
    clearInterval(trafficAutoRefreshTimer);
    trafficAutoRefreshTimer = null;
  }
}

export async function refreshMockServerUI() {
  try {
    await loadServerStatus();
    await loadMockConfig();
    await loadRestRules();
    await loadProtoFiles();
    await loadGrpcRules();
    await loadTrafficLogs(false);
  } catch (err) {
    console.error("Failed to refresh mock server UI:", err);
  }
}

async function loadServerStatus() {
  try {
    const status = await invoke("get_mock_servers_status");
    currentMockStatus = status;
    updateServerControlBar();
  } catch (err) {
    console.error("Failed to get server status:", err);
  }
}

function updateServerControlBar() {
  const isGrpc = activeMockSubTab === "grpc";
  const isRunning = isGrpc
    ? currentMockStatus.is_grpc_running
    : currentMockStatus.is_rest_running;
  const port = isGrpc ? currentMockStatus.grpc_port : currentMockStatus.rest_port;

  mockPortInput.value = port;
  mockBaseUrlDisplay.textContent = isGrpc ? `127.0.0.1:${port}` : `http://127.0.0.1:${port}`;

  if (isRunning) {
    mockServerStatusLed.className = "status-led led-running";
    mockServerStatusText.textContent = `${isGrpc ? "gRPC" : "REST"}: Running (${port})`;
    toggleMockServerBtn.textContent = "⏹ Stop";
    toggleMockServerBtn.className = "danger mock-start-btn running";
    mockPortInput.disabled = true;
  } else {
    mockServerStatusLed.className = "status-led led-stopped";
    mockServerStatusText.textContent = `${isGrpc ? "gRPC" : "REST"}: Stopped`;
    toggleMockServerBtn.textContent = "▶ Start";
    toggleMockServerBtn.className = "primary mock-start-btn";
    mockPortInput.disabled = false;
  }
}

async function handleToggleMockServer() {
  const isGrpc = activeMockSubTab === "grpc";
  const isRunning = isGrpc
    ? currentMockStatus.is_grpc_running
    : currentMockStatus.is_rest_running;
  const port = parseInt(mockPortInput.value, 10) || (isGrpc ? 50051 : 8080);

  try {
    if (isRunning) {
      const msg = isGrpc
        ? await invoke("stop_grpc_mock")
        : await invoke("stop_rest_mock");
      showStatus(`✓ ${msg}`);
    } else {
      const msg = isGrpc
        ? await invoke("start_grpc_mock", { port })
        : await invoke("start_rest_mock", { port });
      showStatus(`✓ ${msg}`);
    }
    await loadServerStatus();
  } catch (e) {
    showStatus(`Server Error: ${e}`, true);
  }
}

async function handleCopyMockBaseUrl() {
  const text = mockBaseUrlDisplay.textContent;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      await invoke("plugin:clipboard-manager|write_text", { text });
    }
    showStatus("✓ Base URL copied to clipboard");
  } catch (e) {
    showStatus("Failed to copy URL", true);
  }
}

async function loadMockConfig() {
  try {
    const serverType = activeMockSubTab === "grpc" ? "GRPC" : "REST";
    const config = await invoke("get_mock_config", { serverType });
    mockForwarderEnabledCheck.checked = config.is_forwarder_enabled;
    mockOriginUrlInput.value = config.origin_url || "";
    mockRecordTrafficCheck.checked = config.record_traffic;
    mockPortInput.value = config.port;

    if (forwarderActiveDot) {
      forwarderActiveDot.classList.toggle("active", config.is_forwarder_enabled);
    }
  } catch (e) {
    console.error("Failed to load mock config:", e);
  }
}

async function handleSaveMockConfig() {
  try {
    const serverType = activeMockSubTab === "grpc" ? "GRPC" : "REST";
    const port = parseInt(mockPortInput.value, 10) || (serverType === "GRPC" ? 50051 : 8080);
    const config = {
      server_type: serverType,
      port,
      is_forwarder_enabled: mockForwarderEnabledCheck.checked,
      origin_url: mockOriginUrlInput.value.trim() || null,
      record_traffic: mockRecordTrafficCheck.checked,
    };
    await invoke("save_mock_config", { config });
    if (forwarderActiveDot) {
      forwarderActiveDot.classList.toggle("active", config.is_forwarder_enabled);
    }
    showStatus("✓ Origin Reverse Proxy configuration saved");
  } catch (e) {
    showStatus(`Failed to save config: ${e}`, true);
  }
}

// --------------------------------------------------------------------------
// REST Rules Management
// --------------------------------------------------------------------------

async function loadRestRules() {
  try {
    mockRestRules = await invoke("get_rest_rules");
    restRuleCount.textContent = `${mockRestRules.length} rules`;
    renderRestRulesList();

    if (mockRestRules.length > 0 && !selectedRestRuleId) {
      selectRestRule(mockRestRules[0].id);
    } else if (selectedRestRuleId) {
      selectRestRule(selectedRestRuleId);
    }
  } catch (e) {
    console.error("Failed to load REST rules:", e);
  }
}

function renderRestRulesList() {
  restRulesList.innerHTML = "";
  const filter = (restRuleSearchInput.value || "").toLowerCase().trim();

  const filtered = mockRestRules.filter((r) => {
    if (activeRestMethodFilter !== "ALL" && r.method !== activeRestMethodFilter) {
      return false;
    }
    if (!filter) return true;
    return (
      r.name.toLowerCase().includes(filter) ||
      r.path.toLowerCase().includes(filter) ||
      r.method.toLowerCase().includes(filter)
    );
  });

  if (filtered.length === 0) {
    restRulesList.innerHTML = `<div class="tree-empty-placeholder">No endpoints match filter. Click "+ New Rule" to add.</div>`;
    return;
  }

  filtered.forEach((rule) => {
    const item = document.createElement("div");
    item.className = `mock-rule-item ${rule.id === selectedRestRuleId ? "active" : ""}`;
    const methodLower = rule.method.toLowerCase();
    const methodClass = rule.method === "*" ? "badge-all" : `badge-${methodLower}`;

    const statusClass =
      rule.status_code >= 500
        ? "status-5xx"
        : rule.status_code >= 400
        ? "status-4xx"
        : "status-2xx";

    item.innerHTML = `
      <div class="mock-rule-left">
        <div class="mock-rule-row-top">
          <span class="mock-method-badge ${methodClass}">${rule.method}</span>
          <span class="mock-rule-path">${escapeHtml(rule.path)}</span>
        </div>
        <span class="mock-rule-name">${escapeHtml(rule.name)}</span>
      </div>
      <div class="mock-rule-right">
        <span class="status-badge ${statusClass}">${rule.status_code}</span>
        <input type="checkbox" class="rule-toggle-check" ${rule.enabled ? "checked" : ""} title="Toggle rule active" />
      </div>
    `;

    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("rule-toggle-check")) {
        e.stopPropagation();
        handleToggleRestRule(rule.id, e.target.checked);
        return;
      }
      selectRestRule(rule.id);
    });

    const toggleInput = item.querySelector(".rule-toggle-check");
    toggleInput.addEventListener("change", (e) => {
      e.stopPropagation();
      handleToggleRestRule(rule.id, e.target.checked);
    });

    restRulesList.appendChild(item);
  });
}

function selectRestRule(ruleId) {
  selectedRestRuleId = ruleId;
  const rule = mockRestRules.find((r) => r.id === ruleId);
  if (!rule) return;

  restRuleNameInput.value = rule.name;
  restRuleMethodSelect.value = rule.method;
  restRulePathInput.value = rule.path;
  restRuleStatusInput.value = rule.status_code;
  restRuleDelayInput.value = rule.delay_ms;
  restRuleHeadersInput.value = rule.response_headers;
  restRuleBodyInput.value = rule.response_body;

  // Sync delay chips
  document.querySelectorAll(".delay-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.delay === String(rule.delay_ms));
  });

  updateRestCurlPreview();
  renderRestRulesList();
}

function handleNewRestRule() {
  const newId = `rule-${Date.now()}`;
  const newRule = {
    id: newId,
    name: `New Endpoint ${mockRestRules.length + 1}`,
    enabled: true,
    method: "GET",
    path: `/api/v1/resource-${mockRestRules.length + 1}`,
    status_code: 200,
    delay_ms: 0,
    response_headers: JSON.stringify({ "Content-Type": "application/json" }),
    response_body: JSON.stringify({ status: "success", data: { id: "123", message: "Hello from mock" } }, null, 2),
    created_at: Math.floor(Date.now() / 1000),
  };

  mockRestRules.unshift(newRule);
  restRuleCount.textContent = `${mockRestRules.length} rules`;
  selectRestRule(newId);
  showStatus("✓ New mock endpoint template created");
}

async function handleSaveRestRule() {
  if (!selectedRestRuleId) {
    handleNewRestRule();
  }

  const name = restRuleNameInput.value.trim() || "Untitled Rule";
  const method = restRuleMethodSelect.value;
  const path = restRulePathInput.value.trim() || "/";
  const statusCode = parseInt(restRuleStatusInput.value, 10) || 200;
  const delayMs = parseInt(restRuleDelayInput.value, 10) || 0;
  const headers = restRuleHeadersInput.value.trim() || "{}";
  const body = restRuleBodyInput.value;

  const rule = {
    id: selectedRestRuleId,
    name,
    enabled: true,
    method,
    path,
    status_code: statusCode,
    delay_ms: delayMs,
    response_headers: headers,
    response_body: body,
    created_at: Math.floor(Date.now() / 1000),
  };

  try {
    await invoke("save_rest_rule", { rule });
    showStatus(`✓ Rule '${name}' saved to SQLite`);
    await loadRestRules();
  } catch (e) {
    showStatus(`Failed to save rule: ${e}`, true);
  }
}

async function handleDeleteRestRule() {
  if (!selectedRestRuleId) return;
  try {
    await invoke("delete_rest_rule", { id: selectedRestRuleId });
    showStatus("✓ Mock rule deleted");
    selectedRestRuleId = null;
    await loadRestRules();
  } catch (e) {
    showStatus(`Failed to delete: ${e}`, true);
  }
}

async function handleDuplicateRestRule() {
  if (!selectedRestRuleId) return;
  const rule = mockRestRules.find((r) => r.id === selectedRestRuleId);
  if (!rule) return;

  const duplicateRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    name: `${rule.name} (Copy)`,
    path: `${rule.path}-copy`,
    created_at: Math.floor(Date.now() / 1000),
  };

  try {
    await invoke("save_rest_rule", { rule: duplicateRule });
    showStatus("✓ Rule duplicated");
    selectedRestRuleId = duplicateRule.id;
    await loadRestRules();
  } catch (e) {
    showStatus(`Failed to duplicate: ${e}`, true);
  }
}

async function handleToggleRestRule(ruleId, enabled) {
  try {
    await invoke("toggle_rest_rule", { id: ruleId, enabled });
    const r = mockRestRules.find((x) => x.id === ruleId);
    if (r) r.enabled = enabled;
  } catch (e) {
    showStatus(`Failed to toggle: ${e}`, true);
  }
}

function updateRestCurlPreview() {
  const port = currentMockStatus.rest_port || 8080;
  const method = restRuleMethodSelect ? restRuleMethodSelect.value : "GET";
  const path = restRulePathInput ? restRulePathInput.value.trim() || "/" : "/";
  const body = restRuleBodyInput ? restRuleBodyInput.value.trim() : "";
  const headersStr = restRuleHeadersInput ? restRuleHeadersInput.value.trim() : "{}";

  let curl = `curl -X ${method === "*" ? "GET" : method} "http://127.0.0.1:${port}${path}"`;

  try {
    const headers = JSON.parse(headersStr || "{}");
    Object.entries(headers).forEach(([k, v]) => {
      curl += ` \\\n  -H "${k}: ${v}"`;
    });
  } catch (_) {
    curl += ` \\\n  -H "Content-Type: application/json"`;
  }

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    const escaped = body.replace(/'/g, "'\\''");
    curl += ` \\\n  -d '${escaped}'`;
  }

  if (restCurlPreviewBox) {
    restCurlPreviewBox.textContent = curl;
  }
  return curl;
}

async function handleCopyRestCurl() {
  const curl = updateRestCurlPreview();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(curl);
    } else {
      await invoke("plugin:clipboard-manager|write_text", { text: curl });
    }
    showStatus("✓ cURL command copied to clipboard");
  } catch (e) {
    showStatus("Failed to copy cURL command", true);
  }
}

// --------------------------------------------------------------------------
// gRPC Proto & Rule Management
// --------------------------------------------------------------------------

function updateProtoEditorStats() {
  if (!protoEditorCharCount || !protoSourceEditor) return;
  const chars = protoSourceEditor.value.length;
  const lines = protoSourceEditor.value.split("\n").length;
  protoEditorCharCount.textContent = `${lines} lines, ${chars} chars`;
}

function handleInsertSampleServiceBoilerplate() {
  if (!protoSourceEditor) return;
  const serviceIndex = Math.floor(Math.random() * 800) + 100;
  const snippet = `
// Added Sample Service
service SampleService${serviceIndex} {
  rpc GetDetails (GetDetailsRequest) returns (GetDetailsResponse);
}

message GetDetailsRequest {
  string id = 1;
}

message GetDetailsResponse {
  string id = 1;
  string status = 2;
  int64 timestamp = 3;
}
`;
  protoSourceEditor.value = protoSourceEditor.value + "\n" + snippet;
  updateProtoEditorStats();
  showStatus("✓ Appended sample service snippet to .proto schema");
}

async function loadProtoFiles() {
  try {
    mockProtoFiles = await invoke("get_proto_files");
    if (!mockProtoFiles) mockProtoFiles = [];
    if (grpcProtoCount) grpcProtoCount.textContent = `${mockProtoFiles.length} file(s)`;
    if (grpcProtoFileSelect) grpcProtoFileSelect.innerHTML = "";

    if (mockProtoFiles.length === 0) {
      selectedProtoId = null;
      selectedRpcMethod = null;
      parsedProtoInfo = null;
      if (grpcProtoFileSelect) grpcProtoFileSelect.innerHTML = `<option value="">(No proto files)</option>`;
      if (grpcServiceTree) {
        grpcServiceTree.innerHTML = `<div class="tree-empty-placeholder">No .proto schema found. Upload a .proto file or folder to get started.</div>`;
      }
      if (protoSourceFilenameLabel) protoSourceFilenameLabel.textContent = "schema.proto";
      if (protoSourceEditor) protoSourceEditor.value = "";
      if (grpcEditorTitle) grpcEditorTitle.textContent = "Select an RPC Method";
      if (grpcSelectedRpcSubtitle) grpcSelectedRpcSubtitle.textContent = "Upload a .proto schema to inspect services and configure mock responses";
      if (grpcResponseBodyInput) grpcResponseBodyInput.value = "";
      if (grpcResponseMetadataInput) grpcResponseMetadataInput.value = "";
      if (grpcResponseTrailersInput) grpcResponseTrailersInput.value = "";
      if (grpcCurlPreviewBox) grpcCurlPreviewBox.textContent = "# Upload and select an RPC method to preview grpcurl command";
      if (protoSourceContainer) {
        protoSourceContainer.classList.add("hidden");
        protoSourceContainer.classList.remove("fullscreen-mode");
      }
      updateProtoEditorStats();
      return;
    }

    mockProtoFiles.forEach((file) => {
      const opt = document.createElement("option");
      opt.value = file.id;
      opt.textContent = file.filename;
      grpcProtoFileSelect.appendChild(opt);
    });

    if (!selectedProtoId || !mockProtoFiles.some((f) => f.id === selectedProtoId)) {
      selectedProtoId = mockProtoFiles[0].id;
    }

    if (selectedProtoId) {
      grpcProtoFileSelect.value = selectedProtoId;
      const file = mockProtoFiles.find((f) => f.id === selectedProtoId);
      if (file) {
        protoSourceEditor.value = file.content;
        if (protoSourceFilenameLabel) protoSourceFilenameLabel.textContent = file.filename;
        updateProtoEditorStats();
        await parseAndRenderProtoSchema(file.content);
      }
    }
  } catch (e) {
    console.error("Failed to load proto files:", e);
  }
}

async function handleSelectProtoFile() {
  selectedProtoId = grpcProtoFileSelect.value;
  const file = mockProtoFiles.find((f) => f.id === selectedProtoId);
  if (file) {
    protoSourceEditor.value = file.content;
    if (protoSourceFilenameLabel) protoSourceFilenameLabel.textContent = file.filename;
    updateProtoEditorStats();
    await parseAndRenderProtoSchema(file.content);
  }
}

async function handleConfirmCreateNewProto() {
  const filename = (newProtoFilenameInput.value || "").trim() || `service_${Date.now()}.proto`;
  newProtoInlineBox.classList.add("hidden");

  const defaultProto = `syntax = "proto3";

package example;

service ExampleService {
  rpc GetData (GetDataRequest) returns (GetDataResponse);
}

message GetDataRequest {
  string id = 1;
}

message GetDataResponse {
  string id = 1;
  string message = 2;
  int32 code = 3;
}
`;

  const newProto = {
    id: `proto-${Date.now()}`,
    filename,
    content: defaultProto,
    created_at: Math.floor(Date.now() / 1000),
  };

  try {
    await invoke("save_proto_file", { proto: newProto });
    showStatus(`✓ Created proto schema '${filename}'`);
    selectedProtoId = newProto.id;
    await loadProtoFiles();
  } catch (e) {
    showStatus(`Failed to add proto: ${e}`, true);
  }
}

async function handleUploadProtoFile(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  let savedCount = 0;
  let lastSavedId = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const content = await file.text();
      const filename = file.name || `uploaded_${Date.now()}_${i}.proto`;

      const newProto = {
        id: `proto-${Date.now()}-${i}`,
        filename,
        content,
        created_at: Math.floor(Date.now() / 1000),
      };

      await invoke("save_proto_file", { proto: newProto });
      savedCount++;
      lastSavedId = newProto.id;
    } catch (err) {
      console.error("Failed to save uploaded proto:", err);
    }
  }

  if (lastSavedId) {
    selectedProtoId = lastSavedId;
  }

  await loadProtoFiles();
  showStatus(`✓ Uploaded ${savedCount} .proto file(s)!`);
  protoFileInput.value = "";
}

async function handleUploadProtoFolder(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  // Filter for .proto extension only
  const protoFiles = files.filter((f) => f.name.toLowerCase().endsWith(".proto"));
  if (protoFiles.length === 0) {
    showStatus("No .proto files found in selected folder", true);
    protoFolderInput.value = "";
    return;
  }

  let protosToSave = [];
  let lastSavedId = null;

  for (let i = 0; i < protoFiles.length; i++) {
    const file = protoFiles[i];
    try {
      const content = await file.text();
      // webkitRelativePath is "folder_name/subfolder/file.proto"
      // Strip top-level selected folder name to preserve neat relative import path
      let relativePath = file.webkitRelativePath || file.name;
      if (relativePath.includes("/")) {
        const parts = relativePath.split("/");
        parts.shift(); // remove root folder name
        relativePath = parts.join("/");
      }
      if (!relativePath) relativePath = file.name;

      const protoObj = {
        id: `proto-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        filename: relativePath,
        content,
        created_at: Math.floor(Date.now() / 1000),
      };
      protosToSave.push(protoObj);
      lastSavedId = protoObj.id;
    } catch (err) {
      console.error("Failed to read proto file:", file.name, err);
    }
  }

  if (protosToSave.length > 0) {
    try {
      await invoke("save_proto_files_batch", { files: protosToSave });
      if (lastSavedId) selectedProtoId = lastSavedId;
      await loadProtoFiles();
      showStatus(`✓ Imported ${protosToSave.length} .proto schema(s) from directory!`);
    } catch (err) {
      showStatus(`Failed to batch import folder: ${err}`, true);
    }
  }
  protoFolderInput.value = "";
}

async function handleDeleteProtoFile() {
  const protoIdToDelete = selectedProtoId || (grpcProtoFileSelect ? grpcProtoFileSelect.value : null);
  if (!protoIdToDelete) {
    showStatus("No .proto file selected to delete", true);
    return;
  }
  const file = (mockProtoFiles || []).find((f) => f.id === protoIdToDelete);
  const name = file ? file.filename : (grpcProtoFileSelect && grpcProtoFileSelect.options[grpcProtoFileSelect.selectedIndex]?.text) || "proto";

  try {
    await invoke("delete_proto_file", { id: protoIdToDelete });
    showStatus(`✓ Deleted proto schema '${name}'`);
    selectedProtoId = null;
    selectedRpcMethod = null;
    parsedProtoInfo = null;
    if (protoSourceContainer) {
      protoSourceContainer.classList.add("hidden");
      protoSourceContainer.classList.remove("fullscreen-mode");
    }
    await loadProtoFiles();
  } catch (e) {
    console.error("Failed to delete proto:", e);
    showStatus(`Failed to delete proto: ${e}`, true);
  }
}

async function handleClearAllProtos() {
  try {
    const deletedCount = await invoke("delete_all_proto_files");
    showStatus(`✓ Cleared ${deletedCount || "all"} .proto file(s) from project`);
    selectedProtoId = null;
    selectedRpcMethod = null;
    parsedProtoInfo = null;
    mockProtoFiles = [];
    if (grpcProtoFileSelect) grpcProtoFileSelect.innerHTML = `<option value="">(No proto files)</option>`;
    if (grpcProtoCount) grpcProtoCount.textContent = "0 file(s)";
    if (protoSourceEditor) protoSourceEditor.value = "";
    if (protoSourceFilenameLabel) protoSourceFilenameLabel.textContent = "schema.proto";
    if (protoSourceContainer) {
      protoSourceContainer.classList.add("hidden");
      protoSourceContainer.classList.remove("fullscreen-mode");
    }
    if (grpcServiceTree) {
      grpcServiceTree.innerHTML = `<div class="tree-empty-placeholder">All proto schemas cleared. Upload a .proto file or folder to begin.</div>`;
    }
    await loadProtoFiles();
  } catch (err) {
    console.error("Failed to clear proto files:", err);
    showStatus(`Failed to clear proto files: ${err}`, true);
  }
}

async function handleCompileProtoSource() {
  const content = protoSourceEditor.value;
  if (!content) return;
  try {
    await parseAndRenderProtoSchema(content);
    if (selectedProtoId) {
      const file = mockProtoFiles.find((f) => f.id === selectedProtoId);
      if (file) {
        file.content = content;
        await invoke("save_proto_file", { proto: file });
        showStatus("✓ Proto schema compiled & saved!");
      }
    }
  } catch (e) {
    showStatus(`Proto Compile Error: ${e}`, true);
  }
}

async function parseAndRenderProtoSchema(protoContent) {
  try {
    parsedProtoInfo = await invoke("parse_proto_schema", { protoContent });
    renderGrpcServiceTree(parsedProtoInfo);
  } catch (e) {
    const errorStr = String(e);
    let hint = "";
    if (errorStr.includes("expected '.' or ';'") || errorStr.includes("found 'import'")) {
      hint = `<div class="tree-error-hint">💡 <b>Syntax Hint:</b> Check if the line before <code>import</code> (such as <code>syntax = "...";</code> or <code>package ...;</code> or <code>option ...;</code>) is missing a trailing semicolon <code>;</code>.</div>`;
    }
    grpcServiceTree.innerHTML = `
      <div class="tree-empty-placeholder error-text">
        <div class="tree-error-title">⚠️ Protobuf Compilation Error</div>
        <div class="tree-error-msg">${escapeHtml(errorStr)}</div>
        ${hint}
        <button id="openProtoFixBtn" class="primary tiny-btn" style="margin-top: 8px;">📝 Edit .proto Code</button>
      </div>
    `;
    const openProtoFixBtn = document.getElementById("openProtoFixBtn");
    if (openProtoFixBtn) {
      openProtoFixBtn.addEventListener("click", () => {
        protoSourceContainer.classList.remove("hidden");
        protoSourceEditor.focus();
      });
    }
  }
}

function renderGrpcServiceTree(info) {
  grpcServiceTree.innerHTML = "";
  if (!info || !info.services || info.services.length === 0) {
    grpcServiceTree.innerHTML = `<div class="tree-empty-placeholder">No service definitions found in this proto file.</div>`;
    return;
  }

  const query = (grpcMethodSearchInput ? grpcMethodSearchInput.value : "").trim().toLowerCase();

  // Calculate totals across all services
  let totalMethods = 0;
  let totalMocked = 0;

  info.services.forEach((service) => {
    service.methods.forEach((method) => {
      totalMethods++;
      const isMocked = mockGrpcRules.some(
        (r) => r.service_name === service.full_name && r.method_name === method.name
      );
      if (isMocked) totalMocked++;
    });
  });

  if (grpcFilterAllBtn) grpcFilterAllBtn.textContent = `All (${totalMethods})`;
  if (grpcFilterMockedBtn) grpcFilterMockedBtn.textContent = `⚡ Mocked (${totalMocked})`;

  let renderedMethodCount = 0;

  info.services.forEach((service) => {
    // Filter methods by search query & mocked filter
    const matchingMethods = service.methods.filter((method) => {
      const isMocked = mockGrpcRules.some(
        (r) => r.service_name === service.full_name && r.method_name === method.name
      );

      if (activeGrpcMethodFilter === "MOCKED" && !isMocked) {
        return false;
      }

      if (!query) return true;

      return (
        method.name.toLowerCase().includes(query) ||
        service.full_name.toLowerCase().includes(query) ||
        (method.input_type && method.input_type.toLowerCase().includes(query)) ||
        (method.output_type && method.output_type.toLowerCase().includes(query))
      );
    });

    if (matchingMethods.length === 0) {
      return;
    }

    const serviceCard = document.createElement("div");
    serviceCard.className = "grpc-service-node";

    // Count mocked within this service
    const serviceMockedCount = service.methods.filter((m) =>
      mockGrpcRules.some((r) => r.service_name === service.full_name && r.method_name === m.name)
    ).length;

    serviceCard.innerHTML = `
      <div class="grpc-service-header-row">
        <div class="grpc-service-title" title="${escapeHtml(service.full_name)}">⚡ ${escapeHtml(service.full_name)}</div>
        <span class="grpc-service-badge ${serviceMockedCount > 0 ? "mocked" : ""}" title="${serviceMockedCount} of ${service.methods.length} methods have custom mock rules">
          ${serviceMockedCount > 0 ? `⚡ ${serviceMockedCount}/${service.methods.length} Mocked` : `${service.methods.length} RPCs`}
        </span>
      </div>
    `;

    const methodsContainer = document.createElement("div");
    methodsContainer.className = "grpc-methods-list";

    matchingMethods.forEach((method) => {
      renderedMethodCount++;
      const methodItem = document.createElement("div");
      const isSelected =
        selectedRpcMethod &&
        selectedRpcMethod.service === service.full_name &&
        selectedRpcMethod.method === method.name;

      const mockRule = mockGrpcRules.find(
        (r) => r.service_name === service.full_name && r.method_name === method.name
      );

      let mockTagHtml = "";
      let tooltip = `${service.full_name}/${method.name} (${method.input_type} → ${method.output_type})`;

      if (mockRule) {
        const isOk = mockRule.status_code === 0;
        const statusLabel = isOk ? "OK" : `ERR (${mockRule.status_code})`;
        const tagClass = isOk ? "status-mock-ok" : "status-mock-err";
        const delayLabel = mockRule.delay_ms > 0 ? ` • ${mockRule.delay_ms}ms` : "";

        mockTagHtml = `<span class="grpc-mock-status-pill ${tagClass}" title="Custom Mock Active: Status ${mockRule.status_code}${delayLabel}">MOCK ${statusLabel}</span>`;
        tooltip += `\n★ Custom Mock Rule Active (Status: ${mockRule.status_code}${delayLabel})`;
      } else {
        mockTagHtml = `<span class="grpc-mock-status-pill status-stub" title="Default Protobuf Schema Stub (No custom rule saved)">Default</span>`;
      }

      methodItem.className = `grpc-method-node ${isSelected ? "active" : ""}`;
      methodItem.title = tooltip;
      methodItem.innerHTML = `
        <div class="grpc-method-node-left">
          <span class="grpc-method-name">${escapeHtml(method.name)}</span>
        </div>
        ${mockTagHtml}
      `;

      methodItem.addEventListener("click", () => {
        selectRpcMethod(service.full_name, method);
      });

      methodsContainer.appendChild(methodItem);
    });

    serviceCard.appendChild(methodsContainer);
    grpcServiceTree.appendChild(serviceCard);
  });

  if (renderedMethodCount === 0) {
    grpcServiceTree.innerHTML = `<div class="tree-empty-placeholder">No RPC methods match '${escapeHtml(query)}' ${activeGrpcMethodFilter === "MOCKED" ? "in Mocked filter" : ""}.</div>`;
  }

  // Select first method if none selected
  if (!selectedRpcMethod && info.services[0] && info.services[0].methods.length > 0) {
    selectRpcMethod(info.services[0].full_name, info.services[0].methods[0]);
  }
}

function setGrpcEditorTab(tab) {
  activeGrpcEditorTab = tab;
  if (grpcTabPayloadBtn) grpcTabPayloadBtn.classList.toggle("active", tab === "payload");
  if (grpcTabTrailersBtn) grpcTabTrailersBtn.classList.toggle("active", tab === "trailers");
  if (grpcTabGrpcurlBtn) grpcTabGrpcurlBtn.classList.toggle("active", tab === "grpcurl");

  if (grpcEditorPayloadSection) grpcEditorPayloadSection.classList.toggle("hidden", tab !== "payload");
  if (grpcEditorTrailersSection) grpcEditorTrailersSection.classList.toggle("hidden", tab !== "trailers");
  if (grpcEditorGrpcurlSection) grpcEditorGrpcurlSection.classList.toggle("hidden", tab !== "grpcurl");

  if (tab === "grpcurl") {
    updateGrpcCurlPreview();
  }
}

function updateGrpcCurlPreview() {
  if (!selectedRpcMethod) {
    if (grpcCurlPreviewBox) grpcCurlPreviewBox.textContent = "Select an RPC method from the left tree";
    return "";
  }
  const port = currentMockStatus.grpc_port || 50051;
  const service = selectedRpcMethod.service;
  const method = selectedRpcMethod.method;
  const sampleReq = selectedRpcMethod.default_request_json || "{}";

  let cmd = `grpcurl -plaintext`;
  try {
    const metaObj = JSON.parse(grpcResponseMetadataInput.value || "{}");
    for (const [k, v] of Object.entries(metaObj)) {
      cmd += ` -H "${k}: ${v}"`;
    }
  } catch (e) {}

  cmd += ` -d '${sampleReq.replace(/\n\s*/g, " ")}' localhost:${port} ${service}/${method}`;
  if (grpcCurlPreviewBox) {
    grpcCurlPreviewBox.textContent = cmd;
  }
  return cmd;
}

function selectRpcMethod(serviceFullName, methodObj) {
  selectedRpcMethod = {
    service: serviceFullName,
    method: methodObj.name,
    input_type: methodObj.input_type,
    output_type: methodObj.output_type,
    default_request_json: methodObj.default_request_json,
    default_response_json: methodObj.default_response_json,
  };

  grpcEditorTitle.textContent = `${serviceFullName} / ${methodObj.name}`;
  grpcSelectedRpcSubtitle.textContent = `Input: ${methodObj.input_type} → Output: ${methodObj.output_type}`;

  // Find existing rule or populate default
  const existingRule = mockGrpcRules.find(
    (r) => r.service_name === serviceFullName && r.method_name === methodObj.name
  );

  if (existingRule) {
    grpcStatusCodeSelect.value = existingRule.status_code;
    grpcStatusMessageInput.value = existingRule.grpc_message || (existingRule.status_code === 0 ? "OK" : "");
    grpcDelayInput.value = existingRule.delay_ms;
    grpcResponseMetadataInput.value = existingRule.response_metadata || "{}";
    grpcResponseTrailersInput.value = existingRule.response_trailers || "{}";
    grpcResponseBodyInput.value = existingRule.response_json;
    if (deleteGrpcRuleBtn) deleteGrpcRuleBtn.classList.remove("hidden");
  } else {
    grpcStatusCodeSelect.value = "0";
    grpcStatusMessageInput.value = "OK";
    grpcDelayInput.value = 0;
    grpcResponseMetadataInput.value = '{\n  "x-trace-id": "trc_sample_8821"\n}';
    grpcResponseTrailersInput.value = '{\n  "x-rate-limit-remaining": "100"\n}';
    grpcResponseBodyInput.value = methodObj.default_response_json || "{}";
    if (deleteGrpcRuleBtn) deleteGrpcRuleBtn.classList.add("hidden");
  }

  // Sync gRPC delay chips
  document.querySelectorAll(".grpc-delay-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.delay === String(grpcDelayInput.value));
  });

  updateGrpcCurlPreview();

  if (parsedProtoInfo) {
    renderGrpcServiceTree(parsedProtoInfo);
  }
}

function handleGenerateGrpcTemplate() {
  if (!selectedRpcMethod) {
    showStatus("Please select an RPC method first", true);
    return;
  }
  grpcResponseBodyInput.value = selectedRpcMethod.default_response_json || "{}";
  showStatus("✓ Generated default Protobuf response JSON schema");
}

async function loadGrpcRules() {
  try {
    mockGrpcRules = await invoke("get_grpc_rules");
  } catch (e) {
    console.error("Failed to load gRPC rules:", e);
  }
}

async function handleSaveGrpcRule() {
  if (!selectedRpcMethod) {
    showStatus("Please select an RPC method first", true);
    return;
  }

  const statusCode = parseInt(grpcStatusCodeSelect.value, 10) || 0;
  const grpcMessage = (grpcStatusMessageInput.value || "").trim();
  const delayMs = parseInt(grpcDelayInput.value, 10) || 0;
  const responseMetadata = grpcResponseMetadataInput.value.trim() || "{}";
  const responseTrailers = grpcResponseTrailersInput.value.trim() || "{}";
  const responseJson = grpcResponseBodyInput.value.trim() || "{}";

  const rule = {
    id: `grpc-${selectedRpcMethod.service}-${selectedRpcMethod.method}`,
    service_name: selectedRpcMethod.service,
    method_name: selectedRpcMethod.method,
    status_code: statusCode,
    grpc_message: grpcMessage,
    delay_ms: delayMs,
    response_metadata: responseMetadata,
    response_trailers: responseTrailers,
    response_json: responseJson,
    created_at: Math.floor(Date.now() / 1000),
  };

  try {
    await invoke("save_grpc_rule", { rule });
    showStatus(`✓ gRPC Mock rule for '${selectedRpcMethod.method}' saved!`);
    await loadGrpcRules();
    if (deleteGrpcRuleBtn) deleteGrpcRuleBtn.classList.remove("hidden");
    if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
  } catch (e) {
    showStatus(`Failed to save gRPC rule: ${e}`, true);
  }
}

async function handleDeleteGrpcMockRule() {
  if (!selectedRpcMethod) return;

  const existingRule = mockGrpcRules.find(
    (r) => r.service_name === selectedRpcMethod.service && r.method_name === selectedRpcMethod.method
  );

  if (!existingRule) return;

  try {
    await invoke("delete_grpc_rule", { id: existingRule.id });
    showStatus(`✓ Removed custom mock rule for '${selectedRpcMethod.method}', reverted to default stub`);
    await loadGrpcRules();
    if (deleteGrpcRuleBtn) deleteGrpcRuleBtn.classList.add("hidden");
    selectRpcMethod(selectedRpcMethod.service, {
      name: selectedRpcMethod.method,
      input_type: selectedRpcMethod.input_type,
      output_type: selectedRpcMethod.output_type,
      default_request_json: selectedRpcMethod.default_request_json,
      default_response_json: selectedRpcMethod.default_response_json,
    });
    if (parsedProtoInfo) renderGrpcServiceTree(parsedProtoInfo);
  } catch (e) {
    showStatus(`Failed to delete gRPC rule: ${e}`, true);
  }
}

async function handleCopyGrpcurl() {
  const cmd = updateGrpcCurlPreview();
  if (!cmd) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cmd);
    } else {
      await invoke("plugin:clipboard-manager|write_text", { text: cmd });
    }
    showStatus("✓ grpcurl command copied to clipboard");
  } catch (e) {
    showStatus("Failed to copy grpcurl command", true);
  }
}

// --------------------------------------------------------------------------
// Traffic Logs & Record-to-Mock Feature
// --------------------------------------------------------------------------

function handleIncomingTrafficEvent(entry) {
  mockTrafficLogs.unshift(entry);
  if (mockTrafficLogs.length > 500) mockTrafficLogs.pop();
  trafficBadgeCount.textContent = mockTrafficLogs.length;
  if (activeMockSubTab === "traffic") {
    renderTrafficLogsTable();
  }
}

async function loadTrafficLogs(showFeedback = true) {
  try {
    mockTrafficLogs = await invoke("get_traffic_logs", { limit: 200 });
    trafficBadgeCount.textContent = mockTrafficLogs.length;
    if (activeMockSubTab === "traffic") {
      renderTrafficLogsTable();
    }
    if (showFeedback) {
      showStatus("✓ Traffic logs refreshed");
    }
  } catch (e) {
    console.error("Failed to get traffic logs:", e);
  }
}

function renderTrafficLogsTable() {
  trafficLogsTableBody.innerHTML = "";
  const filterType = trafficFilterType.value;
  const filterSource = trafficFilterSource.value;
  const search = (trafficFilterSearch.value || "").toLowerCase().trim();

  const filtered = mockTrafficLogs.filter((log) => {
    if (filterType !== "ALL" && log.server_type !== filterType) return false;
    if (filterSource === "MOCK" && !log.is_mocked) return false;
    if (filterSource === "FORWARDED" && log.is_mocked) return false;
    if (search) {
      const matchSearch =
        log.method_or_rpc.toLowerCase().includes(search) ||
        log.path_or_service.toLowerCase().includes(search) ||
        String(log.status_code).includes(search);
      if (!matchSearch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    trafficLogsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; opacity: 0.6;">No traffic recorded yet. Send requests to the mock server port to see live logs.</td></tr>`;
    return;
  }

  filtered.forEach((log) => {
    const tr = document.createElement("tr");
    tr.className = `mock-traffic-row ${log.id === selectedTrafficLogId ? "selected" : ""}`;

    const date = new Date(log.timestamp * 1000);
    const timeStr = date.toTimeString().split(" ")[0];

    const sourceBadge = log.is_mocked
      ? `<span class="mock-source-badge source-mock">MOCK</span>`
      : `<span class="mock-source-badge source-forwarded">FORWARDED</span>`;

    const statusClass =
      log.status_code >= 500
        ? "status-5xx"
        : log.status_code >= 400
        ? "status-4xx"
        : "status-2xx";

    tr.innerHTML = `
      <td>${timeStr}</td>
      <td><strong>${log.server_type}</strong></td>
      <td><code>${escapeHtml(log.method_or_rpc)}</code></td>
      <td title="${escapeHtml(log.path_or_service)}">${escapeHtml(truncate(log.path_or_service, 32))}</td>
      <td><span class="status-badge ${statusClass}">${log.status_code}</span></td>
      <td>${sourceBadge}</td>
      <td>${log.duration_ms} ms</td>
      <td>
        ${
          !log.is_mocked && log.server_type === "REST"
            ? `<button class="record-action-btn" title="Convert into local mock rule">🪄 Record Mock</button>`
            : ""
        }
      </td>
    `;

    tr.addEventListener("click", (e) => {
      if (e.target.classList.contains("record-action-btn")) {
        e.stopPropagation();
        handleSaveLogAsMock(log.id);
        return;
      }
      selectTrafficLog(log.id);
    });

    trafficLogsTableBody.appendChild(tr);
  });
}

function selectTrafficLog(logId) {
  selectedTrafficLogId = logId;
  const log = mockTrafficLogs.find((l) => l.id === logId);
  if (!log) return;

  renderTrafficLogsTable();

  detailDrawerSubtitle.textContent = `${log.server_type} • ${log.method_or_rpc} • ${log.path_or_service}`;

  let reqHeadersFormatted = log.request_headers || "{}";
  let respHeadersFormatted = log.response_headers || "{}";
  try {
    reqHeadersFormatted = JSON.stringify(JSON.parse(reqHeadersFormatted), null, 2);
  } catch (_) {}
  try {
    respHeadersFormatted = JSON.stringify(JSON.parse(respHeadersFormatted), null, 2);
  } catch (_) {}

  trafficDetailContent.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
      <div>
        <strong>Status:</strong> <span class="status-badge ${log.status_code >= 400 ? "status-4xx" : "status-2xx"}">${log.status_code}</span>
        <strong style="margin-left:8px;">Latency:</strong> ${log.duration_ms} ms
      </div>
      ${
        log.server_type === "REST"
          ? `<button id="recordDetailBtn" class="record-action-btn">🪄 Save as Mock Rule</button>`
          : ""
      }
    </div>

    <div class="detail-block">
      <span class="detail-block-title">Request Headers:</span>
      <div class="detail-json-box">${escapeHtml(reqHeadersFormatted)}</div>
    </div>

    ${
      log.request_body
        ? `<div class="detail-block">
             <span class="detail-block-title">Request Body:</span>
             <div class="detail-json-box">${escapeHtml(log.request_body)}</div>
           </div>`
        : ""
    }

    <div class="detail-block">
      <span class="detail-block-title">Response Headers:</span>
      <div class="detail-json-box">${escapeHtml(respHeadersFormatted)}</div>
    </div>

    <div class="detail-block">
      <span class="detail-block-title">Response Body:</span>
      <div class="detail-json-box">${escapeHtml(log.response_body || "(empty)")}</div>
    </div>
  `;

  const recordBtn = document.getElementById("recordDetailBtn");
  if (recordBtn) {
    recordBtn.addEventListener("click", () => handleSaveLogAsMock(log.id));
  }
}

async function handleSaveLogAsMock(logId) {
  try {
    const newRule = await invoke("convert_log_to_mock_rule", { logId });
    showStatus(`✓ Saved as Mock Rule: '${newRule.name}'!`);
    await loadRestRules();
    setMockSubTab("rest");
    selectRestRule(newRule.id);
  } catch (e) {
    showStatus(`Failed to record mock rule: ${e}`, true);
  }
}

async function handleClearTrafficLogs() {
  try {
    await invoke("clear_traffic_logs");
    mockTrafficLogs = [];
    trafficBadgeCount.textContent = "0";
    trafficDetailContent.innerHTML = `<div class="detail-empty-placeholder">Traffic logs cleared.</div>`;
    renderTrafficLogsTable();
    showStatus("✓ Traffic logs cleared");
  } catch (e) {
    showStatus(`Failed to clear logs: ${e}`, true);
  }
}

// --------------------------------------------------------------------------
// Export & Import Mock Collections
// --------------------------------------------------------------------------

async function handleExportCollection() {
  try {
    const payload = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      rest_rules: mockRestRules,
      grpc_rules: mockGrpcRules,
      proto_files: mockProtoFiles,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palugada_mocks_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus("✓ Exported mock collection to JSON");
  } catch (e) {
    showStatus(`Export failed: ${e}`, true);
  }
}

async function handleImportCollection(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let count = 0;
    if (data.rest_rules && Array.isArray(data.rest_rules)) {
      for (const rule of data.rest_rules) {
        await invoke("save_rest_rule", { rule });
        count++;
      }
    }
    if (data.proto_files && Array.isArray(data.proto_files)) {
      for (const p of data.proto_files) {
        await invoke("save_proto_file", { proto: p });
      }
    }
    if (data.grpc_rules && Array.isArray(data.grpc_rules)) {
      for (const g of data.grpc_rules) {
        await invoke("save_grpc_rule", { rule: g });
      }
    }

    showStatus(`✓ Imported ${count} rules & schemas from collection!`);
    await refreshMockServerUI();
  } catch (err) {
    showStatus(`Import failed: ${err.message || err}`, true);
  } finally {
    importMockFileInput.value = "";
  }
}

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

