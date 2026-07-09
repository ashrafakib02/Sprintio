#!/usr/bin/env bash
set -euo pipefail

echo "🧹 Cleaning project..."
pnpm clean
find . -name "node_modules" -type d -maxdepth 4 -exec rm -rf {} + 2>/dev/null || true
find . -name "dist" -type d -maxdepth 4 -exec rm -rf {} + 2>/dev/null || true
find . -name ".turbo" -type d -maxdepth 3 -exec rm -rf {} + 2>/dev/null || true
echo "✅ Clean complete"
