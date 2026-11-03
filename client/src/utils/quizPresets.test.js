import assert from 'node:assert/strict';
import { parseQuizParams, buildQuizShareUrl, QUIZ_PRESETS } from './quizPresets.js';

// 1. Parse named preset ?preset=saas
const saasParams = new URLSearchParams('preset=saas');
const parsedSaas = parseQuizParams(saasParams);
assert.equal(parsedSaas.presetKey, 'saas');
assert.equal(parsedSaas.answers.workload, 'web-api');
assert.equal(parsedSaas.answers.traffic, 'spiky');
assert.equal(parsedSaas.answers.db, 'relational');
assert.equal(parsedSaas.isComplete, true);

// 2. Parse individual query params with override
const customParams = new URLSearchParams('workload=containers&ops=managed&scale=enterprise&auto=true');
const parsedCustom = parseQuizParams(customParams);
assert.equal(parsedCustom.answers.workload, 'containers');
assert.equal(parsedCustom.answers.ops, 'managed');
assert.equal(parsedCustom.answers.scale, 'enterprise');
// autoSubmit is false because db and traffic aren't answered yet
assert.equal(parsedCustom.autoSubmit, false);

// 3. Auto-submit works when all 5 are provided
const completeParams = new URLSearchParams(
  'workload=containers&ops=managed&db=relational&traffic=steady&scale=enterprise&auto=true'
);
const parsedComplete = parseQuizParams(completeParams);
assert.equal(parsedComplete.autoSubmit, true);
assert.equal(parsedComplete.isComplete, true);

// 4. Defensive against invalid or malicious query params
const maliciousParams = new URLSearchParams('workload=DROP_TABLE&ops=evil_server&traffic=spiky');
const parsedMalicious = parseQuizParams(maliciousParams);
assert.equal(parsedMalicious.answers.workload, undefined);
assert.equal(parsedMalicious.answers.ops, undefined);
assert.equal(parsedMalicious.answers.traffic, 'spiky');

// 5. URL builder
const builtUrl = buildQuizShareUrl(QUIZ_PRESETS.startup.answers, true);
assert.ok(builtUrl.includes('/quiz?'));
assert.ok(builtUrl.includes('workload=web-api'));
assert.ok(builtUrl.includes('ops=serverless'));
assert.ok(builtUrl.includes('auto=true'));

console.log('quizPresets: 5 checks passed');
