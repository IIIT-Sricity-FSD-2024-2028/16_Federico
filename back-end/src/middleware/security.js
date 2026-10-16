'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
      // FIX: Vite's dev-server HMR creates Web Workers from blob: URLs.
      // Without an explicit worker-src, the browser falls back to script-src
      // which doesn't include blob: — so every HMR worker is blocked, the
      // Vite WebSocket reconnects in a loop, and the browser console fills
      // with "server connection lost / Creating a worker from blob: violates CSP".
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false, // For local development & multi-origin embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Crucial for static uploads and frontend integration
});

// 2. Global Rate Limiter (Protects API against flooding)
//
// FIX: The previous limit of 1000 req / 15 min was too low for local
// development. A single developer session involves:
//   - React StrictMode double-fetching on every page mount
//   - HOM dashboard polling every 15 s (7 parallel API calls each tick)
//   - Patient portal parallel fetch bundle (~6 calls on every open)
//   - Multiple open browser tabs
//
// With these patterns, 1000 requests is exhausted in roughly 3-5 minutes of
// normal use, causing every subsequent call to return 429 and the entire app
// to appear broken. The limit is raised to 10 000 for the current dev setup.
// Auth and upload sub-limiters below remain stricter (brute-force protection).
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10 000 requests per 15-min window per IP
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  message: {
    statusCode: 429,
    error: 'Too Many Requests',
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  // Skip rate limiting for unit tests
  skip: () => process.env.NODE_ENV === 'test',
});

// 3. Auth Rate Limiter (Protects login endpoints against brute-force attacks)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Raised from 50 → 200: dev sessions log in/out frequently across roles
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
  max: 200, // Raised from 60 → 200 to allow normal document upload workflows
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
