'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const dataStore = require('./dataStore');
const env = require('../config/env');

const DB_PATH = env.DB_PATH || path.resolve(__dirname, '../../data/db.json');
const TMP_PATH = `${DB_PATH}.tmp`;
const DEBOUNCE_MS = env.PERSIST_DEBOUNCE_MS || 250;
const MAX_RENAME_RETRIES = 5;

let isDirty = false;
let saveTimer = null;
let isWriting = false;
let pendingWrite = false;

function markDirty() {
  isDirty = true;
}

function isStateDirty() {
  return isDirty;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Crash-Safe State Durability:
 * Restores dataStore from local JSON snapshot on startup and saves changes using
 * atomic filesystem operations (write to .tmp -> atomic rename) to prevent database corruption.
 *
 * Edge cases handled:
 * - Missing db.json: Falls back cleanly to seed data in dataStore.js.
 * - Corrupted db.json: Backs up the corrupted file to db.json.corrupt.<timestamp> and falls back to seed data.
 * - File locks on Windows: Retries rename up to 5 times with non-blocking exponential backoff and jitter.
 * - Dirty State: Bypasses disk I/O when no entities have mutated.
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
      isDirty = false;
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

/**
 * Asynchronous atomic write with non-blocking retry backoff and mutex queue.
 * Prevents Node.js event-loop starvation during Windows file locks (EBUSY/EPERM).
 */
async function writeAtomicAsync() {
  if (!isDirty && !pendingWrite) {
    return;
  }

  if (isWriting) {
    pendingWrite = true;
    return;
  }

  isWriting = true;
  pendingWrite = false;

  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      await fsp.mkdir(dir, { recursive: true });
    }

    const payload = JSON.stringify(dataStore, null, 2);
    await fsp.writeFile(TMP_PATH, payload, 'utf8');

    let attempts = 0;
    while (attempts < MAX_RENAME_RETRIES) {
      try {
        await fsp.rename(TMP_PATH, DB_PATH);
        isDirty = false;
        return;
      } catch (err) {
        attempts++;
        if (attempts >= MAX_RENAME_RETRIES) {
          console.error(
            `[Persist] Atomic rename failed after ${MAX_RENAME_RETRIES} attempts: ${err.message}. Preserving temp snapshot for retry.`,
          );
          // Preserve failed snapshot with timestamp for recovery rather than unlinking
          const failPath = `${TMP_PATH}.failed.${Date.now()}`;
          try {
            await fsp.rename(TMP_PATH, failPath);
          } catch (_) {}
          // Retain dirty state so subsequent cycles retry
          isDirty = true;
          return;
        }
        // Non-blocking backoff with randomized jitter to release event loop
        const jitter = Math.floor(Math.random() * 15);
        await sleep(attempts * 25 + jitter);
      }
    }
  } catch (writeErr) {
    console.error(`[Persist] Async persistence error: ${writeErr.message}`);
    isDirty = true;
  } finally {
    isWriting = false;
    if (pendingWrite && isDirty) {
      setImmediate(() => {
        writeAtomicAsync().catch((e) => console.error('[Persist] Queued write error:', e.message));
      });
    }
  }
}

/**
 * Synchronous atomic write fallback for immediate process exit / test teardown.
 */
function writeAtomicSync() {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_PERSIST_IN_TEST) {
    isDirty = false;
    return;
  }
  if (!isDirty) {
    return;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(TMP_PATH, JSON.stringify(dataStore, null, 2), 'utf8');

  let attempts = 0;
  while (attempts < MAX_RENAME_RETRIES) {
    try {
      fs.renameSync(TMP_PATH, DB_PATH);
      isDirty = false;
      return;
    } catch (err) {
      attempts++;
      if (attempts >= MAX_RENAME_RETRIES) {
        console.warn(
          `[Persist] Synchronous atomic rename failed after ${MAX_RENAME_RETRIES} attempts: ${err.message}`,
        );
        return;
      }
      // Small sync micro-pause only during synchronous teardown
      const delayUntil = Date.now() + attempts * 10;
      while (Date.now() < delayUntil) {}
    }
  }
}

/**
 * Debounced save to coalesce high-frequency mutations into a single disk write.
 * In test environment (NODE_ENV === 'test'), disk writes are skipped unless explicitly enabled.
 */
function save() {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_PERSIST_IN_TEST) {
    return;
  }
  if (!isDirty) {
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeAtomicAsync().catch((err) => {
      console.error('[Persist] Failed debounced save:', err.message);
    });
  }, DEBOUNCE_MS);
}

/**
 * Immediate write without debounce (flushes pending changes).
 */
function saveImmediate() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_PERSIST_IN_TEST) {
    isDirty = false;
    return;
  }
  writeAtomicSync();
}

module.exports = {
  load,
  save,
  saveImmediate,
  flush: saveImmediate,
  markDirty,
  isStateDirty,
  writeAtomicAsync,
  writeAtomicSync,
  DB_PATH,
  TMP_PATH,
};
