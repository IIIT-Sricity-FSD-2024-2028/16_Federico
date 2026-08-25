'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.admissions;
}

function findOne(id) {
  return dataStore.admissions.find((a) => a.admission_id === id) || null;
}

function create(admission) {
  const newAdmission = {
    admission_id:
      dataStore.admissions.length > 0
        ? Math.max(...dataStore.admissions.map((a) => a.admission_id)) + 1
        : 701,
    patient_id: Number(admission.patient_id),
    appointment_id: admission.appointment_id ? Number(admission.appointment_id) : null,
    bed_id: admission.bed_id ? Number(admission.bed_id) : null,
    status: admission.status || 'ADMITTED',
    admit_time: admission.admit_time || new Date().toISOString(),
    discharge_time: admission.discharge_time || null,
    organization_id: admission.organization_id ? Number(admission.organization_id) : null,
    hospital_id: admission.hospital_id ? Number(admission.hospital_id) : null,
    receipt_sent_to_hom: Boolean(admission.receipt_sent_to_hom),
  };
  dataStore.admissions.push(newAdmission);
  return newAdmission;
}

function update(id, patch) {
  const admission = findOne(id);
  if (!admission) return null;
  Object.assign(admission, patch);
  return admission;
}

module.exports = { findAll, findOne, create, update };
