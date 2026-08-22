'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.patients;
}

// NOTE: id arrives as a string from the route param, matches by numeric
// patient_id OR string uhid — exactly as the original controller passed
// the raw string param straight through without `+id` conversion.
function findOne(id) {
  return (
    dataStore.patients.find((p) => p.patient_id === +id || p.uhid === id) ||
    null
  );
}

function generateUhid() {
  let uhid;
  do {
    uhid = `UHID-${Math.floor(100000 + Math.random() * 900000)}`;
  } while (dataStore.patients.some((p) => p.uhid === uhid));
  return uhid;
}

function create(patient) {
  const newPatient = {
    patient_id:
      dataStore.patients.length > 0
        ? Math.max(...dataStore.patients.map((p) => p.patient_id)) + 1
        : 201,
    created_at: new Date().toISOString(),
    ...patient,
    uhid: patient.uhid || generateUhid(),
  };
  dataStore.patients.push(newPatient);
  return newPatient;
}

function update(id, patch) {
  const patient = findOne(id);
  if (!patient) return null;
  Object.assign(patient, patch);
  return patient;
}

function remove(id) {
  const initialLen = dataStore.patients.length;
  dataStore.patients = dataStore.patients.filter(
    (p) => p.patient_id !== +id && p.uhid !== id,
  );
  return { deleted: initialLen > dataStore.patients.length };
}

// Insurance
function findAllInsurances() {
  return dataStore.patientInsurances;
}

function findInsuranceByPatient(patient_id) {
  return dataStore.patientInsurances.filter((i) => i.patient_id === patient_id);
}

function createInsurance(insurance) {
  const newIns = {
    insurance_id:
      dataStore.patientInsurances.length > 0
        ? Math.max(...dataStore.patientInsurances.map((i) => i.insurance_id)) +
          1
        : 301,
    created_at: new Date().toISOString(),
    ...insurance,
  };
  dataStore.patientInsurances.push(newIns);
  return newIns;
}

module.exports = {
  findAll,
  findOne,
  create,
  update,
  remove,
  findAllInsurances,
  findInsuranceByPatient,
  createInsurance,
  generateUhid,
};
