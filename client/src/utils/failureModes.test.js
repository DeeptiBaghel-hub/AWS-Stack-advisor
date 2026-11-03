import assert from 'node:assert/strict';
import { analyzeFailureModes } from './failureModes.js';

// 1. Serverless web API with RDS and ElastiCache
const serverlessStack = {
  why: [
    { name: 'AWS Lambda + API Gateway' },
    { name: 'Amazon RDS' },
    { name: 'Amazon ElastiCache (optional)' },
    { name: 'Amazon S3 (optional)' },
  ],
  diagram: {
    nodes: [
      { name: 'AWS Lambda +' },
      { name: 'Amazon RDS' },
      { name: 'Amazon ElastiCache' },
      { name: 'Amazon S3' },
    ],
  },
};

const results = analyzeFailureModes(serverlessStack);
const ids = results.map((r) => r.id);

// Should identify Lambda, API Gateway, RDS, ElastiCache, S3
assert.ok(ids.includes('lambda-cold-start'), 'Should identify Lambda cold start');
assert.ok(ids.includes('apigw-timeout'), 'Should identify API Gateway timeout');
assert.ok(ids.includes('rds-connection-pool'), 'Should identify RDS connection pool exhaustion');
assert.ok(ids.includes('elasticache-stampede'), 'Should identify ElastiCache stampede');
assert.ok(ids.includes('s3-public-exposure'), 'Should identify S3 exposure');

// 2. High severity failure modes flagged properly
const highRisk = results.filter((r) => r.severity === 'High');
assert.ok(highRisk.length >= 2, 'Should flag multiple high severity risks');

// 3. Handles empty recommendation safely
assert.deepEqual(analyzeFailureModes(null), []);
assert.deepEqual(analyzeFailureModes({}), []);

console.log('failureModes: 3 checks passed');

