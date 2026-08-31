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

function findAll(predicate = null) {
  return predicate ? dataStore.preRequests.filter(predicate) : dataStore.preRequests;
}

function findOne(id) {
  return dataStore.preRequests.find((p) => p.pre_request_id === id) || null;
}

function create(payload, createdBy) {
  const initialStatus =
    payload.status || (payload.visit_type === 'Emergency' ? 'EMERGENCY' : 'PENDING');
  const newRequest = {
    pre_request_id:
      dataStore.preRequests.length > 0
        ? Math.max(...dataStore.preRequests.map((p) => p.pre_request_id)) + 1
        : 1,
    patient_id: Number(payload.patient_id),
    appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
    department: payload.department,
    doctor_id: payload.doctor_id ? Number(payload.doctor_id) : null,
    visit_type: payload.visit_type,
    ward_type: payload.ward_type || null,
    requested_date: payload.requested_date || payload.appointment_date || null,
    requested_time: payload.requested_time || payload.appointment_time || null,
    note: payload.note || null,
    document_urls: Array.isArray(payload.document_urls) ? payload.document_urls : [],
    status: initialStatus,
    hom_status: HOM_STATUS_BY_STATUS[initialStatus] || 'Awaiting PRE review',
    bed_id: null,
    reject_reason: null,
    created_by: createdBy || null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    decided_at: null,
  };
  dataStore.preRequests.push(newRequest);

  const patient = dataStore.patients.find(
    (p) => p.patient_id === newRequest.patient_id,
  );
  activityService.log(
    'info',
    `Pre-registration submitted for ${patient ? patient.name : 'patient #' + newRequest.patient_id}`,
    { preRequestId: newRequest.pre_request_id },
    newRequest.organization_id,
  );

  return newRequest;
}

/**
 * Field-level update (doctor/date/time/department/ward_type/visit_type) —
 * PRE rescheduling or assigning a doctor. Does not change status. If a
 * linked appointment exists, its matching fields are synchronized too.
 */
function updateFields(id, patch) {
  const request = findOne(id);
  if (!request) return null;

  const allowedFields = ['doctor_id', 'requested_date', 'requested_time', 'department', 'ward_type', 'visit_type'];
  const updateData = {};
  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      updateData[field] = patch[field];
    }
  }
  Object.assign(request, updateData);
  request.updated_at = new Date().toISOString();

  // Synchronize with linked appointment if present
  if (request.appointment_id) {
    const appointment = dataStore.appointments.find(
      (a) => a.appointment_id === request.appointment_id,
    );
    if (appointment) {
      if (updateData.requested_date) {
        appointment.appointment_date = updateData.requested_date;
        const timePart = updateData.requested_time
          ? (updateData.requested_time.includes(':') ? updateData.requested_time : '09:00:00')
          : '09:00:00';
        appointment.scheduled_datetime = `${updateData.requested_date}T${timePart}`;
      }
      if (updateData.requested_time) appointment.appointment_time = updateData.requested_time;
      if (updateData.doctor_id) appointment.doctor_id = Number(updateData.doctor_id);
      if (updateData.department) appointment.department = updateData.department;
      if (updateData.visit_type) appointment.visit_type = updateData.visit_type;
    }
  }

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
  if (
    isTerminal(toStatus) ||
    ['ADMITTED', 'DISCHARGE_APPROVED'].includes(toStatus)
  ) {
    request.decided_at = request.decided_at || new Date().toISOString();
  }

  if (toStatus === 'REJECTED' && extra?.reject_reason) {
    request.reject_reason = extra.reject_reason;
  }

  if (toStatus === 'ADMITTED' && extra?.bed_id) {
    request.bed_id = Number(extra.bed_id);
  }

  if (toStatus === 'DISCHARGED') {
    // Release the physical bed and finalize the inpatient admission.
    // We look up by patient_id only — relying on bed_id matching the pre-request
    // is fragile if the pre-request's bed_id was set in a separate transaction.
    if (request.bed_id) {
      wardService.updateBedStatus(request.bed_id, 'AVAILABLE');
    }
    const patientAdmissions = dataStore.admissions.filter(
      (a) => a.patient_id === request.patient_id,
    );
    // Pick the active admission (any non-DISCHARGED status)
    const admission = patientAdmissions.find((a) => a.status !== 'DISCHARGED');
    if (admission) {
      admission.status = 'DISCHARGED';
      admission.discharge_time = new Date().toISOString();
    }
  }

  // Synchronize appointment status if linked
  if (request.appointment_id) {
    const appointment = dataStore.appointments.find(
      (a) => a.appointment_id === request.appointment_id,
    );
    if (appointment) {
      if (toStatus === 'APPROVED') {
        appointment.status = 'CONFIRMED';
      } else if (toStatus === 'REJECTED') {
        appointment.status = 'CANCELLED';
      } else if (['CONSULTATION_DONE', 'DISCHARGED'].includes(toStatus)) {
        appointment.status = 'COMPLETED';
      }
    }
  } else if (toStatus === 'APPROVED') {
    const timePart = request.requested_time
      ? (request.requested_time.includes(':') ? request.requested_time : '09:00:00')
      : '09:00:00';
    const newAppointment = {
      appointment_id:
        dataStore.appointments.length > 0
          ? Math.max(...dataStore.appointments.map((a) => a.appointment_id)) + 1
          : 601,
      patient_id: request.patient_id,
      doctor_id: request.doctor_id || null,
      appointment_date: request.requested_date,
      appointment_time: request.requested_time || null,
      scheduled_datetime: request.requested_date ? `${request.requested_date}T${timePart}` : null,
      department: request.department || 'General',
      status: 'CONFIRMED',
      organization_id: request.organization_id,
      hospital_id: request.hospital_id,
      created_at: new Date().toISOString(),
    };
    dataStore.appointments.push(newAppointment);
    request.appointment_id = newAppointment.appointment_id;
  }

  activityService.log(
    'success',
    `Pre-request #${id} moved to ${toStatus}`,
    { preRequestId: id, actorRole },
    request.organization_id,
  );

  return request;
}

function checkIn(id, payload = {}, organizationId, hospitalId, actorRole = 'PRE') {
  const request = findOne(id);
  if (!request) {
    const err = new Error(`Pre-request #${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const visitType = payload.visit_type === 'Admit' ? 'Admit' : 'OPD';
  const orgId = organizationId || request.organization_id;
  const hospId = hospitalId || request.hospital_id;

  if (visitType === 'OPD') {
    request.status = 'CONSULTATION_DONE';
    request.visit_type = 'OPD';
    request.updated_at = new Date().toISOString();

    // Check if an active admission for this patient already exists
    let admission = (request.admission_id ? dataStore.admissions.find((a) => a.admission_id === request.admission_id) : null) ||
      dataStore.admissions.find(
        (a) => a.patient_id === request.patient_id && a.status !== 'DISCHARGED',
      );

    if (!admission) {
      admission = {
        admission_id:
          dataStore.admissions.length > 0
            ? Math.max(...dataStore.admissions.map((a) => a.admission_id)) + 1
            : 501,
        patient_id: request.patient_id,
        doctor_id: request.doctor_id || null,
        department: request.department || 'General',
        visit_type: 'OPD',
        admission_date: new Date().toISOString(),
        status: 'ADMITTED',
        organization_id: orgId,
        hospital_id: hospId,
        created_at: new Date().toISOString(),
      };
      dataStore.admissions.push(admission);
    } else {
      admission.visit_type = 'OPD';
    }
    request.admission_id = admission.admission_id;

    // Check if a ledger already exists for this admission or patient
    let ledger = dataStore.ledgers.find((l) => l.admission_id === admission.admission_id);
    if (!ledger) {
      ledger = {
        ledger_id:
          dataStore.ledgers.length > 0
            ? Math.max(...dataStore.ledgers.map((l) => l.ledger_id)) + 1
            : 801,
        admission_id: admission.admission_id,
        status: 'OPEN',
        organization_id: orgId,
        hospital_id: hospId,
        created_at: new Date().toISOString(),
      };
      dataStore.ledgers.push(ledger);

      // Find or default Doctor Consultation service
      let service = dataStore.services.find(
        (s) =>
          s.service_name &&
          (s.service_name.toLowerCase().includes('consult') || s.service_name.toLowerCase().includes('doctor')),
      ) || dataStore.services[0];

      const serviceId = service ? service.service_id : 1;
      const unitPrice = service ? Number(service.base_cost) : 500;

      const entry = {
        entry_id:
          dataStore.ledgerEntries.length > 0
            ? Math.max(...dataStore.ledgerEntries.map((e) => e.entry_id)) + 1
            : 901,
        ledger_id: ledger.ledger_id,
        service_id: serviceId,
        quantity: 1,
        unit_price: unitPrice,
        amount: unitPrice,
        organization_id: orgId,
        hospital_id: hospId,
        created_at: new Date().toISOString(),
      };
      dataStore.ledgerEntries.push(entry);
    }

    // Synchronize appointment status
    if (request.appointment_id) {
      const appt = dataStore.appointments.find((a) => a.appointment_id === request.appointment_id);
      if (appt) appt.status = 'COMPLETED';
    }

    activityService.log(
      'success',
      `Outpatient checked in: Pre-request #${id}, Ledger #${ledger.ledger_id} active`,
      { preRequestId: id, admissionId: admission.admission_id, ledgerId: ledger.ledger_id },
      orgId,
    );

    return { preRequest: request, admission, ledger };
  } else {
    // Inpatient Admit flow: marks visit_type = 'Admit', status = 'APPROVED'
    request.visit_type = 'Admit';
    request.status = 'APPROVED';
    request.updated_at = new Date().toISOString();

    let admission = (request.admission_id ? dataStore.admissions.find((a) => a.admission_id === request.admission_id) : null) ||
      dataStore.admissions.find(
        (a) => a.patient_id === request.patient_id && a.status !== 'DISCHARGED',
      );
    if (admission) {
      admission.visit_type = 'Admit';
    }

    let bedRequest = dataStore.bedRequests.find(
      (b) => b.pre_request_id === request.pre_request_id && (b.status === 'PENDING' || b.status === 'ALLOCATED'),
    );
    if (!bedRequest) {
      bedRequest = {
        bed_request_id:
          dataStore.bedRequests.length > 0
            ? Math.max(...dataStore.bedRequests.map((r) => r.bed_request_id)) + 1
            : 1,
        pre_request_id: request.pre_request_id,
        patient_id: Number(request.patient_id),
        ward_id: null,
        priority: payload.priority || 'NORMAL',
        status: 'PENDING',
        bed_id: null,
        requested_by: actorRole || 'PRE',
        organization_id: orgId,
        hospital_id: hospId,
        requested_at: new Date().toISOString(),
        decided_at: null,
      };
      dataStore.bedRequests.push(bedRequest);
    }

    activityService.log(
      'info',
      `Pre-request #${id} marked for Inpatient Admission (Bed request #${bedRequest.bed_request_id} sent to HOM)`,
      { preRequestId: id, bedRequestId: bedRequest.bed_request_id },
      orgId,
    );

    return { preRequest: request, bedRequest };
  }
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
  checkIn,
};
