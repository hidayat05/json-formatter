import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";
import { parseUrl, reconstructUrl } from "./url-parser.js";

export function initUrlBeautifier() {
  const urlInput = document.querySelector("#urlInput");
  const urlProtocol = document.querySelector("#urlProtocol");
  const urlHostname = document.querySelector("#urlHostname");
  const urlPort = document.querySelector("#urlPort");
  const urlPathname = document.querySelector("#urlPathname");
  const urlHash = document.querySelector("#urlHash");
  const urlParamsList = document.querySelector("#urlParamsList");
  const urlAddParamBtn = document.querySelector("#urlAddParamBtn");
  const urlBeautifyBtn = document.querySelector("#urlBeautifyBtn");
  const urlEncodeBtn = document.querySelector("#urlEncodeBtn");
  const urlDecodeBtn = document.querySelector("#urlDecodeBtn");
  const urlReconstructBtn = document.querySelector("#urlReconstructBtn");
  const urlClearBtn = document.querySelector("#urlClearBtn");
  const copyUrlInputBtn = document.querySelector("#copyUrlInputBtn");

  function addParamRow(key = "", value = "") {
    if (!urlParamsList) return;
    const placeholder = urlParamsList.querySelector(".params-placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    const row = document.createElement("div");
    row.className = "url-param-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "param-key";
    keyInput.placeholder = "Key";
    keyInput.value = key;
    keyInput.spellcheck = false;

    const valInput = document.createElement("input");
    valInput.type = "text";
    valInput.className = "param-value";
    valInput.placeholder = "Value";
    valInput.value = value;
    valInput.spellcheck = false;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-mini-btn";
    copyBtn.title = "Copy Value";
    copyBtn.textContent = "📋";
    copyBtn.addEventListener("click", () => {
      const k = keyInput.value.trim();
      const v = valInput.value;
      if (v) {
        copyText(v, `Value of parameter "${k || "unnamed"}"`);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete-mini-btn";
    delBtn.title = "Delete Parameter";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      row.remove();
      if (urlParamsList.children.length === 0) {
        const ph = document.createElement("div");
        ph.className = "params-placeholder";
        ph.textContent = "No query parameters found";
        urlParamsList.appendChild(ph);
      }
    });

    row.append(keyInput, valInput, copyBtn, delBtn);
    urlParamsList.appendChild(row);
  }

  function renderUrlComponents(components) {
    if (urlProtocol) urlProtocol.value = components.protocol || "";
    if (urlHostname) urlHostname.value = components.hostname || "";
    if (urlPort) urlPort.value = components.port || "";
    if (urlPathname) urlPathname.value = components.pathname || "";
    if (urlHash) urlHash.value = components.hash || "";

    if (!urlParamsList) return;
    urlParamsList.replaceChildren();

    const searchParams = new URLSearchParams(components.search);
    let count = 0;
    for (const [key, value] of searchParams.entries()) {
      addParamRow(key, value);
      count++;
    }

    if (count === 0) {
      const ph = document.createElement("div");
      ph.className = "params-placeholder";
      ph.textContent = "No query parameters found";
      urlParamsList.appendChild(ph);
    }
  }

  function handleUrlBeautify() {
    const urlStr = urlInput?.value.trim();
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
    const urlStr = urlInput?.value.trim();
    if (!urlStr) return;
    if (urlInput) urlInput.value = encodeURI(urlStr);
    showStatus("✓ Entire URL encoded");
  }

  function handleUrlDecode() {
    const urlStr = urlInput?.value.trim();
    if (!urlStr) return;
    try {
      if (urlInput) urlInput.value = decodeURI(urlStr);
      showStatus("✓ Entire URL decoded");
    } catch {
      showStatus("Error decoding URL", true);
    }
  }

  function handleUrlReconstruct() {
    try {
      const params = [];
      const rows = urlParamsList?.querySelectorAll(".url-param-row") || [];
      rows.forEach((row) => {
        const key = row.querySelector(".param-key")?.value || "";
        const val = row.querySelector(".param-value")?.value || "";
        if (key.trim()) {
          params.push([key.trim(), val]);
        }
      });

      const url = reconstructUrl({
        protocol: urlProtocol?.value || "",
        hostname: urlHostname?.value || "",
        port: urlPort?.value || "",
        pathname: urlPathname?.value || "",
        hash: urlHash?.value || "",
        params,
      });

      if (urlInput) urlInput.value = url;
      showStatus("✓ URL reconstructed from components");
    } catch (err) {
      showStatus(`Failed to reconstruct: ${err.message}`, true);
    }
  }

  function handleUrlClear() {
    if (urlInput) urlInput.value = "";
    if (urlProtocol) urlProtocol.value = "";
    if (urlHostname) urlHostname.value = "";
    if (urlPort) urlPort.value = "";
    if (urlPathname) urlPathname.value = "";
    if (urlHash) urlHash.value = "";
    if (urlParamsList) {
      urlParamsList.replaceChildren();
      const ph = document.createElement("div");
      ph.className = "params-placeholder";
      ph.textContent = "No query parameters found";
      urlParamsList.appendChild(ph);
    }
    showStatus("URL fields cleared");
  }

  urlBeautifyBtn?.addEventListener("click", handleUrlBeautify);
  urlEncodeBtn?.addEventListener("click", handleUrlEncode);
  urlDecodeBtn?.addEventListener("click", handleUrlDecode);
  urlReconstructBtn?.addEventListener("click", handleUrlReconstruct);
  urlClearBtn?.addEventListener("click", handleUrlClear);
  urlAddParamBtn?.addEventListener("click", () => addParamRow("", ""));
  copyUrlInputBtn?.addEventListener("click", () => {
    copyText(urlInput?.value || "", "URL");
  });
}
