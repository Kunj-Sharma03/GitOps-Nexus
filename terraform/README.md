# GitOps Nexus - Terraform Infrastructure as Code (IaC)

This directory contains the production-grade Terraform configuration to automatically provision, configure, and manage the AWS infrastructure for **GitOps Nexus**.

---

## 🏗️ Architecture Overview

The Terraform setup provisions an **Anchor Host** on AWS EC2 designed to run the full GitOps Nexus production Docker stack safely:

```
                      +---------------------------------------------------------+
                      |                      AWS VPC                            |
                      |                                                         |
                      |   +-------------------------------------------------+   |
  Internet            |   |               Security Group                    |   |
  [User Traffic] ---->|   |   - Port 22  (SSH Admin Access)                 |   |
                      |   |   - Port 80  (HTTP / Certbot ACME)              |   |
                      |   |   - Port 443 (HTTPS Secure Web Traffic)         |   |
                      |   +-------------------------------------------------+   |
                      |                           |                             |
                      |                           v                             |
                      |   +-------------------------------------------------+   |
                      |   |      EC2 Instance (t3.small / 2 vCPU)           |   |
                      |   |                                                 |   |
                      |   |   +------------------+  +-------------------+   |   |
                      |   |   | 2 GB Physical RAM|  | 2 GB EBS Swapfile|   |   |
                      |   |   +------------------+  +-------------------+   |   |
                      |   |             = 4 GB Virtual Memory               |   |
                      |   |                                                 |   |
                      |   |   +-----------------------------------------+   |   |
                      |   |   | Docker Compose Stack                    |   |   |
                      |   |   |  - Nginx (Reverse Proxy & TLS)          |   |   |
                      |   |   |  - Express API (Auth, Repos, WebSocket) |   |   |
                      |   |   |  - BullMQ Worker (CI & Sandboxes)       |   |   |
                      |   |   |  - Redis 7 (Queues & Pub/Sub)           |   |   |
                      |   |   +-----------------------------------------+   |   |
                      |   +-------------------------------------------------+   |
                      +---------------------------------------------------------+
```

---

## 📁 Directory Layout

```
terraform/
├── environments/
│   └── aws/
│       ├── main.tf                  # Root AWS environment definition
│       ├── variables.tf             # Input variables (region, instance size, key name)
│       ├── outputs.tf               # Public IP, SSH login command, application URL
│       ├── terraform.tfvars.example # Example configuration file
│       └── templates/
│           └── user_data.sh.tpl     # Cloud-init bootstrap (Swap, Docker, UFW, /opt)
├── modules/
│   └── aws-compute/
│       ├── main.tf                  # Security Group, EC2 Instance, Elastic IP, EBS drive
│       ├── variables.tf             # Module input contracts
│       └── outputs.tf               # Module exported outputs
└── README.md                        # Documentation and operational runbook
```

---

## ⚡ Prerequisites

1. **Terraform CLI**: Install Terraform (`>= 1.5.0`) from [terraform.io](https://developer.hashicorp.com/terraform/install).
2. **AWS CLI**: Install and configure your AWS credentials:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, and Default Region (e.g., ap-south-1)
   ```
3. **AWS Key Pair**: Ensure you have an EC2 Key Pair created in your AWS Console (`EC2 -> Key Pairs` in `ap-south-1`) and saved to your local machine (e.g., `~/.ssh/gitops-key.pem`).

---

## 🚀 Quickstart Deployment

### Step 1: Navigate to the AWS Environment
```bash
cd terraform/environments/aws
```

### Step 2: Create your `terraform.tfvars` file
Copy the example template:
```bash
cp terraform.tfvars.example terraform.tfvars
```
Open `terraform.tfvars` in your editor and update your details:
```hcl
aws_region           = "ap-south-1"
key_name             = "your-ec2-key-name"
ssh_private_key_path = "~/.ssh/your-ec2-key-name.pem"
instance_type        = "t3.small"
root_volume_size     = 25
swap_size_gb         = 2
```

### Step 3: Initialize Terraform
Downloads the required AWS provider plugins:
```bash
terraform init
```

### Step 4: Preview the Execution Plan
Review the resources that Terraform will create:
```bash
terraform plan
```

### Step 5: Apply and Provision
Execute the changes on AWS:
```bash
terraform apply
```
Type `yes` when prompted. Within **60–90 seconds**, Terraform will finish provisioning and output your connection details:

```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:
application_http_url = "http://34.201.45.120"
instance_id          = "i-0abc1234def567890"
public_ip            = "34.201.45.120"
ssh_command          = "ssh -i ~/.ssh/your-ec2-key-name.pem ubuntu@34.201.45.120"
```

---

## 🔍 Verifying the Automated Provisioning

Connect to your instance using the output SSH command:
```bash
ssh -i ~/.ssh/your-ec2-key-name.pem ubuntu@<YOUR_PUBLIC_IP>
```

Verify that `user_data` automated the entire setup:
1. **Check Virtual Memory (Swap)**:
   ```bash
   free -h
   ```
   *You should see `Swap: 2.0Gi` active!*

2. **Check Docker Installation**:
   ```bash
   docker --version
   docker compose version
   ```

3. **Check Firewall Rules**:
   ```bash
   sudo ufw status verbose
   ```
   *Ports 22, 80, and 443 are allowed; all other inbound traffic is blocked.*

---

## 📦 Deploying GitOps Nexus onto the Host

Once connected to your server:

```bash
# 1. Clone your repository into the prepared directory
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git /opt/gitops-nexus
cd /opt/gitops-nexus

# 2. Configure production environment variables
cp .env.production.example .env
nano .env   # Fill in Supabase DATABASE_URL, REDIS_URL, and secrets

# 3. Deploy all services with one command
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

---

## 🛑 Destroying or Pausing Resources (Cost Saving)

To completely tear down the AWS resources when not in use:
```bash
cd terraform/environments/aws
terraform destroy
```
*Note: An Elastic IP that is allocated but not attached to a running instance incurs a small fee, so running `terraform destroy` ensures $0 idle costs.*
