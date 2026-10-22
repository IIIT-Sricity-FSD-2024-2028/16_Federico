'use strict';

const { Router } = require('express');
const controller = require('../controllers/ward.controller');
const { authorize } = require('../middleware/actorAccess');
const { validateBody } = require('../validators/engine');
const {
  createWardRules,
  updateWardRules,
  createBedRules,
  updateBedStatusRules,
  createBedRequestRules,
  updateBedRequestRules,
} = require('../validators/ward.validators');

const router = Router();

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
  '/bed',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findAllBeds,
);
router.get(
  '/bed/:id',
  authorize(['ADMIN', 'SUPER_USER'], 'ward', 'read'),
  controller.findBedById,
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

module.exports = router;
