'use strict';

const {
  appointmentRepository,
  patientRepository,
  doctorRepository,
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
    department: appointment.department || 'General',
    status: appointment.status || 'SCHEDULED',
    organization_id: appointment.organization_id ? Number(appointment.organization_id) : null,
    hospital_id: appointment.hospital_id ? Number(appointment.hospital_id) : null,
  });
}

function update(id, patch) {
  return appointmentRepository.update(id, patch);
}

module.exports = { findAll, findOne, create, update };
