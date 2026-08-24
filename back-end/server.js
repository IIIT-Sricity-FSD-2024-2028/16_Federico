'use strict';

const { env } = require('./src/config');
const persist = require('./src/store/persist');
const { createApp } = require('./src/app');

// Restore any previously persisted state before the app starts serving
// requests. Deliberately NOT called from createApp() so tests that import
// createApp() directly always see fresh seed data.
persist.load();

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Application is running on: http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}. Flushing pending state writes to disk...`);
  persist.saveImmediate();
  server.close(() => {
    console.log('[Server] HTTP server closed gracefully.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
