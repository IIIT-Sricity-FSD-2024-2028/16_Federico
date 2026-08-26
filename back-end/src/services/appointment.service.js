'use strict';

const dataStore = require('../store/dataStore');

function findAll(predicate = null) {
  return predicate ? dataStore.appointments.filter(predicate) : dataStore.appointments;
}

function findOne(id) {
  return dataStore.appointments.find((a) => a.appointment_id === id) || null;
}

function create(appointment) {
  const patientId = Number(appointment.patient_id);
  if (!patientId || !dataStore.patients.find((p) => p.patient_id === patientId)) {
    const err = new Error(`Patient #${appointment.patient_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (appointment.doctor_id) {
    const doctorId = Number(appointment.doctor_id);
    if (!dataStore.doctors.find((d) => d.doctor_id === doctorId)) {
      const err = new Error(`Doctor #${appointment.doctor_id} not found`);
      err.statusCode = 404;
      throw err;
    }
  }

  const newAppointment = {
    appointment_id:
      dataStore.appointments.length > 0
        ? Math.max(...dataStore.appointments.map((a) => a.appointment_id)) + 1
        : 601,
    created_at: new Date().toISOString(),
    patient_id: patientId,
    doctor_id: appointment.doctor_id ? Number(appointment.doctor_id) : null,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time || null,
    scheduled_datetime: appointment.scheduled_datetime || (appointment.appointment_date ? `${appointment.appointment_date}T${appointment.appointment_time || '09:00:00'}` : null),
    department: appointment.department || 'General',
    status: appointment.status || 'SCHEDULED',
    organization_id: appointment.organization_id ? Number(appointment.organization_id) : null,
    hospital_id: appointment.hospital_id ? Number(appointment.hospital_id) : null,
  };
  dataStore.appointments.push(newAppointment);
  return newAppointment;
}

function update(id, patch) {
  const appointment = findOne(id);
  if (!appointment) return null;
  Object.assign(appointment, patch);

  // If there's an associated preRequest, sync requested_date and requested_time as well!
  const preRequest = dataStore.preRequests.find((pr) => pr.appointment_id === id);
  if (preRequest) {
    if (patch.scheduled_datetime) {
      const parts = String(patch.scheduled_datetime).split('T');
      preRequest.requested_date = parts[0];
      preRequest.requested_time = parts[1] ? parts[1].slice(0, 5) : '09:00 AM';
    } else {
      if (patch.appointment_date) preRequest.requested_date = patch.appointment_date;
      if (patch.appointment_time) preRequest.requested_time = patch.appointment_time;
    }
    if (patch.doctor_id) preRequest.doctor_id = Number(patch.doctor_id);
    if (patch.department) preRequest.department = patch.department;
  }

  return appointment;
}

module.exports = { findAll, findOne, create, update };
