// Error tracking via Sentry — genuinely optional, same pattern as
// GEMINI_API_KEY elsewhere in this project. With no SENTRY_DSN set, this
// is a complete no-op: Sentry.init() with an empty DSN disables the SDK
// rather than erroring, so the app behaves identically to before this
// feature existed. Sentry's free "Developer" tier needs no credit card,
// which matters for a project meant to stay live without an ongoing bill.

const Sentry = require('@sentry/node');

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Traces/profiling cost quota on the free tier faster than error
    // capture does — keep this modest rather than defaulting to 100%.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });

  return true;
}

module.exports = { Sentry, initSentry };
