#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "========================================================"
echo " Ravens BJJ Academy - GitHub Auto-Version & Push Tool"
echo "========================================================"
echo ""

COMMIT_MSG="$1"

echo "[1/3] Generating new unique Version Code and Build Number..."
node scripts/bump_version.js "$COMMIT_MSG"

echo ""
echo "[2/3] Staging changes and committing..."
git add -A

if [ -z "$COMMIT_MSG" ]; then
  read -r -p "Enter commit description / improvements summary (press Enter for default): " COMMIT_MSG
fi

if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="Continuous deployment update with improvements"
fi

git commit -m "$COMMIT_MSG"

echo ""
echo "[3/3] Pushing to GitHub (origin main)..."
git push origin main

echo ""
echo "========================================================"
echo " SUCCESS: New Version Code published to GitHub!"
echo "========================================================"
