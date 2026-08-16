---
name: terraform
description: "Comprehensive Terraform infrastructure-as-code guide covering HCL syntax, resource and data blocks, variables, outputs, state management, modules, providers, workspaces, lifecycle rules, dynamic blocks, loops, conditional resources, import, Terragrunt, testing, CI/CD integration, state locking, and secret management. Use when provisioning cloud infrastructure, designing IaC modules, or managing Terraform state and workflows."
version: 1.0.0
---

# Terraform

## 1. Philosophy

Terraform manages infrastructure through **declarative configuration files** that describe the desired end state. You do not write scripts that create resources step by step. You declare what should exist, and Terraform figures out how to get there.

**Key principles**:
- Infrastructure is code. It lives in version control, gets reviewed, and is tested.
- State is the source of truth. Terraform tracks what it has created and diffs against your configuration.
- Plan before apply. Always review the execution plan before making changes.
- Modules are the unit of reuse. Never copy-paste resource blocks across projects.
- Immutable when possible. Replace resources rather than mutating them in place.

---

## 2. HCL Syntax Fundamentals

### Resource Blocks

Resources are the core building block. Each resource block declares one infrastructure object.

```hcl
# resource "<provider>_<type>" "<local_name>" { ... }
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  tags = {
    Name        = "web-server"
    Environment = var.environment
  }
}
```

### Data Blocks

Data sources read existing infrastructure that Terraform does not manage.

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

### Variables

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  description = "Number of web server instances"
  type        = number
  default     = 2
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

variable "allowed_cidrs" {
  description = "CIDR blocks allowed to access the load balancer"
  type        = list(string)
}
```

### Outputs

```hcl
# outputs.tf
output "instance_public_ip" {
  description = "Public IP address of the web server"
  value       = aws_instance.web_server.public_ip
}

output "database_endpoint" {
  description = "RDS endpoint for the database"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}
```

---

## 3. State Management

### Remote Backends

Never use local state in team environments. Use a remote backend with locking.

```hcl
# S3 Backend (AWS)
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```hcl
# Terraform Cloud Backend
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "my-app-prod"
    }
  }
}
```

### State Locking

State locking prevents concurrent modifications. With S3 backend, use DynamoDB for locking.

```hcl
# Create the lock table
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### State Operations

```bash
# List resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_instance.web_server

# Move a resource (rename without destroying)
terraform state mv aws_instance.old_name aws_instance.new_name

# Remove a resource from state (does not destroy it)
terraform state rm aws_instance.legacy

# Import existing infrastructure into state
terraform import aws_instance.web_server i-1234567890abcdef0
```

---

## 4. Modules

### Module Structure

```
modules/
  vpc/
    main.tf          # Resource definitions
    variables.tf     # Input variables
    outputs.tf       # Output values
    versions.tf      # Required providers and versions
    README.md        # Usage documentation
```

### Writing a Module

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-vpc"
  })
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${count.index}"
    Tier = "public"
  })
}

# modules/vpc/variables.tf
variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}
```

### Using a Module

```hcl
module "vpc" {
  source = "./modules/vpc"

  name_prefix         = "myapp"
  cidr_block          = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  availability_zones  = ["us-east-1a", "us-east-1b"]
  tags                = local.common_tags
}

# Reference module outputs
resource "aws_instance" "web" {
  subnet_id = module.vpc.public_subnet_ids[0]
  # ...
}
```

### Versioned Modules

```hcl
# From a Git repository
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//vpc?ref=v1.2.0"
}

# From Terraform Registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
}
```

---

## 5. Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# providers.tf
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Project     = var.project_name
      Environment = var.environment
    }
  }
}

# Multiple provider configurations (aliased)
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.us_west
  bucket   = "my-bucket-replica"
}
```

---

## 6. Workspaces

Workspaces let you manage multiple environments with the same configuration.

```bash
# Create and switch to a workspace
terraform workspace new staging
terraform workspace new production

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select staging
```

```hcl
# Use workspace name in configuration
locals {
  environment = terraform.workspace

  instance_type = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.medium"
  }
}

resource "aws_instance" "web" {
  instance_type = local.instance_type[local.environment]
  # ...
}
```

---

## 7. Lifecycle Rules

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    # Create the replacement before destroying the original
    create_before_destroy = true

    # Prevent accidental destruction (e.g., databases)
    prevent_destroy = true

    # Ignore changes made outside Terraform
    ignore_changes = [
      tags["LastModifiedBy"],
      user_data,
    ]

    # Replace the resource when any of these change
    replace_triggered_by = [
      aws_security_group.web.id,
    ]
  }
}
```

---

## 8. Dynamic Blocks

Dynamic blocks generate repeated nested blocks programmatically.

```hcl
variable "ingress_rules" {
  description = "Security group ingress rules"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    { port = 80,  protocol = "tcp", cidr_blocks = ["0.0.0.0/0"], description = "HTTP" },
    { port = 443, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"], description = "HTTPS" },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = module.vpc.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## 9. for_each vs count

### Use for_each for Named Resources

```hcl
# GOOD: Each resource has a meaningful key
variable "buckets" {
  type = map(object({
    versioning = bool
    acl        = string
  }))
  default = {
    logs    = { versioning = false, acl = "log-delivery-write" }
    assets  = { versioning = true,  acl = "private" }
    backups = { versioning = true,  acl = "private" }
  }
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "${var.project_name}-${each.key}"

  tags = { Purpose = each.key }
}

# Removing "logs" from the map only destroys that one bucket
# Adding "uploads" only creates that one bucket
```

### Use count for Conditional Resources

```hcl
# Create the resource only if the variable is true
resource "aws_cloudwatch_log_group" "app" {
  count = var.enable_logging ? 1 : 0
  name  = "/app/${var.environment}"
}

# Reference conditional resources carefully
output "log_group_arn" {
  value = var.enable_logging ? aws_cloudwatch_log_group.app[0].arn : null
}
```

### When NOT to Use count for Lists

```hcl
# BAD: count with a list -- removing item 0 forces recreation of all subsequent items
resource "aws_subnet" "public" {
  count      = length(var.subnet_cidrs)
  cidr_block = var.subnet_cidrs[count.index]
}

# GOOD: for_each with a map -- each subnet is independently addressable
resource "aws_subnet" "public" {
  for_each   = { for i, cidr in var.subnet_cidrs : "subnet-${i}" => cidr }
  cidr_block = each.value
}
```

---

## 10. Importing Existing Infrastructure

```bash
# CLI import (Terraform 1.5+)
terraform import aws_instance.web i-1234567890abcdef0

# Import block (declarative, recommended for Terraform 1.5+)
```

```hcl
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  # Fill in all attributes to match the existing resource
}
```

```bash
# Generate configuration from imported resources
terraform plan -generate-config-out=generated.tf
```

---

## 11. Terragrunt for DRY Patterns

Terragrunt is a wrapper that keeps Terraform configurations DRY across environments.

```
# Directory structure
infrastructure/
  terragrunt.hcl              # Root config (backend, providers)
  dev/
    terragrunt.hcl            # Dev overrides
    vpc/
      terragrunt.hcl          # Module instance
    app/
      terragrunt.hcl
  prod/
    terragrunt.hcl            # Prod overrides
    vpc/
      terragrunt.hcl
    app/
      terragrunt.hcl
```

```hcl
# infrastructure/terragrunt.hcl (root)
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "my-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# infrastructure/dev/vpc/terragrunt.hcl
terraform {
  source = "../../../modules/vpc"
}

include "root" {
  path = find_in_parent_folders()
}

inputs = {
  environment         = "dev"
  cidr_block          = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}
```

---

## 12. Testing

### terraform validate and plan

```bash
# Syntax and configuration validation
terraform validate

# Dry-run -- shows what would change without applying
terraform plan -out=tfplan

# Apply a saved plan (no confirmation prompt)
terraform apply tfplan
```

### Terratest (Go-based Integration Tests)

```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "name_prefix":         "test",
            "cidr_block":          "10.0.0.0/16",
            "public_subnet_cidrs": []string{"10.0.1.0/24"},
            "availability_zones":  []string{"us-east-1a"},
        },
    }

    // Clean up after test
    defer terraform.Destroy(t, terraformOptions)

    // Deploy
    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)
    assert.Contains(t, vpcId, "vpc-")
}
```

### terraform test (Native, Terraform 1.6+)

```hcl
# tests/vpc.tftest.hcl
run "create_vpc" {
  command = apply

  variables {
    name_prefix         = "test"
    cidr_block          = "10.0.0.0/16"
    public_subnet_cidrs = ["10.0.1.0/24"]
    availability_zones  = ["us-east-1a"]
  }

  assert {
    condition     = aws_vpc.this.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block did not match"
  }

  assert {
    condition     = length(aws_subnet.public) == 1
    error_message = "Expected exactly 1 public subnet"
  }
}
```

---

## 13. CI/CD Integration

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ["infrastructure/**"]
  push:
    branches: [main]
    paths: ["infrastructure/**"]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure

      - name: Terraform Validate
        run: terraform validate
        working-directory: infrastructure

      - name: Terraform Plan
        run: terraform plan -no-color -out=tfplan
        working-directory: infrastructure
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Post plan output as PR comment
      - uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            // Post plan summary to PR

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform apply -auto-approve
        working-directory: infrastructure
```

---

## 14. Secret Management

```hcl
# NEVER hardcode secrets
# BAD
resource "aws_db_instance" "main" {
  password = "my-secret-password" # NEVER DO THIS
}

# GOOD: Use variables marked as sensitive
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

resource "aws_db_instance" "main" {
  password = var.db_password
}

# GOOD: Read from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

```bash
# Pass secrets via environment variables
export TF_VAR_db_password="$(aws secretsmanager get-secret-value \
  --secret-id prod/database/password \
  --query SecretString --output text)"

terraform apply
```

---

## 15. Anti-Patterns

### NEVER

- Store state locally in a team project -- always use a remote backend with locking
- Hardcode secrets in `.tf` files -- use variables, environment variables, or secret managers
- Use `count` for resources identified by name -- use `for_each` with meaningful keys
- Skip `terraform plan` and go straight to `apply`
- Commit `.terraform/` or `*.tfstate` files to version control
- Use `terraform taint` (deprecated) -- use `-replace` flag instead
- Create monolithic configurations with hundreds of resources -- break into modules
- Ignore provider version constraints -- pin major versions with `~>`
- Use `terraform destroy` in production without a plan review
- Share a single state file across unrelated projects

### ALWAYS

- Pin provider versions (`~> 5.0`) and Terraform version (`>= 1.5`)
- Use `terraform fmt` to format all files before committing
- Tag all resources with at least `ManagedBy`, `Environment`, and `Project`
- Use `sensitive = true` on variables and outputs containing secrets
- Write module README files with usage examples
- Use `terraform plan -out=tfplan` and `terraform apply tfplan` in CI/CD
- Review the plan output before every apply
- Use separate state files per environment (or workspaces)
- Run `terraform validate` in pre-commit hooks
- Keep modules small and focused -- one logical concern per module

---

## 16. Quick Reference

```bash
# Initialize a working directory
terraform init

# Format configuration files
terraform fmt -recursive

# Validate configuration
terraform validate

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy all managed resources
terraform destroy

# Show current state
terraform show

# List resources in state
terraform state list

# Import existing resource
terraform import <resource_address> <resource_id>

# Force replacement of a resource
terraform apply -replace="aws_instance.web"

# Refresh state from real infrastructure
terraform refresh

# Output a specific value
terraform output database_endpoint

# Generate dependency graph
terraform graph | dot -Tpng > graph.png
```
