'use strict';

const {
  appointmentRepository,
  patientRepository,
  doctorRepository,
  preRequestRepository,
} = require('../repositories');
const { NotFoundError, ValidationError } = require('../errors');

function findAll(predicate = null) {
  return appointmentRepository.findAll(predicate);
}

function findOne(id) {
  return appointmentRepository.findById(id);
}

function create(appointment) {
  const patientId = Number(appointment.patient_id);
  if (!patientId || !patientRepository.findById(patientId)) {
    throw new NotFoundError(`Patient #${appointment.patient_id} not found`);
  }

  if (appointment.doctor_id) {
    const doctorId = Number(appointment.doctor_id);
    if (!doctorRepository.findById(doctorId)) {
      throw new NotFoundError(`Doctor #${appointment.doctor_id} not found`);
    }
  }

  return appointmentRepository.create({
    patient_id: patientId,
    doctor_id: appointment.doctor_id ? Number(appointment.doctor_id) : null,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time || null,
    scheduled_datetime: appointment.scheduled_datetime || (appointment.appointment_date ? `${appointment.appointment_date}T${appointment.appointment_time || '09:00:00'}` : null),
    department: appointment.department || 'General',
    status: appointment.status || 'SCHEDULED',
    organization_id: appointment.organization_id ? Number(appointment.organization_id) : null,
    hospital_id: appointment.hospital_id ? Number(appointment.hospital_id) : null,
  });
}

function update(id, patch) {
  const updated = appointmentRepository.update(id, patch);
  if (updated) {
    // If there's an associated preRequest, sync requested_date and requested_time as well!
    const preRequest = preRequestRepository.findOne((pr) => pr.appointment_id === id);
    if (preRequest) {
      const prPatch = {};
      if (patch.scheduled_datetime) {
        const parts = String(patch.scheduled_datetime).split('T');
        prPatch.requested_date = parts[0];
        prPatch.requested_time = parts[1] ? parts[1].slice(0, 5) : '09:00 AM';
      } else {
        if (patch.appointment_date) prPatch.requested_date = patch.appointment_date;
        if (patch.appointment_time) prPatch.requested_time = patch.appointment_time;
      }
      if (patch.doctor_id) prPatch.doctor_id = Number(patch.doctor_id);
      if (patch.department) prPatch.department = patch.department;
      preRequestRepository.update(preRequest.pre_request_id, prPatch);
    }
  }
  return updated;
}

module.exports = { findAll, findOne, create, update };
