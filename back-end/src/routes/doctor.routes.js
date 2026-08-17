'use strict';

const { Router } = require('express');
const controller = require('../controllers/doctor.controller');
const { authorize } = require('../middleware/actorAccess');
const { validateBody } = require('../validators/engine');
const {
  createDoctorRules,
  updateDoctorRules,
  createDoctorAvailabilityRules,
} = require('../validators/doctor.validators');

const router = Router();

router.get('/', authorize(['ADMIN', 'SUPER_USER'], 'doctor', 'read'), controller.findAllDoctors);
router.get('/:id', authorize(['ADMIN', 'SUPER_USER'], 'doctor', 'read'), controller.findDoctor);
router.post('/', authorize(['SUPER_USER'], 'doctor', 'write'), validateBody(createDoctorRules), controller.createDoctor);
router.put('/:id', authorize(['SUPER_USER'], 'doctor', 'write'), validateBody(updateDoctorRules), controller.updateDoctor);
router.delete('/:id', authorize(['SUPER_USER'], 'doctor', 'write'), controller.deleteDoctor);

// Availability
router.get('/availability/all', authorize(['ADMIN', 'SUPER_USER'], 'doctor', 'read'), controller.findAllAvailabilities);
router.get('/:id/availability', authorize(['ADMIN', 'SUPER_USER'], 'doctor', 'read'), controller.findAvailabilityByDoctor);
router.post(
  '/availability',
  authorize(['SUPER_USER'], 'doctor', 'write'),
  validateBody(createDoctorAvailabilityRules),
  controller.createAvailability,
);
router.delete('/availability/:id', authorize(['SUPER_USER'], 'doctor', 'write'), controller.deleteAvailability);

module.exports = router;
