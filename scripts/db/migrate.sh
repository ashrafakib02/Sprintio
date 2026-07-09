#!/usr/bin/env bash
set -euo pipefail

echo "🗄️ Running database migrations..."
pnpm --filter @sprintio/db migrate
echo "✅ Migrations complete"
