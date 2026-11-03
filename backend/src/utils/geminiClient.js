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

  const response = await fetch(`${GEMINI_URL(GEMINI_MODEL)}?key=${process.env.GEMINI_API_KEY}`, {
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
