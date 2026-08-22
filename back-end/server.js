'use strict';

const persist = require('./src/store/persist');
const { createApp } = require('./src/app');

// Restore any previously persisted state before the app starts serving
// requests. Deliberately NOT called from createApp() so tests that import
// createApp() directly always see fresh seed data.
persist.load();

const app = createApp();

// Bind to 0.0.0.0 to ensure accessibility across IPv4/IPv6, same as the
// original NestJS `app.listen(3000, '0.0.0.0')`. Hardcoded port/host is
// intentional — the original app used no environment variables at all.
const PORT = 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Application is running on: http://localhost:${PORT}`);
});
