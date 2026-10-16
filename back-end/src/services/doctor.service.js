'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

const UNAVAILABLE_MESSAGE = 'Doctor is not available at this time. Please select another time slot.';

// DOCTOR
function findAllDoctors(predicate = null) {
  return typeof predicate === 'function'
    ? dataStore.doctors.filter(predicate)
    : dataStore.doctors;
}

function findDoctorById(doctor_id) {
  const numId = Number(doctor_id);
  return dataStore.doctors.find((d) => Number(d.doctor_id) === numId) || null;
}

function createDoctor(doctor) {
  const newDoctor = {
    doctor_id:
      maxId(dataStore.doctors, 'doctor_id', 401) + 1,
    name: doctor.name,
    specialization: doctor.specialization || 'General Practitioner',
    department: doctor.department || 'General',
    phone: doctor.phone || null,
    email: doctor.email || null,
    is_active: doctor.is_active !== undefined ? Boolean(doctor.is_active) : true,
    organization_id: doctor.organization_id ? Number(doctor.organization_id) : null,
    hospital_id: doctor.hospital_id ? Number(doctor.hospital_id) : null,
  };
  dataStore.doctors.push(newDoctor);
  return newDoctor;
}

function updateDoctor(doctor_id, patch) {
  const doc = findDoctorById(doctor_id);
  if (!doc) return null;
  const { doctor_id: _did, organization_id: _oid, hospital_id: _hid, created_at: _cat, ...safePatch } = patch;
  Object.assign(doc, safePatch);
  return doc;
}

function deleteDoctor(doctor_id) {
  const numId = Number(doctor_id);
  const doctor = findDoctorById(numId);
  if (!doctor) {
    return { deleted: false };
  }
  // Soft-deletion to guard referential integrity with appointments
  doctor.is_active = false;
  doctor.status = 'INACTIVE';
  dataStore.doctors = dataStore.doctors.filter(
    (d) => Number(d.doctor_id) !== numId,
  );
  return { deleted: true };
}

// DOCTOR_AVAILABILITY
function findAllAvailabilities() {
  return dataStore.doctorAvailabilities;
}

function findAvailabilityByDoctor(doctor_id) {
  const numId = Number(doctor_id);
  return dataStore.doctorAvailabilities.filter(
    (a) => Number(a.doctor_id) === numId,
  );
}

function findAvailabilityById(availability_id) {
  const numId = Number(availability_id);
  return (
    dataStore.doctorAvailabilities.find(
      (a) => Number(a.availability_id) === numId,
    ) || null
  );
}

function createAvailability(availability) {
  const doctorId = Number(availability.doctor_id);
  const doctor = findDoctorById(doctorId);
  if (!doctor) {
    const err = new Error(`Doctor #${availability.doctor_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const newAvail = {
    availability_id:
      maxId(dataStore.doctorAvailabilities, 'availability_id', 501) + 1,
    doctor_id: doctorId,
    available_date: availability.available_date,
    start_time: availability.start_time,
    end_time: availability.end_time,
    status: availability.status || 'Available',
    organization_id: availability.organization_id ? Number(availability.organization_id) : (doctor.organization_id ? Number(doctor.organization_id) : null),
    hospital_id: availability.hospital_id ? Number(availability.hospital_id) : (doctor.hospital_id ? Number(doctor.hospital_id) : null),
  };
  dataStore.doctorAvailabilities.push(newAvail);
  return newAvail;
}

function toDateKey(value) {
  return value ? String(value).slice(0, 10) : '';
}

function toMinutes(value) {
  if (!value) return null;
  const clean = String(value).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Standard duty roster used when a doctor has no explicit availability rows
// for a date: Monday–Friday, 09:00–17:00. The seed calendar only covers a
// handful of dates, so without this default every real date was either
// wide open (any hour, any day) or unbookable.
const DUTY_DAYS = [1, 2, 3, 4, 5]; // getUTCDay(): Mon..Fri
const DUTY_START_MINUTES = 9 * 60;
const DUTY_END_MINUTES = 17 * 60;
// Two bookings for the same doctor closer than this overlap.
const SLOT_MINUTES = 30;

function isWithinStandardDutyHours(dateKey, minutes) {
  const day = new Date(dateKey + 'T00:00:00Z').getUTCDay();
  return (
    DUTY_DAYS.includes(day) &&
    minutes >= DUTY_START_MINUTES &&
    minutes < DUTY_END_MINUTES
  );
}

/**
 * An active appointment for this doctor overlapping `date` + `time`, or null.
 * Reads appointment_date/appointment_time, falling back to scheduled_datetime
 * (the seed appointments only carry the latter). `excludeId` skips the
 * appointment being rescheduled.
 */
function findConflictingAppointment(doctor_id, date, time, excludeId = null) {
  const doctorId = Number(doctor_id);
  const dateKey = toDateKey(date);
  const requestedMinutes = toMinutes(time);
  const numExcludeId = excludeId !== null && excludeId !== undefined ? Number(excludeId) : null;
  if (!doctorId || !dateKey || requestedMinutes === null) return null;

  return (
    dataStore.appointments.find((appointment) => {
      if (numExcludeId !== null && Number(appointment.appointment_id) === numExcludeId) return false;
      if (Number(appointment.doctor_id) !== doctorId) return false;
      if (['CANCELLED', 'COMPLETED'].includes(appointment.status)) return false;
      if (toDateKey(appointment.appointment_date || appointment.scheduled_datetime) !== dateKey) return false;
      const appointmentMinutes = toMinutes(
        appointment.appointment_time || String(appointment.scheduled_datetime || '').slice(11, 16),
      );
      return appointmentMinutes !== null && Math.abs(appointmentMinutes - requestedMinutes) < SLOT_MINUTES;
    }) || null
  );
}

function isDoctorAvailableAt(doctor_id, date, time, excludeAppointmentId = null) {
  const doctorId = Number(doctor_id);
  const dateKey = toDateKey(date);
  const requestedMinutes = toMinutes(time);
  if (!doctorId || !dateKey || requestedMinutes === null) {
    return { available: false, message: UNAVAILABLE_MESSAGE };
  }

  const slots = dataStore.doctorAvailabilities.filter(
    (slot) =>
      Number(slot.doctor_id) === doctorId &&
      toDateKey(slot.available_date) === dateKey,
  );

  if (slots.length > 0) {
    // Explicit calendar rows for this date override the standard roster.
    const coveredBySlot = slots.some((slot) => {
      if (String(slot.status || 'AVAILABLE').toUpperCase() !== 'AVAILABLE') return false;
      const start = toMinutes(slot.start_time);
      const end = toMinutes(slot.end_time);
      return start !== null && end !== null && requestedMinutes >= start && requestedMinutes < end;
    });
    if (!coveredBySlot) return { available: false, message: UNAVAILABLE_MESSAGE };
  } else if (!isWithinStandardDutyHours(dateKey, requestedMinutes)) {
    return { available: false, message: UNAVAILABLE_MESSAGE };
  }

  return findConflictingAppointment(doctorId, dateKey, time, excludeAppointmentId)
    ? { available: false, message: UNAVAILABLE_MESSAGE }
    : { available: true, message: null };
}

function deleteAvailability(availability_id) {
  const numId = Number(availability_id);
  const initialLen = dataStore.doctorAvailabilities.length;
  dataStore.doctorAvailabilities = dataStore.doctorAvailabilities.filter(
    (a) => Number(a.availability_id) !== numId,
  );
  return { deleted: initialLen > dataStore.doctorAvailabilities.length };
}

module.exports = {
  findAllDoctors,
  findDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  findAllAvailabilities,
  findAvailabilityByDoctor,
  createAvailability,
  isDoctorAvailableAt,
  findConflictingAppointment,
  isWithinStandardDutyHours,
  UNAVAILABLE_MESSAGE,
  deleteAvailability,
  findAvailabilityById,
};
