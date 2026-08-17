'use strict';

const { partial } = require('./engine');

// Port of patient/dto/create-patient.dto.ts
const createPatientRules = [
  { field: 'user_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'uhid', checks: ['isNotEmpty', 'isString'] },
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'phone', checks: ['isPhoneNumber'] },
  { field: 'alternate_phone', checks: ['isPhoneNumber'], optional: true },
  { field: 'dob', checks: ['isISO8601'] },
  { field: 'gender', checks: ['isNotEmpty', 'isString'] },
  { field: 'blood_group', checks: ['isString'], optional: true },
  { field: 'address', checks: ['isString'], optional: true },
  { field: 'emergency_contact_name', checks: ['isString'], optional: true },
  { field: 'emergency_contact_phone', checks: ['isPhoneNumber'], optional: true },
];

const updatePatientRules = partial(createPatientRules);

const createPatientInsuranceRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'provider_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'policy_number', checks: ['isNotEmpty', 'isString'] },
  { field: 'member_id', checks: ['isNotEmpty', 'isString'] },
  { field: 'coverage_type', checks: ['isNotEmpty', 'isString'] },
  { field: 'valid_from', checks: ['isISO8601'] },
  { field: 'valid_to', checks: ['isISO8601'] },
];

module.exports = { createPatientRules, updatePatientRules, createPatientInsuranceRules };
