'use strict';

const { Router } = require('express');
const controller = require('../controllers/request.controller');
const { authorize } = require('../middleware/actorAccess');
const { validateBody } = require('../validators/engine');
const { createAppointmentRules, updateAppointmentRules } = require('../validators/request.validators');

const router = Router();

router.get('/', authorize(['ADMIN', 'SUPER_USER'], 'appointment', 'read'), controller.findAll);
router.post(
  '/',
  authorize(['SUPER_USER'], 'appointment', 'write'),
  validateBody(createAppointmentRules),
  controller.create,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'appointment', 'write'),
  validateBody(updateAppointmentRules),
  controller.update,
);

module.exports = router;
