// Generates a Terraform starter scaffold for a recommendation's services.
//
// Deliberately template-based, never AI-generated — consistent with this
// whole app's philosophy that AI extracts/summarizes but never invents
// technical output directly. Generated infrastructure code that "looks
// right" but has a subtle security or cost issue is a different risk
// category than a wrong diagram or an illustrative cost estimate, so this
// only covers a curated subset of services with hand-written, reviewed
// templates. Anything not in that set is explicitly reported as
// unsupported rather than generating something plausible-looking but wrong.
//
// Security defaults are deliberately conservative: private-by-default S3
// and RDS, minimal IAM (basic execution role only, no wildcard
// permissions), no hardcoded secrets, no 0.0.0.0/0 ingress for anything
// with real access. This is a *starting point for a design conversation*,
// not a production deployment — the generated README says so prominently,
// and so does every place this appears in the UI.

function matchService(name) {
  const n = name.toLowerCase();
  if (n.includes('lambda') && n.includes('api gateway')) return 'lambdaApi';
  if (n.includes('lambda')) return 'lambda';
  if (n.includes('ec2')) return 'ec2';
  if (n.includes('fargate') || n.includes('ecs')) return 'fargate';
  if (n.includes('aurora')) return 'aurora';
  if (n.includes('rds')) return 'rds';
  if (n.includes('dynamodb')) return 'dynamodb';
  if (n.includes('elasticache')) return 'elasticache';
  if (n.includes('s3')) return 's3';
  if (n.includes('cloudfront')) return 'cloudfront';
  if (n.includes('sqs') || n.includes('sns')) return 'messaging';
  return null;
}

const UNSUPPORTED_REASONS = {
  eks: 'requires a full VPC and node-group design to template safely — generate via eksctl or the AWS Console instead',
  redshift: 'cluster sizing and network placement are workload-specific enough that a generic template would likely be wrong',
  kinesis: 'shard count and retention need real traffic data to size correctly',
  sagemaker: 'notebook/endpoint configuration varies too much by ML workload to template generically',
  glue: 'job and crawler configuration depends heavily on your actual data layout',
  athena: 'depends entirely on the schema of data it queries — nothing generic to template',
  'step functions': 'state machine definitions are inherently workload-specific',
  'iot core': 'device provisioning and policy design need real device details',
  batch: 'compute environment sizing depends on real job characteristics',
};

function templateFor(key, ctx) {
  const { prefix } = ctx;

  switch (key) {
    case 'lambdaApi':
      return {
        resources: `
# --- Lambda + API Gateway (from: AWS Lambda + API Gateway) ---
data "archive_file" "${prefix}_lambda_zip" {
  type        = "zip"
  output_path = "\${path.module}/${prefix}-lambda.zip"
  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'Hello from ${prefix}' });"
    filename = "index.js"
  }
}

resource "aws_iam_role" "${prefix}_lambda_role" {
  name = "${prefix}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic execution role only — CloudWatch Logs access, nothing broader.
# Add scoped-down permissions for any other AWS resource this function
# actually needs to touch (e.g. a specific DynamoDB table ARN).
resource "aws_iam_role_policy_attachment" "${prefix}_lambda_basic" {
  role       = aws_iam_role.${prefix}_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "${prefix}_fn" {
  function_name    = "${prefix}-fn"
  role             = aws_iam_role.${prefix}_lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.${prefix}_lambda_zip.output_path
  source_code_hash = data.archive_file.${prefix}_lambda_zip.output_base64sha256
  timeout          = 10
}

resource "aws_apigatewayv2_api" "${prefix}_api" {
  name          = "${prefix}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "${prefix}_integration" {
  api_id                 = aws_apigatewayv2_api.${prefix}_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.${prefix}_fn.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "${prefix}_route" {
  api_id    = aws_apigatewayv2_api.${prefix}_api.id
  route_key = "$default"
  target    = "integrations/\${aws_apigatewayv2_integration.${prefix}_integration.id}"
}

resource "aws_apigatewayv2_stage" "${prefix}_stage" {
  api_id      = aws_apigatewayv2_api.${prefix}_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "${prefix}_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.${prefix}_fn.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_apigatewayv2_api.${prefix}_api.execution_arn}/*/*"
}`,
        outputs: `
output "${prefix}_api_url" {
  description = "Invoke URL for the ${prefix} API"
  value       = aws_apigatewayv2_stage.${prefix}_stage.invoke_url
}`,
        note: 'Lambda ships with a placeholder "Hello from" handler — replace the inline source with your real deployment package before this does anything useful. IAM role only has CloudWatch Logs access; add scoped permissions for anything else the function needs to touch.',
      };

    case 'lambda':
      return {
        resources: `
# --- Lambda (from: AWS Lambda) ---
data "archive_file" "${prefix}_lambda_zip" {
  type        = "zip"
  output_path = "\${path.module}/${prefix}-lambda.zip"
  source {
    content  = "exports.handler = async (event) => { console.log(JSON.stringify(event)); };"
    filename = "index.js"
  }
}

resource "aws_iam_role" "${prefix}_lambda_role" {
  name = "${prefix}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "${prefix}_lambda_basic" {
  role       = aws_iam_role.${prefix}_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "${prefix}_fn" {
  function_name    = "${prefix}-fn"
  role             = aws_iam_role.${prefix}_lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.${prefix}_lambda_zip.output_path
  source_code_hash = data.archive_file.${prefix}_lambda_zip.output_base64sha256
  timeout          = 30
}`,
        outputs: `
output "${prefix}_lambda_arn" {
  description = "ARN of the ${prefix} Lambda function"
  value       = aws_lambda_function.${prefix}_fn.arn
}`,
        note: 'No trigger is wired up (no EventBridge rule, no queue) — add whatever actually invokes this function for your workload.',
      };

    case 'ec2':
      return {
        resources: `
# --- EC2 (from: Amazon EC2) ---
# SSH ingress deliberately does NOT default to 0.0.0.0/0 — you must set
# var.${prefix}_ssh_cidr to your own IP before this is usable, on purpose.
resource "aws_security_group" "${prefix}_sg" {
  name        = "${prefix}-sg"
  description = "Security group for ${prefix}"

  ingress {
    description = "SSH from a specific CIDR only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.${prefix}_ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ami" "${prefix}_al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "${prefix}_instance" {
  ami                    = data.aws_ami.${prefix}_al2023.id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.${prefix}_sg.id]

  tags = { Name = "${prefix}-instance" }
}`,
        variables: `
variable "${prefix}_ssh_cidr" {
  description = "CIDR block allowed to SSH into the ${prefix} instance — set this to your own IP, e.g. 203.0.113.4/32. Never leave this as 0.0.0.0/0."
  type        = string
}`,
        outputs: `
output "${prefix}_instance_public_ip" {
  description = "Public IP of the ${prefix} instance"
  value       = aws_instance.${prefix}_instance.public_ip
}`,
        note: 'No Auto Scaling Group or Elastic Load Balancer — this is a single instance, matching what the recommendation quiz actually asked about. Add an ASG/ALB yourself if you need real redundancy.',
      };

    case 'fargate':
      return {
        resources: `
# --- ECS on Fargate (from: Amazon ECS on Fargate) ---
# Uses a placeholder public nginx image — replace with your actual
# container image before this serves real traffic.
resource "aws_ecs_cluster" "${prefix}_cluster" {
  name = "${prefix}-cluster"
}

resource "aws_iam_role" "${prefix}_task_execution_role" {
  name = "${prefix}-task-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "${prefix}_task_execution" {
  role       = aws_iam_role.${prefix}_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "${prefix}_task" {
  family                   = "${prefix}-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.${prefix}_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "${prefix}-container"
    image     = "public.ecr.aws/nginx/nginx:latest"
    essential = true
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
  }])
}`,
        note: 'Task definition uses a placeholder nginx image and has no aws_ecs_service (which needs real subnet/security-group wiring specific to your VPC) — add that once you have real networking in place.',
      };

    case 'rds':
      return {
        resources: `
# --- RDS (from: Amazon RDS) ---
# Never publicly accessible. Password is a required variable, never
# hardcoded or auto-generated into state.
resource "aws_db_instance" "${prefix}_db" {
  identifier             = "${prefix}-db"
  engine                 = "postgres"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = replace("${prefix}", "-", "_")
  username               = "app_admin"
  password               = var.${prefix}_db_password
  publicly_accessible    = false
  skip_final_snapshot    = true
  backup_retention_period = 7
}`,
        variables: `
variable "${prefix}_db_password" {
  description = "Master password for the ${prefix} database — set via TF_VAR_${prefix}_db_password or a .tfvars file, never commit this."
  type        = string
  sensitive   = true
}`,
        outputs: `
output "${prefix}_db_endpoint" {
  description = "Connection endpoint for the ${prefix} database"
  value       = aws_db_instance.${prefix}_db.endpoint
}`,
        note: 'skip_final_snapshot is true for easy teardown while testing — set it to false before you have real data in here, or you\'ll lose it on destroy with no snapshot.',
      };

    case 'aurora':
      return {
        resources: `
# --- Aurora Serverless v2 (from: Amazon Aurora) ---
resource "aws_rds_cluster" "${prefix}_cluster" {
  cluster_identifier      = "${prefix}-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  master_username         = "app_admin"
  master_password         = var.${prefix}_db_password
  skip_final_snapshot     = true
  backup_retention_period = 7

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2
  }
}

resource "aws_rds_cluster_instance" "${prefix}_instance" {
  cluster_identifier = aws_rds_cluster.${prefix}_cluster.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.${prefix}_cluster.engine
}`,
        variables: `
variable "${prefix}_db_password" {
  description = "Master password for the ${prefix} Aurora cluster — set via TF_VAR_${prefix}_db_password, never commit this."
  type        = string
  sensitive   = true
}`,
        outputs: `
output "${prefix}_cluster_endpoint" {
  description = "Writer endpoint for the ${prefix} Aurora cluster"
  value       = aws_rds_cluster.${prefix}_cluster.endpoint
}`,
        note: 'Scaled to a minimum of 0.5 ACU to keep idle cost low for a starter setup — raise min_capacity once you have real, steady traffic.',
      };

    case 'dynamodb':
      return {
        resources: `
# --- DynamoDB (from: Amazon DynamoDB) ---
resource "aws_dynamodb_table" "${prefix}_table" {
  name         = "${prefix}-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}`,
        outputs: `
output "${prefix}_table_name" {
  description = "Name of the ${prefix} DynamoDB table"
  value       = aws_dynamodb_table.${prefix}_table.name
}`,
        note: 'Single string partition key named "id" — rename/restructure to match your actual access patterns before relying on this.',
      };

    case 's3':
      return {
        resources: `
# --- S3 (from: Amazon S3) ---
# Private by default: public access is explicitly blocked at the bucket
# level, not just left to default ACLs.
resource "aws_s3_bucket" "${prefix}_bucket" {
  bucket = "${prefix}-bucket-\${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "${prefix}_block" {
  bucket                  = aws_s3_bucket.${prefix}_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "${prefix}_versioning" {
  bucket = aws_s3_bucket.${prefix}_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_caller_identity" "current" {}`,
        outputs: `
output "${prefix}_bucket_name" {
  description = "Name of the ${prefix} S3 bucket"
  value       = aws_s3_bucket.${prefix}_bucket.id
}`,
        note: 'Account ID is suffixed onto the bucket name since S3 bucket names are globally unique — expect a genuinely unique name, not the literal "${prefix}-bucket".',
      };

    case 'cloudfront':
      return {
        resources: `
# --- CloudFront (from: Amazon CloudFront) ---
# Assumes an S3 origin — if this recommendation also includes S3, this
# fronts that same bucket via Origin Access Control (no public bucket
# policy needed).
resource "aws_cloudfront_origin_access_control" "${prefix}_oac" {
  name                              = "${prefix}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "${prefix}_cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.${prefix}_bucket.bucket_regional_domain_name
    origin_id                = "${prefix}-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.${prefix}_oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${prefix}-origin"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}`,
        outputs: `
output "${prefix}_cdn_domain" {
  description = "CloudFront domain name for ${prefix}"
  value       = aws_cloudfront_distribution.${prefix}_cdn.domain_name
}`,
        note: 'Requires the S3 template to also be included in this recommendation (it references that bucket directly) — if you generated CloudFront alone, add an S3 bucket resource or repoint the origin.',
      };

    case 'elasticache':
      return {
        resources: `
# --- ElastiCache Redis (from: Amazon ElastiCache) ---
resource "aws_elasticache_cluster" "${prefix}_cache" {
  cluster_id           = "${prefix}-cache"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}`,
        outputs: `
output "${prefix}_cache_endpoint" {
  description = "Configuration endpoint for the ${prefix} Redis cluster"
  value       = aws_elasticache_cluster.${prefix}_cache.cache_nodes[0].address
}`,
        note: 'No subnet group specified — uses the default VPC. Set subnet_group_name explicitly once you have real network isolation set up.',
      };

    case 'messaging':
      return {
        resources: `
# --- SQS + SNS (from: Amazon SQS / Amazon SNS) ---
resource "aws_sqs_queue" "${prefix}_queue" {
  name                       = "${prefix}-queue"
  visibility_timeout_seconds = 30
}

resource "aws_sns_topic" "${prefix}_topic" {
  name = "${prefix}-topic"
}`,
        outputs: `
output "${prefix}_queue_url" {
  description = "URL of the ${prefix} SQS queue"
  value       = aws_sqs_queue.${prefix}_queue.url
}
output "${prefix}_topic_arn" {
  description = "ARN of the ${prefix} SNS topic"
  value       = aws_sns_topic.${prefix}_topic.arn
}`,
        note: null,
      };

    default:
      return null;
  }
}

function slugifyPrefix(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
    .slice(0, 24);
  return slug || 'app';
}

// serviceNames: array of strings from recommendation.why[].name
export function generateTerraform(serviceNames, projectTitle) {
  const prefix = slugifyPrefix(projectTitle || 'app');
  const supported = [];
  const unsupported = [];
  const seen = new Set();

  let resourceBlocks = '';
  let variableBlocks = '';
  let outputBlocks = '';
  const notes = [];

  serviceNames.forEach((name) => {
    const key = matchService(name);
    if (!key) {
      const lowerName = name.toLowerCase();
      const reasonKey = Object.keys(UNSUPPORTED_REASONS).find((k) => lowerName.includes(k));
      unsupported.push({ name, reason: reasonKey ? UNSUPPORTED_REASONS[reasonKey] : 'no reviewed template exists for this service yet' });
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);

    const tmpl = templateFor(key, { prefix });
    if (!tmpl) return;
    supported.push(name);
    resourceBlocks += tmpl.resources + '\n';
    if (tmpl.variables) variableBlocks += tmpl.variables + '\n';
    if (tmpl.outputs) outputBlocks += tmpl.outputs + '\n';
    if (tmpl.note) notes.push(`- **${name}**: ${tmpl.note}`);
  });

  const mainTf = `terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
${resourceBlocks}`;

  const variablesTf = `variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}
${variableBlocks}`;

  const outputsTf = outputBlocks || '# No outputs for this configuration.\n';

  const readme = `# Terraform starter scaffold — ${projectTitle || 'your stack'}

## Read this before you run anything

This is a **starting point for a design conversation**, not a production
deployment. It was generated from a template for each service, not by an
AI freely writing infrastructure code — but it still needs your review.

**Before running \`terraform apply\`:**
1. Run \`terraform plan\` first, every time, and actually read the output.
2. Set every required variable (see variables.tf) — several have no
   default on purpose, particularly anything security-sensitive like
   \`${prefix}_ssh_cidr\` or \`${prefix}_db_password\`.
3. This will create real AWS resources that cost real money. Nothing here
   runs or costs anything until you run \`terraform apply\`.

## What's deliberately NOT included

- No VPC design — everything uses your account's default VPC. For
  anything beyond a personal project, design real network isolation
  first.
- No least-privilege IAM beyond what's needed for the resource to
  function at all (e.g., Lambda's basic execution role). Add scoped
  permissions for whatever else your code actually needs to touch.
- No monitoring, alarms, or log retention policies.
- No multi-AZ or disaster-recovery configuration.
- No CI/CD wiring — this is meant to be run manually while you're
  learning the shape of the infrastructure, not a deploy pipeline.

## Services included in this scaffold
${supported.map((s) => `- ${s}`).join('\n') || '- (none — see unsupported services below)'}

${notes.length ? `## Notes on what was generated\n${notes.join('\n')}\n` : ''}
${unsupported.length ? `## Not included\n\nThese services from your recommendation don't have a reviewed template yet — generating something plausible-looking but wrong felt worse than being upfront that it's not supported:\n\n${unsupported.map((u) => `- **${u.name}**: ${u.reason}`).join('\n')}\n` : ''}
`;

  return {
    files: {
      'main.tf': mainTf,
      'variables.tf': variablesTf,
      'outputs.tf': outputsTf,
      'README.md': readme,
    },
    supported,
    unsupported,
  };
}
