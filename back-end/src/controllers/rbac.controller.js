'use strict';

const rbacService = require('../services/rbac.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🛡️  RBAC');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function listRoles(req, res) {
  sendResult(res, rbacService.listRoles(req.tenant.organizationId), 200);
}

function createRole(req, res) {
  const result = rbacService.createRole(req.tenant.organizationId, req.body);
  logger.log(
    `✅ ROLE CREATED  id=${result.custom_role_id}  name="${result.role_name}"  org=${req.tenant.organizationId}`,
  );
  sendResult(res, result, 201);
}

function listPermissions(req, res) {
  sendResult(res, rbacService.listPermissions(), 200);
}

function assignPermission(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role)
    return res
      .status(404)
      .json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });
  const result = rbacService.assignPermission(
    role.custom_role_id,
    req.body.permission_id,
  );
  sendResult(res, result, 200);
}

function permissionsForRole(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role)
    return res
      .status(404)
      .json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });
  sendResult(res, rbacService.permissionsForRole(role.custom_role_id), 200);
}

function unassignPermission(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role)
    return res
      .status(404)
      .json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });
  const result = rbacService.unassignPermission(
    role.custom_role_id,
    +req.params.permissionId,
  );
  sendResult(res, result, 200);
}

// A custom role may only ever be assigned to a staff account (HOM/PRE/FA)
// belonging to the SAME organization — never a Patient, never cross-org.
function assignStaffRole(req, res) {
  const role = rbacService.findRole(
    req.tenant.organizationId,
    req.body.custom_role_id,
  );
  if (!role)
    return res
      .status(404)
      .json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });

  const targetUser = dataStore.users.find(
    (u) => u.user_id === +req.params.userId,
  );
  if (
    !targetUser ||
    targetUser.organization_id !== req.tenant.organizationId ||
    targetUser.role_id === 2
  ) {
    return res.status(403).json(FORBIDDEN);
  }

  const result = rbacService.assignStaffRole(
    targetUser.user_id,
    role.custom_role_id,
  );
  logger.log(
    `✅ ROLE ASSIGNED  user_id=${targetUser.user_id}  role_id=${role.custom_role_id}`,
  );
  sendResult(res, result, 200);
}

// Same org/non-Patient guard as assignStaffRole above — removing a role
// from a user outside the caller's org (or from a Patient, who can never
// have one) is refused rather than silently no-op-ing.
function unassignStaffRole(req, res) {
  const targetUser = dataStore.users.find(
    (u) => u.user_id === +req.params.userId,
  );
  if (
    !targetUser ||
    targetUser.organization_id !== req.tenant.organizationId ||
    targetUser.role_id === 2
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  const result = rbacService.unassignStaffRole(
    targetUser.user_id,
    +req.params.roleId,
  );
  logger.log(
    `➖ ROLE UNASSIGNED  user_id=${targetUser.user_id}  role_id=${req.params.roleId}`,
  );
  sendResult(res, result, 200);
}

function listStaff(req, res) {
  sendResult(res, rbacService.staffFor(req.tenant.organizationId), 200);
}

function listMembers(req, res) {
  sendResult(res, rbacService.membersFor(req.tenant.organizationId), 200);
}

// Admin adds a person to the organization and gets back their login
// email + password to pass on. Org-scoped; new user lands in the caller's
// organization and primary hospital.
function createStaff(req, res) {
  const hospitalId = req.session ? req.session.hospitalId : null;
  const result = rbacService.createStaff(
    req.tenant.organizationId,
    hospitalId,
    req.body,
  );
  if (result.error === 'EMAIL_TAKEN') {
    return res.status(409).json({
      message: 'That email is already registered',
      error: 'Conflict',
      statusCode: 409,
    });
  }
  if (result.error === 'INVALID_ROLE') {
    return res.status(400).json({
      message: `Role must be one of: ${rbacService.CREATABLE_STAFF_ROLES.join(', ')}`,
      error: 'Bad Request',
      statusCode: 400,
    });
  }
  if (result.error === 'WEAK_PASSWORD') {
    return res.status(400).json({
      message: 'Temporary password must be at least 6 characters',
      error: 'Bad Request',
      statusCode: 400,
    });
  }
  logger.log(
    `✅ STAFF CREATED  user_id=${result.user_id}  role=${result.actor_role}  email=${result.email}  org=${req.tenant.organizationId}`,
  );
  sendResult(res, result, 201);
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
  listMembers,
  createStaff,
};
