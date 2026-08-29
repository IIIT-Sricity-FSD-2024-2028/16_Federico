'use strict';

const createRoleRules = [
  { field: 'role_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'description', checks: ['isString'], optional: true },
];

const assignPermissionRules = [
  { field: 'permission_id', checks: ['isNotEmpty', 'isInt'] },
];

const assignStaffRoleRules = [
  { field: 'custom_role_id', checks: ['isNotEmpty', 'isInt'] },
];

const createStaffRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'email', checks: ['isNotEmpty', 'isEmail'] },
  { field: 'password', checks: ['isNotEmpty', 'isString'] },
  { field: 'actor_role', checks: ['isNotEmpty', 'isString'] },
];

module.exports = {
  createRoleRules,
  assignPermissionRules,
  assignStaffRoleRules,
  createStaffRules,
};
