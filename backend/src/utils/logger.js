// Structured logging via pino — outputs JSON in production (so a hosting
// platform's log aggregator, or something like Datadog/Better Stack, can
// parse and index it) and human-readable pretty output in development.
//
// This deliberately writes to stdout only, not to files or a database.
// That's the standard approach for a containerized/PaaS-deployed app
// (Render, Railway, etc. all capture and retain stdout for you) — adding
// file-based log rotation here would be solving a problem the deployment
// platform already solves.

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
  // Never let a stray log call leak secrets, even by accident — these
  // redactions apply regardless of where in the object the key appears.
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      'req.headers.authorization',
      '*.GEMINI_API_KEY',
      '*.JWT_SECRET',
    ],
    censor: '[redacted]',
  },
});

module.exports = logger;
