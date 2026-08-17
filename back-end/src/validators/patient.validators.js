'use strict';

const { partial } = require('./engine');

// Port of patient/dto/create-patient.dto.ts, with two Phase 2 relaxations
// (both additive/backward-compatible — anything that used to validate
// still validates identically):
//   - user_id is now optional: PRE registers walk-in patients who don't
//     have a login account yet, so there's no user_id to attach.
//   - uhid is now optional: the backend generates one when omitted
//     (patient.service.js#generateUhid), so the frontend no longer has
//     to invent UHIDs client-side.
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
  // Phase 2 additions: the amount InsuranceCalc.computePatientShare()
  // (front-end/shared/insurance.js) needs to split a bill between
  // insurer and patient. Optional so the Phase-1 contract shape still
  // validates unchanged.
  { field: 'coverage_limit', checks: ['isNumber'], optional: true },
  { field: 'copay_percentage', checks: ['isNumber'], optional: true },
];

module.exports = { createPatientRules, updatePatientRules, createPatientInsuranceRules };
