'use strict';

const { Router } = require('express');
const controller = require('../controllers/patient.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const {
  createPatientRules,
  updatePatientRules,
  createPatientInsuranceRules,
} = require('../validators/patient.validators');

const router = Router();

router.get(
  '/',
  authorize(['ADMIN', 'SUPER_USER'], 'patient', 'read'),
  controller.findAll,
);
router.get(
  '/:id',
  authorize(['ADMIN', 'SUPER_USER'], 'patient', 'read'),
  controller.findOne,
);
router.post(
  '/',
  authorize(['SUPER_USER'], 'patient', 'write'),
  validateBody(createPatientRules),
  controller.create,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'patient', 'write'),
  validateBody(updatePatientRules),
  controller.update,
);
router.delete(
  '/:id',
  authorize(['SUPER_USER'], 'patient', 'write'),
  controller.remove,
);

// Insurance — its own toggleable module (utils/tenant.js#MODULES), unlike
// core patient records, so only these three routes are gated.
router.get(
  '/insurance/all',
  requireModule('INSURANCE'),
  authorize(['ADMIN', 'SUPER_USER'], 'patient', 'read'),
  controller.findAllInsurances,
);
router.get(
  '/:id/insurance',
  requireModule('INSURANCE'),
  authorize(['ADMIN', 'SUPER_USER'], 'patient', 'read'),
  controller.findInsuranceByPatient,
);
router.post(
  '/insurance',
  requireModule('INSURANCE'),
  authorize(['SUPER_USER'], 'patient', 'write'),
  validateBody(createPatientInsuranceRules),
  controller.createInsurance,
);

module.exports = router;
