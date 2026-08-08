# ==============================================================================
# GitOps Nexus - AWS Environment Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region to deploy the infrastructure into (e.g. ap-south-1, us-east-1, us-east-2)"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment identifier (e.g., prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "name_prefix" {
  description = "Prefix prepended to resource names"
  type        = string
  default     = "gitops-nexus"
}

variable "instance_type" {
  description = "EC2 instance size. 't3.small' (2 vCPU, 2 GB RAM) is recommended for production Anchor Stack."
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "The exact name of your existing AWS Key Pair (created in the AWS Console under EC2 -> Key Pairs)"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Local path to your private key file (e.g., '~/.ssh/my-key.pem') used to output a ready-to-use SSH command"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "root_volume_size" {
  description = "Size of the root EBS SSD drive in GB"
  type        = number
  default     = 25
}

variable "swap_size_gb" {
  description = "Size of the automated swapfile in GB (2 GB recommended to safely double virtual memory)"
  type        = number
  default     = 2
}

variable "app_dir" {
  description = "Target application folder on the remote Linux host"
  type        = string
  default     = "/opt/gitops-nexus"
}

variable "allowed_ssh_cidrs" {
  description = "Allowed IPv4 CIDR blocks for SSH. Default allows all ('0.0.0.0/0'). For enhanced security, set to your IP (e.g. ['YOUR_IP/32'])."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allocate_elastic_ip" {
  description = "Whether to allocate a static Elastic IP (EIP) so the IP address remains fixed across server reboots"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Custom tags to attach to all AWS resources"
  type        = map(string)
  default = {
    Project     = "GitOps-Nexus"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
