'use strict';

const { partial } = require('./engine');

const createAppointmentRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'doctor_id', checks: ['isInt'], optional: true },
  { field: 'appointment_date', checks: ['isString'], optional: true },
  { field: 'appointment_time', checks: ['isString'], optional: true },
  { field: 'department', checks: ['isString'], optional: true },
  { field: 'availability_id', checks: ['isInt'], optional: true },
  { field: 'scheduled_datetime', checks: ['isISO8601'], optional: true },
  { field: 'visit_type', checks: ['isString'], optional: true },
  { field: 'status', checks: ['isString'], optional: true },
  { field: 'created_by', checks: ['isInt'], optional: true },
];

const updateAppointmentRules = partial(createAppointmentRules);

module.exports = { createAppointmentRules, updateAppointmentRules };
