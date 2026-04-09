# JSON Formatter

![](docs/json-formatter.gif)

A native desktop application built with Rust and Tauri for JSON and utility workflows. It ships with a tab-based desktop UI powered by HTML/CSS/JavaScript and a Rust backend.

## Features

### JSON Converter
- **Minify JSON**: Remove unnecessary whitespace from JSON
- **Format JSON**: Pretty-print JSON with indentation
- **JSON to String**: Convert JSON into an escaped string literal
- **String to JSON**: Parse escaped JSON string literals back into formatted JSON
- **JSON to Proto**: Generate Protocol Buffers (proto3) schema from JSON
- **Proto to JSON**: Convert Protocol Buffers (proto3) schema to sample JSON
- **JSON to Class**: Generate data models/classes for:
  TypeScript, JavaScript, Python, Rust, Java, C#, Go, Kotlin, and Swift

### JSON Compare
- **Side-by-side compare**: Compare two JSON payloads after normalization
- **Beautify per side**: Format left or right JSON independently before compare
- **Diff output**: Visual diff panel plus copyable diff text

### Mermaid Editor
- **Render Mermaid diagrams**: Live render Mermaid syntax into SVG
- **Download PNG**: Export the rendered diagram as PNG
- **Zoom and pan**: Zoom controls, wheel zoom, and drag mode for large diagrams
- **Editor helpers**: Copy Mermaid code and use Tab / Shift+Tab indentation support

### Image Resizer
- **Resize by percentage**
- **Resize by dimensions**
- **Quality-only recompression**
- **Convert to PNG**
- **Background removal**: Flood-fill based background removal with tolerance control
- **Download processed image**

### OpenSSL Cert
- **Certificate detail from text**: Parse PEM or base64 DER certificate input
- **Certificate detail from URL**: Fetch server certificates directly from a target URL
- **Leaf or full chain mode**: View only leaf certificate or full chain
- **Certificate fingerprinting**: Includes SHA-256 fingerprint and public key pin output

### Traceroute
- **Traceroute from URL or host**: Run traceroute directly from the app
- **Hop IP details**: Extract hop IPs and enrich them with type and reverse DNS
- **Network enrichment**: Best-effort ASN, organization, and geo summary for public IPs
- **Readable output**: Hop metadata rendered as an ASCII table in the result panel
- **Loading state**: Shimmer loading state while traceroute is running

### General UX
- **Copy to Clipboard**: One-click copy buttons across tabs
- **Clear actions**: Clear actions for converter, compare, image, OpenSSL, and traceroute tools
- **Keyboard shortcuts**: Ctrl+M to minify, Ctrl+F to format
- **Native desktop app**: Tauri-based app with native OS integration

## Requirements

- Rust 1.70+ (currently using 1.91.1)
- Node.js and npm (for frontend dependencies) - optional
- System dependencies for Tauri:
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft C++ Build Tools

## Building

```bash
# Install Tauri CLI
cargo install tauri-cli

# Development mode (with hot reload)
cargo tauri dev

# Production build
cargo tauri build
```

## Running

### Development Mode
```bash
cargo tauri dev
```
This will:
- Build the Rust backend
- Start the frontend with hot reload (using trunk serve)
- Launch the desktop application
- Auto-reload on code changes

### Production Build
```bash
cargo tauri build
```
The built application will be in `src-tauri/target/release/bundle/`:
- **Linux**: `.deb`, `.AppImage`
- **macOS**: `.dmg`, `.app`
- **Windows**: `.msi`, `.exe`

## Usage

1. Launch the application with `cargo tauri dev` or open the packaged desktop app.
2. Choose a tab from the top bar:
  - **JSON Converter** for transformation and code generation
  - **JSON Compare** for left/right diffing
  - **Mermaid Editor** for diagram authoring and export
  - **Image Resizer** for image resize and background removal
  - **OpenSSL Cert** for certificate inspection from text or URL
  - **Traceroute** for network path inspection and hop enrichment
3. Enter input for the selected tool.
4. Run the action using the tab-specific buttons.
5. Review output in the result panel and use the copy button if needed.
6. Status messages appear at the bottom for success and error feedback.

## Examples

### Minify JSON
**Input:**
```json
{
  "name": "John",
  "age": 30
}
```
**Output:**
```json
{"name":"John","age":30}
```

### Format JSON
**Input:**
```json
{"name":"John","age":30}
```
**Output:**
```json
{
  "name": "John",
  "age": 30
}
```

### JSON to String
**Input:**
```json
{"name":"John"}
```
**Output:**
```
"{\"name\":\"John\"}"
```

### String to JSON
**Input:**
```
"{\"name\":\"John\"}"
```
**Output:**
```json
{
  "name": "John"
}
```

### JSON to Proto
**Input:**
```json
{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "isActive": true,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": 10001
  },
  "tags": ["developer", "rust", "tauri"]
}
```
**Output:**
```proto
syntax = "proto3";

message Root {
  string name = 1;
  int32 age = 2;
  string email = 3;
  bool is_active = 4;
  Address address = 5;
  repeated string tags = 6;
}

message Address {
  string street = 1;
  string city = 2;
  int32 zip_code = 3;
}
```

### Proto to JSON
**Input:**
```proto
syntax = "proto3";

message User {
  string name = 1;
  int32 age = 2;
  bool is_active = 3;
  Address address = 4;
  repeated string tags = 5;
}

message Address {
  string street = 1;
  string city = 2;
  int32 zip_code = 3;
}
```
**Output:**
```json
{
  "name": "",
  "age": 0,
  "is_active": false,
  "address": {
    "street": "",
    "city": "",
    "zip_code": 0
  },
  "tags": [
    ""
  ]
}
```

## Technologies Used

- **Rust**: Backend with Tauri commands for JSON processing and utility operations
- **Tauri**: Cross-platform desktop framework
- **HTML/CSS/JavaScript**: Modern frontend UI
- **serde_json**: JSON parsing and serialization
- **Tauri Clipboard Plugin**: Native clipboard access
- **OpenSSL**: Certificate inspection and TLS certificate retrieval
- **Mermaid**: Client-side diagram rendering
- **System utilities**: Uses `traceroute`, `curl`, and `nslookup` when available

## Project Structure

```
json-formatter/
├── docs/                  # Screenshots and documentation assets
├── frontend/              # Frontend files
│   ├── index.html         # Tab-based UI markup
│   ├── main.js            # Frontend behavior and Tauri invoke calls
│   └── styles.css         # Application styling
├── src-tauri/            # Rust backend
│   ├── Cargo.toml        # Backend dependencies
│   ├── tauri.conf.json   # Tauri configuration
│   ├── build.rs          # Build script
│   ├── capabilities/     # Tauri capability definitions
│   ├── icons/            # Application icons
│   ├── gen/              # Generated Tauri schema files
│   └── src/
│       └── main.rs       # Tauri commands and app logic
├── run.sh                # Helper run script
└── README.md             # Project documentation
```

## Development

### Development Mode with Hot Reload
```bash
cargo tauri dev
```
- Automatically rebuilds on file changes
- Instant application reload
- Development build (faster compilation)
- Opens dev tools for frontend debugging

### Production Build
```bash
cargo tauri build
```
- Optimized binary
- Platform-specific installers
- Ready for distribution

### Testing Backend
```bash
# Run Rust tests
cd src-tauri
cargo test

# Backend tests cover core JSON utilities; add more coverage as new tools are introduced
```

### Debugging
- Frontend: Use browser dev tools (opened automatically in dev mode)
- Backend: Add `dbg!()` macros or use `println!()` in Rust code
- Logs appear in terminal when running `cargo tauri dev`

## Notes

- `OpenSSL Cert` requires the `openssl` CLI to be available on the host system.
- `Traceroute` uses system utilities such as `traceroute`, `nslookup`, and `curl` when available.
- Public hop enrichment in `Traceroute` is best-effort and depends on network access.

