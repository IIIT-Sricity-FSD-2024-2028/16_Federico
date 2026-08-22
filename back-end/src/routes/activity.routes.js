'use strict';

const { Router } = require('express');
const controller = require('../controllers/activity.controller');
const { authorize } = require('../middleware/actorAccess');

const router = Router();

router.get(
  '/',
  authorize(['ADMIN', 'SUPER_USER'], 'admission', 'read'),
  controller.findAll,
);

module.exports = router;
