'use strict';

const { Router } = require('express');
const controller = require('../controllers/admission.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const { createAdmissionRules, updateAdmissionRules } = require('../validators/admission.validators');

const router = Router();
router.use(requireModule('ADMISSIONS'));

router.get('/', authorize(['ADMIN', 'SUPER_USER'], 'admission', 'read'), controller.findAll);
router.get('/:id', authorize(['ADMIN', 'SUPER_USER'], 'admission', 'read'), controller.findOne);
router.post(
  '/',
  authorize(['SUPER_USER'], 'admission', 'write'),
  validateBody(createAdmissionRules),
  controller.create,
);
router.put(
  '/:id',
  authorize(['SUPER_USER'], 'admission', 'write'),
  validateBody(updateAdmissionRules),
  controller.update,
);

module.exports = router;
