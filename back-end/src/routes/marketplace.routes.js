'use strict';

const { Router } = require('express');
const controller = require('../controllers/marketplace.controller');

const router = Router();

router.get('/organizations', controller.listOrganizations);

module.exports = router;
