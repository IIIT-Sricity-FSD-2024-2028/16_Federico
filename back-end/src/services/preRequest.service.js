'use strict';

const {
  preRequestRepository,
  patientRepository,
  wardRepository,
  admissionRepository,
} = require('../repositories');
const activityService = require('./activity.service');
const { NotFoundError, ValidationError, ForbiddenError } = require('../errors');

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

const TRANSITIONS = {
  PENDING: {
    APPROVED: ['PRE'],
    REJECTED: ['PRE', 'Patient'],
  },
  APPROVED: {
    EMERGENCY: ['PRE'],
    CONSULTATION_DONE: ['PRE'],
    ADMITTED: ['HOM'],
  },
  EMERGENCY: {
    ADMITTED: ['HOM'],
  },
  ADMITTED: {
    DISCHARGE_REQUESTED: ['PRE'],
  },
  DISCHARGE_REQUESTED: {
    DISCHARGE_APPROVED: ['HOM'],
  },
  DISCHARGE_APPROVED: {
    DISCHARGED: ['PRE'],
  },
};

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

function canTransition(fromStatus, toStatus, actorRole) {
  const allowedActors = TRANSITIONS[fromStatus]?.[toStatus];
  return Boolean(allowedActors && allowedActors.includes(actorRole));
}

function isTerminal(status) {
  return ['REJECTED', 'CONSULTATION_DONE', 'DISCHARGED'].includes(status);
}

function findAll() {
  return preRequestRepository.findAll();
}

function findOne(id) {
  return preRequestRepository.findById(id);
}

function create(payload, createdBy) {
  const newRequest = preRequestRepository.create({
    patient_id: Number(payload.patient_id),
    appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
    department: payload.department,
    doctor_id: payload.doctor_id ? Number(payload.doctor_id) : null,
    visit_type: payload.visit_type,
    ward_type: payload.ward_type || null,
    requested_date: payload.requested_date || null,
    requested_time: payload.requested_time || null,
    status: 'PENDING',
    hom_status: 'Awaiting PRE review',
    bed_id: null,
    reject_reason: null,
    created_by: createdBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    decided_at: null,
  });

  const patient = patientRepository.findById(newRequest.patient_id);
  activityService.log(
    'info',
    `Pre-registration submitted for ${patient ? patient.name : 'patient #' + newRequest.patient_id}`,
    { preRequestId: newRequest.pre_request_id },
    newRequest.organization_id,
  );

  return newRequest;
}

function updateFields(id, patch) {
  const request = preRequestRepository.findById(id);
  if (!request) return null;

  const allowedFields = ['doctor_id', 'requested_date', 'requested_time', 'department', 'ward_type', 'visit_type'];
  const updateData = {};
  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      updateData[field] = patch[field];
    }
  }

  return preRequestRepository.update(id, updateData);
}

function transition(id, toStatus, actorRole, extra) {
  const request = preRequestRepository.findById(id);
  if (!request) return null;

  const patch = {
    status: toStatus,
    hom_status: HOM_STATUS_BY_STATUS[toStatus] || request.hom_status,
  };

  if (
    isTerminal(toStatus) ||
    ['ADMITTED', 'DISCHARGE_APPROVED'].includes(toStatus)
  ) {
    patch.decided_at = request.decided_at || new Date().toISOString();
  }

  if (toStatus === 'REJECTED' && extra?.reject_reason) {
    patch.reject_reason = extra.reject_reason;
  }

  if (toStatus === 'ADMITTED' && extra?.bed_id) {
    patch.bed_id = Number(extra.bed_id);
  }

  if (toStatus === 'DISCHARGED') {
    // Release the physical bed and finalize the inpatient admission
    if (request.bed_id) {
      wardRepository.updateBed(request.bed_id, { status: 'AVAILABLE' });
    }
    const admission = admissionRepository.findOne(
      (a) => a.patient_id === request.patient_id && a.bed_id === request.bed_id,
    );
    if (admission) {
      admissionRepository.update(admission.admission_id, { status: 'DISCHARGED' });
    }
  }

  const updated = preRequestRepository.update(id, patch);

  activityService.log(
    'success',
    `Pre-request #${id} moved to ${toStatus}`,
    { preRequestId: id, actorRole },
    request.organization_id,
  );

  return updated;
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  canTransition,
  isTerminal,
  findAll,
  findOne,
  create,
  updateFields,
  transition,
};
