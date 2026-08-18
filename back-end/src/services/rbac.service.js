'use strict';

const dataStore = require('../store/dataStore');

/**
 * Fixed permission catalog — the `resource:mode` pairs `actorAccess.js`'s
 * `ACTOR_ACCESS` already governs for the 4 fixed actors. Custom roles grant
 * a subset of these same pairs (see `dynamicRoleGrants` in
 * `middleware/actorAccess.js`), so a custom role like "Billing Manager"
 * composes from the exact same permission space the fixed actors use —
 * there's only one access-control vocabulary in the app, not two.
 */
const PERMISSION_CATALOG = [
  ['doctor', 'read'],
  ['doctor', 'write'],
  ['patient', 'read'],
  ['patient', 'write'],
  ['ward', 'read'],
  ['ward', 'write'],
  ['inventory', 'read'],
  ['inventory', 'write'],
  ['billing', 'read'],
  ['billing', 'write'],
  ['payment', 'write'],
  ['ledgerEntry', 'write'],
  ['appointment', 'read'],
  ['appointment', 'write'],
  ['admission', 'read'],
  ['admission', 'write'],
  ['preRequest', 'read'],
  ['preRequest', 'write'],
];

/** Idempotent — safe to call on every boot/seed run without duplicating rows. */
function ensurePermissionCatalog() {
  PERMISSION_CATALOG.forEach(([resource, mode]) => {
    const code = `${resource}:${mode}`;
    if (!dataStore.permissions.some((p) => p.permission_code === code)) {
      dataStore.permissions.push({
        permission_id:
          dataStore.permissions.length > 0
            ? Math.max(...dataStore.permissions.map((p) => p.permission_id)) + 1
            : 1,
        permission_code: code,
        description: `${mode === 'read' ? 'View' : 'Manage'} ${resource} records`,
      });
    }
  });
  return dataStore.permissions;
}

function listPermissions() {
  return dataStore.permissions;
}

function listRoles(organizationId) {
  return dataStore.customRoles.filter(
    (r) => r.organization_id === organizationId,
  );
}

function createRole(organizationId, payload) {
  const newRole = {
    custom_role_id:
      dataStore.customRoles.length > 0
        ? Math.max(...dataStore.customRoles.map((r) => r.custom_role_id)) + 1
        : 1,
    organization_id: organizationId,
    role_name: payload.role_name,
    description: payload.description || null,
    created_at: new Date().toISOString(),
  };
  dataStore.customRoles.push(newRole);
  return newRole;
}

function findRole(organizationId, roleId) {
  return (
    dataStore.customRoles.find(
      (r) =>
        r.custom_role_id === roleId && r.organization_id === organizationId,
    ) || null
  );
}

function permissionsForRole(roleId) {
  const permissionIds = dataStore.rolePermissions
    .filter((rp) => rp.custom_role_id === roleId)
    .map((rp) => rp.permission_id);
  return dataStore.permissions.filter((p) =>
    permissionIds.includes(p.permission_id),
  );
}

function assignPermission(roleId, permissionId) {
  const already = dataStore.rolePermissions.some(
    (rp) => rp.custom_role_id === roleId && rp.permission_id === permissionId,
  );
  if (!already)
    dataStore.rolePermissions.push({
      custom_role_id: roleId,
      permission_id: permissionId,
    });
  return permissionsForRole(roleId);
}

function unassignPermission(roleId, permissionId) {
  dataStore.rolePermissions = dataStore.rolePermissions.filter(
    (rp) =>
      !(rp.custom_role_id === roleId && rp.permission_id === permissionId),
  );
  return permissionsForRole(roleId);
}

/** Assigns a custom role to a staff user (HOM/PRE/FA — never a Patient, checked by the controller). Additive on top of their fixed actor role, never a replacement. */
function assignStaffRole(userId, roleId) {
  const already = dataStore.staffRoleAssignments.some(
    (a) => a.user_id === userId && a.custom_role_id === roleId,
  );
  if (!already)
    dataStore.staffRoleAssignments.push({
      user_id: userId,
      custom_role_id: roleId,
      assigned_at: new Date().toISOString(),
    });
  return dataStore.staffRoleAssignments.filter((a) => a.user_id === userId);
}

function unassignStaffRole(userId, roleId) {
  dataStore.staffRoleAssignments = dataStore.staffRoleAssignments.filter(
    (a) => !(a.user_id === userId && a.custom_role_id === roleId),
  );
  return dataStore.staffRoleAssignments.filter((a) => a.user_id === userId);
}

function rolesForUser(userId) {
  const roleIds = dataStore.staffRoleAssignments
    .filter((a) => a.user_id === userId)
    .map((a) => a.custom_role_id);
  return dataStore.customRoles.filter((r) =>
    roleIds.includes(r.custom_role_id),
  );
}

// Fixed actor roles (see auth.service.js's ROLE_ID_TO_NAME — replicated
// here rather than imported, since auth.service.js keeps it private and
// this is a small, stable, cross-cutting constant, same reasoning as
// MODULE_CATALOG being duplicated on the frontend).
const ROLE_ID_TO_NAME = { 1: 'HOM', 2: 'Patient', 3: 'FA', 4: 'PRE' };

/** Every non-Patient user in the organization, with their fixed actor role and any custom roles — the roster the "assign a custom role" admin UI picks from. */
function staffFor(organizationId) {
  return dataStore.users
    .filter((u) => u.organization_id === organizationId && u.role_id !== 2)
    .map((u) => ({
      user_id: u.user_id,
      name: u.name,
      email: u.email,
      actor_role: ROLE_ID_TO_NAME[u.role_id] || null,
      custom_roles: rolesForUser(u.user_id),
    }));
}

module.exports = {
  ensurePermissionCatalog,
  listPermissions,
  listRoles,
  createRole,
  findRole,
  permissionsForRole,
  assignPermission,
  unassignPermission,
  assignStaffRole,
  unassignStaffRole,
  rolesForUser,
  staffFor,
};
