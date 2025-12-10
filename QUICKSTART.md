# Quick Start Guide - JSON Formatter (Yew Web App)

## 🚀 Running the Application

### Option 1: Development Server (Recommended)
```bash
cd /home/maskipli/RustroverProjects/json-formatter
trunk serve
```

Then open your browser to: **http://localhost:8080**

Features:
- ✅ Hot reload on file changes
- ✅ Instant feedback
- ✅ Console logging for debugging

### Option 2: Production Build
```bash
cd /home/maskipli/RustroverProjects/json-formatter
trunk build --release
```

Then serve the `dist/` directory:
```bash
# Using Python
python3 -m http.server 8080 --directory dist

# Using Node.js
cd dist && npx serve -p 8080
```

## 📖 Using the Application

1. **Open http://localhost:8080** in your browser
2. **Paste JSON** into the left textarea (Input)
3. **Click a button**:
   - `Minify JSON` - Compress to single line
   - `Format JSON` - Pretty-print with indentation
   - `JSON → String` - Convert to escaped string
   - `String → JSON` - Parse escaped string back
   - `Clear All` - Reset everything
4. **View result** in right textarea (Output)
5. **Click 📋 Copy** to copy input or output to clipboard

## 🛠️ Development

### Run Tests
```bash
cargo test
```

### Check Code
```bash
cargo check
```

### Clean Build
```bash
cargo clean
trunk clean
```

### Rebuild from Scratch
```bash
cargo clean
trunk build
```

## 📦 Project Files

- `src/main.rs` - Main Yew application code
- `index.html` - HTML template with CSS
- `Cargo.toml` - Rust dependencies
- `Trunk.toml` - Bundler configuration
- `dist/` - Build output (auto-generated)

## ✅ All Features Working

- ✅ Minify JSON
- ✅ Format JSON  
- ✅ JSON to String conversion
- ✅ String to JSON conversion
- ✅ Copy to clipboard
- ✅ Clear all fields
- ✅ Error handling with status messages
- ✅ Responsive design

## 🎯 Next Steps

1. **Start the server**: `trunk serve`
2. **Open browser**: http://localhost:8080
3. **Test the app**: Paste some JSON and try the buttons!

Enjoy your new web-based JSON formatter! 🎉

