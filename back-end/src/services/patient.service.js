'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.patients;
}

// NOTE: id arrives as a string from the route param. A purely numeric id
// matches by numeric patient_id; otherwise (or if no numeric match is
// found) it falls back to a case-insensitive uhid match.
function findOne(id) {
  if (id === undefined || id === null) return null;
  const asNum = Number(id);
  if (!Number.isNaN(asNum) && String(asNum) === String(id).trim()) {
    const byId = dataStore.patients.find((p) => p.patient_id === asNum);
    if (byId) return byId;
  }
  const normalized = String(id).trim().toUpperCase();
  return (
    dataStore.patients.find(
      (p) => String(p.uhid || '').toUpperCase() === normalized,
    ) || null
  );
}

function generateUhid() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uhid;
  do {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    uhid = `UHID-${code}`;
  } while (dataStore.patients.some((p) => p.uhid === uhid));
  return uhid;
}

function create(patient) {
  const newPatient = {
    patient_id:
      dataStore.patients.length > 0
        ? Math.max(...dataStore.patients.map((p) => p.patient_id)) + 1
        : 201,
    name: patient.name,
    email: patient.email || null,
    phone: patient.phone || null,
    alternate_phone: patient.alternate_phone || null,
    dob: patient.dob || null,
    gender: patient.gender || null,
    blood_group: patient.blood_group || null,
    address: patient.address || null,
    uhid: patient.uhid || generateUhid(),
    organization_id: patient.organization_id ? Number(patient.organization_id) : null,
    hospital_id: patient.hospital_id ? Number(patient.hospital_id) : null,
    created_at: new Date().toISOString(),
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
  const patient = findOne(id);
  if (!patient) return { deleted: false };
  const initialLen = dataStore.patients.length;
  dataStore.patients = dataStore.patients.filter(
    (p) => p.patient_id !== patient.patient_id,
  );
  return { deleted: dataStore.patients.length < initialLen };
}

// Insurance
function findAllInsurances() {
  return dataStore.patientInsurances;
}

function findInsuranceByPatient(patient_id) {
  const pid = Number(patient_id);
  return dataStore.patientInsurances.filter((i) => i.patient_id === pid);
}

function createInsurance(insurance) {
  const newIns = {
    insurance_id:
      dataStore.patientInsurances.length > 0
        ? Math.max(...dataStore.patientInsurances.map((i) => i.insurance_id)) +
          1
        : 301,
    patient_id: Number(insurance.patient_id),
    provider_name: insurance.provider_name,
    policy_number: insurance.policy_number,
    member_id: insurance.member_id,
    coverage_type: insurance.coverage_type || 'Self',
    coverage_limit: Number(insurance.coverage_limit) || 0,
    copay_percentage: Number(insurance.copay_percentage) || 0,
    valid_from: insurance.valid_from || null,
    valid_to: insurance.valid_to || null,
    organization_id: insurance.organization_id ? Number(insurance.organization_id) : null,
    hospital_id: insurance.hospital_id ? Number(insurance.hospital_id) : null,
    card_front_url: insurance.card_front_url || null,
    card_back_url: insurance.card_back_url || null,
    created_at: new Date().toISOString(),
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
