'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
const doctorService = require('./doctor.service');

/** The booked date + time, from explicit fields or scheduled_datetime. */
function appointmentSlot(appointment) {
  const scheduled = String(appointment.scheduled_datetime || '');
  return {
    date: appointment.appointment_date || scheduled.slice(0, 10),
    time: appointment.appointment_time || scheduled.slice(11, 16),
  };
}

function findAll(predicate = null) {
  return predicate ? dataStore.appointments.filter(predicate) : dataStore.appointments;
}

function findOne(id) {
  const numId = Number(id);
  return dataStore.appointments.find((a) => a.appointment_id === numId) || null;
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

    // One doctor, one patient per slot: refuse an overlapping booking.
    const { date, time } = appointmentSlot(appointment);
    if (doctorService.findConflictingAppointment(doctorId, date, time)) {
      const err = new Error(
        'Doctor already has an appointment at this time. Please select another time slot.',
      );
      err.name = 'Conflict';
      err.statusCode = 409;
      throw err;
    }
  }

  const patient = dataStore.patients.find((p) => p.patient_id === patientId);
  const orgId = appointment.organization_id ? Number(appointment.organization_id) : (patient ? patient.organization_id : null);
  const fallbackUser = orgId ? (dataStore.users.find((u) => u.organization_id === orgId)?.user_id || 101) : 101;
  const createdBy = appointment.created_by
    ? Number(appointment.created_by)
    : patient && patient.user_id
      ? Number(patient.user_id)
      : fallbackUser;

  let scheduledDatetime = null;
  if (appointment.scheduled_datetime) {
    const parsed = new Date(appointment.scheduled_datetime);
    scheduledDatetime = !isNaN(parsed.getTime()) ? parsed.toISOString() : appointment.scheduled_datetime;
  } else if (appointment.appointment_date) {
    const timeStr = appointment.appointment_time || '09:00:00';
    const parsed = new Date(`${appointment.appointment_date} ${timeStr}`);
    scheduledDatetime = !isNaN(parsed.getTime()) ? parsed.toISOString() : `${appointment.appointment_date}T09:00:00.000Z`;
  }

  const newAppointment = {
    appointment_id:
      maxId(dataStore.appointments, 'appointment_id', 601) + 1,
    created_at: new Date().toISOString(),
    patient_id: patientId,
    doctor_id: appointment.doctor_id ? Number(appointment.doctor_id) : null,
    availability_id: appointment.availability_id ? Number(appointment.availability_id) : null,
    appointment_date: appointment.appointment_date || (scheduledDatetime ? scheduledDatetime.slice(0, 10) : null),
    appointment_time: appointment.appointment_time || (scheduledDatetime ? scheduledDatetime.slice(11, 16) : null),
    scheduled_datetime: scheduledDatetime,
    department: appointment.department || 'General',
    visit_type: appointment.visit_type || 'Consultation',
    status: appointment.status || 'CONFIRMED',
    created_by: createdBy,
    organization_id: orgId,
    hospital_id: appointment.hospital_id ? Number(appointment.hospital_id) : null,
  };
  dataStore.appointments.push(newAppointment);
  return newAppointment;
}

function update(id, patch) {
  const numId = Number(id);
  const appointment = findOne(numId);
  if (!appointment) return null;
  const {
    appointment_id: _appointmentId,
    organization_id: _organizationId,
    hospital_id: _hospitalId,
    created_by: _createdBy,
    created_at: _createdAt,
    ...safePatch
  } = patch;
  Object.assign(appointment, safePatch);

  // If there's an associated preRequest, sync requested_date and requested_time as well!
  const preRequest = dataStore.preRequests.find((pr) => Number(pr.appointment_id) === numId);
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

/**
 * Boot-time repair (bootstrap.js): older appointments only carry the
 * availability slot they were booked against, not the doctor, so doctor-level
 * conflict checks never saw them. Resolves doctor_id through that slot.
 * Idempotent; returns how many rows were filled in.
 */
function backfillDoctorIds() {
  let filled = 0;
  dataStore.appointments.forEach((appointment) => {
    if (appointment.doctor_id || !appointment.availability_id) return;
    const slot = dataStore.doctorAvailabilities.find(
      (a) => a.availability_id === Number(appointment.availability_id),
    );
    if (slot && slot.doctor_id) {
      appointment.doctor_id = Number(slot.doctor_id);
      filled++;
    }
  });
  return filled;
}

module.exports = { findAll, findOne, create, update, backfillDoctorIds };
