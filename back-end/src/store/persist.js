'use strict';

const fs = require('fs');
const path = require('path');
const dataStore = require('./dataStore');
const env = require('../config/env');

const DB_PATH = env.DB_PATH || path.resolve(__dirname, '../../data/db.json');
const TMP_PATH = `${DB_PATH}.tmp`;
const DEBOUNCE_MS = env.PERSIST_DEBOUNCE_MS || 250;

/**
 * Crash-Safe State Durability:
 * Restores dataStore from local JSON snapshot on startup and saves changes using
 * atomic filesystem operations (write to .tmp -> atomic rename) to prevent database corruption.
 */
function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      if (content && content.trim()) {
        const saved = JSON.parse(content);
        Object.assign(dataStore, saved);
        console.log(`[Persist] Restored state from ${DB_PATH}`);
      }
    }
  } catch (err) {
    console.warn(
      '[Persist] Could not load saved state, starting from seed data:',
      err.message,
    );
  }
}

let saveTimer = null;

/**
 * Performs a crash-safe atomic write to disk.
 */
function writeAtomic() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Write full serialized snapshot to temporary file first
    fs.writeFileSync(TMP_PATH, JSON.stringify(dataStore, null, 2), 'utf8');
    
    // Atomic rename replaces target file instantaneously
    fs.renameSync(TMP_PATH, DB_PATH);
  } catch (err) {
    console.warn('[Persist] Could not save state atomically:', err.message);
    // Cleanup temporary file if it remains
    try {
      if (fs.existsSync(TMP_PATH)) fs.unlinkSync(TMP_PATH);
    } catch (_) {}
  }
}

/**
 * Debounced save to coalesce high-frequency mutations into a single disk write.
 */
function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeAtomic();
  }, DEBOUNCE_MS);
}

/**
 * Immediate write without debounce (useful for tests or graceful process shutdown).
 */
function saveImmediate() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  writeAtomic();
}

module.exports = {
  load,
  save,
  saveImmediate,
  DB_PATH,
};
