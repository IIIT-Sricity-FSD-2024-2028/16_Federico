'use strict';

const dataStore = require('../store/dataStore');

// DOCTOR
function findAllDoctors() {
  return dataStore.doctors;
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
    ...doctor,
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
  const initialLen = dataStore.doctors.length;
  dataStore.doctors = dataStore.doctors.filter(
    (d) => d.doctor_id !== doctor_id,
  );
  return { deleted: initialLen > dataStore.doctors.length };
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
  const newAvail = {
    availability_id:
      dataStore.doctorAvailabilities.length > 0
        ? Math.max(
            ...dataStore.doctorAvailabilities.map((a) => a.availability_id),
          ) + 1
        : 501,
    ...availability,
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
