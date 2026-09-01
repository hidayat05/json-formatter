#!/bin/bash
set -e

# Navigate to backend directory
cd "$(dirname "$0")/src-tauri"

# Build target Wasm package for web
wasm-pack build --target web --out-dir ../frontend/wasm

echo "✅ WebAssembly logic module built successfully!"
