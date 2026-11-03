import assert from 'node:assert/strict';
import { generateMermaid } from './exportMermaid.js';

const sampleDiagram = {
  nodes: [
    { id: 'a', tag: 'entry', name: 'Client', entry: true },
    { id: 'b', tag: 'compute', name: 'AWS Lambda' },
    { id: 'c', tag: 'database', name: 'Amazon DynamoDB' },
    { id: 'd', tag: 'storage', name: 'Amazon S3', optional: true },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'b', to: 'd', optional: true },
  ],
};

// 1. Outputs valid mermaid code block
const output = generateMermaid(sampleDiagram, 'Serverless Web API');
assert.ok(output.startsWith('```mermaid\nflowchart LR'));
assert.ok(output.endsWith('```'));

// 2. Includes node definitions and tags
assert.ok(output.includes('n_a["Client\\n[entry]"]'));
assert.ok(output.includes('n_b["AWS Lambda\\n[compute]"]'));
assert.ok(output.includes('n_c["Amazon DynamoDB\\n[database]"]'));
assert.ok(output.includes('n_d["Amazon S3 (optional)\\n[storage]"]'));

// 3. Includes required and optional edges
assert.ok(output.includes('n_a --> n_b'));
assert.ok(output.includes('n_b --> n_c'));
assert.ok(output.includes('n_b -. "optional" .-> n_d'));

// 4. Handles empty/null diagrams safely
const emptyOutput = generateMermaid(null);
assert.ok(emptyOutput.includes('empty["No nodes in architecture"]'));

console.log('exportMermaid: 4 checks passed');

