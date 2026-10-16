'use strict';

const crypto = require('crypto');

/**
 * In-memory session token store (Phase 2 real auth). Consistent with the
 * rest of this app's architecture — no database — sessions simply don't
 * survive a server restart, same as every other in-memory resource here.
 */
const sessions = new Map();

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
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function destroySession(token) {
  return sessions.delete(token);
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
  return removed;
}

module.exports = { createSession, getSession, destroySession, destroySessionsForUser };
