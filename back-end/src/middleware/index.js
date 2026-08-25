'use strict';

/**
 * @module middleware
 * Central Express Middleware Subsystem
 */

const { attachSession, requireSession, requireActor, extractToken } = require('./session');
const { attachTenant, requireTenant, requireModule } = require('./tenant');
const { authorize, ACTOR_ACCESS, dynamicRoleGrants } = require('./actorAccess');
const { requirePlatformUser } = require('./platformAccess');
const { persistOnMutation } = require('./persistOnMutation');
const { errorHandler } = require('./errorHandler');
const { notFoundHandler } = require('./notFoundHandler');
const { requestLogger } = require('./requestLogger');
const {
  helmetSecurity,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  sanitizeInput,
} = require('./security');

module.exports = {
  // Session & Authentication
  attachSession,
  requireSession,
  requireActor,
  extractToken,

  // Multi-Tenancy & Module Gates
  attachTenant,
  requireTenant,
  requireModule,

  // Authorization & RBAC
  authorize,
  ACTOR_ACCESS,
  dynamicRoleGrants,
  requirePlatformUser,

  // Persistence & Logging
  persistOnMutation,
  requestLogger,

  // Security
  helmetSecurity,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  sanitizeInput,

  // Error Handling
  errorHandler,
  notFoundHandler,
};
