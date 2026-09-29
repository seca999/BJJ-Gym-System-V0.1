#!/usr/bin/env bash
# ====================================================================
# BJJ ACADEMY MANAGEMENT SYSTEM - LINUX VERSION DEPLOYER & RUNNER
# ====================================================================

set -e

PORT=5555
BASE_DIR="/var/www/bjj-academy"
VERSIONS_DIR="${BASE_DIR}/Implement/Versions"
CODE_DIR="${BASE_DIR}/Code"

echo "===================================================================="
echo "          🥋 BJJ ACADEMY SYSTEM - LINUX VERSION DEPLOYER"
echo "===================================================================="
echo ""

# Ensure directories exist
mkdir -p "$VERSIONS_DIR"
mkdir -p "$CODE_DIR"

# Check for zip archives
shopt -s nullglob
zip_files=("$VERSIONS_DIR"/*.zip)

if [ ${#zip_files[@]} -eq 0 ]; then
    echo "[!] No .zip packages found in $VERSIONS_DIR"
    echo "Using current project root code..."
    cd "$BASE_DIR"
    npm install
    npm run build
    PORT=${PORT} node dist/server.cjs
    exit 0
fi

echo "Available Versions in Versions Folder:"
echo "--------------------------------------------------------------------"
i=1
for file in "${zip_files[@]}"; do
    filename=$(basename "$file")
    mod_time=$(date -r "$file" "+%Y-%m-%d %H:%M" 2>/dev/null || stat -c %y "$file" | cut -d' ' -f1-2)
    echo "  [$i] $filename ($mod_time)"
    ((i++))
done
echo "--------------------------------------------------------------------"

read -p "Enter version number to deploy [Default: 1]: " choice
choice=${choice:-1}

idx=$((choice - 1))
selected_zip="${zip_files[$idx]}"

if [ -z "$selected_zip" ] || [ ! -f "$selected_zip" ]; then
    echo "[!] Invalid selection. Aborting."
    exit 1
fi

echo ""
echo "Deploying $(basename "$selected_zip")..."
unzip -q -o "$selected_zip" -d "$CODE_DIR"

cd "$CODE_DIR"
npm install
npm run build

echo "Starting server on port ${PORT}..."
PORT=${PORT} node dist/server.cjs
