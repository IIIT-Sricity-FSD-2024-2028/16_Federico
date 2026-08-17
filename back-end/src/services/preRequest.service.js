'use strict';

const dataStore = require('../store/dataStore');
const activityService = require('./activity.service');
const wardService = require('./ward.service');

/**
 * Explicit state machine for the PRE intake → admission → discharge
 * lifecycle, replacing the original frontend's ad-hoc `status` +
 * `patientStatus` pair (two overlapping, independently-writable fields —
 * a repeated source of the "state gets out of sync" bugs found in the
 * pre-migration audit). One status field, one table of who may move it
 * where. See TRANSITIONS below for the actual workflow this encodes.
 */
const STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CONSULTATION_DONE',
  'EMERGENCY',
  'ADMITTED',
  'DISCHARGE_REQUESTED',
  'DISCHARGE_APPROVED',
  'DISCHARGED',
];

// fromStatus -> { toStatus: [actors allowed to make this specific move] }
// Actors not listed for a transition can never make it, regardless of
// their general 'preRequest' write access — this is deliberately more
// precise than a coarse read/write gate (see actorAccess.js's comment on
// this resource for why that distinction matters).
const TRANSITIONS = {
  PENDING: {
    APPROVED: ['PRE'],
    REJECTED: ['PRE', 'Patient'], // Patient may only cancel their OWN pending request (ownership enforced in the controller)
  },
  APPROVED: {
    EMERGENCY: ['PRE'],
    CONSULTATION_DONE: ['PRE'],
  },
  EMERGENCY: {
    ADMITTED: ['HOM'], // via bed allocation — see ward.service.js#updateBedRequest cascade
  },
  ADMITTED: {
    DISCHARGE_REQUESTED: ['PRE'],
  },
  DISCHARGE_REQUESTED: {
    DISCHARGE_APPROVED: ['HOM'],
  },
  DISCHARGE_APPROVED: {
    DISCHARGED: ['PRE'], // PRE's final sign-off — releases the bed, see below
  },
};

// APPROVED -> ADMITTED also happens via HOM bed allocation, for the
// visitType: 'Admit' path (no EMERGENCY stop in between).
TRANSITIONS.APPROVED.ADMITTED = ['HOM'];

function canTransition(fromStatus, toStatus, actorRole) {
  const allowedActors = TRANSITIONS[fromStatus]?.[toStatus];
  return Boolean(allowedActors && allowedActors.includes(actorRole));
}

function isTerminal(status) {
  return ['REJECTED', 'CONSULTATION_DONE', 'DISCHARGED'].includes(status);
}

function findAll() {
  return dataStore.preRequests;
}

function findOne(id) {
  return dataStore.preRequests.find((p) => p.pre_request_id === id) || null;
}

function create(payload, createdBy) {
  const newRequest = {
    pre_request_id:
      dataStore.preRequests.length > 0
        ? Math.max(...dataStore.preRequests.map((p) => p.pre_request_id)) + 1
        : 1,
    patient_id: payload.patient_id,
    appointment_id: payload.appointment_id || null,
    department: payload.department,
    doctor_id: payload.doctor_id || null,
    visit_type: payload.visit_type,
    ward_type: payload.ward_type || null,
    requested_date: payload.requested_date || null,
    requested_time: payload.requested_time || null,
    status: 'PENDING',
    hom_status: 'Awaiting PRE review',
    bed_id: null,
    reject_reason: null,
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    decided_at: null,
  };
  dataStore.preRequests.push(newRequest);

  const patient = dataStore.patients.find((p) => p.patient_id === newRequest.patient_id);
  activityService.log('info', `Pre-registration submitted for ${patient ? patient.name : 'patient #' + newRequest.patient_id}`, {
    preRequestId: newRequest.pre_request_id,
  });

  return newRequest;
}

const HOM_STATUS_BY_STATUS = {
  PENDING: 'Awaiting PRE review',
  APPROVED: 'Awaiting visit type / bed request',
  REJECTED: 'Closed — rejected by PRE',
  CONSULTATION_DONE: 'Closed — consultation complete',
  EMERGENCY: 'Awaiting HOM bed allocation',
  ADMITTED: 'Bed confirmed',
  DISCHARGE_REQUESTED: 'Awaiting HOM discharge coordination',
  DISCHARGE_APPROVED: 'Ready for PRE final sign-off',
  DISCHARGED: 'Closed — discharged',
};

/**
 * Field-level update (doctor/date/time/department/ward_type) — PRE
 * rescheduling or assigning a doctor. Does not change status.
 */
function updateFields(id, patch) {
  const request = findOne(id);
  if (!request) return null;
  const { doctor_id, requested_date, requested_time, department, ward_type, visit_type } = patch;
  if (doctor_id !== undefined) request.doctor_id = doctor_id;
  if (requested_date !== undefined) request.requested_date = requested_date;
  if (requested_time !== undefined) request.requested_time = requested_time;
  if (department !== undefined) request.department = department;
  if (ward_type !== undefined) request.ward_type = ward_type;
  if (visit_type !== undefined) request.visit_type = visit_type;
  request.updated_at = new Date().toISOString();
  return request;
}

/**
 * Status transition. Caller (controller) has already verified `actorRole`
 * is allowed to make this specific fromStatus -> toStatus move.
 */
function transition(id, toStatus, actorRole, extra) {
  const request = findOne(id);
  if (!request) return null;

  request.status = toStatus;
  request.hom_status = HOM_STATUS_BY_STATUS[toStatus] || request.hom_status;
  request.updated_at = new Date().toISOString();
  if (isTerminal(toStatus) || ['ADMITTED', 'DISCHARGE_APPROVED'].includes(toStatus)) {
    request.decided_at = request.decided_at || new Date().toISOString();
  }

  if (toStatus === 'REJECTED' && extra?.reject_reason) {
    request.reject_reason = extra.reject_reason;
  }

  if (toStatus === 'ADMITTED' && extra?.bed_id) {
    request.bed_id = extra.bed_id;
  }

  if (toStatus === 'DISCHARGED') {
    // Release the bed — the original frontend never did this, so beds
    // stayed OCCUPIED forever once assigned. Closing the loop here.
    if (request.bed_id) {
      wardService.updateBedStatus(request.bed_id, 'AVAILABLE');
    }
    const admission = dataStore.admissions.find(
      (a) => a.patient_id === request.patient_id && a.bed_id === request.bed_id,
    );
    if (admission) admission.status = 'DISCHARGED';
  }

  activityService.log('success', `Pre-request #${id} moved ${request.status}`, { preRequestId: id, actorRole });
  return request;
}

module.exports = { STATUSES, TRANSITIONS, canTransition, isTerminal, findAll, findOne, create, updateFields, transition };
