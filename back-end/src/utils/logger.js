'use strict';

/** Minimal stand-in for Nest's contextual `new Logger(context)`. */
function createLogger(context) {
  return {
    log: (message) => console.log(`[${context}] ${message}`),
  };
}

module.exports = { createLogger };
