// Error tracking for the client, mirroring the server's approach: genuinely
// optional, a complete no-op if no DSN is configured. Uses @sentry/browser
// rather than the full @sentry/react package — this app writes its own
// ErrorBoundary (see components/ErrorBoundary.jsx) rather than using
// Sentry's React-specific wrapper, which keeps the bundle leaner.

import * as Sentry from '@sentry/browser';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Traces cost quota on the free tier faster than error capture does —
    // keep this modest rather than defaulting to 100%.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });

  return true;
}

export { Sentry };
