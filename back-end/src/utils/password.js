'use strict';

const bcrypt = require('bcryptjs');

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
