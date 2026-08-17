'use strict';

const { Router } = require('express');
const controller = require('../controllers/patient.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const {
  createPatientRules,
  updatePatientRules,
  createPatientInsuranceRules,
} = require('../validators/patient.validators');

const router = Router();

router.get('/', requireRoles('ADMIN', 'SUPER_USER'), controller.findAll);
router.get('/:id', requireRoles('ADMIN', 'SUPER_USER'), controller.findOne);
router.post('/', requireRoles('SUPER_USER'), validateBody(createPatientRules), controller.create);
router.put('/:id', requireRoles('SUPER_USER'), validateBody(updatePatientRules), controller.update);
router.delete('/:id', requireRoles('SUPER_USER'), controller.remove);

// Insurance
router.get('/insurance/all', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllInsurances);
router.get('/:id/insurance', requireRoles('ADMIN', 'SUPER_USER'), controller.findInsuranceByPatient);
router.post(
  '/insurance',
  requireRoles('SUPER_USER'),
  validateBody(createPatientInsuranceRules),
  controller.createInsurance,
);

module.exports = router;
