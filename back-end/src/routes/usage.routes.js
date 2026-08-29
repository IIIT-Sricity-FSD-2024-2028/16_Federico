'use strict';

// Tenant-facing usage view — a hospital admin/owner can see the platform
// fees accruing this period so the bill is never a surprise. Mounted at
// `/account` in routes/index.js.

const { Router } = require('express');
const { requireSession } = require('../middleware/session');
const { requireTenant } = require('../middleware/tenant');
const controller = require('../controllers/usageMetering.controller');

const router = Router();

router.get('/usage', requireSession, requireTenant, controller.myUsage);

module.exports = router;
