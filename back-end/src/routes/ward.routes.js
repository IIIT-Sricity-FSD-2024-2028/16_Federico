'use strict';

const { Router } = require('express');
const controller = require('../controllers/ward.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const {
  createWardRules,
  updateWardRules,
  createBedRules,
  updateBedStatusRules,
  createBedRequestRules,
  updateBedRequestRules,
  createEmergencyRules,
  updateEmergencyRules,
} = require('../validators/ward.validators');

const router = Router();

// Wards/beds/bed-requests/emergency all live under the ADMISSIONS module
// flag ("Admissions & Bed Management" — see utils/tenant.js#MODULES).
router.use(requireModule('ADMISSIONS'));

router.get(
  '/',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findAllWards,
);
router.post(
  '/',
  authorize(['SUPER_USER'], 'wardAdmin', 'write'),
  validateBody(createWardRules),
  controller.createWard,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'wardAdmin', 'write'),
  validateBody(updateWardRules),
  controller.updateWard,
);
router.delete(
  '/:id',
  authorize(['SUPER_USER'], 'wardAdmin', 'delete'),
  controller.deleteWard,
);

// Beds
router.get(
  '/beds',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findAllBeds,
);
router.get(
  '/:id/beds',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findBedsByWard,
);
router.post(
  '/bed',
  authorize(['SUPER_USER'], 'ward', 'write'),
  validateBody(createBedRules),
  controller.createBed,
);
router.put(
  '/bed/:bedId',
  authorize(['SUPER_USER'], 'ward', 'write'),
  validateBody(updateBedStatusRules),
  controller.updateBedStatus,
);

// Phase 2 — bed requests (PRE requests, HOM allocates/denies)
router.get(
  '/bed-requests',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findAllBedRequests,
);
router.post(
  '/bed-requests',
  authorize(['SUPER_USER'], 'admission', 'write'),
  validateBody(createBedRequestRules),
  controller.createBedRequest,
);
router.put(
  '/bed-requests/:id',
  authorize(['SUPER_USER'], 'ward', 'write'),
  validateBody(updateBedRequestRules),
  controller.updateBedRequest,
);

// Phase 2 — emergency admissions
router.get(
  '/emergency',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findAllEmergencies,
);
router.post(
  '/emergency',
  authorize(['SUPER_USER'], 'admission', 'write'),
  validateBody(createEmergencyRules),
  controller.createEmergency,
);
router.put(
  '/emergency/:id',
  authorize(['SUPER_USER'], 'ward', 'write'),
  validateBody(updateEmergencyRules),
  controller.updateEmergency,
);

module.exports = router;
