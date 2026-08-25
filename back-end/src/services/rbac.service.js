'use strict';

const dataStore = require('../store/dataStore');
const { ROLE_ID_TO_NAME } = require('../utils/roles');

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
  ['wardAdmin', 'read'],
  ['wardAdmin', 'write'],
  ['wardAdmin', 'delete'],
  ['inventory', 'read'],
  ['inventory', 'write'],
  ['inventoryCatalog', 'read'],
  ['inventoryCatalog', 'write'],
  ['inventoryCatalog', 'delete'],
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
  const oid = Number(organizationId);
  return dataStore.customRoles.filter((r) => r.organization_id === oid);
}

function createRole(organizationId, payload) {
  const newRole = {
    custom_role_id:
      dataStore.customRoles.length > 0
        ? Math.max(...dataStore.customRoles.map((r) => r.custom_role_id)) + 1
        : 1,
    organization_id: Number(organizationId),
    role_name: payload.role_name,
    description: payload.description || null,
    created_at: new Date().toISOString(),
  };
  dataStore.customRoles.push(newRole);
  return newRole;
}

function findRole(organizationId, roleId) {
  const oid = Number(organizationId);
  const rid = Number(roleId);
  return (
    dataStore.customRoles.find(
      (r) => r.custom_role_id === rid && r.organization_id === oid,
    ) || null
  );
}

function permissionsForRole(roleId) {
  const rid = Number(roleId);
  const permissionIds = dataStore.rolePermissions
    .filter((rp) => rp.custom_role_id === rid)
    .map((rp) => rp.permission_id);
  return dataStore.permissions.filter((p) =>
    permissionIds.includes(p.permission_id),
  );
}

function assignPermission(roleId, permissionId) {
  const rid = Number(roleId);
  const pid = Number(permissionId);
  const already = dataStore.rolePermissions.some(
    (rp) => rp.custom_role_id === rid && rp.permission_id === pid,
  );
  if (!already)
    dataStore.rolePermissions.push({
      custom_role_id: rid,
      permission_id: pid,
    });
  return permissionsForRole(rid);
}

function unassignPermission(roleId, permissionId) {
  const rid = Number(roleId);
  const pid = Number(permissionId);
  dataStore.rolePermissions = dataStore.rolePermissions.filter(
    (rp) => !(rp.custom_role_id === rid && rp.permission_id === pid),
  );
  return permissionsForRole(rid);
}

/** Assigns a custom role to a staff user (HOM/PRE/FA — never a Patient, checked by the controller). Additive on top of their fixed actor role, never a replacement. */
function assignStaffRole(userId, roleId) {
  const uid = Number(userId);
  const rid = Number(roleId);
  const already = dataStore.staffRoleAssignments.some(
    (a) => a.user_id === uid && a.custom_role_id === rid,
  );
  if (!already)
    dataStore.staffRoleAssignments.push({
      user_id: uid,
      custom_role_id: rid,
      assigned_at: new Date().toISOString(),
    });
  return dataStore.staffRoleAssignments.filter((a) => a.user_id === uid);
}

function unassignStaffRole(userId, roleId) {
  const uid = Number(userId);
  const rid = Number(roleId);
  dataStore.staffRoleAssignments = dataStore.staffRoleAssignments.filter(
    (a) => !(a.user_id === uid && a.custom_role_id === rid),
  );
  return dataStore.staffRoleAssignments.filter((a) => a.user_id === uid);
}

function rolesForUser(userId) {
  const uid = Number(userId);
  const roleIds = dataStore.staffRoleAssignments
    .filter((a) => a.user_id === uid)
    .map((a) => a.custom_role_id);
  return dataStore.customRoles.filter((r) =>
    roleIds.includes(r.custom_role_id),
  );
}

/**
 * Every HOM/PRE/FA user in the organization, with their fixed actor role
 * and any custom roles — the roster the "assign a custom role" admin UI
 * picks from. Patient (role_id 2) and Admin (role_id 5) are excluded:
 * Patient isn't staff, and Admin is the one managing this roster, not an
 * entry on it.
 */
function staffFor(organizationId) {
  const oid = Number(organizationId);
  return dataStore.users
    .filter(
      (u) =>
        u.organization_id === oid &&
        u.role_id !== 2 &&
        u.role_id !== 5,
    )
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
