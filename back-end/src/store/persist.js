'use strict';

const fs = require('fs');
const path = require('path');
const dataStore = require('./dataStore');
const env = require('../config/env');

const DB_PATH = env.DB_PATH || path.resolve(__dirname, '../../data/db.json');
const TMP_PATH = `${DB_PATH}.tmp`;
const DEBOUNCE_MS = env.PERSIST_DEBOUNCE_MS || 250;
const MAX_RENAME_RETRIES = 3;

/**
 * Crash-Safe State Durability:
 * Restores dataStore from local JSON snapshot on startup and saves changes using
 * atomic filesystem operations (write to .tmp -> atomic rename) to prevent database corruption.
 *
 * Edge cases handled:
 * - Missing db.json: Falls back cleanly to seed data in dataStore.js.
 * - Corrupted db.json: Backs up the corrupted file to db.json.corrupt.<timestamp> and falls back to seed data.
 * - File locks on Windows: Retries rename up to 3 times with exponential backoff.
 */
function load() {
  if (!fs.existsSync(DB_PATH)) {
    return;
  }

  try {
    const content = fs.readFileSync(DB_PATH, 'utf8');
    if (content && content.trim()) {
      const saved = JSON.parse(content);
      Object.assign(dataStore, saved);
      console.log(`[Persist] Restored state from ${DB_PATH}`);
    }
  } catch (err) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const corruptPath = `${DB_PATH}.corrupt.${timestamp}`;
    try {
      fs.copyFileSync(DB_PATH, corruptPath);
      console.error(
        `[Persist] Corrupted state snapshot detected at ${DB_PATH}. Backed up to ${corruptPath}. Starting with baseline seed data. Error: ${err.message}`,
      );
    } catch (backupErr) {
      console.error(
        `[Persist] Failed to create backup of corrupted ${DB_PATH}: ${backupErr.message}. Starting with baseline seed data.`,
      );
    }
  }
}

let saveTimer = null;

/**
 * Performs a crash-safe atomic write to disk with retry backoff for Windows file locks.
 */
function writeAtomic() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write full serialized snapshot to temporary file first
  fs.writeFileSync(TMP_PATH, JSON.stringify(dataStore, null, 2), 'utf8');

  // Attempt atomic rename with retry on transient file locks (Windows EBUSY/EPERM)
  let attempts = 0;
  while (attempts < MAX_RENAME_RETRIES) {
    try {
      fs.renameSync(TMP_PATH, DB_PATH);
      return;
    } catch (err) {
      attempts++;
      if (attempts >= MAX_RENAME_RETRIES) {
        console.warn(
          `[Persist] Atomic rename failed after ${MAX_RENAME_RETRIES} attempts: ${err.message}`,
        );
        // Attempt temporary file cleanup
        try {
          if (fs.existsSync(TMP_PATH)) fs.unlinkSync(TMP_PATH);
        } catch (unlinkErr) {
          console.warn(`[Persist] Could not unlink temp file: ${unlinkErr.message}`);
        }
        return;
      }
      // Small sync backoff for file locks
      const delayUntil = Date.now() + attempts * 25;
      while (Date.now() < delayUntil) {
        // Busy-wait briefly for filesystem release
      }
    }
  }
}

/**
 * Debounced save to coalesce high-frequency mutations into a single disk write.
 * In test environment (NODE_ENV === 'test'), disk writes are skipped to ensure test isolation.
 */
function save() {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_PERSIST_IN_TEST) {
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeAtomic();
  }, DEBOUNCE_MS);
}

/**
 * Immediate write without debounce (flushes pending changes synchronously).
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
  flush: saveImmediate,
  DB_PATH,
};
