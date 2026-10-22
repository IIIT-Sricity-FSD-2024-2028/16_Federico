'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sessions = new Map();
const SESSIONS_FILE = path.resolve(__dirname, '../../data/.sessions.json');

function saveSessions() {
  try {
    const list = Array.from(sessions.entries());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list), 'utf8');
  } catch {
    // Fail silently in read-only or restricted environments
  }
}

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const [k, v] of data) {
          if (k && v) sessions.set(k, v);
        }
      }
    }
  } catch {
    // Fall back to clean empty state on malformed cache
  }
}

loadSessions();

function createSession({
  userId,
  role,
  patientId,
  organizationId,
  hospitalId,
  isPlatformUser,
}) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    token,
    userId,
    role,
    patientId: patientId || null,
    organizationId: organizationId || null,
    hospitalId: hospitalId || null,
    isPlatformUser: Boolean(isPlatformUser),
    createdAt: new Date().toISOString(),
  });
  saveSessions();
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function destroySession(token) {
  const res = sessions.delete(token);
  saveSessions();
  return res;
}

/**
 * Ends every live session for a user. Sessions snapshot the role at login,
 * so an Admin changing a staff member's role (or disabling them) must revoke
 * the old sessions for the change to take effect immediately.
 */
function destroySessionsForUser(userId) {
  let removed = 0;
  sessions.forEach((session, token) => {
    if (session.userId === userId && !session.isPlatformUser) {
      sessions.delete(token);
      removed++;
    }
  });
  if (removed > 0) saveSessions();
  return removed;
}

module.exports = { createSession, getSession, destroySession, destroySessionsForUser };
