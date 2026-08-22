'use strict';

const { partial } = require('./engine');

// Port of request/dto/create-appointment.dto.ts
const createAppointmentRules = [
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'availability_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'scheduled_datetime', checks: ['isNotEmpty', 'isISO8601'] },
  { field: 'visit_type', checks: ['isNotEmpty', 'isString'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
  { field: 'created_by', checks: ['isNotEmpty', 'isInt'] },
];

const updateAppointmentRules = partial(createAppointmentRules);

module.exports = { createAppointmentRules, updateAppointmentRules };
