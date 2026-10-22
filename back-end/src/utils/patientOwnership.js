'use strict';

const { belongsToOrg } = require('./tenant');

/**
 * Centralized ownership check for every patient-scoped endpoint (patient
 * record, insurance, pre-requests, billing views). A Patient session may
 * only ever touch records tied to their own patient_id — HOM/PRE/FA are
 * unrestricted.
 */
function forbidsOtherPatient(req, patientId) {
  if (!req.session || req.session.role !== 'Patient') return false;
  if (patientId == null || req.session.patientId == null) return true;
  return Number(req.session.patientId) !== Number(patientId);
}

/**
 * For endpoints that return data across MANY patients (list-all-patients,
 * list-all-payments, a ledger looked up by raw id with no ownership
 * check possible) — these must never be reachable by a Patient session
 * at all, even though the resource's coarse read/write gate includes
 * 'Patient' for the sibling single-record endpoints.
 */
function isPatientSession(req) {
  return Boolean(req.session && req.session.role === 'Patient');
}

/**
 * Unified patient access guard combining actor ownership and tenant org isolation.
 * Returns true if the requesting session is forbidden from accessing the patient record.
 */
function isForbiddenPatient(patient, req) {
  if (!patient) return false;
  return forbidsOtherPatient(req, patient.patient_id) || !belongsToOrg(patient, req);
}

module.exports = {
  forbidsOtherPatient,
  isPatientSession,
  isForbiddenPatient,
};
