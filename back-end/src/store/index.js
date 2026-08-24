'use strict';

/**
 * @module store
 * Central Data & Session Storage Subsystem
 *
 * This module provides the 3 core state components of the backend:
 *
 * 1. `dataStore` (dataStore.js):
 *    The in-memory singleton object holding all active collections (patients, doctors,
 *    wards, admissions, ledgers, etc.) initialized from pre-seeded baseline mock data.
 *
 * 2. `persist` (persist.js):
 *    Crash-safe disk persistence engine that debounces writes to `data/db.json` and restores
 *    saved state on server boot. Includes corrupted file backup and Windows lock backoff.
 *
 * 3. `sessionStore` (sessionStore.js):
 *    In-memory Map cache for authenticated session tokens (login / logout / auth middleware).
 */

const dataStore = require('./dataStore');
const persist = require('./persist');
const sessionStore = require('./sessionStore');

module.exports = {
  dataStore,
  persist,
  sessionStore,
};
