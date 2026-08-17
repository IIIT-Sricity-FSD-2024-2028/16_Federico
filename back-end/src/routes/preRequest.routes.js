'use strict';

const { Router } = require('express');
const controller = require('../controllers/preRequest.controller');
const { authorize } = require('../middleware/actorAccess');
const { validateBody } = require('../validators/engine');
const { createPreRequestRules, updatePreRequestRules } = require('../validators/preRequest.validators');

// New Phase 2 resource — no legacy contract to preserve, but still
// accepts the legacy ADMIN/SUPER_USER header so Swagger/manual testing
// works without a real login.
const router = Router();

router.get('/', authorize(['ADMIN', 'SUPER_USER'], 'admission', 'read'), controller.findAll);
router.get('/:id', authorize(['ADMIN', 'SUPER_USER'], 'admission', 'read'), controller.findOne);
router.post(
  '/',
  authorize(['SUPER_USER'], 'appointment', 'write'),
  validateBody(createPreRequestRules),
  controller.create,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'admission', 'write'),
  validateBody(updatePreRequestRules),
  controller.update,
);

module.exports = router;
