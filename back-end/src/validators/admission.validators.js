'use strict';

const { partial } = require('./engine');

// Port of admission/dto/create-admission.dto.ts
const createAdmissionRules = [
  { field: 'appointment_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'bed_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'admit_time', checks: ['isISO8601'], optional: true },
  { field: 'discharge_time', checks: ['isISO8601'], optional: true },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
];

const updateAdmissionRules = partial(createAdmissionRules);

module.exports = { createAdmissionRules, updateAdmissionRules };
