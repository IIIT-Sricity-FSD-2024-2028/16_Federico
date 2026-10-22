'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sessions = new Map();
const SESSIONS_FILE = path.resolve(
  process.env.SESSION_STORE_PATH || path.resolve(__dirname, '../../data/.sessions.json'),
);
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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
          if (k && v && !isExpired(v)) sessions.set(k, v);
        }
        saveSessions();
      }
    }
  } catch {
    // Fall back to clean empty state on malformed cache
  }
}

loadSessions();

function isExpired(session, now = Date.now()) {
  const expiresAt = session && session.expiresAt
    ? new Date(session.expiresAt).getTime()
    : session && session.createdAt
      ? new Date(session.createdAt).getTime() + SESSION_TTL_MS
      : NaN;
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

function createSession({
  userId,
  role,
  patientId,
  organizationId,
  hospitalId,
  isPlatformUser,
}) {
  const token = crypto.randomBytes(24).toString('hex');
  const createdAt = new Date().toISOString();
  sessions.set(token, {
    token,
    userId,
    role,
    patientId: patientId || null,
    organizationId: organizationId || null,
    hospitalId: hospitalId || null,
    isPlatformUser: Boolean(isPlatformUser),
    createdAt,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  saveSessions();
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(token);
    saveSessions();
    return null;
  }
  return session;
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

module.exports = { createSession, getSession, destroySession, destroySessionsForUser, SESSION_TTL_MS };
