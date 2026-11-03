import assert from 'node:assert/strict';
import { generateSvg } from './exportSvg.js';

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

// 1. Generates valid SVG wrapper
const svg = generateSvg(sampleDiagram, 'Serverless Architecture');
assert.ok(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
assert.ok(svg.trim().endsWith('</svg>'));

// 2. Contains all node titles and tags
assert.ok(svg.includes('Client'));
assert.ok(svg.includes('AWS Lambda'));
assert.ok(svg.includes('Amazon DynamoDB'));
assert.ok(svg.includes('Amazon S3'));

// 3. Contains required and optional edges with bezier path syntax
assert.ok(svg.includes('class="edge-req"'));
assert.ok(svg.includes('class="edge-opt"'));
assert.ok(svg.includes('stroke-dasharray: 5, 5'));

// 4. Handles empty/null gracefully
const emptySvg = generateSvg(null);
assert.ok(emptySvg.includes('No diagram data available'));

console.log('exportSvg: 4 checks passed');

