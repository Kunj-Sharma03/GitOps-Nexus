# ==============================================================================
# GitOps Nexus - AWS Environment Outputs
# ==============================================================================

output "instance_id" {
  description = "AWS EC2 Instance ID"
  value       = module.gitops_host.instance_id
}

output "public_ip" {
  description = "The static Public IPv4 address assigned to your GitOps Nexus server"
  value       = module.gitops_host.public_ip
}

output "ssh_command" {
  description = "Ready-to-run SSH command to log in to your new server"
  value       = "ssh -i ${var.ssh_private_key_path} ubuntu@${module.gitops_host.public_ip}"
}

output "application_http_url" {
  description = "Initial HTTP URL for accessing the server"
  value       = "http://${module.gitops_host.public_ip}"
}

output "deployment_instructions" {
  description = "Summary of next steps to deploy the GitOps Nexus application"
  value       = <<EOT
==============================================================================
🚀 Server successfully provisioned!
==============================================================================
1. SSH into the server:
   ssh -i ${var.ssh_private_key_path} ubuntu@${module.gitops_host.public_ip}

2. Verify Docker and Swapfile are active:
   docker --version
   free -h

3. Clone your GitOps repository into the app folder:
   git clone <YOUR_GIT_REPO_URL> /opt/gitops-nexus
   cd /opt/gitops-nexus

4. Configure your environment secrets:
   cp .env.production.example .env
   nano .env

5. Deploy production containers:
   ./deploy/deploy.sh
==============================================================================
EOT
}
