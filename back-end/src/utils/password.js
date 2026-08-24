'use strict';

const bcrypt = require('bcryptjs');

/**
 * Synchronous password hashing.
 * @param {string} plain - Plain text password
 * @returns {string} - Bcrypt hash
 */
function hashPassword(plain) {
  if (!plain) throw new Error('Password must not be empty');
  return bcrypt.hashSync(plain, 10);
}

/**
 * Asynchronous password hashing.
 * @param {string} plain - Plain text password
 * @returns {Promise<string>} - Bcrypt hash
 */
async function hashPasswordAsync(plain) {
  if (!plain) throw new Error('Password must not be empty');
  return bcrypt.hash(plain, 10);
}

/**
 * Synchronous password verification.
 * @param {string} plain - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {boolean}
 */
function verifyPassword(plain, hash) {
  if (!plain || !hash || typeof hash !== 'string') return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Asynchronous password verification.
 * @param {string} plain - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>}
 */
async function verifyPasswordAsync(plain, hash) {
  if (!plain || !hash || typeof hash !== 'string') return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  hashPasswordAsync,
  hashPasswordSync: hashPassword,
  verifyPassword,
  verifyPasswordAsync,
  verifyPasswordSync: verifyPassword,
};
