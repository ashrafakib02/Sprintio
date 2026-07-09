#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Running type checks..."
pnpm typecheck
echo "✅ Type checks complete"
