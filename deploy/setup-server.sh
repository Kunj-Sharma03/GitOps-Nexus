#!/bin/bash
# ===========================================
# GitOps Nexus - Initial Server Setup Script
# ===========================================
# Run this on a fresh Ubuntu 22.04/24.04 droplet
# Usage: chmod +x deploy/setup-server.sh && ./deploy/setup-server.sh
# ===========================================

set -e

echo "=========================================="
echo "GitOps Nexus - Server Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# Install useful tools
echo "🔧 Installing utilities..."
sudo apt install -y git curl wget htop ufw

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/gitops-nexus
sudo chown $USER:$USER /opt/gitops-nexus

echo ""
echo "=========================================="
echo "✅ Server setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Log out and back in (for docker group)"
echo "2. Clone your repo: git clone <your-repo> /opt/gitops-nexus"
echo "3. Copy .env.production.example to .env and fill in values"
echo "4. Run: ./deploy/deploy.sh"
echo ""
