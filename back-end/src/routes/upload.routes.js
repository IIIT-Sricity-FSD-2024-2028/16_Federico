'use strict';

const { Router } = require('express');
const controller = require('../controllers/upload.controller');
const { requireSession } = require('../middleware/session');
const { uploadRateLimiter } = require('../middleware/security');
const {
  uploadDocument,
  uploadBranding,
  uploadInventory,
} = require('../middleware/fileUpload');

const router = Router();

// Log and Error Management status endpoint — surfaces logs/*.log file state
// (must be registered before the wildcard :category/:filename route below).
router.get('/system/logs-status', requireSession, controller.getLogStatus);

// Router-level middleware chains for File Upload: rate limiter -> auth -> multer -> controller.
router.post(
  '/document',
  uploadRateLimiter,
  requireSession,
  uploadDocument,
  controller.handleDocumentUpload,
);

router.post(
  '/branding',
  uploadRateLimiter,
  requireSession,
  uploadBranding,
  controller.handleBrandingUpload,
);

router.post(
  '/inventory',
  uploadRateLimiter,
  requireSession,
  uploadInventory,
  controller.handleInventoryUpload,
);

// Authenticated file retrieval (wildcard route stays last).
router.get('/:category/:filename', requireSession, controller.serveFile);

module.exports = router;
