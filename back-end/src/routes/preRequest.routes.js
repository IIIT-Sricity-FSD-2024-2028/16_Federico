'use strict';

const { Router } = require('express');
const controller = require('../controllers/preRequest.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const { createPreRequestRules, updatePreRequestRules } = require('../validators/preRequest.validators');

// New Phase 2 resource — no legacy contract to preserve, but still
// accepts the legacy ADMIN/SUPER_USER header so Swagger/manual testing
// works without a real login. Uses its own 'preRequest' permission entry
// (not 'admission'/'appointment') since Patient needs read/write here,
// scoped to their own records only — enforced in the controller.
const router = Router();
router.use(requireModule('ADMISSIONS'));

router.get('/', authorize(['ADMIN', 'SUPER_USER'], 'preRequest', 'read'), controller.findAll);
router.get('/:id', authorize(['ADMIN', 'SUPER_USER'], 'preRequest', 'read'), controller.findOne);
router.post(
  '/',
  authorize(['SUPER_USER'], 'preRequest', 'write'),
  validateBody(createPreRequestRules),
  controller.create,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'preRequest', 'write'),
  validateBody(updatePreRequestRules),
  controller.update,
);

module.exports = router;
