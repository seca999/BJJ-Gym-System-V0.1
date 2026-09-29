#!/usr/bin/env bash
# ====================================================================
# BJJ ACADEMY MANAGEMENT SYSTEM - LINUX STOP & CLEANUP TOOL
# Frees port 5555 and terminates background processes
# ====================================================================

PORT=5555

echo "===================================================================="
echo "    🥋 RAVENS BJJ ACADEMY - STOP & CLEANUP TOOL (LINUX)"
echo "===================================================================="
echo ""

# Stop PM2 if present
if command -v pm2 &> /dev/null; then
    pm2 stop bjj-academy 2>/dev/null || true
    echo "  [OK] Checked PM2 processes."
fi

# Stop systemd service if present
if command -v systemctl &> /dev/null; then
    sudo systemctl stop bjj-academy 2>/dev/null || true
    echo "  [OK] Checked systemd service."
fi

# Kill process on port 5555
if command -v fuser &> /dev/null; then
    fuser -k ${PORT}/tcp 2>/dev/null || true
    echo "  [OK] Port ${PORT} freed using fuser."
elif command -v lsof &> /dev/null; then
    PID=$(lsof -ti tcp:${PORT} 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo "  [OK] Terminated PID $PID on port ${PORT}."
    fi
fi

# Clean dist folder if requested
if [ "$1" == "--clean" ]; then
    echo "  Cleaning dist cache..."
    rm -rf dist
fi

echo ""
echo "✅ Cleanup complete. Port ${PORT} is ready."
