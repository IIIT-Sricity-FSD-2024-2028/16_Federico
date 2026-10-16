'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

function findAll() {
  return dataStore.admissions;
}

function findOne(id) {
  const numId = Number(id);
  return dataStore.admissions.find((a) => a.admission_id === numId) || null;
}

function create(admission) {
  const newAdmission = {
    admission_id: maxId(dataStore.admissions, 'admission_id', 701) + 1,
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
  const { admission_id: _aid, patient_id: _pid, organization_id: _oid, hospital_id: _hid, admit_time: _at, ...safePatch } = patch;
  Object.assign(admission, safePatch);
  return admission;
}

module.exports = { findAll, findOne, create, update };
