'use strict';

const { Router } = require('express');
const controller = require('../controllers/rbac.controller');
const { authorize } = require('../middleware/actorAccess');
const { requireTenant } = require('../middleware/tenant');
const { validateBody } = require('../validators/engine');
const {
  createRoleRules,
  assignPermissionRules,
  assignStaffRoleRules,
} = require('../validators/rbac.validators');

const router = Router();

router.get(
  '/roles',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'read'),
  controller.listRoles,
);
router.post(
  '/roles',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  validateBody(createRoleRules),
  controller.createRole,
);
router.get(
  '/permissions',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'read'),
  controller.listPermissions,
);
router.post(
  '/roles/:id/permissions',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  validateBody(assignPermissionRules),
  controller.assignPermission,
);
router.post(
  '/staff/:userId/role',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  validateBody(assignStaffRoleRules),
  controller.assignStaffRole,
);

module.exports = router;
