import { initTabs } from "./modules/tabs.js";
import { initConverter } from "./modules/converter.js";
import { initCompare } from "./modules/compare.js";
import { initOpenssl } from "./modules/openssl.js";
import { initTraceroute } from "./modules/traceroute.js";
import { initJsonHtml } from "./modules/json-html.js";
import { initUrlBeautifier } from "./modules/url-beautifier.js";
import { initImageResizer } from "./modules/image-resizer.js";
import { initMermaid } from "./modules/mermaid-editor.js";
import { initJsonEditor } from "./modules/json-editor.js";

// Clean smart/curly quotes across all text inputs
document.querySelectorAll("textarea, input[type='text']").forEach((inputEl) => {
  inputEl.addEventListener("input", (e) => {
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = target.value;

    const cleaned = val
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036”“”„‟″‟❝❞]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035‘’‚‛′‟❛❜]/g, "'");

    if (val !== cleaned) {
      target.value = cleaned;
      if (start !== null && end !== null) {
        target.setSelectionRange(start, end);
      }
    }
  });
});

// Default active tab: initialize immediately
initConverter();

// Lazy router initialization for other tabs
initTabs({
  converter: null,
  compare: initCompare,
  openssl: initOpenssl,
  traceroute: initTraceroute,
  jsonHtml: initJsonHtml,
  url: initUrlBeautifier,
  imageResizer: initImageResizer,
  mermaid: initMermaid,
  jsonEditor: initJsonEditor,
});
