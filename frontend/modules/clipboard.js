import { showStatus } from "./status.js";

export async function copyText(text, label = "Content") {
  if (!text) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showStatus(`✓ ${label} copied to clipboard`);
      return true;
    }

    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (invoke) {
      await invoke("plugin:clipboard-manager|write_text", { text });
      showStatus(`✓ ${label} copied to clipboard`);
      return true;
    }

    throw new Error("Clipboard API not available");
  } catch (error) {
    showStatus(`Error: Failed to copy - ${error}`, true);
    return false;
  }
}
