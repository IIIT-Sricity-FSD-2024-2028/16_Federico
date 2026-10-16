'use strict';

const dataStore = require('../store/dataStore');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createSession, destroySession } = require('../store/sessionStore');
const { parseEmail, PLATFORM_EMAIL_DOMAIN } = require('../utils/emailIdentity');
const { maxId } = require('../utils/maxId');

/**
 * Platform Super User authentication — a wholly separate account namespace
 * from the org `users` table (see `middleware/platformAccess.js` header).
 * Same bcrypt/session mechanics as `auth.service.js`, deliberately not
 * shared code with it: keeping the two login paths textually separate
 * makes it obvious at a glance that a platform session can never resolve
 * to an org actor role or vice versa.
 */
function findByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return (
    dataStore.platformSuperUsers.find(
      (u) => String(u.email || '').toLowerCase() === normalized,
    ) || null
  );
}

function toPublic(user) {
  return {
    platform_user_id: user.platform_user_id,
    name: user.name,
    email: user.email,
  };
}

function login(email, password) {
  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: 'INVALID_CREDENTIALS' };
  }
  const token = createSession({
    userId: user.platform_user_id,
    role: 'PLATFORM',
    isPlatformUser: true,
  });
  return { token, user: toPublic(user) };
}

function me(session) {
  const user =
    dataStore.platformSuperUsers.find(
      (u) => u.platform_user_id === session.userId,
    ) || null;
  return user ? toPublic(user) : null;
}

function logout(token) {
  return destroySession(token);
}

/**
 * Platform logins must be name.platform@federico.com — the unified login page
 * routes that shape (and only that shape) to the platform realm.
 */
function create(payload) {
  const parsed = parseEmail(payload.email);
  if (
    !parsed ||
    parsed.actor !== 'PLATFORM' ||
    parsed.domain !== PLATFORM_EMAIL_DOMAIN
  ) {
    return { error: 'INVALID_PLATFORM_EMAIL' };
  }
  const newUser = {
    platform_user_id:
      maxId(dataStore.platformSuperUsers, 'platform_user_id') + 1 || 1,
    name: payload.name,
    email: payload.email,
    password_hash: hashPassword(payload.password),
    created_at: new Date().toISOString(),
  };
  dataStore.platformSuperUsers.push(newUser);
  return toPublic(newUser);
}

module.exports = { login, me, logout, create, findByEmail };
