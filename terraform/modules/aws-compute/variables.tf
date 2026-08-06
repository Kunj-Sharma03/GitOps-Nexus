# ==============================================================================
# GitOps Nexus - AWS Compute Module Variables
# ==============================================================================

variable "environment" {
  description = "Deployment environment name (e.g., prod, dev, staging)"
  type        = string
  default     = "prod"
}

variable "name_prefix" {
  description = "Prefix used for naming AWS resources"
  type        = string
  default     = "gitops-nexus"
}

variable "instance_type" {
  description = "EC2 Instance type (e.g. t3.small for 2 vCPU, 2 GB RAM)"
  type        = string
  default     = "t3.small"
}

variable "ami_id" {
  description = "Custom AMI ID to use. If omitted, the latest official Ubuntu 24.04 LTS AMI will be used."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Name of the existing AWS EC2 Key Pair for SSH access"
  type        = string
}

variable "root_volume_size" {
  description = "Size of the root EBS volume in GB"
  type        = number
  default     = 25
}

variable "root_volume_type" {
  description = "EBS volume type (gp3 is the latest, high-performance general purpose SSD)"
  type        = string
  default     = "gp3"
}

variable "allowed_ssh_cidrs" {
  description = "List of IPv4 CIDR blocks allowed to access SSH on port 22. For maximum security, set to your personal public IP (e.g., ['203.0.113.25/32'])."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "vpc_id" {
  description = "VPC ID where resources will be launched. If left empty, the AWS default VPC is used."
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Subnet ID where the EC2 instance will be placed. If left empty, a subnet from the default VPC is used."
  type        = string
  default     = ""
}

variable "user_data" {
  description = "Rendered cloud-init bootstrap script passed to the EC2 instance on first boot"
  type        = string
  default     = ""
}

variable "allocate_elastic_ip" {
  description = "Whether to allocate and attach a dedicated static Elastic IP (EIP) to the instance"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources created by this module"
  type        = map(string)
  default     = {}
}
