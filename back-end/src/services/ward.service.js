'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
const activityService = require('./activity.service');

// WARD
function findAllWards() {
  return dataStore.wards;
}

function bedNumberPrefix(wardName) {
  return String(wardName || 'WARD')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4) || 'WARD';
}

/**
 * Also creates `ward.total_beds` matching AVAILABLE bed records — the
 * original version only ever wrote the ward row itself (nothing on the
 * frontend called this endpoint before Admin/departments.js, so the gap
 * between a ward's `total_beds` field and its actual bed records went
 * unnoticed). `updateWard` below already does the equivalent "grow to
 * target" step when resizing; this is that same step at creation time.
 */
function createWard(ward) {
  const newWard = {
    ward_id:
      maxId(dataStore.wards, 'ward_id', 1) + 1,
    ward_name: ward.ward_name,
    description: ward.description || null,
    total_beds: Number(ward.total_beds) || 0,
    organization_id: ward.organization_id ? Number(ward.organization_id) : null,
    hospital_id: ward.hospital_id ? Number(ward.hospital_id) : null,
  };
  dataStore.wards.push(newWard);

  const targetBeds = Number(ward.total_beds) || 0;
  if (targetBeds > 0) {
    const prefix = bedNumberPrefix(newWard.ward_name);
    for (let i = 1; i <= targetBeds; i++) {
      createBed({
        ward_id: newWard.ward_id,
        bed_number: `${prefix}-${String(i).padStart(2, '0')}`,
        status: 'AVAILABLE',
        organization_id: newWard.organization_id,
        hospital_id: newWard.hospital_id,
      });
    }
  }

  return newWard;
}

/**
 * Admin-only structural edit (see wardAdmin in middleware/actorAccess.js) —
 * distinct from HOM's day-to-day updateBedStatus. Renaming just patches the
 * ward; retargeting total_beds auto-creates/removes AVAILABLE beds to
 * reach the new count, refusing to shrink below the currently OCCUPIED
 * count (those beds are in use — Admin can't will them away).
 */
function updateWard(ward_id, patch) {
  const numId = Number(ward_id);
  const ward = dataStore.wards.find((w) => Number(w.ward_id) === numId);
  if (!ward) return null;

  if (patch.ward_name !== undefined) ward.ward_name = patch.ward_name;
  if (patch.description !== undefined) ward.description = patch.description;

  if (patch.total_beds !== undefined) {
    const beds = findBedsByWard(numId);
    const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
    const target = Number(patch.total_beds);

    if (target < occupied) {
      return {
        error: 'BEDS_OCCUPIED',
        message: `Cannot reduce ${ward.ward_name} below its ${occupied} currently occupied bed(s)`,
      };
    }

    if (target > beds.length) {
      const prefix = bedNumberPrefix(ward.ward_name);
      for (let i = beds.length + 1; i <= target; i++) {
        createBed({
          ward_id: numId,
          bed_number: `${prefix}-${String(i).padStart(2, '0')}`,
          status: 'AVAILABLE',
          organization_id: ward.organization_id,
          hospital_id: ward.hospital_id,
        });
      }
    } else if (target < beds.length) {
      const removable = beds
        .filter((b) => b.status !== 'OCCUPIED')
        .slice(0, beds.length - target);
      const removeIds = new Set(removable.map((b) => b.bed_id));
      dataStore.beds = dataStore.beds.filter((b) => !removeIds.has(b.bed_id));
    }

    ward.total_beds = target;
  }

  return ward;
}

/** Admin-only (see wardAdmin). Refuses to delete a ward with any OCCUPIED bed. */
function deleteWard(ward_id) {
  const numId = Number(ward_id);
  const ward = dataStore.wards.find((w) => Number(w.ward_id) === numId);
  if (!ward) return null;

  const beds = findBedsByWard(numId);
  if (beds.some((b) => b.status === 'OCCUPIED')) {
    return {
      error: 'WARD_HAS_OCCUPIED_BEDS',
      message: `Cannot delete ${ward.ward_name} — it has occupied beds`,
    };
  }

  dataStore.wards = dataStore.wards.filter((w) => Number(w.ward_id) !== numId);
  dataStore.beds = dataStore.beds.filter((b) => Number(b.ward_id) !== numId);
  return { deleted: true, ward_id: numId };
}

// BED
function findAllBeds() {
  return dataStore.beds;
}

function findBedsByWard(ward_id) {
  const numId = Number(ward_id);
  return dataStore.beds.filter((b) => Number(b.ward_id) === numId);
}

function createBed(bed) {
  const newBed = {
    bed_id:
      maxId(dataStore.beds, 'bed_id', 11) + 1,
    ward_id: Number(bed.ward_id),
    bed_number: bed.bed_number,
    status: bed.status || 'AVAILABLE',
    organization_id: bed.organization_id ? Number(bed.organization_id) : null,
    hospital_id: bed.hospital_id ? Number(bed.hospital_id) : null,
  };
  dataStore.beds.push(newBed);
  return newBed;
}

function updateBedStatus(bed_id, status) {
  const bedId = Number(bed_id);
  const bed = dataStore.beds.find((b) => Number(b.bed_id) === bedId);
  if (!bed) return null;
  bed.status = status;
  return bed;
}

// --- Phase 2: bed request / allocation workflow, layered on top of the
// existing wards/beds above (no duplicate bed table). ---

function findAllBedRequests() {
  return dataStore.bedRequests;
}

function createBedRequest(payload, requestedBy) {
  const patientId = Number(payload.patient_id);
  const orgId = payload.organization_id ? Number(payload.organization_id) : 1;
  const preRequestId = payload.pre_request_id
    ? Number(payload.pre_request_id)
    : (dataStore.preRequests.find((pr) => Number(pr.patient_id) === patientId)?.pre_request_id || null);

  const wardId = payload.ward_id
    ? Number(payload.ward_id)
    : (dataStore.wards.find((w) => Number(w.organization_id) === orgId &&
      (!payload.hospital_id || Number(w.hospital_id) === Number(payload.hospital_id)))?.ward_id || 1);

  const requestedByNum = requestedBy
    ? (typeof requestedBy === 'number' ? requestedBy : Number(requestedBy) || 102)
    : (dataStore.users.find((u) => Number(u.organization_id) === orgId && u.role_id === 2)?.user_id || 102);

  // Check if an existing PENDING bed request already exists for this pre-request or patient
  const existing = dataStore.bedRequests.find(
    (r) =>
      r.status === 'PENDING' &&
      ((preRequestId && r.pre_request_id === preRequestId) ||
        (!preRequestId && r.patient_id === patientId)),
  );

  if (existing) {
    if (payload.ward_id) existing.ward_id = Number(payload.ward_id);
    if (payload.priority) existing.priority = payload.priority;
    if (requestedBy) existing.requested_by = requestedByNum;
    return existing;
  }

  const newRequest = {
    bed_request_id:
      maxId(dataStore.bedRequests, 'bed_request_id', 1) + 1,
    pre_request_id: preRequestId,
    patient_id: patientId,
    ward_id: wardId,
    priority: payload.priority || 'NORMAL',
    status: 'PENDING',
    bed_id: null,
    requested_by: requestedByNum,
    organization_id: orgId,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    requested_at: new Date().toISOString(),
    decided_at: null,
  };
  dataStore.bedRequests.push(newRequest);

  const patient = dataStore.patients.find(
    (p) => p.patient_id === newRequest.patient_id,
  );
  activityService.log(
    'info',
    `Bed requested for ${patient ? patient.name : 'patient #' + newRequest.patient_id}`,
    { bedRequestId: newRequest.bed_request_id },
    newRequest.organization_id,
  );

  return newRequest;
}

function conflict(message) {
  const err = new Error(message);
  err.name = 'Conflict';
  err.statusCode = 409;
  return err;
}

/**
 * Allocating a bed (patch.bed_id) is refused with 409 when the target bed is
 * already OCCUPIED — the original wrote OCCUPIED unconditionally, so a second
 * allocation silently put two patients in one bed.
 */
function updateBedRequest(id, patch) {
  const reqId = Number(id);
  const request = dataStore.bedRequests.find((r) => Number(r.bed_request_id) === reqId);
  if (!request) return null;

  if (patch.bed_id) {
    if (request.status === 'ALLOCATED') {
      throw conflict(`Bed request #${id} has already been allocated a bed`);
    }
    const target = dataStore.beds.find((b) => Number(b.bed_id) === Number(patch.bed_id));
    if (target && target.status === 'OCCUPIED') {
      throw conflict('Bed is already occupied');
    }
    const bed = updateBedStatus(Number(patch.bed_id), 'OCCUPIED');
    if (bed) {
      request.bed_id = Number(patch.bed_id);
      request.status = 'ALLOCATED';
      request.decided_at = new Date().toISOString();
      activityService.log(
        'success',
        `Bed ${bed.bed_number} allocated (bed request #${id})`,
        { bedRequestId: id },
        request.organization_id,
      );
    }
  } else if (patch.status === 'DENIED' || patch.status === 'REJECTED') {
    request.status = 'REJECTED';
    request.decided_at = new Date().toISOString();
    activityService.log(
      'warning',
      `Bed request #${id} denied`,
      { bedRequestId: id },
      request.organization_id,
    );
  } else if (patch.status === 'PENDING') {
    // Compensating rollback from ward.controller.js when the admission
    // cascade after an allocation fails: put the request back in the queue.
    request.status = 'PENDING';
    request.bed_id = null;
    request.decided_at = null;
  }

  return request;
}

module.exports = {
  findAllWards,
  createWard,
  updateWard,
  deleteWard,
  bedNumberPrefix,
  findAllBeds,
  findBedsByWard,
  createBed,
  updateBedStatus,
  findAllBedRequests,
  createBedRequest,
  updateBedRequest,
};
