'use strict';

const { rbacRepository } = require('../repositories');
const { ForbiddenError } = require('../errors');
const { sendError } = require('../utils/response');

const ACTOR_ACCESS = {
  doctor: { read: ['HOM', 'PRE', 'FA', 'Patient', 'Admin'], write: ['HOM'] },
  patient: {
    read: ['HOM', 'PRE', 'FA', 'Patient', 'Admin'],
    write: ['HOM', 'PRE', 'Patient'],
  },
  ward: { read: ['HOM', 'PRE', 'FA', 'Admin'], write: ['HOM'] },
  inventory: { read: ['HOM', 'FA', 'Admin'], write: ['HOM'] },
  wardAdmin: { read: ['Admin'], write: ['Admin'], delete: ['Admin'] },
  inventoryCatalog: { read: ['Admin'], write: ['Admin'], delete: ['Admin'] },
  billing: { read: ['HOM', 'FA', 'Patient', 'Admin'], write: ['FA'] },
  leader: { read: ['HOM', 'FA', 'Admin'], write: ['HOM', 'FA'] },
  payment: { write: ['FA', 'Patient'] },
  ledgerEntry: { write: ['FA', 'HOM'] },
  appointment: { read: ['HOM', 'PRE', 'FA'], write: ['PRE'] },
  admission: { read: ['HOM', 'PRE', 'FA', 'Admin'], write: ['HOM', 'PRE'] },
  preRequest: {
    read: ['HOM', 'PRE', 'FA', 'Patient'],
    write: ['HOM', 'PRE', 'Patient'],
  },
  rbac: { read: ['Admin'], write: ['Admin'] },
};

/**
 * Checks if the caller has been granted custom granular permissions through dynamic RBAC assignments.
 * @param {import('express').Request} req
 * @param {string} resource
 * @param {string} mode - 'read', 'write', 'delete'
 * @returns {boolean}
 */
function dynamicRoleGrants(req, resource, mode) {
  if (
    !req.session ||
    !req.session.userId ||
    !req.tenant ||
    !req.tenant.organizationId
  ) {
    return false;
  }

  const permissionCode = `${resource}:${mode}`;
  const permission = rbacRepository.findPermissionByCode(permissionCode);
  if (!permission) return false;

  const staffRoles = rbacRepository.findRolesForStaff(req.session.userId);
  const orgRoles = staffRoles.filter(
    (r) => r.organization_id === req.tenant.organizationId,
  );
  if (orgRoles.length === 0) return false;

  for (const role of orgRoles) {
    const rolePerms = rbacRepository.findPermissionsForRole(role.custom_role_id);
    if (rolePerms.some((p) => p.permission_id === permission.permission_id)) {
      return true;
    }
  }

  return false;
}

/**
 * Authorizes request against the static ACTOR_ACCESS permission matrix and dynamic RBAC grants.
 * @param {string[]} _legacyRoles - Ignored (legacy x-role header deprecated for security)
 * @param {string} resource - e.g. 'billing', 'patient', 'doctor', 'ward'
 * @param {string} mode - 'read', 'write', 'delete'
 */
function authorize(_legacyRoles, resource, mode) {
  return function (req, res, next) {
    const allowedActors = ACTOR_ACCESS[resource]?.[mode] || [];
    const actorOk = Boolean(
      req.session && allowedActors.includes(req.session.role),
    );
    const dynamicOk = dynamicRoleGrants(req, resource, mode);

    if (actorOk || dynamicOk) return next();

    return sendError(
      res,
      new ForbiddenError(`Forbidden: You do not have permission to ${mode} ${resource}`),
      403,
    );
  };
}

module.exports = { authorize, ACTOR_ACCESS, dynamicRoleGrants };
