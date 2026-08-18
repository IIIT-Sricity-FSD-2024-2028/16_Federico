'use strict';

const loginRules = [
  { field: 'email', checks: ['isNotEmpty', 'isString'] },
  { field: 'password', checks: ['isNotEmpty', 'isString'] },
  // Optional: set by the marketplace "pick an organization" flow (tasks.md
  // §11) so login can cross-check the account actually belongs there.
  { field: 'organization_id', checks: ['isInt'], optional: true },
];

const signupRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'email', checks: ['isNotEmpty', 'isEmail'] },
  { field: 'password', checks: ['isNotEmpty', 'isString'] },
  { field: 'phone', checks: ['isPhoneNumber'] },
  { field: 'dob', checks: ['isISO8601'] },
  { field: 'gender', checks: ['isNotEmpty', 'isString'] },
  { field: 'organization_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'blood_group', checks: ['isString'], optional: true },
  { field: 'address', checks: ['isString'], optional: true },
  { field: 'emergency_contact_name', checks: ['isString'], optional: true },
  {
    field: 'emergency_contact_phone',
    checks: ['isPhoneNumber'],
    optional: true,
  },
];

module.exports = { loginRules, signupRules };
