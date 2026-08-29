'use strict';

const { partial } = require('./engine');

const createDoctorRules = [
  { field: 'name', checks: ['isNotEmpty', 'isString'] },
  { field: 'specialization', checks: ['isNotEmpty', 'isString'] },
  { field: 'department', checks: ['isString'], optional: true },
  { field: 'phone', checks: ['isPhoneNumber'], optional: true },
  { field: 'email', checks: ['isEmail'], optional: true },
];

const updateDoctorRules = partial(createDoctorRules);

const createDoctorAvailabilityRules = [
  { field: 'doctor_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'available_date', checks: ['isNotEmpty', 'isString'] },
  { field: 'start_time', checks: ['isNotEmpty', 'isString'] },
  { field: 'end_time', checks: ['isNotEmpty', 'isString'] },
  { field: 'status', checks: ['isString'], optional: true },
];

module.exports = {
  createDoctorRules,
  updateDoctorRules,
  createDoctorAvailabilityRules,
};
