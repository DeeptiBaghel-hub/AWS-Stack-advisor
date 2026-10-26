const mongoose = require('mongoose');
const dns = require('node:dns');
const logger = require('../utils/logger');

// On Windows, Node.js SRV queries often fail with querySrv ECONNREFUSED on ISP/local router DNS.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if not permitted
}

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

module.exports = connectDB;
