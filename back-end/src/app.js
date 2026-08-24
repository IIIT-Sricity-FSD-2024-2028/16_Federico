'use strict';

const express = require('express');
const cors = require('cors');

const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { attachSession } = require('./middleware/session');
const { attachTenant } = require('./middleware/tenant');
const { setupSwagger } = require('./config/swagger');
const routes = require('./routes');

function createApp() {
  const app = express();

  // Enable CORS for frontend integration
  app.use(
    cors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use(requestLogger);
  app.use(attachSession);
  app.use(attachTenant);

  // Health check endpoint
  app.get(['/', '/health'], (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Federico HMS Backend',
      version: '2.0.0',
    });
  });

  app.use(routes);

  // Swagger UI at /api
  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
