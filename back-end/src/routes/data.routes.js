'use strict';

const { Router } = require('express');
const controller = require('../controllers/data.controller');

// Original DataController had no @Roles() on either handler — open access,
// matching the RolesGuard's "no metadata => allow" default.
const router = Router();

router.get('/full-state', controller.getFullState);
router.post('/full-state', controller.updateFullState);

module.exports = router;
