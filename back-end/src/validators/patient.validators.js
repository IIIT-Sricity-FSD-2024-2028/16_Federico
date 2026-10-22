'use strict';

const { partial } = require('./engine');

const createPatientRules = [
  { field: 'user_id', checks: ['isInt'], optional: true },
  { field: 'uhid', checks: ['isNotEmpty', 'isString'], optional: true },
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'phone', checks: ['isPhoneNumber'] },
  { field: 'alternate_phone', checks: ['isPhoneNumber'], optional: true },
  { field: 'dob', checks: ['isISO8601'] },
  { field: 'gender', checks: ['isNotEmpty', 'isString'] },
  { field: 'blood_group', checks: ['isString'], optional: true },
  { field: 'address', checks: ['isString'], optional: true },
  { field: 'emergency_contact_name', checks: ['isString'], optional: true },
  {
    field: 'emergency_contact_phone',
    checks: ['isPhoneNumber'],
    optional: true,
  },
];

const updatePatientRules = partial(createPatientRules);

const createPatientInsuranceRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'provider_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'policy_number', checks: ['isNotEmpty', 'isString'] },
  { field: 'member_id', checks: ['isString'], optional: true },
  { field: 'coverage_type', checks: ['isNotEmpty', 'isString'] },
  { field: 'valid_from', checks: ['isISO8601'], optional: true },
  { field: 'valid_to', checks: ['isISO8601'], optional: true },
  { field: 'coverage_limit', checks: ['isNumber'], optional: true },
  { field: 'copay_percentage', checks: ['isNumber'], optional: true },
  { field: 'card_front_url', checks: ['isString'], optional: true },
  { field: 'card_back_url', checks: ['isString'], optional: true },
];

module.exports = {
  createPatientRules,
  updatePatientRules,
  createPatientInsuranceRules,
};
