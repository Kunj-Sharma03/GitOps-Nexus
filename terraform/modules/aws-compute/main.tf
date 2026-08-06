# ==============================================================================
# GitOps Nexus - AWS Compute Module Main Resources
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ------------------------------------------------------------------------------
# 1. VPC & Subnet Discovery (Default VPC fallback)
# ------------------------------------------------------------------------------
data "aws_vpc" "default" {
  count   = var.vpc_id == "" ? 1 : 0
  default = true
}

data "aws_subnets" "default" {
  count = var.subnet_id == "" ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default[0].id]
  }
}

locals {
  selected_vpc_id    = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default[0].id
  selected_subnet_id = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.default[0].ids[0]

  common_tags = merge(
    {
      Project     = "GitOps-Nexus"
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}

# ------------------------------------------------------------------------------
# 2. Canonical Ubuntu 24.04 LTS (Noble) AMI Lookup
# ------------------------------------------------------------------------------
data "aws_ami" "ubuntu" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical official AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  effective_ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu[0].id
}

# ------------------------------------------------------------------------------
# 3. Security Group (Firewall Rules)
# ------------------------------------------------------------------------------
resource "aws_security_group" "gitops_sg" {
  name_prefix = "${var.name_prefix}-${var.environment}-sg-"
  description = "Security group for GitOps Nexus application host"
  vpc_id      = local.selected_vpc_id

  # SSH (Port 22) - Configurable CIDR for admin access
  ingress {
    description = "SSH administrative access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # HTTP (Port 80) - Required for web traffic & Let's Encrypt / Certbot challenge
  ingress {
    description = "HTTP traffic & Let's Encrypt validation"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS (Port 443) - Secure TLS reverse proxy to API & Frontend
  ingress {
    description = "HTTPS secure traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound traffic: Allow all destinations (needed for docker pull, git clone, apt-get updates)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.name_prefix}-${var.environment}-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ------------------------------------------------------------------------------
# 4. EC2 Compute Instance
# ------------------------------------------------------------------------------
resource "aws_instance" "server" {
  ami                         = local.effective_ami_id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = local.selected_subnet_id
  vpc_security_group_ids      = [aws_security_group.gitops_sg.id]
  associate_public_ip_address = true
  user_data                   = var.user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    delete_on_termination = true
    encrypted             = true

    tags = merge(
      local.common_tags,
      {
        Name = "${var.name_prefix}-${var.environment}-root-volume"
      }
    )
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.name_prefix}-${var.environment}-server"
    }
  )
}

# ------------------------------------------------------------------------------
# 5. Dedicated Elastic IP (Static IPv4)
# ------------------------------------------------------------------------------
resource "aws_eip" "static_ip" {
  count    = var.allocate_elastic_ip ? 1 : 0
  domain   = "vpc"
  instance = aws_instance.server.id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.name_prefix}-${var.environment}-eip"
    }
  )

  depends_on = [aws_instance.server]
}
