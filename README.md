# Palugada (JSON Formatter & Developer Swiss Army Knife)

![](docs/json-formatter.gif)

A fast, lightweight, and versatile desktop toolbox built with **Rust** and **Tauri** with a modern tab-based interface.

---

## 🚀 Features

### 1. 🌲 JSON Editor *(New)*
* **Visual Tree & Code Split View**: Interactive visual node tree editor synchronized in real-time with raw JSON code.
* **In-Place Key & Value Editing**: Directly edit keys or values independently without breaking structure.
* **Type Switcher**: On-the-fly data type conversion (`string`, `number`, `boolean`, `null`, `object`, `array`).
* **✨ Smart Array Auto-Add**: Automatically duplicates schema/properties of existing array items with empty/default values (`""`, `0`, `false`, `[]`, `{}`).
* **🔄 Stringified JSON Detection & Unpack**: Auto-detects escaped JSON strings in values (e.g. nested payloads/Kafka logs) and unpacks them into native objects/arrays with one click.
* **🪄 Auto-Fix JSON**: Repairs malformed JSON instantly (single quotes, unquoted keys, trailing commas, JavaScript comments).
* **Key Case Converter**: Recursively converts keys to `camelCase`, `snake_case`, `kebab-case`, or `PascalCase`.
* **🛡️ Data Masking (PII Anonymizer)**: Masks sensitive data like emails, phone numbers, passwords, and tokens for safe sharing.
* **Search & Filter**: Real-time keyword search with instant node highlighting.
* **Node Utilities**: Duplicate items, move up/down, delete, expand/collapse all, and copy JSONPath (`$.users[0].name`).

### 2. 🔄 JSON Converter
* **Minify & Format**: Fast JSON indentation and whitespace removal.
* **Sort Keys**: Alphabetically sorts keys in nested JSON.
* **String Literal Conversions**: JSON &harr; Escaped String.
* **Schema & Code Generation**:
  * JSON &harr; Protocol Buffers (proto3)
  * JSON &rarr; Models / Classes for **TypeScript, JavaScript, Python, Rust, Java, C#, Go, Kotlin, Swift**
  * JSON &rarr; YAML, XML, CSV, and JMESPath querying.

### 3. 🔍 JSON Compare
* **Side-by-Side Diff**: Compare two JSON payloads with structural normalization.
* **Per-side Beautifier**: Format and clean left or right payloads independently before diffing.
* **Visual Diff Highlighting**: Color-coded line and token differences with copyable diff reports.

### 4. 🌐 URL Beautifier
* **URL Component Parser**: Breaks down URLs into Protocol, Hostname, Port, Path, and Hash/Fragment.
* **Query Parameters Editor**: Add, edit, remove, and duplicate query parameters interactively.
* **Reconstruct & Encode/Decode**: Live URL reconstruction and complete encoding/decoding.

### 5. 📄 JSON to HTML
* **Template Rendering**: Inject JSON values into custom HTML templates using `{{key}}` syntax.
* **Live HTML Preview**: Real-time rendering and preview of the resulting HTML markup.

### 6. 📊 Mermaid Editor
* **Live Diagram Rendering**: Author flowcharts, sequence diagrams, and class diagrams with real-time SVG rendering.
* **Interactive Canvas**: Zoom in/out, pan, reset view, and export to PNG.

### 7. 🖼️ Image Resizer & Background Remover
* **Resizing Modes**: Scale by percentage or exact dimensions with aspect-ratio preservation.
* **Quality & Format**: Quality-based compression and PNG conversion.
* **Background Removal**: Flood-fill background transparency with adjustable tolerance.

### 8. 🔒 OpenSSL Certificate Inspector
* **Certificate Parsing**: Inspect PEM text or base64 DER certificates.
* **Fetch Server Certificates**: Pull TLS certificates directly from any HTTPS URL.
* **Chain Inspection & Fingerprints**: Leaf or full-chain inspection, validity dates, SHA-256 fingerprint, and public key pin.

### 9. 🗺️ Traceroute & Network Enrichment
* **Real-time Traceroute**: Run traceroute directly against domains or IPs.
* **Enriched Metadata**: Auto-resolves reverse DNS, ASN, Organization, and Geo location for public hops.
* **Formatted ASCII Output**: Clean, readable hop table summary.

---

## 🛠️ Tech Stack

* **Backend**: Rust, Tauri v2, Serde, OpenSSL, native system tools (`traceroute`, `curl`, `nslookup`).
* **Frontend**: HTML5, Vanilla JavaScript, Custom Neumorphic CSS design system, Mermaid.js.

---

## 📦 Getting Started

### Prerequisites
* **Rust 1.70+** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
* **Tauri CLI**: `cargo install tauri-cli`
* **System Dependencies**:
  * **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  * **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  * **Windows**: Microsoft C++ Build Tools

### Running in Development
```bash
# Run the application with hot reload
cargo tauri dev
```

### Building for Production
```bash
cargo tauri build
```
Built binaries and installers are generated in `src-tauri/target/release/bundle/`:
* **macOS**: `.dmg`, `.app` *(See [INSTALL_MAC.md](INSTALL_MAC.md) for Gatekeeper notes)*
* **Linux**: `.deb`, `.AppImage`
* **Windows**: `.msi`, `.exe`

---

## 📂 Project Structure

```
json-formatter/
├── frontend/             # Desktop UI
│   ├── index.html        # Main tab-based layout
│   ├── main.js           # Client logic, tree editor & Tauri bindings
│   └── styles.css        # Modern design system
├── src-tauri/            # Rust Backend
│   ├── src/main.rs       # Core commands & system integration
│   ├── Cargo.toml        # Dependencies
│   └── tauri.conf.json   # Tauri configuration
├── docs/                 # Assets & screenshots
├── run.sh                # Helper launch script
└── README.md
```
