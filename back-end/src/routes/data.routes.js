'use strict';

const { Router } = require('express');
const controller = require('../controllers/data.controller');
const { requireSession } = require('../middleware/session');
const { requirePlatformUser } = require('../middleware/platformAccess');
const { requireTenant } = require('../middleware/tenant');
const { authorize } = require('../middleware/actorAccess');

const router = Router();

// Full state dump & restore is strictly restricted to authenticated Platform Super Users
router.get('/full-state', requireSession, requirePlatformUser, controller.getFullState);
router.post('/full-state', requireSession, requirePlatformUser, controller.updateFullState);

// Consolidated Admin Dashboard snapshot for the signed-in organization
router.get(
  '/admin-dashboard',
  requireSession,
  requireTenant,
  authorize(['Admin'], 'rbac', 'read'),
  controller.getAdminDashboard,
);

module.exports = router;
