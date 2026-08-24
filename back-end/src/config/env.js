/**
 * env.js
 * Centralized, validated environment configuration following 12-Factor App principles.
 */
require('dotenv').config();
const path = require('path');

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DB_PATH: path.resolve(process.cwd(), process.env.DB_PATH || 'data/db.json'),
  PERSIST_DEBOUNCE_MS: parseInt(process.env.PERSIST_DEBOUNCE_MS || '250', 10),
  SESSION_SECRET: process.env.SESSION_SECRET || 'federico_dev_secret_key',
};

module.exports = env;
