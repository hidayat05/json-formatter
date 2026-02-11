// Import Tauri API - v2 uses window.__TAURI_INTERNALS__
const invoke = window.__TAURI_INTERNALS__.invoke;

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const statusMessage = document.getElementById('statusMessage');
const language = document.getElementById('languageSelect');
const classNameInput = document.getElementById('classNameInputText');

const converterTabBtn = document.getElementById('converterTabBtn');
const compareTabBtn = document.getElementById('compareTabBtn');
const converterSection = document.getElementById('converterSection');
const compareSection = document.getElementById('compareSection');

const compareLeft = document.getElementById('compareLeft');
const compareRight = document.getElementById('compareRight');
const diffContainer = document.getElementById('diffContainer');

let lastDiffText = '';
let lastDiffHtml = '';

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sortKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value && typeof value === 'object') {
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
            diff.push({ type: 'same', left: leftLines[i - 1], right: rightLines[j - 1] });
            i -= 1;
            j -= 1;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.push({ type: 'added', left: '', right: rightLines[j - 1] });
            j -= 1;
        } else {
            diff.push({ type: 'removed', left: leftLines[i - 1], right: '' });
            i -= 1;
        }
    }

    diff.reverse();

    const merged = [];
    for (let k = 0; k < diff.length; k += 1) {
        const current = diff[k];
        const next = diff[k + 1];
        if (current && current.type === 'removed' && next && next.type === 'added') {
            merged.push({ type: 'changed', left: current.left, right: next.right });
            k += 1;
        } else {
            merged.push(current);
        }
    }
    return merged;
}

function buildDiffHtml(entries) {
    if (!entries.length) {
        return '<div class="diff-header">Left</div><div class="diff-header">Right</div>';
    }

    const rows = entries.map((entry) => {
        const leftVal = entry.left || '';
        const rightVal = entry.right || '';
        const leftCell = `<div class="diff-cell ${leftVal ? '' : 'diff-empty'}">${escapeHtml(leftVal || ' ')}</div>`;
        const rightCell = `<div class="diff-cell ${rightVal ? '' : 'diff-empty'}">${escapeHtml(rightVal || ' ')}</div>`;
        return `<div class="diff-row diff-${entry.type}">${leftCell}${rightCell}</div>`;
    }).join('');

    return `<div class="diff-header">Left</div><div class="diff-header">Right</div>${rows}`;
}

function serializeDiff(entries) {
    return entries.map((entry) => {
        switch (entry.type) {
            case 'same':
                return `  ${entry.left}`;
            case 'added':
                return `+ ${entry.right}`;
            case 'removed':
                return `- ${entry.left}`;
            case 'changed':
                return `- ${entry.left}\n+ ${entry.right}`;
            default:
                return '';
        }
    }).join('\n');
}

function buildDiffDocument(htmlContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>JSON Diff</title>
<style>
    body { margin: 0; padding: 16px; font-family: 'JetBrains Mono', monospace; background: #e0e5ec; color: #5a6a7d; }
    .diff-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; height: 100%; padding: 6px; border-radius: 10px; background: #e0e5ec; box-shadow: inset 4px 4px 8px rgba(163, 177, 198, 0.6), inset -4px -4px 8px rgba(255, 255, 255, 0.5); overflow: auto; font-size: 13px; line-height: 1.4; }
    .diff-header { position: sticky; top: 0; z-index: 1; background: linear-gradient(145deg, #d4dae5, #edf2f9); padding: 8px; font-weight: 700; color: #5a6a7d; border-radius: 8px; }
    .diff-row { display: contents; }
    .diff-cell { padding: 6px 8px; white-space: pre-wrap; border-radius: 6px; background: #e0e5ec; color: #5a6a7d; }
    .diff-added .diff-cell { background: #d4edda; color: #2e7d32; }
    .diff-removed .diff-cell { background: #f8d7da; color: #c62828; }
    .diff-changed .diff-cell { background: #fff3cd; color: #8d6e00; }
    .diff-empty { opacity: 0.5; }
</style>
</head>
<body>
<div class="diff-panel">${htmlContent}</div>
</body>
</html>`;
}

function setActiveTab(tab) {
    const isConverter = tab === 'converter';
    converterSection.classList.toggle('hidden', !isConverter);
    compareSection.classList.toggle('hidden', isConverter);
    converterTabBtn.classList.toggle('active', isConverter);
    compareTabBtn.classList.toggle('active', !isConverter);
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusMessage.className = 'status-message hidden';
    }, 3000);
}

function openDiffWindow() {
    if (!lastDiffHtml) {
        showStatus('No diff to open', true);
        return;
    }
    const doc = buildDiffDocument(lastDiffHtml);
    const win = window.open('', '_blank');
    if (!win) {
        showStatus('Popup blocked: allow popups to view diff', true);
        return;
    }
    win.document.write(doc);
    win.document.close();
}

function renderDiffHtml(html) {
    if (diffContainer) {
        diffContainer.innerHTML = html;
    }
}

function handleBeautifyCompare(side) {
    try {
        if (side === 'left') {
            compareLeft.value = normalizedJson(compareLeft.value);
            showStatus('✓ Left JSON beautified');
        } else {
            compareRight.value = normalizedJson(compareRight.value);
            showStatus('✓ Right JSON beautified');
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

        const diff = buildLineDiff(leftFormatted.split('\n'), rightFormatted.split('\n'));
        lastDiffHtml = buildDiffHtml(diff);
        lastDiffText = serializeDiff(diff);
        renderDiffHtml(lastDiffHtml);
        showStatus('✓ Comparison complete');
    } catch (error) {
        lastDiffText = '';
        lastDiffHtml = '';
        renderDiffHtml('<div class="diff-header">Left</div><div class="diff-header">Right</div>');
        showStatus(`Error: ${error}`, true);
    }
}

async function handleMinify() {
    try {
        const result = await invoke('minify_json', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ JSON minified successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleFormat() {
    try {
        const result = await invoke('format_json', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ JSON formatted successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleJsonToString() {
    try {
        const result = await invoke('json_to_string', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ JSON converted to string successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleStringToJson() {
    try {
        const result = await invoke('string_to_json', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ String converted to JSON successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleJsonToProto() {
    try {
        const result = await invoke('json_to_proto', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ JSON converted to Proto schema successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleProtoToJson() {
    try {
        const result = await invoke('proto_to_json', { input: inputText.value });
        outputText.value = result;
        showStatus('✓ Proto schema converted to JSON successfully');
    } catch (error) {
        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

async function handleJsonToClass() {
    try {
        const languageSelected = language.value;
        const className = classNameInput.value.trim() || 'Root';

        const result = await invoke('json_to_class', {
            input: inputText.value,
            language: languageSelected,
            name: className  // Use snake_case to match Rust parameter
        });

        outputText.value = result;
        showStatus(`✓ JSON converted to ${languageSelected} class successfully`);
    } catch (error) {
        console.timeEnd('Conversion Time');
        console.error('❌ Conversion Failed:', error);
        console.groupEnd();

        outputText.value = '';
        showStatus(`Error: ${error}`, true);
    }
}

function handleClear() {
    inputText.value = '';
    outputText.value = '';
    classNameInput.value = '';
    statusMessage.className = 'status-message hidden';

    compareLeft.value = '';
    compareRight.value = '';
    lastDiffText = '';
    lastDiffHtml = '';
    renderDiffHtml('<div class="diff-header">Left</div><div class="diff-header">Right</div>');
}

async function handleCopyInput() {
    if (inputText.value) {
        try {
            // Try using native clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(inputText.value);
                showStatus('✓ Input copied to clipboard');
            } else {
                // Fallback to Tauri clipboard plugin
                await invoke('plugin:clipboard-manager|write_text', { text: inputText.value });
                showStatus('✓ Input copied to clipboard');
            }
        } catch (error) {
            showStatus(`Error: Failed to copy - ${error}`, true);
        }
    }
}

async function handleCopyCompare(side) {
    const value = side === 'left' ? compareLeft.value : compareRight.value;
    if (!value) return;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            showStatus(`✓ ${side === 'left' ? 'Left' : 'Right'} input copied`);
        } else {
            await invoke('plugin:clipboard-manager|write_text', { text: value });
            showStatus(`✓ ${side === 'left' ? 'Left' : 'Right'} input copied`);
        }
    } catch (error) {
        showStatus(`Error: Failed to copy - ${error}`, true);
    }
}

async function handleCopyDiff() {
    if (!lastDiffText) {
        showStatus('No diff to copy', true);
        return;
    }
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastDiffText);
            showStatus('✓ Diff copied to clipboard');
        } else {
            await invoke('plugin:clipboard-manager|write_text', { text: lastDiffText });
            showStatus('✓ Diff copied to clipboard');
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
                showStatus('✓ Output copied to clipboard');
            } else {
                // Fallback to Tauri clipboard plugin
                await invoke('plugin:clipboard-manager|write_text', { text: outputText.value });
                showStatus('✓ Output copied to clipboard');
            }
        } catch (error) {
            showStatus(`Error: Failed to copy - ${error}`, true);
        }
    }
}

// Event listeners
document.getElementById('minifyBtn').addEventListener('click', handleMinify);
document.getElementById('formatBtn').addEventListener('click', handleFormat);
document.getElementById('jsonToStringBtn').addEventListener('click', handleJsonToString);
document.getElementById('stringToJsonBtn').addEventListener('click', handleStringToJson);
document.getElementById('jsonToProtoBtn').addEventListener('click', handleJsonToProto);
document.getElementById('protoToJsonBtn').addEventListener('click', handleProtoToJson);
document.getElementById('jsonToClassBtn').addEventListener('click', handleJsonToClass);
document.getElementById('clearBtn').addEventListener('click', handleClear);
document.getElementById('copyInputBtn').addEventListener('click', handleCopyInput);
document.getElementById('copyOutputBtn').addEventListener('click', handleCopyOutput);
document.getElementById('copyLeftCompareBtn').addEventListener('click', () => handleCopyCompare('left'));
document.getElementById('copyRightCompareBtn').addEventListener('click', () => handleCopyCompare('right'));
document.getElementById('copyDiffBtn').addEventListener('click', handleCopyDiff);
document.getElementById('beautifyLeftBtn').addEventListener('click', () => handleBeautifyCompare('left'));
document.getElementById('beautifyRightBtn').addEventListener('click', () => handleBeautifyCompare('right'));
document.getElementById('compareBtn').addEventListener('click', handleCompare);
document.getElementById('openDiffWindowBtn').addEventListener('click', openDiffWindow);
converterTabBtn.addEventListener('click', () => setActiveTab('converter'));
compareTabBtn.addEventListener('click', () => setActiveTab('compare'));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'm':
                e.preventDefault();
                handleMinify();
                break;
            case 'f':
                e.preventDefault();
                handleFormat();
                break;
        }
    }
});

setActiveTab('converter');
renderDiffHtml('<div class="diff-header">Left</div><div class="diff-header">Right</div>');

