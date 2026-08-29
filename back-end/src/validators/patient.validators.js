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
  // member_id / validity dates are optional: the PRE walk-in registration
  // form only captures provider + policy number + coverage limit, and the
  // patient can fill the rest later from their profile page. The service
  // layer supplies safe defaults (patient.service.js#createInsurance).
  { field: 'member_id', checks: ['isString'], optional: true },
  { field: 'coverage_type', checks: ['isNotEmpty', 'isString'] },
  { field: 'valid_from', checks: ['isISO8601'], optional: true },
  { field: 'valid_to', checks: ['isISO8601'], optional: true },
  // Phase 2 additions: the amount InsuranceCalc.computePatientShare()
  // (front-end/shared/insurance.js) needs to split a bill between
  // insurer and patient. Optional so the Phase-1 contract shape still
  // validates unchanged.
  { field: 'coverage_limit', checks: ['isNumber'], optional: true },
  { field: 'copay_percentage', checks: ['isNumber'], optional: true },
  // Set from POST /uploads/document's response URL when the patient scans
  // their insurance card via the profile page's upload boxes.
  { field: 'card_front_url', checks: ['isString'], optional: true },
  { field: 'card_back_url', checks: ['isString'], optional: true },
];

module.exports = {
  createPatientRules,
  updatePatientRules,
  createPatientInsuranceRules,
};
