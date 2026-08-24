'use strict';

const { Router } = require('express');
const controller = require('../controllers/data.controller');
const { requireSession } = require('../middleware/session');
const { requirePlatformUser } = require('../middleware/platformAccess');

const router = Router();

// Full state dump & restore is strictly restricted to authenticated Platform Super Users
router.get('/full-state', requireSession, requirePlatformUser, controller.getFullState);
router.post('/full-state', requireSession, requirePlatformUser, controller.updateFullState);

module.exports = router;
