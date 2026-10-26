// Entirely client-side, static cost model — no live AWS Pricing API call.
// That's a deliberate tradeoff, not a limitation to hide: it's free (no API
// key, no per-request cost, works offline), and it's flexible (recomputes
// instantly as sliders move), but the numbers are illustrative, based on
// approximate US-East-1 on-demand list prices, not a live quote. Every
// place this shows a number says so.
//
// Rates below are deliberately simple, rounded approximations of public
// AWS list pricing (checked against published rates at the time this was
// written) — good for "is this roughly $30/month or $3,000/month," not for
// a real bill estimate. Real pricing depends on region, reserved/spot
// discounts, free tier status, and dozens of other factors this doesn't
// model.

function matchModel(serviceName) {
  const n = serviceName.toLowerCase();
  if (n.includes('lambda') && n.includes('api gateway')) return 'lambdaWithApiGateway';
  if (n.includes('lambda')) return 'lambda';
  if (n.includes('api gateway')) return 'apiGateway';
  if (n.includes('ec2')) return 'ec2';
  if (n.includes('fargate')) return 'fargate';
  if (n.includes('eks')) return 'eks';
  if (n.includes('ecs')) return 'fargate';
  if (n.includes('aurora')) return 'aurora';
  if (n.includes('rds')) return 'rds';
  if (n.includes('dynamodb')) return 'dynamodb';
  if (n.includes('elasticache')) return 'elasticache';
  if (n.includes('s3')) return 's3';
  if (n.includes('cloudfront')) return 'cloudfront';
  if (n.includes('athena')) return 'athena';
  if (n.includes('glue')) return 'glue';
  if (n.includes('kinesis')) return 'kinesis';
  if (n.includes('redshift')) return 'redshift';
  if (n.includes('sagemaker')) return 'sagemaker';
  if (n.includes('iot core')) return 'iotCore';
  if (n.includes('step functions')) return 'stepFunctions';
  if (n.includes('batch')) return 'batch';
  if (n.includes('sqs') || n.includes('sns')) return 'messaging';
  return null;
}

function estimateFor(model, inputs) {
  const { requestsPerMonth, storageGB, transferGB } = inputs;

  switch (model) {
    case 'lambdaWithApiGateway':
      return { cost: (requestsPerMonth / 1e6) * 1.60, note: 'Lambda compute + API Gateway requests, blended' };
    case 'lambda':
      return { cost: (requestsPerMonth / 1e6) * 0.60, note: 'requests + compute, blended' };
    case 'apiGateway':
      return { cost: (requestsPerMonth / 1e6) * 1.0, note: 'per million API calls' };
    case 'ec2': {
      const instances = Math.max(1, Math.ceil(requestsPerMonth / 2_000_000));
      return { cost: instances * 15, note: `${instances} × small instance, always-on` };
    }
    case 'fargate': {
      const tasks = Math.max(1, Math.ceil(requestsPerMonth / 1_000_000));
      return { cost: tasks * 18, note: `${tasks} × small task, always-on` };
    }
    case 'eks': {
      const tasks = Math.max(1, Math.ceil(requestsPerMonth / 1_000_000));
      return { cost: 73 + tasks * 18, note: 'control plane + node compute' };
    }
    case 'rds':
      return { cost: 12 + storageGB * 0.115, note: 'small instance + storage' };
    case 'aurora':
      return { cost: 60 + storageGB * 0.10, note: 'small instance + storage' };
    case 'dynamodb': {
      const reads = requestsPerMonth * 0.7;
      const writes = requestsPerMonth * 0.3;
      return {
        cost: (reads / 1e6) * 0.25 + (writes / 1e6) * 1.25 + storageGB * 0.25,
        note: 'on-demand reads/writes + storage',
      };
    }
    case 'elasticache':
      return { cost: 12, note: 'small node, roughly flat' };
    case 's3':
      return { cost: storageGB * 0.023 + transferGB * 0.09, note: 'storage + data transfer out' };
    case 'cloudfront':
      return { cost: transferGB * 0.085, note: 'data transfer out at the edge' };
    case 'athena':
      return { cost: storageGB * 0.005, note: 'assumes queries scan your dataset ~once' };
    case 'glue':
      return { cost: 26, note: 'small recurring ETL job' };
    case 'kinesis':
      return { cost: 25 + (requestsPerMonth / 1e6) * 0.5, note: 'shard hours + records' };
    case 'redshift':
      return { cost: 180, note: 'smallest always-on node — often overkill below real scale' };
    case 'sagemaker':
      return { cost: 50, note: 'light, intermittent training/hosting' };
    case 'iotCore':
      return { cost: (requestsPerMonth / 1e6) * 1.0, note: 'per million messages' };
    case 'stepFunctions': {
      const transitions = requestsPerMonth * 3;
      return { cost: (transitions / 1000) * 0.025, note: 'assumes ~3 transitions per request' };
    }
    case 'batch':
      return { cost: 20, note: 'light, intermittent batch compute' };
    case 'messaging':
      return { cost: (requestsPerMonth / 1e6) * 0.40, note: 'per million messages' };
    default:
      return null;
  }
}

// Maps a service name to one of Icon.jsx's existing tag keys, so the UI
// can show the right icon per line without duplicating the name-matching
// logic used for cost modeling.
export function guessIconTag(serviceName) {
  const n = serviceName.toLowerCase();
  if (n.includes('lambda') || n.includes('ec2') || n.includes('batch')) return 'compute';
  if (n.includes('fargate') || n.includes('ecs') || n.includes('eks')) return 'containers';
  if (n.includes('aurora') || n.includes('rds') || n.includes('dynamodb') || n.includes('redshift')) return 'database';
  if (n.includes('elasticache')) return 'cache';
  if (n.includes('s3') || n.includes('ebs')) return 'storage';
  if (n.includes('cloudfront') || n.includes('route 53') || n.includes('api gateway')) return 'delivery';
  if (n.includes('athena')) return 'query';
  if (n.includes('glue')) return 'etl';
  if (n.includes('kinesis')) return 'ingest';
  if (n.includes('sagemaker')) return 'ml';
  if (n.includes('iot core')) return 'ingest';
  if (n.includes('step functions')) return 'orchestration';
  if (n.includes('sqs') || n.includes('sns')) return 'messaging';
  return 'note';
}

// serviceNames: array of strings (e.g. from recommendation.why[].name or
// diagram nodes). Returns { lines: [{name, cost, note}], total, unknownCount }
export function estimateMonthlyCost(serviceNames, inputs) {
  const seen = new Set();
  const lines = [];
  let unknownCount = 0;

  serviceNames.forEach((name) => {
    const model = matchModel(name);
    if (!model || seen.has(model)) {
      if (!model) unknownCount += 1;
      return;
    }
    seen.add(model);
    const result = estimateFor(model, inputs);
    if (result) {
      lines.push({ name, cost: result.cost, note: result.note });
    } else {
      unknownCount += 1;
    }
  });

  const total = lines.reduce((sum, l) => sum + l.cost, 0);
  return { lines, total, unknownCount };
}

export const PRESETS = {
  serverless: {
    label: 'Serverless API',
    services: ['AWS Lambda + API Gateway', 'Amazon DynamoDB', 'Amazon S3'],
  },
  containers: {
    label: 'Containerized service',
    services: ['Amazon ECS on Fargate', 'Amazon RDS', 'Amazon S3'],
  },
  static: {
    label: 'Static site + analytics',
    services: ['Amazon CloudFront', 'Amazon S3', 'AWS Glue', 'Amazon Athena'],
  },
};
