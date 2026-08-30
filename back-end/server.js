'use strict';

require('dotenv').config();
const { createApp } = require('./src/app');
const { runBootReconciliation } = require('./src/bootstrap');

const parsedPort = parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Reconcile permission catalog + per-org module flags against the current
// module catalog (see src/bootstrap.js).
runBootReconciliation();

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`Application is running on: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('[Server] HTTP server closed gracefully.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
