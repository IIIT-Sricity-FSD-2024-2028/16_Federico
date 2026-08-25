'use strict';

const dataStore = require('../store/dataStore');

// DOCTOR
function findAllDoctors(predicate = null) {
  return typeof predicate === 'function'
    ? dataStore.doctors.filter(predicate)
    : dataStore.doctors;
}

function findDoctorById(doctor_id) {
  return dataStore.doctors.find((d) => d.doctor_id === doctor_id) || null;
}

function createDoctor(doctor) {
  const newDoctor = {
    doctor_id:
      dataStore.doctors.length > 0
        ? Math.max(...dataStore.doctors.map((d) => d.doctor_id)) + 1
        : 401,
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
  Object.assign(doc, patch);
  return doc;
}

function deleteDoctor(doctor_id) {
  const doctor = findDoctorById(doctor_id);
  if (!doctor) {
    return { deleted: false };
  }
  // Soft-deletion to guard referential integrity with appointments
  doctor.is_active = false;
  doctor.status = 'INACTIVE';
  dataStore.doctors = dataStore.doctors.filter(
    (d) => d.doctor_id !== doctor_id,
  );
  return { deleted: true };
}

// DOCTOR_AVAILABILITY
function findAllAvailabilities() {
  return dataStore.doctorAvailabilities;
}

function findAvailabilityByDoctor(doctor_id) {
  return dataStore.doctorAvailabilities.filter(
    (a) => a.doctor_id === doctor_id,
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
      dataStore.doctorAvailabilities.length > 0
        ? Math.max(
            ...dataStore.doctorAvailabilities.map((a) => a.availability_id),
          ) + 1
        : 501,
    doctor_id: doctorId,
    available_date: availability.available_date,
    start_time: availability.start_time,
    end_time: availability.end_time,
    status: availability.status || 'AVAILABLE',
    organization_id: availability.organization_id || doctor.organization_id || null,
    hospital_id: availability.hospital_id || doctor.hospital_id || null,
  };
  dataStore.doctorAvailabilities.push(newAvail);
  return newAvail;
}

function deleteAvailability(availability_id) {
  const initialLen = dataStore.doctorAvailabilities.length;
  dataStore.doctorAvailabilities = dataStore.doctorAvailabilities.filter(
    (a) => a.availability_id !== availability_id,
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
  deleteAvailability,
};
