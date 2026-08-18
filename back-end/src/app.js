'use strict';

const express = require('express');
const cors = require('cors');

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

  // Enable CORS for frontend integration (Critical for file:// origins) —
  // same options object Nest's app.enableCors() passed straight through to
  // the same underlying `cors` package.
  app.use(
    cors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);
  app.use(attachSession);
  app.use(attachTenant);
  app.use(persistOnMutation);

  app.use(routes);

  // Swagger UI at /api + docs/swagger.json export, mirroring main.ts.
  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
