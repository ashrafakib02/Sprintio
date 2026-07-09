#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Setting up Sprintio for local development..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy .env if not exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Edit .env with your configuration"
fi

# Start infrastructure
echo "🐳 Starting Docker services..."
docker compose -f infrastructure/docker/docker-compose.yml up -d db redis

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until docker compose -f infrastructure/docker/docker-compose.yml exec -T db pg_isready -U sprintio; do
  sleep 1
done

# Run migrations
echo "🗄️ Running database migrations..."
pnpm db:migrate

# Seed database
echo "🌱 Seeding database..."
pnpm db:seed

echo "✅ Setup complete! Run 'pnpm dev' to start."
