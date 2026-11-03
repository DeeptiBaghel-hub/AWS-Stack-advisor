const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;

  // req.log is pino-http's per-request child logger — it automatically
  // carries the same request id as the access log line, so a single
  // requestId ties "here's the request" and "here's what broke" together
  // in whatever log viewer this ends up in.
  const log = req.log || logger;
  log.error({ err, status }, err.publicMessage || err.message);

  res.status(status).json({
    message: err.publicMessage || 'Something went wrong on our end.',
    requestId: req.id,
  });
}

module.exports = { notFound, errorHandler };
