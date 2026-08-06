#!/bin/bash
# ==============================================================================
# GitOps Nexus - EC2 Cloud-Init Bootstrap Script
# ==============================================================================
# This script runs automatically as root during the very first boot of the EC2 instance.
# It sets up swap space (to prevent OOM on 2GB RAM instances), installs Docker + Compose,
# configures the UFW firewall, and prepares the application directory.
# ==============================================================================

set -euxo pipefail

# Output all logs to console and to a persistent logfile
exec > >(tee -a /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "=============================================================================="
echo " Starting GitOps Nexus Automated Host Provisioning: $(date -u)"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. Automated 2GB Swapfile Configuration (Double Virtual Memory Safely)
# ------------------------------------------------------------------------------
SWAP_SIZE_GB="${swap_size_gb}"
if [ -z "$SWAP_SIZE_GB" ]; then
    SWAP_SIZE_GB=2
fi

if ! grep -q '/swapfile' /etc/fstab; then
    echo "⚙️ Creating a $${SWAP_SIZE_GB}GB swapfile on EBS disk..."
    fallocate -l "$${SWAP_SIZE_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024))
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # Tune Linux swappiness: only swap when physical RAM is 90% full
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.d/99-swap.conf
    sysctl vm.vfs_cache_pressure=50
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.d/99-swap.conf
    echo "✅ Swapfile initialized successfully. Total Virtual Memory increased."
else
    echo "ℹ️ Swapfile already exists. Skipping creation."
fi

# ------------------------------------------------------------------------------
# 2. System Package Updates & Utilities
# ------------------------------------------------------------------------------
echo "📦 Updating system package repositories..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    wget \
    htop \
    ufw \
    net-tools \
    unzip

# ------------------------------------------------------------------------------
# 3. Docker Engine & Docker Compose Plugin Installation
# ------------------------------------------------------------------------------
echo "🐳 Installing Docker Engine and Docker Compose Plugin..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    apt-get install -y docker-compose-plugin
fi

# Ensure Docker service starts on boot
systemctl enable docker
systemctl start docker

# Add the default ubuntu user to the docker group (avoids needing sudo for docker commands)
if id -u ubuntu &>/dev/null; then
    usermod -aG docker ubuntu
fi

# ------------------------------------------------------------------------------
# 4. Host Firewall Hardening (UFW)
# ------------------------------------------------------------------------------
echo "🔒 Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing

# Open SSH, HTTP, and HTTPS ports only
ufw allow 22/tcp comment 'SSH Access'
ufw allow 80/tcp comment 'HTTP (Certbot & Web)'
ufw allow 443/tcp comment 'HTTPS (TLS Proxy)'

# Enable UFW without prompting
ufw --force enable

# ------------------------------------------------------------------------------
# 5. Application Directory Preparation
# ------------------------------------------------------------------------------
APP_DIR="${app_dir}"
if [ -z "$APP_DIR" ]; then
    APP_DIR="/opt/gitops-nexus"
fi

echo "📁 Creating application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
if id -u ubuntu &>/dev/null; then
    chown -R ubuntu:ubuntu "$APP_DIR"
fi

# ------------------------------------------------------------------------------
# 6. Completion Flag
# ------------------------------------------------------------------------------
echo "=============================================================================="
echo "🎉 Host Provisioning Complete at $(date -u)"
echo " Server is ready for GitOps Nexus deployment."
echo "=============================================================================="
touch /var/log/user_data_complete.flag
