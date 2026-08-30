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
  createStaffRules,
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
router.get(
  '/roles/:id/permissions',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'read'),
  controller.permissionsForRole,
);
router.delete(
  '/roles/:id/permissions/:permissionId',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  controller.unassignPermission,
);
router.post(
  '/staff/:userId/role',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  validateBody(assignStaffRoleRules),
  controller.assignStaffRole,
);
router.delete(
  '/staff/:userId/role/:roleId',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  controller.unassignStaffRole,
);
router.get(
  '/staff',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'read'),
  controller.listStaff,
);
router.post(
  '/staff',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  validateBody(createStaffRules),
  controller.createStaff,
);
router.put(
  '/staff/:userId/active',
  requireTenant,
  authorize(['SUPER_USER'], 'rbac', 'write'),
  controller.setStaffActive,
);

module.exports = router;
