'use strict';

const { patientRepository } = require('../repositories');

function findAll() {
  return patientRepository.findAll();
}

function findOne(id) {
  return patientRepository.findByIdOrUhid(id);
}

function generateUhid() {
  return patientRepository.generateUhid();
}

function create(patient) {
  return patientRepository.create({
    name: patient.name,
    email: patient.email || null,
    phone: patient.phone || null,
    alternate_phone: patient.alternate_phone || null,
    dob: patient.dob || null,
    gender: patient.gender || null,
    blood_group: patient.blood_group || null,
    address: patient.address || null,
    uhid: patient.uhid || patientRepository.generateUhid(),
    organization_id: patient.organization_id ? Number(patient.organization_id) : null,
    hospital_id: patient.hospital_id ? Number(patient.hospital_id) : null,
  });
}

function update(id, patch) {
  const patient = findOne(id);
  if (!patient) return null;
  return patientRepository.update(patient.patient_id, patch);
}

function remove(id) {
  const patient = findOne(id);
  if (!patient) return { deleted: false };
  const deleted = patientRepository.delete(patient.patient_id);
  return { deleted };
}

// Insurance
function findAllInsurances() {
  return patientRepository.findAllInsurances();
}

function findInsuranceByPatient(patient_id) {
  const pid = Number(patient_id);
  return patientRepository.findAllInsurances((i) => i.patient_id === pid);
}

function createInsurance(insurance) {
  return patientRepository.createInsurance({
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
  });
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
