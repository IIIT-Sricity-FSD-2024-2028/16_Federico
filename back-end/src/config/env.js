'use strict';

/**
 * env.js
 * Centralized, validated environment configuration following 12-Factor App principles.
 */
require('dotenv').config();
const path = require('path');

const parsedPort = parseInt(process.env.PORT || '3000', 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;

const parsedDebounce = parseInt(process.env.PERSIST_DEBOUNCE_MS || '250', 10);
const debounceMs = Number.isInteger(parsedDebounce) && parsedDebounce >= 0 ? parsedDebounce : 250;

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  PORT: port,
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DB_PATH: path.resolve(process.cwd(), process.env.DB_PATH || 'data/db.json'),
  PERSIST_DEBOUNCE_MS: debounceMs,
  SESSION_SECRET: process.env.SESSION_SECRET || 'federico_dev_placeholder_secret_key',
};

module.exports = env;
