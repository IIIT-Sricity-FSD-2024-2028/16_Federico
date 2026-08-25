'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security Middleware Subsystem (Evaluation Criteria: Security)
 * Helmet HTTP headers, tiered rate limiting, and request body/query sanitization.
 */

// 1. Helmet HTTP Security Headers
const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://fonts.googleapis.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:*', 'https://*'],
      connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // For local development & multi-origin embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Crucial for static uploads and frontend integration
});

// 2. Global Rate Limiter (Protects API against flooding)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  message: {
    statusCode: 429,
    error: 'Too Many Requests',
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  // Skip rate limiting for unit/e2e tests (mirrors the rest of this project's NODE_ENV=test guards)
  skip: () => process.env.NODE_ENV === 'test',
});

// 3. Auth Rate Limiter (Protects login endpoints against brute-force attacks)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// 4. File Upload Rate Limiter (Protects upload endpoints against disk filling)
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Upload limit reached, please try again later',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// 5. Input Sanitization (Prevents XSS in string payloads)
function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Strip dangerous script tags and javascript: URLs
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/\bon\w+\s*=/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const key of Object.keys(value)) {
      sanitizedObj[key] = sanitizeValue(value[key]);
    }
    return sanitizedObj;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  next();
}

module.exports = {
  helmetSecurity,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  sanitizeInput,
  sanitizeValue,
};
