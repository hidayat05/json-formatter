// Import Tauri API - v2 uses window.__TAURI_INTERNALS__
const invoke = window.__TAURI_INTERNALS__.invoke;

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const statusMessage = document.getElementById('statusMessage');

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusMessage.className = 'status-message hidden';
    }, 3000);
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

function handleClear() {
    inputText.value = '';
    outputText.value = '';
    statusMessage.className = 'status-message hidden';
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
document.getElementById('clearBtn').addEventListener('click', handleClear);
document.getElementById('copyInputBtn').addEventListener('click', handleCopyInput);
document.getElementById('copyOutputBtn').addEventListener('click', handleCopyOutput);

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

