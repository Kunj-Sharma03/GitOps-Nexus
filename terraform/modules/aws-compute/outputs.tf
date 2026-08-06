# ==============================================================================
# GitOps Nexus - AWS Compute Module Outputs
# ==============================================================================

output "instance_id" {
  description = "The unique ID of the provisioned EC2 instance"
  value       = aws_instance.server.id
}

output "instance_arn" {
  description = "The Amazon Resource Name (ARN) of the EC2 instance"
  value       = aws_instance.server.arn
}

output "public_ip" {
  description = "The public IPv4 address of the EC2 host (Elastic IP if enabled, otherwise public IP)"
  value       = var.allocate_elastic_ip && length(aws_eip.static_ip) > 0 ? aws_eip.static_ip[0].public_ip : aws_instance.server.public_ip
}

output "private_ip" {
  description = "The private IPv4 address of the EC2 instance inside the VPC"
  value       = aws_instance.server.private_ip
}

output "security_group_id" {
  description = "The ID of the security group attached to the instance"
  value       = aws_security_group.gitops_sg.id
}
