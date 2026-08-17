'use strict';

const fs = require('fs');
const path = require('path');
const dataStore = require('./dataStore');

const DB_PATH = path.resolve(__dirname, '../../data/db.json');

/**
 * Lightweight durability for the in-memory store: writes the whole store
 * to a local JSON file on mutation, reloads it on boot. Keeps the
 * original "no external database" architecture (still zero DB engine,
 * zero new infra) while surviving a server restart, which matters once
 * the backend is the real source of truth instead of a disposable demo.
 */
function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const saved = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      Object.assign(dataStore, saved);
      console.log(`[Persist] Restored state from ${DB_PATH}`);
    }
  } catch (err) {
    console.warn('[Persist] Could not load saved state, starting from seed data:', err.message);
  }
}

let saveTimer = null;

/** Debounced so a burst of mutations in one workflow coalesces into one write. */
function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(dataStore, null, 2));
    } catch (err) {
      console.warn('[Persist] Could not save state:', err.message);
    }
  }, 250);
}

module.exports = { load, save, DB_PATH };
