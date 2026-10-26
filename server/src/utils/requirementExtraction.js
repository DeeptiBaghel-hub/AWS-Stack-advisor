// Extracts the same five structured parameters the stepped quiz collects
// (questions.js) from a free-text project description, then hands them to
// the existing computeRecommendation() engine — the AI's job stops at
// "understand the request," it never invents services or diagrams itself.
// That keeps every recommendation grounded in the same tested, rule-based
// logic regardless of which entry point produced the answers.

const { generateContent } = require('./geminiClient');

// Must match client/src/questions.js exactly — these are the only values
// computeRecommendation() knows how to reason about.
const VALID = {
  workload: ['web-api', 'static', 'containers', 'analytics', 'ml', 'iot', 'batch'],
  ops: ['serverless', 'managed', 'full-control'],
  traffic: ['steady', 'spiky', 'low', 'unsure'],
  db: ['relational', 'nosql', 'none', 'unsure'],
  scale: ['startup', 'growing', 'enterprise'],
};

// Safe, reasonable fallback per field if the model returns something
// outside the allowed set, or omits a field entirely.
const DEFAULTS = {
  workload: 'web-api',
  ops: 'serverless',
  traffic: 'unsure',
  db: 'unsure',
  scale: 'growing',
};

function buildExtractionPrompt() {
  return `You extract structured requirements from a free-text description of a software project, for an AWS architecture advisor.

Respond with ONLY a JSON object with exactly these five keys — no other text, no markdown code fences, no explanation:
{
  "workload": one of ${JSON.stringify(VALID.workload)},
  "ops": one of ${JSON.stringify(VALID.ops)},
  "traffic": one of ${JSON.stringify(VALID.traffic)},
  "db": one of ${JSON.stringify(VALID.db)},
  "scale": one of ${JSON.stringify(VALID.scale)}
}

Guidance:
- workload: what they're building. "web-api" for most apps/backends/APIs. "static" only for a site with no server-side logic. "containers" only if they explicitly mention Docker/Kubernetes/containers. "analytics" for data pipelines or dashboards. "ml" for training or serving models. "iot" for device/sensor data. "batch" for scheduled or offline jobs.
- ops: how hands-on they want to be with servers. Default to "serverless" unless they explicitly want control over servers/VMs ("full-control") or already mention containers ("managed").
- traffic: "spiky" for bursty/unpredictable/viral. "steady" for constant, predictable load. "low" for small or personal projects. "unsure" if not mentioned at all.
- db: "relational" if they mention SQL/Postgres/MySQL. "nosql" if they mention NoSQL/DynamoDB/MongoDB. "none" if no data storage is mentioned. "unsure" otherwise.
- scale: infer from any mentioned user counts. Roughly under 10,000 users or explicitly early-stage is "startup". Tens of thousands to low millions is "growing". Explicit enterprise/compliance/mission-critical language or very large user counts is "enterprise". Default to "growing" if unclear.

Always include all five keys with a valid value from the lists above, even if you have to make a reasonable guess.`;
}

// Gemini sometimes wraps JSON in markdown fences despite instructions not
// to — strip those before parsing rather than failing on a cosmetic issue.
function stripCodeFences(text) {
  return text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
}

function validateAndNormalize(parsed) {
  const result = {};
  for (const key of Object.keys(VALID)) {
    const value = parsed?.[key];
    result[key] = VALID[key].includes(value) ? value : DEFAULTS[key];
  }
  return result;
}

// Returns { answers, wasSafetyBlocked } on success, or null if the model's
// response genuinely couldn't be parsed as anything usable — the caller
// decides how to surface that to the user.
async function extractRequirements(description) {
  const candidate = await generateContent({
    systemPrompt: buildExtractionPrompt(),
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: { maxOutputTokens: 200, temperature: 0.1, responseMimeType: 'application/json' },
  });

  if (!candidate || candidate.finishReason === 'SAFETY') {
    return null;
  }

  const text = candidate.content?.parts?.map((p) => p.text).join('') || '';
  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch (e) {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  return validateAndNormalize(parsed);
}

module.exports = { extractRequirements, VALID, DEFAULTS };
