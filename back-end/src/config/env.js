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

const parsedMaxAdvance = parseInt(process.env.MAX_ADVANCE_BOOKING_DAYS || '14', 10);
const maxAdvanceBookingDays = Number.isInteger(parsedMaxAdvance) && parsedMaxAdvance > 0 ? parsedMaxAdvance : 14;

const parsedMinAdvance = parseInt(process.env.MIN_ADVANCE_BOOKING_DAYS || '0', 10);
const minAdvanceBookingDays = Number.isInteger(parsedMinAdvance) && parsedMinAdvance >= 0 ? parsedMinAdvance : 0;

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
  MAX_ADVANCE_BOOKING_DAYS: maxAdvanceBookingDays,
  MIN_ADVANCE_BOOKING_DAYS: minAdvanceBookingDays,
};

if (
  env.IS_PRODUCTION &&
  (!process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET === 'federico_dev_placeholder_secret_key')
) {
  throw new Error(
    '[FATAL SECURITY ERROR] Running in production with missing or default SESSION_SECRET! A secure SESSION_SECRET must be configured in .env',
  );
}

module.exports = env;
