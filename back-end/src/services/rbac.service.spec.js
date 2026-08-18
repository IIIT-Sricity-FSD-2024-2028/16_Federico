'use strict';

const rbacService = require('./rbac.service');

describe('services/rbac.service', () => {
  it('ensurePermissionCatalog() is idempotent and seeds the fixed resource:mode catalog', () => {
    rbacService.ensurePermissionCatalog();
    const first = rbacService.listPermissions().length;
    rbacService.ensurePermissionCatalog();
    const second = rbacService.listPermissions().length;
    expect(second).toBe(first);
    expect(rbacService.listPermissions().some((p) => p.permission_code === 'billing:read')).toBe(true);
  });

  it('createRole()/assignPermission()/permissionsForRole() round-trip within one organization', () => {
    rbacService.ensurePermissionCatalog();
    const role = rbacService.createRole(9001, { role_name: 'Unit Test Role', description: 'test' });
    expect(rbacService.listRoles(9001)).toContainEqual(role);

    const permission = rbacService.listPermissions().find((p) => p.permission_code === 'ward:read');
    rbacService.assignPermission(role.custom_role_id, permission.permission_id);
    expect(rbacService.permissionsForRole(role.custom_role_id)).toContainEqual(permission);

    // Assigning the same permission twice does not duplicate it.
    rbacService.assignPermission(role.custom_role_id, permission.permission_id);
    expect(rbacService.permissionsForRole(role.custom_role_id)).toHaveLength(1);
  });

  it('findRole() only matches within the given organization', () => {
    const role = rbacService.createRole(9002, { role_name: 'Org-Scoped Role' });
    expect(rbacService.findRole(9002, role.custom_role_id)).toEqual(role);
    expect(rbacService.findRole(9003, role.custom_role_id)).toBeNull();
  });

  it('assignStaffRole() is idempotent per user/role pair', () => {
    const role = rbacService.createRole(9004, { role_name: 'Assign Test Role' });
    rbacService.assignStaffRole(5001, role.custom_role_id);
    rbacService.assignStaffRole(5001, role.custom_role_id);
    const assignments = rbacService.assignStaffRole(5001, role.custom_role_id);
    expect(assignments).toHaveLength(1);
  });
});
