'use strict';

const createPreRequestRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'appointment_id', checks: ['isInt'], optional: true },
  { field: 'department', checks: ['isNotEmpty', 'isString'] },
  { field: 'doctor_id', checks: ['isInt'], optional: true },
  { field: 'visit_type', checks: ['isNotEmpty', 'isString'] },
  { field: 'ward_type', checks: ['isString'], optional: true },
  { field: 'requested_date', checks: ['isISO8601'], optional: true },
  { field: 'requested_time', checks: ['isString'], optional: true },
];

const updatePreRequestRules = [
  { field: 'status', checks: ['isNotEmpty', 'isString'], optional: true },
  { field: 'hom_status', checks: ['isNotEmpty', 'isString'], optional: true },
  { field: 'bed_id', checks: ['isInt'], optional: true },
  { field: 'reject_reason', checks: ['isString'], optional: true },
  { field: 'ward_type', checks: ['isString'], optional: true },
  { field: 'requested_date', checks: ['isISO8601'], optional: true },
  { field: 'requested_time', checks: ['isString'], optional: true },
  { field: 'doctor_id', checks: ['isInt'], optional: true },
];

module.exports = { createPreRequestRules, updatePreRequestRules };
