const assert = require('assert');
const { scoreWellArchitected, PILLARS } = require('./wellArchitectedScorer');

function run() {
  let passed = 0;

  // Every result must cover all 6 real AWS pillars, in order, with valid scores
  const generic = scoreWellArchitected({ ops: 'serverless', scale: 'startup', traffic: 'spiky' });
  assert.strictEqual(generic.pillars.length, 6);
  assert.deepStrictEqual(generic.pillars.map((p) => p.pillar), PILLARS);
  generic.pillars.forEach((p) => {
    assert.ok(p.score >= 1 && p.score <= 5, `score out of range for ${p.pillar}`);
    assert.ok(p.reasoning.length > 20, `reasoning too short for ${p.pillar}`);
  });
  assert.ok(generic.overall >= 1 && generic.overall <= 5);
  passed++;

  // Serverless + spiky traffic should score well on performance and cost —
  // the framework's own definition of a good fit, not just a high number.
  const idealServerless = scoreWellArchitected({ ops: 'serverless', scale: 'startup', traffic: 'spiky' });
  const perf = idealServerless.pillars.find((p) => p.pillar === 'Performance Efficiency');
  const cost = idealServerless.pillars.find((p) => p.pillar === 'Cost Optimization');
  assert.strictEqual(perf.score, 5);
  assert.strictEqual(cost.score, 5);
  passed++;

  // The exact opposite fit — full manual control fighting spiky traffic —
  // should score meaningfully worse on the same two pillars.
  const worstFit = scoreWellArchitected({ ops: 'full-control', scale: 'startup', traffic: 'spiky' });
  const perf2 = worstFit.pillars.find((p) => p.pillar === 'Performance Efficiency');
  const cost2 = worstFit.pillars.find((p) => p.pillar === 'Cost Optimization');
  assert.strictEqual(perf2.score, 2);
  assert.strictEqual(cost2.score, 2);
  assert.ok(perf2.score < perf.score, 'worst-fit performance should score below the ideal-fit case');
  passed++;

  // Full control should always score low on Operational Excellence and
  // Security, regardless of scale — self-management is self-management.
  const fullControlEnterprise = scoreWellArchitected({ ops: 'full-control', scale: 'enterprise', traffic: 'steady' });
  const opEx = fullControlEnterprise.pillars.find((p) => p.pillar === 'Operational Excellence');
  const sec = fullControlEnterprise.pillars.find((p) => p.pillar === 'Security');
  assert.strictEqual(opEx.score, 2);
  assert.ok(sec.score <= 3, 'full-control security score should stay capped low even at enterprise scale');
  passed++;

  // Enterprise scale should push Reliability up relative to startup scale,
  // holding ops/traffic constant.
  const enterpriseReliability = scoreWellArchitected({ ops: 'managed', scale: 'enterprise', traffic: 'steady' }).pillars.find((p) => p.pillar === 'Reliability');
  const startupReliability = scoreWellArchitected({ ops: 'managed', scale: 'startup', traffic: 'steady' }).pillars.find((p) => p.pillar === 'Reliability');
  assert.ok(enterpriseReliability.score > startupReliability.score, 'enterprise scale should score higher reliability than startup scale');
  passed++;

  // Missing/empty answers shouldn't throw — should still return a complete,
  // valid scorecard with the safe middle-ground defaults.
  const empty = scoreWellArchitected({});
  assert.strictEqual(empty.pillars.length, 6);
  passed++;

  console.log(`wellArchitectedScorer: ${passed} checks passed`);
}

run();
