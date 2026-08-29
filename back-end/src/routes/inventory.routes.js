'use strict';

const { Router } = require('express');
const controller = require('../controllers/inventory.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireModule } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const {
  createInventoryItemRules,
  updateInventoryItemRules,
  createPurchaseRequestRules,
  updatePurchaseRequestRules,
} = require('../validators/inventory.validators');

const router = Router();
router.use(requireModule('INVENTORY'));

router.get(
  '/items',
  authorize(['ADMIN', 'SUPER_USER'], 'inventory', 'read'),
  controller.findAllItems,
);
router.post(
  '/items',
  authorize(['SUPER_USER'], 'inventoryCatalog', 'write'),
  validateBody(createInventoryItemRules),
  controller.createItem,
);
router.put(
  '/items/:id',
  authorize(['SUPER_USER'], 'inventoryCatalog', 'write'),
  validateBody(updateInventoryItemRules),
  controller.updateItem,
);
router.delete(
  '/items/:id',
  authorize(['SUPER_USER'], 'inventoryCatalog', 'delete'),
  controller.deleteItem,
);

router.get(
  '/requests',
  authorize(['ADMIN', 'SUPER_USER'], 'inventory', 'read'),
  controller.findAllRequests,
);
router.post(
  '/requests',
  authorize(['SUPER_USER'], 'inventory', 'write'),
  validateBody(createPurchaseRequestRules),
  controller.createRequest,
);
router.put(
  '/requests/:id',
  authorize(['SUPER_USER'], 'inventory', 'write'),
  validateBody(updatePurchaseRequestRules),
  controller.updateRequest,
);

module.exports = router;
