import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";

const invoke = window.__TAURI_INTERNALS__?.invoke;

export function initTraceroute() {
  const tracerouteUrlInput = document.querySelector("#tracerouteUrlInput");
  const tracerouteOutput = document.querySelector("#tracerouteOutput");
  const tracerouteLoading = document.querySelector("#tracerouteLoading");
  const runTracerouteBtn = document.querySelector("#runTracerouteBtn");
  const clearTracerouteBtn = document.querySelector("#clearTracerouteBtn");
  const copyTracerouteOutputBtn = document.querySelector(
    "#copyTracerouteOutputBtn",
  );

  function setTracerouteLoadingState(isLoading) {
    if (tracerouteLoading)
      tracerouteLoading.classList.toggle("hidden", !isLoading);
    if (tracerouteOutput)
      tracerouteOutput.classList.toggle("hidden", isLoading);
    if (tracerouteUrlInput) tracerouteUrlInput.disabled = isLoading;
    if (runTracerouteBtn) {
      runTracerouteBtn.disabled = isLoading;
      runTracerouteBtn.textContent = isLoading
        ? "Running..."
        : "Run Traceroute";
    }
    if (clearTracerouteBtn) clearTracerouteBtn.disabled = isLoading;
    if (copyTracerouteOutputBtn) {
      copyTracerouteOutputBtn.disabled = isLoading || !tracerouteOutput?.value;
    }
  }

  async function handleTraceroute() {
    const urlInput = tracerouteUrlInput?.value.trim();
    if (!urlInput) {
      showStatus("Please enter a URL or host for traceroute", true);
      return;
    }

    if (tracerouteOutput) tracerouteOutput.value = "";
    setTracerouteLoadingState(true);

    try {
      const result = await invoke("run_traceroute", { urlInput });
      if (tracerouteOutput) tracerouteOutput.value = result;
      showStatus("✓ Traceroute completed successfully");
    } catch (error) {
      if (tracerouteOutput) tracerouteOutput.value = "";
      showStatus(`Error: ${error}`, true);
    } finally {
      setTracerouteLoadingState(false);
    }
  }

  function handleClearTraceroute() {
    if (tracerouteUrlInput) tracerouteUrlInput.value = "";
    if (tracerouteOutput) tracerouteOutput.value = "";
    setTracerouteLoadingState(false);
  }

  runTracerouteBtn?.addEventListener("click", handleTraceroute);
  clearTracerouteBtn?.addEventListener("click", handleClearTraceroute);
  copyTracerouteOutputBtn?.addEventListener("click", () => {
    copyText(tracerouteOutput?.value || "", "Traceroute output");
  });

  tracerouteUrlInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTraceroute();
    }
  });

  setTracerouteLoadingState(false);
}
