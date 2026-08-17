'use strict';

const { Router } = require('express');
const controller = require('../controllers/inventory.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const {
  createInventoryItemRules,
  updateInventoryItemRules,
  createPurchaseRequestRules,
  updatePurchaseRequestRules,
} = require('../validators/inventory.validators');

const router = Router();

router.get('/items', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllItems);
router.post('/items', requireRoles('SUPER_USER'), validateBody(createInventoryItemRules), controller.createItem);
router.put(
  '/items/:id',
  requireRoles('SUPER_USER'),
  validateBody(updateInventoryItemRules),
  controller.updateItem,
);

router.get('/requests', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllRequests);
router.post(
  '/requests',
  requireRoles('SUPER_USER'),
  validateBody(createPurchaseRequestRules),
  controller.createRequest,
);
router.put(
  '/requests/:id',
  requireRoles('SUPER_USER'),
  validateBody(updatePurchaseRequestRules),
  controller.updateRequest,
);

module.exports = router;
