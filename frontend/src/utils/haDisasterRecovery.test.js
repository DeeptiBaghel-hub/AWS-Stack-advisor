import assert from 'node:assert/strict';
import { applyHaTierToRecommendation, HA_TIERS } from './haDisasterRecovery.js';

const baseRecommendation = {
  title: 'Serverless Web API',
  diagram: {
    nodes: [
      { id: 'n0', tag: 'entry', name: 'Client', entry: true },
      { id: 'n1', tag: 'compute', name: 'AWS Lambda +' },
      { id: 'n2', tag: 'database', name: 'Amazon DynamoDB' },
      { id: 'n3', tag: 'storage', name: 'Amazon S3', optional: true },
    ],
    edges: [
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n1', to: 'n3', optional: true },
    ],
  },
  why: [
    { mark: 'compute', name: 'AWS Lambda', text: 'Serverless compute' },
    { mark: 'database', name: 'Amazon DynamoDB', text: 'Managed NoSQL' },
  ],
  footnotes: ['General footnote'],
};

// 1. Single-AZ tier check
const singleAz = applyHaTierToRecommendation(baseRecommendation, 'single-az');
assert.ok(singleAz.title.includes('(Single-AZ)'));
assert.equal(singleAz.haTier.id, 'single-az');

// 2. Multi-AZ tier check
const multiAz = applyHaTierToRecommendation(baseRecommendation, 'multi-az');
assert.ok(multiAz.title.includes('(Multi-AZ Resilient)'));
assert.equal(multiAz.haTier.id, 'multi-az');

// 3. Multi-Region Active-Active check
const multiRegion = applyHaTierToRecommendation(baseRecommendation, 'multi-region');
assert.ok(multiRegion.title.includes('Multi-Region Active-Active'));
assert.equal(multiRegion.haTier.id, 'multi-region');

// Verify Multi-Region DAG structure:
const mrNodeNames = multiRegion.diagram.nodes.map((n) => n.name);
assert.ok(mrNodeNames.some((n) => n.includes('Route 53')), 'Should add Route 53 entry node');
assert.ok(mrNodeNames.some((n) => n.includes('Primary Region')), 'Should add Primary Region compute');
assert.ok(mrNodeNames.some((n) => n.includes('Secondary Region')), 'Should add Secondary Region compute');
assert.ok(mrNodeNames.some((n) => n.includes('DynamoDB Global Tables')), 'Should convert DynamoDB to Global Tables');
assert.ok(mrNodeNames.some((n) => n.includes('Cross-Region CRR')), 'Should convert S3 to S3 CRR');

// Verify edges connect Route 53 to both regions and both regions to Global Tables:
const fromR53 = multiRegion.diagram.edges.filter((e) => e.from === 'r53');
assert.equal(fromR53.length, 2, 'Route 53 should connect to both regional compute nodes');

console.log('haDisasterRecovery: 6 checks passed');

