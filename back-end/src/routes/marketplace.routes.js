'use strict';

const { Router } = require('express');
const controller = require('../controllers/marketplace.controller');

const router = Router();

router.get('/organizations', controller.listOrganizations);
router.get('/plans', controller.listPlans);
router.post('/register-organization', controller.registerOrganization);

module.exports = router;

