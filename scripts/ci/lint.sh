#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Running linters..."
pnpm lint
echo "✅ Lint complete"
