'use strict';

const { Router } = require('express');
const controller = require('../controllers/doctor.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const {
  createDoctorRules,
  updateDoctorRules,
  createDoctorAvailabilityRules,
} = require('../validators/doctor.validators');

const router = Router();

router.get('/', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllDoctors);
router.get('/:id', requireRoles('ADMIN', 'SUPER_USER'), controller.findDoctor);
router.post('/', requireRoles('SUPER_USER'), validateBody(createDoctorRules), controller.createDoctor);
router.put('/:id', requireRoles('SUPER_USER'), validateBody(updateDoctorRules), controller.updateDoctor);
router.delete('/:id', requireRoles('SUPER_USER'), controller.deleteDoctor);

// Availability
router.get('/availability/all', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllAvailabilities);
router.get('/:id/availability', requireRoles('ADMIN', 'SUPER_USER'), controller.findAvailabilityByDoctor);
router.post(
  '/availability',
  requireRoles('SUPER_USER'),
  validateBody(createDoctorAvailabilityRules),
  controller.createAvailability,
);
router.delete('/availability/:id', requireRoles('SUPER_USER'), controller.deleteAvailability);

module.exports = router;
