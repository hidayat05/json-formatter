import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";

const invoke = window.__TAURI_INTERNALS__?.invoke;

export function initOpenssl() {
  const opensslInput = document.querySelector("#opensslInput");
  const opensslOutput = document.querySelector("#opensslOutput");
  const opensslUrlInput = document.querySelector("#opensslUrlInput");
  const opensslChainMode = document.querySelector("#opensslChainMode");

  async function handleOpensslDetail() {
    try {
      const result = await invoke("openssl_cert_detail", {
        certInput: opensslInput.value,
      });
      opensslOutput.value = result;
      const certCount = (
        opensslInput.value.match(/-----BEGIN CERTIFICATE-----/g) || []
      ).length;
      const label = certCount > 1 ? `${certCount} certificates` : "certificate";
      showStatus(
        `✓ Certificate detail generated successfully (${label || "1 certificate"})`,
      );
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
        `✓ SSL detail fetched from URL successfully (${opensslChainMode.value} mode)`,
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

  document
    .querySelector("#opensslDetailBtn")
    ?.addEventListener("click", handleOpensslDetail);
  document
    .querySelector("#opensslUrlDetailBtn")
    ?.addEventListener("click", handleOpensslDetailFromUrl);
  document
    .querySelector("#clearOpensslBtn")
    ?.addEventListener("click", handleClearOpenssl);

  document
    .querySelector("#copyOpensslInputBtn")
    ?.addEventListener("click", () => {
      copyText(opensslInput.value, "Certificate input");
    });
  document
    .querySelector("#copyOpensslOutputBtn")
    ?.addEventListener("click", () => {
      copyText(opensslOutput.value, "Certificate detail");
    });

  opensslUrlInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOpensslDetailFromUrl();
    }
  });
}
