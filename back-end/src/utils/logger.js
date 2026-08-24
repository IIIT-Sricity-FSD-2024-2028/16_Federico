'use strict';

/**
 * Contextual console logger.
 * @param {string} context - The subsystem or feature name (e.g. '🏥 Admissions')
 */
function createLogger(context) {
  return {
    log: (message) => console.log(`[${context}] ${message}`),
    warn: (message) => console.warn(`[${context}] ⚠️ ${message}`),
    error: (message, err) => console.error(`[${context}] ❌ ${message}`, err || ''),
  };
}

module.exports = { createLogger };
