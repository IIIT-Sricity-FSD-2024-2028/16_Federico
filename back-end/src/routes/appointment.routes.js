'use strict';

const { Router } = require('express');
const controller = require('../controllers/appointment.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const {
  createAppointmentRules,
  updateAppointmentRules,
} = require('../validators/appointment.validators');

const router = Router();

// Appointment Management is its own purchasable module (utils/tenant.js#MODULES).
router.use(requireModule('APPOINTMENTS'));

router.get(
  '/',
  authorize(['ADMIN', 'SUPER_USER'], 'appointment', 'read'),
  controller.findAll,
);
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
