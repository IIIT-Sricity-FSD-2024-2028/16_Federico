'use strict';

const {
  wardRepository,
  patientRepository,
  preRequestRepository,
  admissionRepository,
} = require('../repositories');
const activityService = require('./activity.service');

function findAllWards() {
  return wardRepository.findAll();
}

function bedNumberPrefix(wardName) {
  return String(wardName || 'WARD')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4) || 'WARD';
}

function createWard(ward) {
  const newWard = wardRepository.create({
    ward_name: ward.ward_name,
    description: ward.description || null,
    total_beds: Number(ward.total_beds) || 0,
    organization_id: ward.organization_id ? Number(ward.organization_id) : null,
    hospital_id: ward.hospital_id ? Number(ward.hospital_id) : null,
  });

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

function updateWard(ward_id, patch) {
  const ward = wardRepository.findById(ward_id);
  if (!ward) return null;

  const updateData = {};
  if (patch.ward_name !== undefined) updateData.ward_name = patch.ward_name;
  if (patch.description !== undefined) updateData.description = patch.description;

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
      for (const b of removable) {
        wardRepository.deleteBed(b.bed_id);
      }
    }

    updateData.total_beds = target;
  }

  return wardRepository.update(ward_id, updateData);
}

function deleteWard(ward_id) {
  const ward = wardRepository.findById(ward_id);
  if (!ward) return null;

  const beds = findBedsByWard(ward_id);
  if (beds.some((b) => b.status === 'OCCUPIED')) {
    return {
      error: 'WARD_HAS_OCCUPIED_BEDS',
      message: `Cannot delete ${ward.ward_name} — it has occupied beds`,
    };
  }

  for (const b of beds) {
    wardRepository.deleteBed(b.bed_id);
  }
  wardRepository.delete(ward_id);
  return { deleted: true, ward_id };
}

// Beds
function findAllBeds() {
  return wardRepository.findAllBeds();
}

function findBedsByWard(ward_id) {
  return wardRepository.findBedsByWard(ward_id);
}

function createBed(bed) {
  return wardRepository.createBed({
    ward_id: Number(bed.ward_id),
    bed_number: bed.bed_number,
    status: bed.status || 'AVAILABLE',
    organization_id: bed.organization_id ? Number(bed.organization_id) : null,
    hospital_id: bed.hospital_id ? Number(bed.hospital_id) : null,
  });
}

function updateBedStatus(bed_id, status) {
  return wardRepository.updateBed(bed_id, { status });
}

// Bed Requests
function findAllBedRequests() {
  return wardRepository.findAllBedRequests();
}

function createBedRequest(payload, requestedBy) {
  const newRequest = wardRepository.createBedRequest({
    pre_request_id: payload.pre_request_id ? Number(payload.pre_request_id) : null,
    patient_id: Number(payload.patient_id),
    ward_id: payload.ward_id ? Number(payload.ward_id) : null,
    priority: payload.priority || 'NORMAL',
    status: 'PENDING',
    bed_id: null,
    requested_by: requestedBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    requested_at: new Date().toISOString(),
    decided_at: null,
  });

  const patient = patientRepository.findById(newRequest.patient_id);
  activityService.log(
    'info',
    `Bed requested for ${patient ? patient.name : 'patient #' + newRequest.patient_id}`,
    { bedRequestId: newRequest.bed_request_id },
    newRequest.organization_id,
  );

  return newRequest;
}

function updateBedRequest(id, patch) {
  const request = wardRepository.findBedRequestById(id);
  if (!request) return null;

  if (patch.bed_id) {
    const bed = updateBedStatus(patch.bed_id, 'OCCUPIED');
    if (bed) {
      const updated = wardRepository.updateBedRequest(id, {
        bed_id: Number(patch.bed_id),
        status: 'ALLOCATED',
        decided_at: new Date().toISOString(),
      });

      // Synchronize linked preRequest and admission
      if (request.pre_request_id) {
        preRequestRepository.update(request.pre_request_id, {
          status: 'ADMITTED',
          bed_id: Number(patch.bed_id),
          hom_status: 'Bed confirmed',
        });
        const existingAdm = admissionRepository.findOne(
          (a) => a.patient_id === request.patient_id && a.status === 'ADMITTED',
        );
        if (!existingAdm) {
          admissionRepository.create({
            patient_id: request.patient_id,
            bed_id: Number(patch.bed_id),
            status: 'ADMITTED',
            admission_date: new Date().toISOString().slice(0, 10),
            organization_id: request.organization_id,
            hospital_id: request.hospital_id,
          });
        }
      }

      activityService.log(
        'success',
        `Bed ${bed.bed_number} allocated (bed request #${id})`,
        { bedRequestId: id },
        request.organization_id,
      );
      return updated;
    }
  } else if (patch.status === 'DENIED') {
    const updated = wardRepository.updateBedRequest(id, {
      status: 'DENIED',
      decided_at: new Date().toISOString(),
    });
    activityService.log(
      'warning',
      `Bed request #${id} denied`,
      { bedRequestId: id },
      request.organization_id,
    );
    return updated;
  }

  return request;
}

// Emergency notifications
function findAllEmergencies() {
  return wardRepository.findAllEmergencies();
}

function createEmergency(payload, createdBy) {
  const newEmergency = wardRepository.createEmergency({
    patient_id: payload.patient_id ? Number(payload.patient_id) : null,
    bed_id: payload.bed_id ? Number(payload.bed_id) : null,
    department: payload.department || null,
    status: 'PENDING',
    created_by: createdBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
  });

  if (newEmergency.bed_id) {
    updateBedStatus(newEmergency.bed_id, 'OCCUPIED');
  }

  activityService.log(
    'error',
    `Emergency admission — bed ${newEmergency.bed_id || 'TBD'}`,
    { emergencyId: newEmergency.emergency_id },
    newEmergency.organization_id,
  );

  return newEmergency;
}

function updateEmergency(id, patch) {
  return wardRepository.updateEmergency(id, patch);
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
