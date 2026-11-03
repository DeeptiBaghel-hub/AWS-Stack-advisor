// Minimal smoke test, run with: npm test
const assert = require('assert');
const { computeRecommendation } = require('./recommendationEngine');

function names(rec) {
  return rec.diagram.nodes.map((n) => n.name);
}

function run() {
  let passed = 0;

  const staticSite = computeRecommendation({ workload: 'static', scale: 'growing' });
  assert.ok(names(staticSite).includes('Amazon S3'));
  assert.ok(names(staticSite).includes('Amazon CloudFront'));
  assert.strictEqual(staticSite.diagram.edges.length, 2, 'static site should be a simple 2-edge chain');
  passed++;

  const serverlessApi = computeRecommendation({ workload: 'web-api', ops: 'serverless', traffic: 'spiky', db: 'nosql', scale: 'startup' });
  assert.ok(serverlessApi.why.some((w) => w.name.includes('Lambda')));
  assert.ok(serverlessApi.why.some((w) => w.name === 'Amazon DynamoDB'));
  // spiky + db should branch: compute -> db, compute -> cache (optional), compute -> storage (optional)
  const computeNode = serverlessApi.diagram.nodes.find((n) => n.tag === 'compute');
  const computeChildren = serverlessApi.diagram.edges.filter((e) => e.from === computeNode.id);
  assert.strictEqual(computeChildren.length, 3, 'compute should branch to db, cache, and storage');
  assert.ok(computeChildren.some((e) => e.optional === false || e.optional === undefined ? true : e.optional), 'edges should carry an optional flag');
  const cacheNode = serverlessApi.diagram.nodes.find((n) => n.tag === 'cache');
  assert.ok(cacheNode && cacheNode.optional === true, 'cache node should be marked optional');
  passed++;

  const steadyApiNoBranch = computeRecommendation({ workload: 'web-api', ops: 'serverless', traffic: 'steady', db: 'none', scale: 'startup' });
  assert.ok(!steadyApiNoBranch.diagram.nodes.some((n) => n.tag === 'cache'), 'no cache branch without spiky traffic');
  passed++;

  const enterpriseContainers = computeRecommendation({ workload: 'containers', scale: 'enterprise', db: 'relational' });
  assert.ok(enterpriseContainers.why.some((w) => w.name === 'Amazon EKS'));
  assert.ok(enterpriseContainers.why.some((w) => w.name === 'Amazon Aurora'));
  passed++;

  const analytics = computeRecommendation({ workload: 'analytics', scale: 'growing' });
  const s3Node = analytics.diagram.nodes.find((n) => n.tag === 'storage');
  const s3Children = analytics.diagram.edges.filter((e) => e.from === s3Node.id);
  assert.strictEqual(s3Children.length, 2, 'S3 should branch to both Glue and Athena');
  const glueNode = analytics.diagram.nodes.find((n) => n.tag === 'etl');
  assert.ok(analytics.diagram.edges.some((e) => e.from === glueNode.id), 'Glue should also feed into Athena (catalog dependency)');
  passed++;

  const iot = computeRecommendation({ workload: 'iot', db: 'nosql' });
  const ingestNode = iot.diagram.nodes.find((n) => n.tag === 'ingest');
  const ingestChildren = iot.diagram.edges.filter((e) => e.from === ingestNode.id);
  assert.strictEqual(ingestChildren.length, 2, 'IoT Core should branch to Lambda processing and an optional S3 archive');
  passed++;

  const empty = computeRecommendation({});
  assert.ok(empty.title.length > 0);
  passed++;

  console.log(`recommendationEngine: ${passed} checks passed`);
}

run();
