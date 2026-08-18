'use strict';

const rbacService = require('./rbac.service');

describe('services/rbac.service', () => {
  it('ensurePermissionCatalog() is idempotent and seeds the fixed resource:mode catalog', () => {
    rbacService.ensurePermissionCatalog();
    const first = rbacService.listPermissions().length;
    rbacService.ensurePermissionCatalog();
    const second = rbacService.listPermissions().length;
    expect(second).toBe(first);
    expect(
      rbacService
        .listPermissions()
        .some((p) => p.permission_code === 'billing:read'),
    ).toBe(true);
  });

  it('createRole()/assignPermission()/permissionsForRole() round-trip within one organization', () => {
    rbacService.ensurePermissionCatalog();
    const role = rbacService.createRole(9001, {
      role_name: 'Unit Test Role',
      description: 'test',
    });
    expect(rbacService.listRoles(9001)).toContainEqual(role);

    const permission = rbacService
      .listPermissions()
      .find((p) => p.permission_code === 'ward:read');
    rbacService.assignPermission(role.custom_role_id, permission.permission_id);
    expect(rbacService.permissionsForRole(role.custom_role_id)).toContainEqual(
      permission,
    );

    // Assigning the same permission twice does not duplicate it.
    rbacService.assignPermission(role.custom_role_id, permission.permission_id);
    expect(rbacService.permissionsForRole(role.custom_role_id)).toHaveLength(1);
  });

  it('unassignPermission() removes exactly the one role/permission pairing', () => {
    const role = rbacService.createRole(9007, {
      role_name: 'Revoke Test Role',
    });
    const permA = rbacService
      .listPermissions()
      .find((p) => p.permission_code === 'doctor:read');
    const permB = rbacService
      .listPermissions()
      .find((p) => p.permission_code === 'ward:read');
    rbacService.assignPermission(role.custom_role_id, permA.permission_id);
    rbacService.assignPermission(role.custom_role_id, permB.permission_id);

    const afterRevoke = rbacService.unassignPermission(
      role.custom_role_id,
      permA.permission_id,
    );
    expect(afterRevoke).toEqual([permB]);
  });

  it('findRole() only matches within the given organization', () => {
    const role = rbacService.createRole(9002, { role_name: 'Org-Scoped Role' });
    expect(rbacService.findRole(9002, role.custom_role_id)).toEqual(role);
    expect(rbacService.findRole(9003, role.custom_role_id)).toBeNull();
  });

  it('assignStaffRole() is idempotent per user/role pair', () => {
    const role = rbacService.createRole(9004, {
      role_name: 'Assign Test Role',
    });
    rbacService.assignStaffRole(5001, role.custom_role_id);
    rbacService.assignStaffRole(5001, role.custom_role_id);
    const assignments = rbacService.assignStaffRole(5001, role.custom_role_id);
    expect(assignments).toHaveLength(1);
  });

  it('unassignStaffRole() removes exactly the one role/user pairing', () => {
    const roleA = rbacService.createRole(9005, { role_name: 'Role A' });
    const roleB = rbacService.createRole(9005, { role_name: 'Role B' });
    rbacService.assignStaffRole(5002, roleA.custom_role_id);
    rbacService.assignStaffRole(5002, roleB.custom_role_id);

    const afterRemove = rbacService.unassignStaffRole(
      5002,
      roleA.custom_role_id,
    );
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].custom_role_id).toBe(roleB.custom_role_id);
  });

  it('rolesForUser() resolves assignment ids to full role records', () => {
    const role = rbacService.createRole(9006, { role_name: 'Resolved Role' });
    rbacService.assignStaffRole(5003, role.custom_role_id);
    expect(rbacService.rolesForUser(5003)).toContainEqual(role);
    expect(rbacService.rolesForUser(999999)).toEqual([]);
  });

  it('staffFor() lists only non-Patient users in the organization, each with their custom roles resolved', () => {
    // Uses the real seeded org-1 dataset (see dataStore.js / seed-multitenant.js):
    // admin@hosp.com (HOM), rekha.pre@hosp.com (PRE), farah.fa@hosp.com (FA),
    // billing.assist@hosp.com (PRE, has a custom role) all live in organization_id 1,
    // alongside several Patient users that must NOT appear here.
    const staff = rbacService.staffFor(1);
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.every((s) => s.actor_role !== 'Patient')).toBe(true);

    const hom = staff.find((s) => s.email === 'admin@hosp.com');
    expect(hom.actor_role).toBe('HOM');

    const billingAssist = staff.find(
      (s) => s.email === 'billing.assist@hosp.com',
    );
    expect(
      billingAssist.custom_roles.some(
        (r) => r.role_name === 'Billing Assistant',
      ),
    ).toBe(true);
  });
});
