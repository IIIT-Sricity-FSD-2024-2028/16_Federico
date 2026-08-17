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

// Covers both kinds of PUT body (see preRequest.controller.js#update):
// a status transition ({status, reject_reason?}) or a field update
// (doctor_id/requested_date/requested_time/department/ward_type). No
// `bed_id` or `hom_status` here — bed assignment only ever happens
// through the ward bed-allocation cascade, and hom_status is derived
// server-side from the status transition, never client-settable.
const updatePreRequestRules = [
  { field: 'status', checks: ['isNotEmpty', 'isString'], optional: true },
  { field: 'reject_reason', checks: ['isString'], optional: true },
  { field: 'ward_type', checks: ['isString'], optional: true },
  { field: 'requested_date', checks: ['isISO8601'], optional: true },
  { field: 'requested_time', checks: ['isString'], optional: true },
  { field: 'doctor_id', checks: ['isInt'], optional: true },
  { field: 'department', checks: ['isNotEmpty', 'isString'], optional: true },
  { field: 'visit_type', checks: ['isNotEmpty', 'isString'], optional: true },
];

module.exports = { createPreRequestRules, updatePreRequestRules };
