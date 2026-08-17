'use strict';

const { Router } = require('express');
const controller = require('../controllers/ward.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const { createWardRules, createBedRules, updateBedStatusRules } = require('../validators/ward.validators');

const router = Router();

router.get('/', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllWards);
router.post('/', requireRoles('SUPER_USER'), validateBody(createWardRules), controller.createWard);

// Beds
router.get('/beds', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllBeds);
router.get('/:id/beds', requireRoles('ADMIN', 'SUPER_USER'), controller.findBedsByWard);
router.post('/bed', requireRoles('SUPER_USER'), validateBody(createBedRules), controller.createBed);
router.put(
  '/bed/:bedId',
  requireRoles('SUPER_USER'),
  validateBody(updateBedStatusRules),
  controller.updateBedStatus,
);

module.exports = router;
