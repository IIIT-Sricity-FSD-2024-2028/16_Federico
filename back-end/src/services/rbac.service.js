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
  ['doctor', 'read'], ['doctor', 'write'],
  ['patient', 'read'], ['patient', 'write'],
  ['ward', 'read'], ['ward', 'write'],
  ['inventory', 'read'], ['inventory', 'write'],
  ['billing', 'read'], ['billing', 'write'],
  ['payment', 'write'],
  ['ledgerEntry', 'write'],
  ['appointment', 'read'], ['appointment', 'write'],
  ['admission', 'read'], ['admission', 'write'],
  ['preRequest', 'read'], ['preRequest', 'write'],
];

/** Idempotent — safe to call on every boot/seed run without duplicating rows. */
function ensurePermissionCatalog() {
  PERMISSION_CATALOG.forEach(([resource, mode]) => {
    const code = `${resource}:${mode}`;
    if (!dataStore.permissions.some((p) => p.permission_code === code)) {
      dataStore.permissions.push({
        permission_id: dataStore.permissions.length > 0 ? Math.max(...dataStore.permissions.map((p) => p.permission_id)) + 1 : 1,
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
  return dataStore.customRoles.filter((r) => r.organization_id === organizationId);
}

function createRole(organizationId, payload) {
  const newRole = {
    custom_role_id: dataStore.customRoles.length > 0 ? Math.max(...dataStore.customRoles.map((r) => r.custom_role_id)) + 1 : 1,
    organization_id: organizationId,
    role_name: payload.role_name,
    description: payload.description || null,
    created_at: new Date().toISOString(),
  };
  dataStore.customRoles.push(newRole);
  return newRole;
}

function findRole(organizationId, roleId) {
  return dataStore.customRoles.find((r) => r.custom_role_id === roleId && r.organization_id === organizationId) || null;
}

function permissionsForRole(roleId) {
  const permissionIds = dataStore.rolePermissions.filter((rp) => rp.custom_role_id === roleId).map((rp) => rp.permission_id);
  return dataStore.permissions.filter((p) => permissionIds.includes(p.permission_id));
}

function assignPermission(roleId, permissionId) {
  const already = dataStore.rolePermissions.some((rp) => rp.custom_role_id === roleId && rp.permission_id === permissionId);
  if (!already) dataStore.rolePermissions.push({ custom_role_id: roleId, permission_id: permissionId });
  return permissionsForRole(roleId);
}

/** Assigns a custom role to a staff user (HOM/PRE/FA — never a Patient, checked by the controller). Additive on top of their fixed actor role, never a replacement. */
function assignStaffRole(userId, roleId) {
  const already = dataStore.staffRoleAssignments.some((a) => a.user_id === userId && a.custom_role_id === roleId);
  if (!already) dataStore.staffRoleAssignments.push({ user_id: userId, custom_role_id: roleId, assigned_at: new Date().toISOString() });
  return dataStore.staffRoleAssignments.filter((a) => a.user_id === userId);
}

module.exports = { ensurePermissionCatalog, listPermissions, listRoles, createRole, findRole, permissionsForRole, assignPermission, assignStaffRole };
