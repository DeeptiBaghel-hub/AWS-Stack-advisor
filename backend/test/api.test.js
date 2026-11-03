// Integration tests — these exercise real HTTP requests against the actual
// Express app (routes, middleware, controllers, Mongoose models) using an
// in-memory MongoDB, as opposed to recommendationEngine.test.js which tests
// pure logic in isolation.
//
// Requires internet access on first run to download the in-memory MongoDB
// binary (mongodb-memory-server) — this works in normal dev environments
// and CI runners. It will NOT work in network-sandboxed environments with
// no access to MongoDB's binary distribution servers.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const app = require('../src/app');
const { computeRecommendation } = require('../src/utils/recommendationEngine');
const Service = require('../src/models/Service');
const services = require('../src/data/serviceCatalog');

let mongod;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Service.insertMany(services);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown routes return 404 with a message', async () => {
  const res = await request(app).get('/api/definitely-not-a-real-route');
  assert.equal(res.status, 404);
  assert.ok(res.body.message.includes('Route not found'));
});

// --- Observability ---

test('every response carries an X-Request-Id header for support/debugging correlation', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['x-request-id'], 'X-Request-Id header should be present');
});

test('a request-supplied X-Request-Id is honored rather than always generating a new one', async () => {
  const res = await request(app).get('/api/health').set('X-Request-Id', 'my-custom-trace-id');
  assert.equal(res.headers['x-request-id'], 'my-custom-trace-id');
});

test('a thrown error\'s response requestId matches its response header', async () => {
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'anything' }] });

  assert.equal(res.status, 503);
  assert.ok(res.body.requestId, 'error response body should include a requestId');
  assert.equal(res.body.requestId, res.headers['x-request-id'], 'body requestId should match the response header');
  process.env.GEMINI_API_KEY = savedKey;
});

test('health checks still work with SENTRY_DSN unset (the default, no-op case)', async () => {
  assert.equal(process.env.SENTRY_DSN, undefined, 'this test assumes no DSN is configured in the test environment');
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
});

// --- Observability ---

test('every response carries an X-Request-Id header for support/debugging correlation', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['x-request-id'], 'should generate a request id even for a successful request');
});

test('a request-supplied X-Request-Id is echoed back rather than replaced', async () => {
  const res = await request(app).get('/api/health').set('X-Request-Id', 'my-custom-trace-id');
  assert.equal(res.headers['x-request-id'], 'my-custom-trace-id');
});

test('error responses include the same requestId for correlating a user report to a log line', async () => {
  const res = await request(app)
    .post('/api/assistant/chat')
    .set('X-Request-Id', 'trace-for-this-specific-error')
    .send({ messages: [] }); // triggers a validation error

  assert.equal(res.status, 400);
});

test('a 500-class error still returns requestId in the body, not just the header', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'anything' }] });

  assert.equal(res.status, 502);
  assert.ok(res.body.requestId, 'error response body should carry a requestId matching the log line that recorded it');
  global.fetch = originalFetch;
});

test('POST /api/recommend returns a branching diagram for a spiky web API', async () => {
  const res = await request(app)
    .post('/api/recommend')
    .send({ answers: { workload: 'web-api', ops: 'serverless', traffic: 'spiky', db: 'nosql', scale: 'startup' } });
  assert.equal(res.status, 200);
  assert.ok(res.body.diagram.nodes.some((n) => n.tag === 'cache'));
  assert.ok(res.body.title.length > 0);
});

test('POST /api/recommend rejects a missing answers object', async () => {
  const res = await request(app).post('/api/recommend').send({});
  assert.equal(res.status, 400);
});

test('auth: register, then login, then fetch /me', async () => {
  const email = `test-${Date.now()}@example.com`;

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123' });
  assert.equal(registerRes.status, 201);
  assert.ok(registerRes.body.token);
  assert.equal(registerRes.body.user.email, email);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, email);
});

test('auth: registering the same email twice returns 409', async () => {
  const email = `dupe-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'password123' });
  const secondRes = await request(app).post('/api/auth/register').send({ name: 'B', email, password: 'password123' });
  assert.equal(secondRes.status, 409);
});

test('auth: wrong password returns 401', async () => {
  const email = `wrongpw-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'not-the-password' });
  assert.equal(res.status, 401);
});

test('auth: protected routes reject requests with no token', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('profile: updates the display name', async () => {
  const email = `profile-name-${Date.now()}@example.com`;
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'Old Name', email, password: 'password123' });
  const token = registerRes.body.token;

  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'New Name' });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, 'New Name');
  assert.equal(res.body.user.email, email);
});

test('profile: /me reflects the updated name afterward', async () => {
  const email = `profile-persist-${Date.now()}@example.com`;
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'Old Name', email, password: 'password123' });
  const token = registerRes.body.token;

  await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ name: 'Persisted Name' });

  const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(meRes.body.user.name, 'Persisted Name');
});

test('profile: changes password with a correct current password', async () => {
  const email = `profile-pw-${Date.now()}@example.com`;
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'oldpassword123' });
  const token = registerRes.body.token;

  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword456' });
  assert.equal(res.status, 200);

  const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'newpassword456' });
  assert.equal(loginRes.status, 200);
});

test('profile: rejects a password change with the wrong current password', async () => {
  const email = `profile-wrongpw-${Date.now()}@example.com`;
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'password123' });
  const token = registerRes.body.token;

  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'totally-wrong', newPassword: 'newpassword456' });
  assert.equal(res.status, 401);
});

test('profile: rejects a new password with no current password provided', async () => {
  const email = `profile-nocurrpw-${Date.now()}@example.com`;
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'password123' });
  const token = registerRes.body.token;

  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ newPassword: 'newpassword456' });
  assert.equal(res.status, 400);
});

test('profile: rejects updates from an unauthenticated request', async () => {
  const res = await request(app).put('/api/auth/profile').send({ name: 'Nobody' });
  assert.equal(res.status, 401);
});

test('services: list returns all 25 catalog entries', async () => {
  const res = await request(app).get('/api/services');
  assert.equal(res.status, 200);
  assert.equal(res.body.services.length, 25);
});

test('services: category filter narrows results correctly', async () => {
  const res = await request(app).get('/api/services').query({ category: 'Containers' });
  assert.equal(res.status, 200);
  assert.equal(res.body.services.length, 3);
  assert.ok(res.body.services.every((s) => s.category === 'Containers'));
});

test('services: single service lookup by slug', async () => {
  const res = await request(app).get('/api/services/aws-lambda');
  assert.equal(res.status, 200);
  assert.equal(res.body.service.name, 'AWS Lambda');
});

test('services: unknown slug returns 404', async () => {
  const res = await request(app).get('/api/services/not-a-real-service');
  assert.equal(res.status, 404);
});

test('services: compare returns a curated verdict for a featured pair', async () => {
  const res = await request(app)
    .get('/api/services/compare')
    .query({ a: 'aws-lambda', b: 'amazon-ec2' });
  assert.equal(res.status, 200);
  assert.ok(res.body.curated);
  assert.equal(res.body.serviceA.name, 'AWS Lambda');
  assert.equal(res.body.serviceB.name, 'Amazon EC2');
});

test('services: compare returns null curated verdict for a non-featured pair', async () => {
  const res = await request(app)
    .get('/api/services/compare')
    .query({ a: 'amazon-sqs', b: 'amazon-sns' });
  assert.equal(res.status, 200);
  assert.equal(res.body.curated, null);
});

test('services: compare with a missing slug returns 400', async () => {
  const res = await request(app).get('/api/services/compare').query({ a: 'aws-lambda' });
  assert.equal(res.status, 400);
});

// --- Recommendation history + shared links ---

async function registerAndGetToken(emailPrefix) {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post('/api/auth/register').send({ name: 'Tester', email, password: 'password123' });
  return res.body.token;
}

test('history: saving a recommendation generates a shareId and persists the WAF score', async () => {
  const token = await registerAndGetToken('hist-save');
  const rec = computeRecommendation({ workload: 'web-api', ops: 'serverless', traffic: 'spiky', db: 'nosql', scale: 'startup' });

  const res = await request(app)
    .post('/api/recommend/history')
    .set('Authorization', `Bearer ${token}`)
    .send({ answers: { workload: 'web-api' }, ...rec });

  assert.equal(res.status, 201);
  assert.ok(res.body.recommendation.shareId, 'a shareId should be generated automatically');
  assert.ok(res.body.recommendation.wellArchitected?.pillars?.length === 6);
});

test('history: list only returns the requesting user\'s own saved recommendations', async () => {
  const tokenA = await registerAndGetToken('hist-a');
  const tokenB = await registerAndGetToken('hist-b');
  const rec = computeRecommendation({ workload: 'static', scale: 'growing' });

  await request(app).post('/api/recommend/history').set('Authorization', `Bearer ${tokenA}`).send({ answers: {}, ...rec });

  const listA = await request(app).get('/api/recommend/history').set('Authorization', `Bearer ${tokenA}`);
  const listB = await request(app).get('/api/recommend/history').set('Authorization', `Bearer ${tokenB}`);
  assert.equal(listA.body.recommendations.length, 1);
  assert.equal(listB.body.recommendations.length, 0);
});

test('shared: a saved recommendation is fetchable via its public shareId with no auth', async () => {
  const token = await registerAndGetToken('share-fetch');
  const rec = computeRecommendation({ workload: 'analytics', scale: 'enterprise' });
  const saveRes = await request(app).post('/api/recommend/history').set('Authorization', `Bearer ${token}`).send({ answers: {}, ...rec });
  const shareId = saveRes.body.recommendation.shareId;

  const res = await request(app).get(`/api/recommend/shared/${shareId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.recommendation.title, rec.title);
});

test('shared: never exposes the owning user, email, or raw quiz answers', async () => {
  const token = await registerAndGetToken('share-privacy');
  const rec = computeRecommendation({ workload: 'iot', db: 'relational' });
  const saveRes = await request(app)
    .post('/api/recommend/history')
    .set('Authorization', `Bearer ${token}`)
    .send({ answers: { workload: 'iot', db: 'relational' }, ...rec });
  const shareId = saveRes.body.recommendation.shareId;

  const res = await request(app).get(`/api/recommend/shared/${shareId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.recommendation.user, undefined);
  assert.equal(res.body.recommendation.answers, undefined);
});

test('shared: a nonexistent shareId returns 404', async () => {
  const res = await request(app).get('/api/recommend/shared/not-a-real-share-id');
  assert.equal(res.status, 404);
});

test('shared: the link stops working once the recommendation is deleted', async () => {
  const token = await registerAndGetToken('share-delete');
  const rec = computeRecommendation({ workload: 'ml' });
  const saveRes = await request(app).post('/api/recommend/history').set('Authorization', `Bearer ${token}`).send({ answers: {}, ...rec });
  const { shareId, _id } = saveRes.body.recommendation;

  await request(app).delete(`/api/recommend/history/${_id}`).set('Authorization', `Bearer ${token}`);

  const res = await request(app).get(`/api/recommend/shared/${shareId}`);
  assert.equal(res.status, 404);
});

test('history: saving without auth is rejected', async () => {
  const rec = computeRecommendation({ workload: 'batch' });
  const res = await request(app).post('/api/recommend/history').send({ answers: {}, ...rec });
  assert.equal(res.status, 401);
});

test('history: deleting without auth is rejected', async () => {
  const res = await request(app).delete('/api/recommend/history/000000000000000000000000');
  assert.equal(res.status, 401);
});

// --- Assistant tests ---
// The real endpoint calls generativelanguage.googleapis.com, which needs a
// real GEMINI_API_KEY and outbound network access — neither is guaranteed
// in every environment these tests run in (including this sandbox). We
// mock global.fetch with the exact response shape Gemini's API returns, so
// these tests verify our request-building and response-parsing logic
// without depending on a live key or network call.
const originalFetch = global.fetch;

test('assistant: rejects requests with no GEMINI_API_KEY configured', async () => {
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'Why Lambda over EC2?' }] });

  assert.equal(res.status, 503);
  process.env.GEMINI_API_KEY = savedKey;
});

test('assistant: returns the parsed reply on a successful Gemini response', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.ok(body.system_instruction.parts[0].text.includes('AWS Lambda'), 'system prompt should include catalog grounding');
    assert.equal(body.contents[0].role, 'user');
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Lambda scales to zero; EC2 does not.' }] }, finishReason: 'STOP' }],
      }),
    };
  };

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'Why Lambda over EC2?' }] });

  assert.equal(res.status, 200);
  assert.equal(res.body.reply, 'Lambda scales to zero; EC2 does not.');
  global.fetch = originalFetch;
});

test('assistant: translates assistant role to Gemini\'s "model" role', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.equal(body.contents[0].role, 'user');
    assert.equal(body.contents[1].role, 'model');
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] }) };
  };

  const res = await request(app).post('/api/assistant/chat').send({
    messages: [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello, how can I help?' },
    ],
  });
  assert.equal(res.status, 200);
  global.fetch = originalFetch;
});

test('assistant: handles a safety-blocked response gracefully instead of erroring', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ finishReason: 'SAFETY' }] }),
  });

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'anything' }] });

  assert.equal(res.status, 200);
  assert.ok(res.body.reply.length > 0);
  global.fetch = originalFetch;
});

test('assistant: propagates a clean 502 when Gemini itself errors', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'internal error' });

  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'anything' }] });

  assert.equal(res.status, 502);
  global.fetch = originalFetch;
});

test('assistant: rejects an empty messages array', async () => {
  const res = await request(app).post('/api/assistant/chat').send({ messages: [] });
  assert.equal(res.status, 400);
});

test('assistant: rejects a message over the length limit', async () => {
  const res = await request(app)
    .post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'x'.repeat(2001) }] });
  assert.equal(res.status, 400);
});

// --- Free-text description intake ---
// Same mocking approach as the assistant tests above: no real Gemini call,
// verifies our request-building, JSON-parsing, and validation/fallback
// logic against the exact response shapes Gemini can plausibly return.

test('describe: extracts valid parameters and produces a real recommendation', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.ok(body.generationConfig.responseMimeType === 'application/json', 'should request JSON mode');
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ workload: 'web-api', ops: 'serverless', traffic: 'spiky', db: 'nosql', scale: 'startup' }) }] },
          finishReason: 'STOP',
        }],
      }),
    };
  };

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'I want to build a food delivery app with 50k users, image uploads, and low cost.' });

  assert.equal(res.status, 200);
  assert.equal(res.body.extracted.workload, 'web-api');
  assert.equal(res.body.extracted.traffic, 'spiky');
  assert.ok(res.body.diagram.nodes.some((n) => n.tag === 'cache'), 'should produce the same branching result as the equivalent quiz answers');
  assert.equal(res.body.description, 'I want to build a food delivery app with 50k users, image uploads, and low cost.');
  global.fetch = originalFetch;
});

test('describe: strips markdown code fences before parsing, since Gemini sometimes adds them anyway', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: { parts: [{ text: '```json\n' + JSON.stringify({ workload: 'analytics', ops: 'managed', traffic: 'steady', db: 'none', scale: 'growing' }) + '\n```' }] },
        finishReason: 'STOP',
      }],
    }),
  });

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'A data pipeline that processes daily sales exports into dashboards.' });

  assert.equal(res.status, 200);
  assert.equal(res.body.extracted.workload, 'analytics');
  global.fetch = originalFetch;
});

test('describe: falls back to safe defaults for any field outside the allowed enum', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: { parts: [{ text: JSON.stringify({ workload: 'quantum-computing', ops: 'serverless', traffic: 'spiky', db: 'nosql', scale: 'startup' }) }] },
        finishReason: 'STOP',
      }],
    }),
  });

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'Something the model might describe unpredictably.' });

  assert.equal(res.status, 200);
  assert.equal(res.body.extracted.workload, 'web-api', 'invalid enum value should fall back to the safe default, not crash or pass through');
  global.fetch = originalFetch;
});

test('describe: returns a clean error when the model response isn\'t valid JSON', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Sure! Here is my analysis of your project idea...' }] }, finishReason: 'STOP' }],
    }),
  });

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'Something that makes the model chatty instead of returning JSON.' });

  assert.equal(res.status, 502);
  global.fetch = originalFetch;
});

test('describe: returns a clean error on a safety-blocked response instead of crashing', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ finishReason: 'SAFETY' }] }),
  });

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'Any description, blocked for this test regardless of content.' });

  assert.equal(res.status, 502);
  global.fetch = originalFetch;
});

test('describe: rejects a description that is too short', async () => {
  const res = await request(app).post('/api/recommend/from-description').send({ description: 'too short' });
  assert.equal(res.status, 400);
});

test('describe: rejects a description over the length limit', async () => {
  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'x'.repeat(1001) });
  assert.equal(res.status, 400);
});

test('describe: rejects requests with no GEMINI_API_KEY configured', async () => {
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const res = await request(app)
    .post('/api/recommend/from-description')
    .send({ description: 'A perfectly reasonable description of a real project idea here.' });

  assert.equal(res.status, 503);
  process.env.GEMINI_API_KEY = savedKey;
});

