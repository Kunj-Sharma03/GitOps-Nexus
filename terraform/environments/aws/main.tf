# ==============================================================================
# GitOps Nexus - AWS Production Environment Root
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: For production teams, configure S3 remote state here:
  # backend "s3" {
  #   bucket         = "my-gitops-nexus-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# ------------------------------------------------------------------------------
# 1. Render Cloud-Init User Data Template
# ------------------------------------------------------------------------------
locals {
  rendered_user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    swap_size_gb = var.swap_size_gb
    app_dir      = var.app_dir
  })
}

# ------------------------------------------------------------------------------
# 2. Deploy Compute & Network Infrastructure via Module
# ------------------------------------------------------------------------------
module "gitops_host" {
  source = "../../modules/aws-compute"

  environment         = var.environment
  name_prefix         = var.name_prefix
  instance_type       = var.instance_type
  key_name            = var.key_name
  root_volume_size    = var.root_volume_size
  allowed_ssh_cidrs   = var.allowed_ssh_cidrs
  allocate_elastic_ip = var.allocate_elastic_ip
  user_data           = local.rendered_user_data
  tags                = var.tags
}
