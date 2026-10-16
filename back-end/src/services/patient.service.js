'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

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
      maxId(dataStore.patients, 'patient_id', 201) + 1,
    user_id: patient.user_id ? Number(patient.user_id) : null,
    uhid: patient.uhid || generateUhid(),
    name: patient.name,
    email: patient.email || null,
    phone: patient.phone || null,
    alternate_phone: patient.alternate_phone || null,
    dob: patient.dob || null,
    gender: patient.gender || null,
    blood_group: patient.blood_group || null,
    address: patient.address || null,
    emergency_contact_name: patient.emergency_contact_name || null,
    emergency_contact_phone: patient.emergency_contact_phone || null,
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
  const { patient_id: _pid, organization_id: _oid, hospital_id: _hid, created_at: _cat, uhid: _uhid, ...safePatch } = patch;
  Object.assign(patient, safePatch);
  return patient;
}

function remove(id) {
  const patient = findOne(id);
  if (!patient) return { deleted: false };
  const hasActiveAdmission = (dataStore.admissions || []).some(
    (a) => a.patient_id === patient.patient_id && a.status === 'ADMITTED',
  );
  if (hasActiveAdmission) {
    const err = new Error(`Cannot delete patient #${patient.patient_id} with active admission`);
    err.statusCode = 409;
    throw err;
  }
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
    insurance_id: maxId(dataStore.patientInsurances, 'insurance_id', 301) + 1,
    patient_id: Number(insurance.patient_id),
    provider_name: insurance.provider_name,
    policy_number: insurance.policy_number,
    member_id: insurance.member_id || `MEM-${Number(insurance.patient_id)}`,
    coverage_type: insurance.coverage_type || 'Comprehensive',
    coverage_limit: Number(insurance.coverage_limit) || 0,
    copay_percentage: Number(insurance.copay_percentage) || 0,
    valid_from: insurance.valid_from || new Date().toISOString().slice(0, 10),
    valid_to:
      insurance.valid_to ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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
