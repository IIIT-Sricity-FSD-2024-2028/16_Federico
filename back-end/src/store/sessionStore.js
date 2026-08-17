'use strict';

const crypto = require('crypto');

/**
 * In-memory session token store (Phase 2 real auth). Consistent with the
 * rest of this app's architecture — no database — sessions simply don't
 * survive a server restart, same as every other in-memory resource here.
 */
const sessions = new Map();

function createSession({ userId, role, patientId }) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { token, userId, role, patientId: patientId || null, createdAt: new Date().toISOString() });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function destroySession(token) {
  return sessions.delete(token);
}

module.exports = { createSession, getSession, destroySession };
