'use strict';

const dataStore = require('../store/dataStore');
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
      dataStore.wards.length > 0
        ? Math.max(...dataStore.wards.map((w) => w.ward_id)) + 1
        : 1,
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
  const ward = dataStore.wards.find((w) => w.ward_id === ward_id);
  if (!ward) return null;

  if (patch.ward_name !== undefined) ward.ward_name = patch.ward_name;
  if (patch.description !== undefined) ward.description = patch.description;

  if (patch.total_beds !== undefined) {
    const beds = findBedsByWard(ward_id);
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
          ward_id,
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
  const ward = dataStore.wards.find((w) => w.ward_id === ward_id);
  if (!ward) return null;

  const beds = findBedsByWard(ward_id);
  if (beds.some((b) => b.status === 'OCCUPIED')) {
    return {
      error: 'WARD_HAS_OCCUPIED_BEDS',
      message: `Cannot delete ${ward.ward_name} — it has occupied beds`,
    };
  }

  dataStore.wards = dataStore.wards.filter((w) => w.ward_id !== ward_id);
  dataStore.beds = dataStore.beds.filter((b) => b.ward_id !== ward_id);
  return { deleted: true, ward_id };
}

// BED
function findAllBeds() {
  return dataStore.beds;
}

function findBedsByWard(ward_id) {
  return dataStore.beds.filter((b) => b.ward_id === ward_id);
}

function createBed(bed) {
  const newBed = {
    bed_id:
      dataStore.beds.length > 0
        ? Math.max(...dataStore.beds.map((b) => b.bed_id)) + 1
        : 11,
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
  const bed = dataStore.beds.find((b) => b.bed_id === bed_id);
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
  const preRequestId = payload.pre_request_id ? Number(payload.pre_request_id) : null;

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
    if (requestedBy) existing.requested_by = requestedBy;
    return existing;
  }

  const newRequest = {
    bed_request_id:
      dataStore.bedRequests.length > 0
        ? Math.max(...dataStore.bedRequests.map((r) => r.bed_request_id)) + 1
        : 1,
    pre_request_id: preRequestId,
    patient_id: patientId,
    ward_id: payload.ward_id ? Number(payload.ward_id) : null,
    priority: payload.priority || 'NORMAL',
    status: 'PENDING',
    bed_id: null,
    requested_by: requestedBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
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

function updateBedRequest(id, patch) {
  const request = dataStore.bedRequests.find((r) => r.bed_request_id === id);
  if (!request) return null;

  if (patch.bed_id) {
    const bed = updateBedStatus(patch.bed_id, 'OCCUPIED');
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
  } else if (patch.status === 'DENIED') {
    request.status = 'DENIED';
    request.decided_at = new Date().toISOString();
    activityService.log(
      'warning',
      `Bed request #${id} denied`,
      { bedRequestId: id },
      request.organization_id,
    );
  }

  return request;
}

// --- Phase 2: emergency admission notifications. Per SRS/domain-expert
// interaction, an emergency patient is moved to a ward before formal
// registration — patient_id is intentionally optional here. ---

function findAllEmergencies() {
  return dataStore.emergencyNotifications;
}

function createEmergency(payload, createdBy) {
  const newEmergency = {
    emergency_id:
      dataStore.emergencyNotifications.length > 0
        ? Math.max(
            ...dataStore.emergencyNotifications.map((e) => e.emergency_id),
          ) + 1
        : 1,
    patient_id: payload.patient_id ? Number(payload.patient_id) : null,
    bed_id: payload.bed_id ? Number(payload.bed_id) : null,
    department: payload.department || null,
    status: 'PENDING',
    created_by: createdBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    created_at: new Date().toISOString(),
  };
  dataStore.emergencyNotifications.push(newEmergency);

  if (newEmergency.bed_id) updateBedStatus(newEmergency.bed_id, 'OCCUPIED');

  activityService.log(
    'error',
    `Emergency admission — bed ${newEmergency.bed_id || 'TBD'}`,
    { emergencyId: newEmergency.emergency_id },
    newEmergency.organization_id,
  );

  return newEmergency;
}

function updateEmergency(id, patch) {
  const emergency = dataStore.emergencyNotifications.find(
    (e) => e.emergency_id === id,
  );
  if (!emergency) return null;
  Object.assign(emergency, patch);
  return emergency;
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
  findAllEmergencies,
  createEmergency,
  updateEmergency,
};
