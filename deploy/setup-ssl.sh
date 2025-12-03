#!/bin/bash
# ===========================================
# GitOps Nexus - SSL Certificate Setup
# ===========================================
# Run this AFTER initial deployment to get SSL certificates
# Usage: ./deploy/setup-ssl.sh your-domain.com your@email.com
# ===========================================

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./deploy/setup-ssl.sh <domain> <email>"
    echo "Example: ./deploy/setup-ssl.sh api.myapp.com admin@myapp.com"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "Setting up SSL for: $DOMAIN"
echo "=========================================="

# First, get certificate using HTTP challenge
echo "📜 Requesting SSL certificate..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Reload nginx to use new certificates
echo "🔄 Reloading Nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "=========================================="
echo "✅ SSL setup complete!"
echo "=========================================="
echo ""
echo "Your API is now available at: https://$DOMAIN"
echo ""
echo "Certificate will auto-renew via certbot container."
echo ""
