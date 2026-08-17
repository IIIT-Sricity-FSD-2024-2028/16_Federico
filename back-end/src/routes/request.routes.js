'use strict';

const { Router } = require('express');
const controller = require('../controllers/request.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const { createAppointmentRules, updateAppointmentRules } = require('../validators/request.validators');

const router = Router();

router.get('/', requireRoles('ADMIN', 'SUPER_USER'), controller.findAll);
router.post('/', requireRoles('SUPER_USER'), validateBody(createAppointmentRules), controller.create);
router.put('/:id', requireRoles('SUPER_USER'), validateBody(updateAppointmentRules), controller.update);

module.exports = router;
