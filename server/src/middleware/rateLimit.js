const rateLimit = require('express-rate-limit');

// Production limits are deliberately tight (see comments below on each).
// In the test environment, the test *suite itself* legitimately makes more
// requests against a given route than any real visitor would in 15 minutes
// — that's test volume, not something to weaken production behavior for.
// Effectively disabling rate limiting under NODE_ENV=test keeps the real
// limits honest while not making the test suite fight its own middleware.
const isTest = process.env.NODE_ENV === 'test';

// Applies to /api/auth/* — login and register are the endpoints most worth
// protecting from brute-force / credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 100000 : 20, // 20 attempts per window per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in a few minutes.' },
});

// Applies to /api/assistant/* — each request costs real LLM API quota
// (shared across every visitor, since there's one API key for the whole
// app), so this is deliberately tighter than the auth limiter.
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 100000 : 15, // 15 messages per window per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You\'ve hit the message limit for now. Try again in a few minutes.' },
});

module.exports = { authLimiter, assistantLimiter };
