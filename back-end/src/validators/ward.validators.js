'use strict';

// Port of ward/create-ward.dto.ts
const createWardRules = [
  { field: 'ward_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'total_beds', checks: ['isNotEmpty', 'isInt'] },
  { field: 'description', checks: ['isString'], optional: true },
];

const createBedRules = [
  { field: 'ward_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'bed_number', checks: ['isNotEmpty', 'isString'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
];

// UpdateBedStatusDto is NOT a PartialType in the original — status stays required.
const updateBedStatusRules = [{ field: 'status', checks: ['isNotEmpty', 'isString'] }];

// Phase 2 additions
const createBedRequestRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'pre_request_id', checks: ['isInt'], optional: true },
  { field: 'ward_id', checks: ['isInt'], optional: true },
  { field: 'priority', checks: ['isString'], optional: true },
];

const updateBedRequestRules = [
  { field: 'bed_id', checks: ['isInt'], optional: true },
  { field: 'status', checks: ['isString'], optional: true },
];

const createEmergencyRules = [
  { field: 'patient_id', checks: ['isInt'], optional: true },
  { field: 'bed_id', checks: ['isInt'], optional: true },
  { field: 'department', checks: ['isString'], optional: true },
];

const updateEmergencyRules = [
  { field: 'patient_id', checks: ['isInt'], optional: true },
  { field: 'status', checks: ['isNotEmpty', 'isString'], optional: true },
];

module.exports = {
  createWardRules,
  createBedRules,
  updateBedStatusRules,
  createBedRequestRules,
  updateBedRequestRules,
  createEmergencyRules,
  updateEmergencyRules,
};
