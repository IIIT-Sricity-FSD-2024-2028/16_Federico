'use strict';

const { partial } = require('./engine');

// Port of doctor/create-doctor.dto.ts
const createDoctorRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'specialization', checks: ['isNotEmpty', 'isString'] },
  { field: 'phone', checks: ['isPhoneNumber'] },
  { field: 'email', checks: ['isEmail'] },
];

const updateDoctorRules = partial(createDoctorRules);

const createDoctorAvailabilityRules = [
  { field: 'doctor_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'available_date', checks: ['isNotEmpty', 'isString'] },
  { field: 'start_time', checks: ['isNotEmpty', 'isString'] },
  { field: 'end_time', checks: ['isNotEmpty', 'isString'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
];

module.exports = {
  createDoctorRules,
  updateDoctorRules,
  createDoctorAvailabilityRules,
};
