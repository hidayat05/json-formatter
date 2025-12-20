# JSON Formatter

![](docs/json-formatter.gif)

A native desktop application built with Rust and Tauri for JSON manipulation. Features a modern web-based UI powered by HTML/CSS/JavaScript with Rust backend.

## Features

- **Minify JSON**: Remove all unnecessary whitespace from JSON
- **Format JSON**: Pretty-print JSON with proper indentation
- **JSON to String**: Convert JSON to an escaped string literal
- **String to JSON**: Parse escaped JSON string literals back to formatted JSON
- **JSON to Proto**: Generate Protocol Buffers (proto3) schema definition from JSON structure
- **Copy to Clipboard**: One-click copy for both input and output with the 📋 Copy button
- **Clear All**: Reset both input and output fields
- **Keyboard Shortcuts**: Ctrl+M to minify, Ctrl+F to format
- **Native Performance**: Desktop application with native OS integration
- **Json To Class**: Generate classes from JSON by selected language

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

1. Launch the application (`cargo tauri dev` or run the built executable)
2. Enter or paste JSON content into the **Input** text area (left side)
3. Click one of the action buttons:
   - **Minify JSON** (Ctrl+M): Compresses JSON to a single line
   - **Format JSON** (Ctrl+F): Formats JSON with indentation
   - **JSON → String**: Converts JSON to an escaped string
   - **String → JSON**: Converts an escaped string back to JSON
   - **JSON → Proto**: Generates Protocol Buffers schema from JSON
   - **Clear All**: Resets both input and output
4. View the result in the **Output** text area (right side)
5. Click the **📋 Copy** button to copy input or output to your clipboard
6. Status messages appear at the bottom (green for success, red for errors)

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

## Technologies Used

- **Rust**: Backend with Tauri commands for JSON processing
- **Tauri**: Cross-platform desktop framework
- **HTML/CSS/JavaScript**: Modern frontend UI
- **serde_json**: JSON parsing and serialization
- **Tauri Clipboard Plugin**: Native clipboard access

## Project Structure

```
json-formatter/
├── frontend/              # Frontend files
│   ├── index.html        # HTML + embedded CSS
│   └── main.js          # JavaScript with Tauri API calls
├── src-tauri/            # Rust backend
│   ├── Cargo.toml       # Backend dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   ├── build.rs         # Build script
│   ├── src/
│   │   └── main.rs     # Tauri commands and app logic
│   └── icons/          # Application icons
└── dist/                # Build output (auto-generated)
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

# The JSON processing functions have full test coverage
```

### Debugging
- Frontend: Use browser dev tools (opened automatically in dev mode)
- Backend: Add `dbg!()` macros or use `println!()` in Rust code
- Logs appear in terminal when running `cargo tauri dev`

