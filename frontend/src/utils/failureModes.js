// Production Pre-Mortem & Known Failure Modes Engine
// Maps recommended AWS services to real-world production failure modes,
// operational gotchas, and concrete hardening mitigations.

export const FAILURE_MODES_CATALOG = {
  lambda: {
    id: 'lambda-cold-start',
    service: 'AWS Lambda',
    title: 'Cold Starts & Concurrency Starvation',
    category: 'Compute / Operational',
    severity: 'Medium',
    trigger: 'Sudden traffic bursts after idle intervals or hitting account concurrency ceilings.',
    impact: 'P99 response latencies spike by 500ms–2s; downstream services risk 429 TooManyRequests.',
    mitigation: 'Provision warm concurrency for critical HTTP endpoints; assign reserved concurrency limits to isolate spiky functions.',
  },
  apiGateway: {
    id: 'apigw-timeout',
    service: 'Amazon API Gateway',
    title: '29-Second Hard Integration Timeout',
    category: 'Ingestion / Availability',
    severity: 'High',
    trigger: 'Synchronous long-running jobs, complex queries, or slow downstream webhooks exceeding 29s.',
    impact: 'Client receives HTTP 504 Gateway Timeout while backend execution continues detached.',
    mitigation: 'Decouple long jobs asynchronously: return HTTP 202 Accepted with a correlation ID and enqueue to SQS or Step Functions.',
  },
  rds: {
    id: 'rds-connection-pool',
    service: 'Amazon RDS / Aurora',
    title: 'Database Connection Pool Exhaustion',
    category: 'Database / Resilience',
    severity: 'High',
    trigger: 'Stateless compute instances or bursty Lambda functions each initiating multiple direct database connections.',
    impact: 'Database crashes with "FATAL: remaining connection slots are reserved" error, cascading to complete API downtime.',
    mitigation: 'Deploy AWS RDS Proxy between compute and the database cluster to pool and multiplex database connections seamlessly.',
  },
  dynamodb: {
    id: 'dynamodb-hot-partition',
    service: 'Amazon DynamoDB',
    title: 'Hot Partitioning & Read/Write Throttling',
    category: 'Database / Performance',
    severity: 'High',
    trigger: 'Low-entropy partition keys (e.g. date or fixed status) concentrating writes onto a single physical partition.',
    impact: 'ProvisionedThroughputExceededException errors and exponential backoff retry storms.',
    mitigation: 'Add random hash suffixes (salting) to partition keys; enable DynamoDB On-Demand capacity and add DAX for hot reads.',
  },
  ecs: {
    id: 'ecs-sigterm-drop',
    service: 'Amazon ECS on Fargate / EKS',
    title: 'Premature Connection Drops During Deployments',
    category: 'Containers / Availability',
    severity: 'Medium',
    trigger: 'ALB target group deregistration delay outlasting container stopTimeout, or missing SIGTERM handler in app code.',
    impact: 'Users experience intermittent HTTP 502 Bad Gateway errors during rolling task updates.',
    mitigation: 'Implement graceful SIGTERM shutdown hooks in container code; tune ALB deregistration delay to 15s and stopTimeout to 30s.',
  },
  s3: {
    id: 's3-public-exposure',
    service: 'Amazon S3',
    title: 'Public Access Exposure & Egress Bill Shock',
    category: 'Storage / Security & Cost',
    severity: 'High',
    trigger: 'Permissive bucket policies or direct S3 media downloads without an edge cache.',
    impact: 'Security compliance failure, data leaks, and high direct S3 internet transfer fees ($0.09/GB).',
    mitigation: 'Enforce S3 Block Public Access at account level; always front public asset delivery with CloudFront Origin Access Control (OAC).',
  },
  cloudfront: {
    id: 'cloudfront-stale-cache',
    service: 'Amazon CloudFront',
    title: 'Stale Cache Invalidation Storm & Edge Drift',
    category: 'Edge / Delivery',
    severity: 'Medium',
    trigger: 'Running repetitive /* wildcard invalidations after every deployment instead of content hashing.',
    impact: 'Exceeds monthly free invalidation limits ($0.005/path) and triggers thundering herd cache misses on origin.',
    mitigation: 'Use immutable content-hashed bundle filenames with 1-year Cache-Control; invalidate only index.html upon release.',
  },
  elasticache: {
    id: 'elasticache-stampede',
    service: 'Amazon ElastiCache',
    title: 'Cache Stampede (Thundering Herd Failure)',
    category: 'Caching / Performance',
    severity: 'High',
    trigger: 'A heavily queried cache key expires simultaneously under high concurrent read pressure.',
    impact: 'Thousands of requests miss cache and hammer backing relational database at the exact same millisecond.',
    mitigation: 'Implement probabilistic early expiration (XFetch algorithm) or randomized TTL jitter; use distributed mutex locks during cache refills.',
  },
  ec2: {
    id: 'ec2-scaling-lag',
    service: 'Amazon EC2 Auto Scaling',
    title: 'Auto Scaling Lag During Rapid Spikes',
    category: 'Compute / Scaling',
    severity: 'Medium',
    trigger: 'CPU-based scaling metric has 1-minute aggregation delay + 2-3 minute AMI launch and warm-up.',
    impact: 'Instances saturate and drop active connections before newly provisioned EC2 instances become healthy.',
    mitigation: 'Use Target Tracking based on ALB RequestCountPerTarget instead of CPU; configure EC2 Warm Pools for pre-initialized capacity.',
  },
  athena: {
    id: 'athena-scan-cost',
    service: 'Amazon Athena / AWS Glue',
    title: 'Runaway Query Costs on Unpartitioned S3 Data',
    category: 'Analytics / Cost Optimization',
    severity: 'Medium',
    trigger: 'Running unoptimized full table scans across raw, unpartitioned CSV or JSON files in S3.',
    impact: 'Athena bills $5.00 per TB scanned; accidental full scans across large lakes result in surprise cloud bills.',
    mitigation: 'Convert raw logs into partitioned Apache Parquet format via AWS Glue; enforce query data limits in Athena Workgroups.',
  },
  sagemaker: {
    id: 'sagemaker-idle-cost',
    service: 'Amazon SageMaker',
    title: 'Idle GPU Endpoint Billing Overheads',
    category: 'Machine Learning / Cost',
    severity: 'Medium',
    trigger: '24/7 dedicated GPU instances (e.g. ml.g5) running during zero-traffic overnight periods.',
    impact: 'Fixed infrastructure expense running thousands of dollars per month with low average utilization.',
    mitigation: 'Migrate sporadic or bursty model inference to SageMaker Serverless Inference; apply auto-scaling down to zero where feasible.',
  },
  stepFunctions: {
    id: 'step-functions-payload',
    service: 'AWS Step Functions',
    title: 'State Transition Payload Limit Exceeded',
    category: 'Orchestration / Resilience',
    severity: 'Medium',
    trigger: 'Passing large payloads (>256 KB) directly through task execution states.',
    impact: 'States.DataLimitExceeded runtime exception halts workflow execution mid-flight.',
    mitigation: 'Use the Claim-Check pattern: write large payloads to Amazon S3 and pass only the S3 bucket and object key between states.',
  },
};

export function analyzeFailureModes(recommendation) {
  if (!recommendation) return [];

  const serviceNames = (recommendation.why || []).map((w) => (w.name || '').toLowerCase());
  const diagramNames = (recommendation.diagram?.nodes || []).map((n) => (n.name || '').toLowerCase());
  const allNames = [...serviceNames, ...diagramNames].join(' ');

  const identified = [];

  if (allNames.includes('lambda')) {
    identified.push(FAILURE_MODES_CATALOG.lambda);
  }
  if (allNames.includes('api gateway') || allNames.includes('lambda +')) {
    identified.push(FAILURE_MODES_CATALOG.apiGateway);
  }
  if (allNames.includes('rds') || allNames.includes('aurora')) {
    identified.push(FAILURE_MODES_CATALOG.rds);
  }
  if (allNames.includes('dynamodb')) {
    identified.push(FAILURE_MODES_CATALOG.dynamodb);
  }
  if (allNames.includes('ecs') || allNames.includes('fargate') || allNames.includes('eks')) {
    identified.push(FAILURE_MODES_CATALOG.ecs);
  }
  if (allNames.includes('s3')) {
    identified.push(FAILURE_MODES_CATALOG.s3);
  }
  if (allNames.includes('cloudfront')) {
    identified.push(FAILURE_MODES_CATALOG.cloudfront);
  }
  if (allNames.includes('elasticache')) {
    identified.push(FAILURE_MODES_CATALOG.elasticache);
  }
  if (allNames.includes('ec2')) {
    identified.push(FAILURE_MODES_CATALOG.ec2);
  }
  if (allNames.includes('athena') || allNames.includes('glue')) {
    identified.push(FAILURE_MODES_CATALOG.athena);
  }
  if (allNames.includes('sagemaker')) {
    identified.push(FAILURE_MODES_CATALOG.sagemaker);
  }
  if (allNames.includes('step functions')) {
    identified.push(FAILURE_MODES_CATALOG.stepFunctions);
  }

  // Deduplicate by ID
  const unique = [];
  const seen = new Set();
  for (const item of identified) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }

  return unique;
}

