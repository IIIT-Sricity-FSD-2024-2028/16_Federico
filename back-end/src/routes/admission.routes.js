'use strict';

const { Router } = require('express');
const controller = require('../controllers/admission.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const { createAdmissionRules, updateAdmissionRules } = require('../validators/admission.validators');

const router = Router();

router.get('/', requireRoles('ADMIN', 'SUPER_USER'), controller.findAll);
router.get('/:id', requireRoles('ADMIN', 'SUPER_USER'), controller.findOne);
router.post('/', requireRoles('SUPER_USER'), validateBody(createAdmissionRules), controller.create);
router.put('/:id', requireRoles('SUPER_USER'), validateBody(updateAdmissionRules), controller.update);

module.exports = router;
