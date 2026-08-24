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

// Log and Error Management Status Endpoint (must be before wildcard params)
router.get('/system/logs-status', requireSession, controller.getLogStatus);

// Router-level middleware chains for File Upload
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

// Public/authenticated safe file access (wildcard at end)
router.get('/:category/:filename', controller.serveFile);

module.exports = router;
