'use strict';

const rbacService = require('../services/rbac.service');
const { userRepository } = require('../repositories');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError, NotFoundError } = require('../errors');

const logger = createLogger('🛡️  RBAC');

function listRoles(req, res) {
  sendSuccess(res, rbacService.listRoles(req.tenant.organizationId), 200);
}

function createRole(req, res) {
  const result = rbacService.createRole(req.tenant.organizationId, req.body);
  logger.log(
    `✅ ROLE CREATED  id=${result.custom_role_id}  name="${result.role_name}"  org=${req.tenant.organizationId}`,
  );
  sendSuccess(res, result, 201);
}

function listPermissions(req, res) {
  sendSuccess(res, rbacService.listPermissions(), 200);
}

function assignPermission(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role) {
    return sendError(res, new NotFoundError('Role not found'), 404);
  }
  const result = rbacService.assignPermission(
    role.custom_role_id,
    req.body.permission_id,
  );
  sendSuccess(res, result, 200);
}

function permissionsForRole(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role) {
    return sendError(res, new NotFoundError('Role not found'), 404);
  }
  sendSuccess(res, rbacService.permissionsForRole(role.custom_role_id), 200);
}

function unassignPermission(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role) {
    return sendError(res, new NotFoundError('Role not found'), 404);
  }
  const result = rbacService.unassignPermission(
    role.custom_role_id,
    +req.params.permissionId,
  );
  sendSuccess(res, result, 200);
}

function assignStaffRole(req, res) {
  const role = rbacService.findRole(
    req.tenant.organizationId,
    req.body.custom_role_id,
  );
  if (!role) {
    return sendError(res, new NotFoundError('Role not found'), 404);
  }

  const targetUser = userRepository.findById(+req.params.userId);
  if (
    !targetUser ||
    targetUser.organization_id !== req.tenant.organizationId ||
    targetUser.role_id === 2
  ) {
    return sendError(res, new ForbiddenError('Forbidden: Invalid staff target for role assignment'), 403);
  }

  const result = rbacService.assignStaffRole(
    targetUser.user_id,
    role.custom_role_id,
  );
  logger.log(
    `✅ ROLE ASSIGNED  user_id=${targetUser.user_id}  role_id=${role.custom_role_id}`,
  );
  sendSuccess(res, result, 200);
}

function unassignStaffRole(req, res) {
  const targetUser = userRepository.findById(+req.params.userId);
  if (
    !targetUser ||
    targetUser.organization_id !== req.tenant.organizationId ||
    targetUser.role_id === 2
  ) {
    return sendError(res, new ForbiddenError('Forbidden: Invalid staff target for role removal'), 403);
  }
  const result = rbacService.unassignStaffRole(
    targetUser.user_id,
    +req.params.roleId,
  );
  logger.log(
    `➖ ROLE UNASSIGNED  user_id=${targetUser.user_id}  role_id=${req.params.roleId}`,
  );
  sendSuccess(res, result, 200);
}

function listStaff(req, res) {
  sendSuccess(res, rbacService.staffFor(req.tenant.organizationId), 200);
}

module.exports = {
  listRoles,
  createRole,
  listPermissions,
  permissionsForRole,
  assignPermission,
  unassignPermission,
  assignStaffRole,
  unassignStaffRole,
  listStaff,
};
