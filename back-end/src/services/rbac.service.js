'use strict';

const { rbacRepository, userRepository } = require('../repositories');
const { ROLE_ID_TO_NAME } = require('../utils/roles');

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

function ensurePermissionCatalog() {
  PERMISSION_CATALOG.forEach(([resource, mode]) => {
    const code = `${resource}:${mode}`;
    const exists = rbacRepository.findPermissionByCode(code);
    if (!exists) {
      rbacRepository.createPermission({
        permission_code: code,
        description: `${mode === 'read' ? 'View' : 'Manage'} ${resource} records`,
      });
    }
  });
  return rbacRepository.findAllPermissions();
}

function listPermissions() {
  return rbacRepository.findAllPermissions();
}

function listRoles(organizationId) {
  const oid = Number(organizationId);
  return rbacRepository.findAll((r) => r.organization_id === oid);
}

function createRole(organizationId, payload) {
  return rbacRepository.create({
    organization_id: Number(organizationId),
    role_name: payload.role_name,
    description: payload.description || null,
  });
}

function findRole(organizationId, roleId) {
  const oid = Number(organizationId);
  const rid = Number(roleId);
  return rbacRepository.findOne(
    (r) => r.custom_role_id === rid && r.organization_id === oid,
  );
}

function permissionsForRole(roleId) {
  return rbacRepository.findPermissionsForRole(roleId);
}

function assignPermission(roleId, permissionId) {
  rbacRepository.assignPermissionToRole(roleId, permissionId);
  return permissionsForRole(roleId);
}

function unassignPermission(roleId, permissionId) {
  rbacRepository.unassignPermissionFromRole(roleId, permissionId);
  return permissionsForRole(roleId);
}

function assignStaffRole(userId, roleId) {
  rbacRepository.assignRoleToStaff(userId, roleId);
  return rbacRepository.staffAssignmentsRepo.findAll((a) => a.user_id === Number(userId));
}

function unassignStaffRole(userId, roleId) {
  rbacRepository.unassignRoleFromStaff(userId, roleId);
  return rbacRepository.staffAssignmentsRepo.findAll((a) => a.user_id === Number(userId));
}

function rolesForUser(userId) {
  return rbacRepository.findRolesForStaff(userId);
}

function staffFor(organizationId) {
  const oid = Number(organizationId);
  return userRepository
    .findAll(
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
