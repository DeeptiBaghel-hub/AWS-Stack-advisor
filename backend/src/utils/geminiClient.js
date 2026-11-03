// Shared low-level Gemini API client. Both the chat assistant and the
// free-text project-description intake hit the same endpoint with the
// same error-handling shape — factored out once so both get identical,
// tested behavior instead of two copies drifting apart.

const logger = require('./logger');

// Model names on Gemini's API churn faster than most — gemini-2.5-flash
// (this project's original default) is being fully shut down in October
// 2026. Rather than re-hardcode a name that will just go stale again,
// GEMINI_MODEL is meant to be set directly in .env — check
// https://aistudio.google.com/ for whatever's currently listed as
// available for your key before assuming any name baked into this file
// is still correct by the time you're reading it.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;

function retryDelay(attempt, retryAfterHeader) {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 5000);
  }
  return BASE_RETRY_DELAY_MS * (2 ** (attempt - 1)) + Math.floor(Math.random() * 251);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini can briefly return 429/5xx responses during quota or capacity spikes.
// Retry only transient failures with bounded exponential backoff and jitter.
async function fetchWithRetry(url, options) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      const delayMs = retryDelay(attempt);
      logger.warn({ attempt, delayMs }, 'Gemini request failed transiently; retrying');
      await wait(delayMs);
      continue;
    }

    if (response.ok || !TRANSIENT_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
      return response;
    }

    const delayMs = retryDelay(attempt, response.headers?.get('retry-after'));
    if (response.body) await response.body.cancel().catch(() => {});
    logger.warn({ attempt, status: response.status, delayMs, model: GEMINI_MODEL }, 'Gemini returned a transient error; retrying');
    await wait(delayMs);
  }
}

// Returns the raw candidate object from Gemini's response (or throws a
// request-scoped error with .status/.publicMessage already set, ready to
// be forwarded to Express's error handler by the caller's asyncHandler,
// which also reports it to Sentry automatically — no need to do that here).
async function generateContent({ systemPrompt, contents, generationConfig }) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    err.status = 503;
    err.publicMessage = 'This AI feature isn\'t configured yet — GEMINI_API_KEY is missing on the server.';
    throw err;
  }

  const response = await fetchWithRetry(`${GEMINI_URL(GEMINI_MODEL)}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    logger.error({ status: response.status, body: errBody }, 'Gemini API returned a non-OK response');
    const err = new Error(`Gemini API returned ${response.status}`);
    err.status = 502;
    err.publicMessage = 'That AI feature is temporarily unavailable. Try again in a moment.';
    throw err;
  }

  const data = await response.json();
  return data.candidates?.[0] || null;
}

module.exports = { generateContent, GEMINI_MODEL };
