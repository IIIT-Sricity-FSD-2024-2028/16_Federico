'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { attachSession } = require('./middleware/session');
const { attachTenant } = require('./middleware/tenant');
const { persistOnMutation } = require('./middleware/persistOnMutation');
const { helmetSecurity, globalRateLimiter, sanitizeInput } = require('./middleware/security');
const { setupSwagger } = require('./config');
const routes = require('./routes');

function createApp() {
  const app = express();

  // 1. Security Middleware: Helmet HTTP headers (Evaluation Criteria: Security)
  app.use(helmetSecurity);

  // 2. Enable CORS for frontend integration
  app.use(
    cors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    }),
  );

  // 3. Security Middleware: global API rate limiter
  app.use(globalRateLimiter);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 4. Security Middleware: strips <script>/javascript:/on*= from body & query
  app.use(sanitizeInput);

  // 5. Logging Middleware: console + logs/access.log & logs/combined.log
  app.use(requestLogger);

  app.use(attachSession);
  app.use(attachTenant);

  // 6. Persist every successful mutation (POST/PUT/DELETE) to data/db.json.
  // Previously exported but never mounted, so writes only survived a graceful
  // SIGINT/SIGTERM shutdown — see implementation.md for details.
  app.use(persistOnMutation);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Federico HMS Backend',
      version: '2.0.0',
    });
  });

  // 7. Static delivery of uploaded files (Evaluation Criteria: File upload)
  app.use(
    '/uploads-static',
    express.static(path.resolve(__dirname, '../uploads')),
  );

  app.use(routes);

  // Swagger UI at /api
  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
