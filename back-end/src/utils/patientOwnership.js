'use strict';

/**
 * Centralized ownership check for every patient-scoped endpoint (patient
 * record, insurance, pre-requests, billing views). A Patient session may
 * only ever touch records tied to their own patient_id — HOM/PRE/FA are
 * unrestricted. Previously this exact check was copy-pasted separately in
 * patient.controller.js and billing.controller.js (and about to be a
 * third copy in preRequest.controller.js); centralizing it here means
 * there's exactly one place to get this right, and one place to audit.
 */
function forbidsOtherPatient(req, patientId) {
  return Boolean(
    req.session &&
    req.session.role === 'Patient' &&
    req.session.patientId !== patientId,
  );
}

/**
 * For endpoints that return data across MANY patients (list-all-patients,
 * list-all-payments, a ledger looked up by raw id with no ownership
 * check possible) — these must never be reachable by a Patient session
 * at all, even though the resource's coarse read/write gate includes
 * 'Patient' for the sibling single-record endpoints. Use this instead of
 * forbidsOtherPatient when there's no single patientId to check against.
 */
function isPatientSession(req) {
  return Boolean(req.session && req.session.role === 'Patient');
}

module.exports = { forbidsOtherPatient, isPatientSession };
