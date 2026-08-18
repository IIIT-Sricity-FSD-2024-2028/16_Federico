'use strict';

const rbacService = require('../services/rbac.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🛡️  RBAC');
const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

function listRoles(req, res) {
  sendResult(res, rbacService.listRoles(req.tenant.organizationId), 200);
}

function createRole(req, res) {
  const result = rbacService.createRole(req.tenant.organizationId, req.body);
  logger.log(`✅ ROLE CREATED  id=${result.custom_role_id}  name="${result.role_name}"  org=${req.tenant.organizationId}`);
  sendResult(res, result, 201);
}

function listPermissions(req, res) {
  sendResult(res, rbacService.listPermissions(), 200);
}

function assignPermission(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, +req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });
  const result = rbacService.assignPermission(role.custom_role_id, req.body.permission_id);
  sendResult(res, result, 200);
}

// A custom role may only ever be assigned to a staff account (HOM/PRE/FA)
// belonging to the SAME organization — never a Patient, never cross-org.
function assignStaffRole(req, res) {
  const role = rbacService.findRole(req.tenant.organizationId, req.body.custom_role_id);
  if (!role) return res.status(404).json({ message: 'Role not found', error: 'Not Found', statusCode: 404 });

  const targetUser = dataStore.users.find((u) => u.user_id === +req.params.userId);
  if (!targetUser || targetUser.organization_id !== req.tenant.organizationId || targetUser.role_id === 2) {
    return res.status(403).json(FORBIDDEN);
  }

  const result = rbacService.assignStaffRole(targetUser.user_id, role.custom_role_id);
  logger.log(`✅ ROLE ASSIGNED  user_id=${targetUser.user_id}  role_id=${role.custom_role_id}`);
  sendResult(res, result, 200);
}

module.exports = { listRoles, createRole, listPermissions, assignPermission, assignStaffRole };
