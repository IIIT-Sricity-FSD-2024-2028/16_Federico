'use strict';

const platformLoginRules = [
  { field: 'email', checks: ['isNotEmpty', 'isString'] },
  { field: 'password', checks: ['isNotEmpty', 'isString'] },
];

const provisionOrganizationRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'admin_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'admin_email', checks: ['isNotEmpty', 'isEmail'] },
  { field: 'admin_password', checks: ['isNotEmpty', 'isString'] },
  { field: 'plan_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'city', checks: ['isString'], optional: true },
  { field: 'emergency_available', checks: ['isBoolean'], optional: true },
];

const createHospitalRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'city', checks: ['isString'], optional: true },
  { field: 'address', checks: ['isString'], optional: true },
  { field: 'phone', checks: ['isString'], optional: true },
];

const setModuleFlagRules = [
  { field: 'enabled', checks: ['isBoolean'] },
  { field: 'instances', checks: ['isInt'], optional: true },
];

const createApiKeyRules = [
  { field: 'label', checks: ['isString'], optional: true },
];

const createPlanRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'max_beds', checks: ['isNotEmpty', 'isInt'] },
  { field: 'max_users', checks: ['isNotEmpty', 'isInt'] },
  { field: 'max_hospitals', checks: ['isNotEmpty', 'isInt'] },
  { field: 'storage_gb', checks: ['isNotEmpty', 'isInt'] },
  { field: 'api_rate_limit', checks: ['isNotEmpty', 'isInt'] },
  { field: 'price_monthly', checks: ['isNotEmpty', 'isNumber'] },
];

const setSubscriptionRules = [
  { field: 'plan_id', checks: ['isNotEmpty', 'isInt'] },
];

module.exports = {
  platformLoginRules,
  provisionOrganizationRules,
  createHospitalRules,
  setModuleFlagRules,
  createApiKeyRules,
  createPlanRules,
  setSubscriptionRules,
};
