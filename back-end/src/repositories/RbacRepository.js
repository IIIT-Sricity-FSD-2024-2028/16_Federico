'use strict';

const BaseRepository = require('./BaseRepository');

class RbacRepository extends BaseRepository {
  constructor() {
    super('customRoles', 'custom_role_id');
    this.permissionsRepo = new BaseRepository('permissions', 'permission_id');
    this.rolePermissionsRepo = new BaseRepository('rolePermissions', 'role_permission_id');
    this.staffAssignmentsRepo = new BaseRepository('staffRoleAssignments', 'assignment_id');
  }

  // Permissions catalog
  findAllPermissions() {
    return this.permissionsRepo.findAll();
  }

  findPermissionByCode(code) {
    return this.permissionsRepo.findOne((p) => p.permission_code === code);
  }

  createPermission(permission) {
    return this.permissionsRepo.create(permission);
  }

  // Role Permissions
  findPermissionsForRole(customRoleId) {
    const rid = Number(customRoleId);
    const links = this.rolePermissionsRepo.findAll((rp) => rp.custom_role_id === rid);
    const permIds = links.map((l) => l.permission_id);
    return this.permissionsRepo.findAll((p) => permIds.includes(p.permission_id));
  }

  assignPermissionToRole(customRoleId, permissionId) {
    const rid = Number(customRoleId);
    const pid = Number(permissionId);
    const exists = this.rolePermissionsRepo.findOne(
      (rp) => rp.custom_role_id === rid && rp.permission_id === pid,
    );
    if (exists) return exists;
    return this.rolePermissionsRepo.create({
      custom_role_id: rid,
      permission_id: pid,
    });
  }

  unassignPermissionFromRole(customRoleId, permissionId) {
    const rid = Number(customRoleId);
    const pid = Number(permissionId);
    const match = this.rolePermissionsRepo.findOne(
      (rp) => rp.custom_role_id === rid && rp.permission_id === pid,
    );
    if (!match) return false;
    return this.rolePermissionsRepo.delete(match.role_permission_id);
  }

  // Staff Assignments
  findRolesForStaff(userId) {
    const uid = Number(userId);
    const assignments = this.staffAssignmentsRepo.findAll((sa) => sa.user_id === uid);
    const roleIds = assignments.map((a) => a.custom_role_id);
    return this.findAll((r) => roleIds.includes(r.custom_role_id));
  }

  assignRoleToStaff(userId, customRoleId) {
    const uid = Number(userId);
    const rid = Number(customRoleId);
    const exists = this.staffAssignmentsRepo.findOne(
      (sa) => sa.user_id === uid && sa.custom_role_id === rid,
    );
    if (exists) return exists;
    return this.staffAssignmentsRepo.create({
      user_id: uid,
      custom_role_id: rid,
    });
  }

  unassignRoleFromStaff(userId, customRoleId) {
    const uid = Number(userId);
    const rid = Number(customRoleId);
    const match = this.staffAssignmentsRepo.findOne(
      (sa) => sa.user_id === uid && sa.custom_role_id === rid,
    );
    if (!match) return false;
    return this.staffAssignmentsRepo.delete(match.assignment_id);
  }
}

module.exports = new RbacRepository();
