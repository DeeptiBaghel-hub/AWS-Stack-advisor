// Express app definition, separated from server startup (index.js) so it
// can be imported directly in tests with supertest — no need to bind a
// real port or connect to a real database just to test routing/middleware.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const logger = require('./utils/logger');
const { Sentry, initSentry } = require('./utils/sentry');
const authRoutes = require('./routes/authRoutes');
const recommendRoutes = require('./routes/recommendRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Must happen before the app is built so Sentry can instrument everything
// that follows. A no-op if SENTRY_DSN isn't set — see utils/sentry.js.
const sentryEnabled = initSentry();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Every request gets a correlation id, logged on the way in and included
// in any error response — so "it broke for me" from a user can actually
// be traced back to one line in the logs, not guessed at.
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // Health checks would otherwise dominate the logs with zero signal —
    // a load balancer or uptime monitor can hit this every few seconds.
    autoLogging: { ignore: (req) => req.url === '/api/health' },
  })
);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// authLimiter is applied per-route inside authRoutes.js — only to
// register/login, which are the actual brute-force targets. Routes like
// /me and /profile already require a valid JWT, so they don't need the
// same protection, and someone legitimately editing their profile a few
// times shouldn't hit a "too many attempts" wall meant for blocking
// credential stuffing.
app.use('/api/auth', authRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFound);

// Reports unhandled errors to Sentry (if configured) before our own error
// handler turns them into a client-safe JSON response. Must come after all
// routes and before errorHandler for both to see the same errors.
if (sentryEnabled) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

module.exports = app;
