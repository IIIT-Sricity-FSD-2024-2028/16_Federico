'use strict';

const dataStore = require('../store/dataStore');
const activityService = require('./activity.service');

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
    status: 'PENDING',
    hom_status: 'Awaiting HOM',
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

const DECIDED_STATUSES = ['APPROVED', 'ADMITTED', 'REJECTED', 'DISCHARGE_REQUESTED'];

function update(id, patch) {
  const request = findOne(id);
  if (!request) return null;

  Object.assign(request, patch);
  request.updated_at = new Date().toISOString();
  if (patch.status && DECIDED_STATUSES.includes(patch.status) && !request.decided_at) {
    request.decided_at = new Date().toISOString();
  }

  if (patch.status) {
    activityService.log('success', `Pre-request #${id} status changed to ${patch.status}`, { preRequestId: id });
  }

  return request;
}

module.exports = { findAll, findOne, create, update };
