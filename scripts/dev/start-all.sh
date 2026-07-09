#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Sprintio development environment..."

# Start Docker services (DB + Redis)
echo "📦 Starting infrastructure services..."
docker compose -f infrastructure/docker/docker-compose.yml up -d db redis

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until docker compose -f infrastructure/docker/docker-compose.yml exec -T db pg_isready -U sprintio; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

# Start all apps via Turborepo
echo "🔥 Starting all applications..."
pnpm dev
