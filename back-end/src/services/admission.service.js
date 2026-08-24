'use strict';

const { admissionRepository } = require('../repositories');

function findAll() {
  return admissionRepository.findAll();
}

function findOne(id) {
  return admissionRepository.findById(id);
}

function create(admission) {
  return admissionRepository.create({
    patient_id: Number(admission.patient_id),
    appointment_id: admission.appointment_id ? Number(admission.appointment_id) : null,
    bed_id: admission.bed_id ? Number(admission.bed_id) : null,
    status: admission.status || 'ADMITTED',
    admit_time: admission.admit_time || new Date().toISOString(),
    discharge_time: admission.discharge_time || null,
    organization_id: admission.organization_id ? Number(admission.organization_id) : null,
    hospital_id: admission.hospital_id ? Number(admission.hospital_id) : null,
    receipt_sent_to_hom: Boolean(admission.receipt_sent_to_hom),
  });
}

function update(id, patch) {
  return admissionRepository.update(id, patch);
}

module.exports = {
  findAll,
  findOne,
  create,
  update,
};
