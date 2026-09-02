import { showStatus } from "./status.js";
import { copyText } from "./clipboard.js";
import { sortKeys } from "./json-utils.js";

const invoke = window.__TAURI_INTERNALS__?.invoke;

export function initConverter() {
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");
  const language = document.getElementById("languageSelect");
  const classNameInput = document.getElementById("classNameInputText");

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
        name: className,
      });

      outputText.value = result;
      showStatus(`✓ JSON converted to ${languageSelected} class successfully`);
    } catch (error) {
      outputText.value = "";
      showStatus(`Error: ${error}`, true);
    }
  }

  function handleClear() {
    inputText.value = "";
    outputText.value = "";
    classNameInput.value = "";
  }

  document.getElementById("minifyBtn")?.addEventListener("click", handleMinify);
  document.getElementById("formatBtn")?.addEventListener("click", handleFormat);
  document
    .getElementById("sortKeysBtn")
    ?.addEventListener("click", handleSortKeys);
  document
    .getElementById("jsonToStringBtn")
    ?.addEventListener("click", handleJsonToString);
  document
    .getElementById("stringToJsonBtn")
    ?.addEventListener("click", handleStringToJson);
  document
    .getElementById("jsonToProtoBtn")
    ?.addEventListener("click", handleJsonToProto);
  document
    .getElementById("protoToJsonBtn")
    ?.addEventListener("click", handleProtoToJson);
  document
    .getElementById("jsonToClassBtn")
    ?.addEventListener("click", handleJsonToClass);
  document.getElementById("clearBtn")?.addEventListener("click", handleClear);

  document.getElementById("copyInputBtn")?.addEventListener("click", () => {
    copyText(inputText.value, "Input");
  });
  document.getElementById("copyOutputBtn")?.addEventListener("click", () => {
    copyText(outputText.value, "Output");
  });
}
