#!/usr/bin/env bash
# ====================================================================
# BJJ ACADEMY MANAGEMENT SYSTEM - LINUX FAST RUNNER
# Starts production server on port 5555
# ====================================================================

set -e

PORT=5555
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "===================================================================="
echo "       🥋 RAVENS BJJ ACADEMY - LINUX RUNNER (PORT ${PORT})"
echo "===================================================================="
echo "  • Directory: $SCRIPT_DIR"
echo "  • Port     : $PORT"
echo ""

# Check node
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed. Please install Node.js LTS (v20+ or v22+)."
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing missing node_modules..."
    npm install
fi

# Check build
if [ ! -f "dist/server.cjs" ]; then
    echo "Building production package..."
    npm run build
fi

# Kill any existing process on port
if command -v fuser &> /dev/null; then
    fuser -k ${PORT}/tcp 2>/dev/null || true
elif command -v lsof &> /dev/null; then
    PID=$(lsof -ti tcp:${PORT} 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
    fi
fi

echo "Starting server on http://localhost:${PORT}..."

# Attempt to open browser if desktop environment is present
if [ -n "$DISPLAY" ]; then
    (sleep 1 && (xdg-open "http://localhost:${PORT}" 2>/dev/null || sensible-browser "http://localhost:${PORT}" 2>/dev/null || true)) &
fi

PORT=${PORT} node dist/server.cjs
