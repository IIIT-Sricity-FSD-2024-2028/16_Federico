'use strict';

const createRoleRules = [
  { field: 'role_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'description', checks: ['isString'], optional: true },
];

const assignPermissionRules = [{ field: 'permission_id', checks: ['isNotEmpty', 'isInt'] }];

const assignStaffRoleRules = [{ field: 'custom_role_id', checks: ['isNotEmpty', 'isInt'] }];

module.exports = { createRoleRules, assignPermissionRules, assignStaffRoleRules };
