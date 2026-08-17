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

module.exports = { createWardRules, createBedRules, updateBedStatusRules };
