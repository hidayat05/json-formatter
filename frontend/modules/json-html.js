import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";
import { escapeHtml } from "./json-utils.js";

const invoke = window.__TAURI_INTERNALS__?.invoke;

export function initJsonHtml() {
  const jsonHtmlInput = document.querySelector("#jsonHtmlInput");
  const htmlTemplate = document.querySelector("#htmlTemplate");
  const htmlResult = document.querySelector("#htmlResult");

  function renderJsonToHtml() {
    const jsonText = jsonHtmlInput?.value.trim() || "";
    const templateText = htmlTemplate?.value.trim() || "";

    if (!jsonText) {
      showStatus("Please enter JSON data", true);
      return;
    }

    if (!templateText) {
      showStatus("Please enter an HTML template", true);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonText);
      let resultHtml = templateText;

      const replaceValues = (obj, text) => {
        let curText = text;
        for (const [key, value] of Object.entries(obj)) {
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            curText = curText.replace(
              new RegExp(`{{\\s*${key}\\s*}}`, "g"),
              escapeHtml(JSON.stringify(value)),
            );
            curText = replaceValues(value, curText);
          } else if (Array.isArray(value)) {
            curText = curText.replace(
              new RegExp(`{{\\s*${key}\\s*}}`, "g"),
              escapeHtml(JSON.stringify(value)),
            );
          } else {
            curText = curText.replace(
              new RegExp(`{{\\s*${key}\\s*}}`, "g"),
              escapeHtml(String(value)),
            );
          }
        }
        return curText;
      };

      resultHtml = replaceValues(jsonData, resultHtml);

      if (htmlResult) {
        htmlResult.replaceChildren();
        const parser = new DOMParser();
        const doc = parser.parseFromString(resultHtml, "text/html");
        while (doc.body.firstChild) {
          htmlResult.appendChild(doc.body.firstChild);
        }
      }
      showStatus("✓ HTML rendered successfully!");
    } catch (error) {
      showStatus(`Error: ${error.message}`, true);
      if (htmlResult) {
        htmlResult.replaceChildren();
        const errDiv = document.createElement("div");
        errDiv.className = "placeholder";
        const span = document.createElement("span");
        span.style.color = "red";
        span.textContent = `Error: ${error.message}`;
        errDiv.appendChild(span);
        htmlResult.appendChild(errDiv);
      }
    }
  }

  async function handleFormatJsonHtml() {
    const jsonText = jsonHtmlInput?.value.trim();
    if (!jsonText) {
      showStatus("Please enter JSON data", true);
      return;
    }

    try {
      const result = await invoke("format_json", { input: jsonText });
      if (jsonHtmlInput) jsonHtmlInput.value = result;
      showStatus("✓ JSON data formatted successfully");
    } catch (error) {
      showStatus(`Error: ${error}`, true);
    }
  }

  function handleClearHtml() {
    if (jsonHtmlInput) jsonHtmlInput.value = "";
    if (htmlTemplate) htmlTemplate.value = "";
    if (htmlResult) {
      htmlResult.replaceChildren();
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.textContent = "Result will appear here after rendering";
      htmlResult.appendChild(placeholder);
    }
    showStatus("JSON to HTML cleared!");
  }

  document
    .querySelector("#renderHtmlBtn")
    ?.addEventListener("click", renderJsonToHtml);
  document
    .querySelector("#formatJsonHtmlBtn")
    ?.addEventListener("click", handleFormatJsonHtml);
  document
    .querySelector("#clearHtmlBtn")
    ?.addEventListener("click", handleClearHtml);

  document.querySelector("#copyJsonHtmlBtn")?.addEventListener("click", () => {
    copyText(jsonHtmlInput?.value || "", "JSON data");
  });
  document.querySelector("#copyTemplateBtn")?.addEventListener("click", () => {
    copyText(htmlTemplate?.value || "", "HTML template");
  });
  document
    .querySelector("#copyResultHtmlBtn")
    ?.addEventListener("click", () => {
      copyText(htmlResult?.textContent || "", "HTML result");
    });
  document
    .querySelector("#copyHtmlResultBtn")
    ?.addEventListener("click", () => {
      copyText(htmlResult?.textContent || "", "HTML result");
    });

  jsonHtmlInput?.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      renderJsonToHtml();
    }
  });

  htmlTemplate?.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      renderJsonToHtml();
    }
  });
}
