#!/bin/bash
# ===========================================
# GitOps Nexus - Deployment Script
# ===========================================
# Run this to deploy/update the application
# Usage: ./deploy/deploy.sh
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "GitOps Nexus - Deploying"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.production.example to .env and fill in values"
    exit 1
fi

# Load domain from .env
export $(grep -v '^#' .env | xargs)

# Pull latest code (if git repo)
if [ -d .git ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Build API
echo "🔨 Building API..."
cd api
npm ci
npm run build
cd ..

# Build Worker
echo "🔨 Building Worker..."
cd worker
npm ci
# Copy prisma schema from api
mkdir -p prisma
cp ../api/prisma/schema.prisma prisma/
npx prisma generate
npm run build
cd ..

# Update nginx config with domain
echo "🔧 Configuring Nginx..."
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" nginx/conf.d/api.conf

# Build and start containers
echo "🐳 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for postgres
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

echo ""
echo "=========================================="
echo "✅ Deployment complete!"
echo "=========================================="
echo ""
echo "Services running:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
