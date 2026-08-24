'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

// Middleware Imports (Evaluation Criteria: Logging, Error handling, File upload, Security, Router-level)
const {
  helmetSecurity,
  globalRateLimiter,
  sanitizeInput,
} = require('./middleware/security');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { attachSession } = require('./middleware/session');
const { attachTenant } = require('./middleware/tenant');
const { persistOnMutation } = require('./middleware/persistOnMutation');
const { setupSwagger } = require('./config/swagger');
const routes = require('./routes');

function createApp() {
  const app = express();

  // 1. Security Middleware: Helmet HTTP headers
  app.use(helmetSecurity);

  // 2. CORS Configuration
  app.use(
    cors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    }),
  );

  // 3. Security Middleware: Global API Rate Limiter
  app.use(globalRateLimiter);

  // 4. Body Parsers & Input Sanitization
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(sanitizeInput);

  // 5. Logging Middleware: Logs requests to console and logs/access.log + logs/combined.log
  app.use(requestLogger);

  // 6. Application Context & Multi-Tenancy Middleware
  app.use(attachSession);
  app.use(attachTenant);
  app.use(persistOnMutation);

  // 7. Static Uploads Delivery
  const uploadsDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads-static', express.static(uploadsDir));

  // 8. Application Routes (Router-level middleware chains mounted within)
  app.use(routes);

  // 9. Swagger Documentation
  setupSwagger(app);

  // 10. 404 & Error Handling Middleware (Catches errors & logs to logs/error.log)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
