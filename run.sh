#!/bin/bash
# JSON Formatter - Tauri App Launcher
# This script handles the Wayland/X11 compatibility issue and graphics buffer issues

cd "$(dirname "$0")"

# Kill any existing HTTP server on port 1420
pkill -f "http.server 1420" 2>/dev/null

# Set environment variables for graphics compatibility
export GDK_BACKEND=x11
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export LIBGL_ALWAYS_SOFTWARE=1

echo "🚀 Starting JSON Formatter..."
echo "📍 Location: $(pwd)"
echo "🖥️  Display backend: X11 (forced)"
echo "🎨 Graphics: Software rendering (for compatibility)"
echo ""

cargo tauri dev

