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
  { field: 'note', checks: ['isString'], optional: true },
  { field: 'document_urls', checks: ['isArray'], optional: true },
];

// Status transitions may include scheduling fields when approving. No
// `bed_id` or `hom_status` here — bed assignment only ever happens
// through the ward bed-allocation cascade, and hom_status is derived
// server-side from the status transition, never client-settable.
const updatePreRequestRules = [
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
  { field: 'reject_reason', checks: ['isString'], optional: true },
  { field: 'requested_date', checks: ['isISO8601'], optional: true },
  { field: 'requested_time', checks: ['isString'], optional: true },
  { field: 'doctor_id', checks: ['isInt'], optional: true },
  { field: 'department', checks: ['isNotEmpty', 'isString'], optional: true },
];

module.exports = { createPreRequestRules, updatePreRequestRules };
