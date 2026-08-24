'use strict';

const { organizationRepository } = require('../repositories');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createSession, destroySession } = require('../store/sessionStore');

function findByEmail(email) {
  return organizationRepository.findSuperUserByEmail(email);
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
  const user = organizationRepository.findSuperUserById(session.userId);
  return user ? toPublic(user) : null;
}

function logout(token) {
  return destroySession(token);
}

function create(payload) {
  const newUser = organizationRepository.createSuperUser({
    name: payload.name,
    email: payload.email,
    password_hash: hashPassword(payload.password),
  });
  return toPublic(newUser);
}

module.exports = { login, me, logout, create, findByEmail };
