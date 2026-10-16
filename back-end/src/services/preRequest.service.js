'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
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
  'CRITICAL',
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
    CRITICAL: ['PRE'],
    CONSULTATION_DONE: ['PRE'],
  },
  CRITICAL: {
    ADMITTED: ['HOM'], // via bed allocation — see ward.service.js#updateBedRequest cascade
    REJECTED: ['HOM', 'PRE'],
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

// APPROVED -> ADMITTED also happens via HOM bed allocation.
TRANSITIONS.APPROVED.ADMITTED = ['HOM'];

const HOM_STATUS_BY_STATUS = {
  PENDING: 'Awaiting PRE review',
  APPROVED: 'Awaiting PRE action / bed request',
  REJECTED: 'Closed — rejected',
  CONSULTATION_DONE: 'Closed — consultation complete',
  CRITICAL: 'Awaiting HOM bed allocation',
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

/**
 * The CONFIRMED appointment an approved request books with its doctor, so
 * the doctor's slot is visible to later double-booking checks.
 */
function createLinkedAppointment(request) {
  const timePart = request.requested_time
    ? (request.requested_time.includes(':') ? request.requested_time : '09:00:00')
    : '09:00:00';
  let scheduledDatetime = null;
  if (request.requested_date) {
    const combined = new Date(`${request.requested_date} ${timePart}`);
    scheduledDatetime = !isNaN(combined.getTime()) ? combined.toISOString() : `${request.requested_date}T09:00:00.000Z`;
  }

  const orgId = request.organization_id ? Number(request.organization_id) : null;
  const fallbackUser = orgId ? (dataStore.users.find((u) => u.organization_id === orgId)?.user_id || 101) : 101;
  const createdBy = request.created_by ? Number(request.created_by) : fallbackUser;

  const newAppointment = {
    appointment_id:
      maxId(dataStore.appointments, 'appointment_id', 601) + 1,
    patient_id: Number(request.patient_id),
    doctor_id: request.doctor_id ? Number(request.doctor_id) : null,
    availability_id: null,
    appointment_date: request.requested_date,
    appointment_time: request.requested_time || null,
    scheduled_datetime: scheduledDatetime,
    department: request.department || 'General',
    visit_type: request.visit_type || 'Consultation',
    status: 'CONFIRMED',
    created_by: createdBy,
    organization_id: orgId,
    hospital_id: request.hospital_id ? Number(request.hospital_id) : null,
    created_at: new Date().toISOString(),
    note: request.note || null,
    document_urls: Array.isArray(request.document_urls) ? request.document_urls : [],
  };
  dataStore.appointments.push(newAppointment);
  request.appointment_id = newAppointment.appointment_id;
  return newAppointment;
}

function findOne(id) {
  const numId = Number(id);
  return dataStore.preRequests.find((p) => Number(p.pre_request_id) === numId) || null;
}

function create(payload, createdBy) {
  const rawStatus = payload.status === 'EMERGENCY' ? 'CRITICAL' : payload.status;
  const initialStatus =
    rawStatus || (payload.visit_type === 'Critical' || payload.visit_type === 'Emergency' ? 'CRITICAL' : 'PENDING');
  const newRequest = {
    pre_request_id:
      maxId(dataStore.preRequests, 'pre_request_id', 1) + 1,
    patient_id: Number(payload.patient_id),
    appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
    department: payload.department,
    doctor_id: payload.doctor_id ? Number(payload.doctor_id) : null,
    visit_type: payload.visit_type,
    ward_type: payload.ward_type || null,
    requested_date: payload.requested_date || null,
    requested_time: payload.requested_time || null,
    note: payload.note || null,
    document_urls: Array.isArray(payload.document_urls) ? payload.document_urls : [],
    status: initialStatus,
    hom_status: HOM_STATUS_BY_STATUS[initialStatus] || 'Awaiting PRE review',
    bed_id: null,
    reject_reason: null,
    created_by: createdBy ? Number(createdBy) : (payload.created_by ? Number(payload.created_by) : null),
    organization_id: payload.organization_id ? Number(payload.organization_id) : null,
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    decided_at: null,
  };
  dataStore.preRequests.push(newRequest);

  // PRE's "Create Appointment" schedules straight into APPROVED with a doctor;
  // book that doctor's slot just as the PENDING -> APPROVED transition does.
  if (initialStatus === 'APPROVED' && newRequest.doctor_id && !newRequest.appointment_id) {
    createLinkedAppointment(newRequest);
  }

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

  const allowedFields = ['doctor_id', 'requested_date', 'requested_time', 'department', 'ward_type', 'visit_type', 'note', 'document_urls'];
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
        const combined = new Date(`${updateData.requested_date} ${timePart}`);
        appointment.scheduled_datetime = !isNaN(combined.getTime()) ? combined.toISOString() : `${updateData.requested_date}T09:00:00.000Z`;
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
  // Admission must leave the physical bed OCCUPIED. The bed-allocation path
  // already set it, but any other route into ADMITTED previously recorded the
  // bed_id without ever marking the bed itself.
  if (toStatus === 'ADMITTED' && request.bed_id) {
    wardService.updateBedStatus(request.bed_id, 'OCCUPIED');
  }

  if (extra?.doctor_id) request.doctor_id = Number(extra.doctor_id);
  if (extra?.requested_time) request.requested_time = extra.requested_time;
  if (extra?.requested_date) request.requested_date = extra.requested_date;
  if (extra?.department) request.department = extra.department;

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
    createLinkedAppointment(request);
  }

  activityService.log(
    'success',
    `Pre-request #${id} moved to ${toStatus}`,
    { preRequestId: id, actorRole },
    request.organization_id,
  );

  return request;
}

/** HOM may reject only the PRE request linked to an inpatient bed request. */
function rejectAdmissionRequest(id, actorRole) {
  const request = findOne(id);
  if (
    actorRole !== 'HOM' ||
    !request ||
    request.visit_type !== 'Admit' ||
    !['PENDING', 'APPROVED', 'CRITICAL'].includes(request.status)
  ) {
    return null;
  }
  return transition(id, 'REJECTED', actorRole);
}

const OPD_CONSULTATION_FEE = 500;
const CHECK_IN_STATUSES = ['PENDING', 'APPROVED', 'CRITICAL'];

/**
 * The tenant's own consultation tariff for the OPD check-in charge. The
 * original searched every tenant's services, so one org's check-in could post
 * another org's service_id/price. Prefers the exact "Consultation Fee" row
 * every provisioned tenant is seeded with, then any consultation service, and
 * creates the standard ₹500 one if the tenant has none.
 */
function consultationServiceFor(organizationId, hospitalId) {
  const own = dataStore.services.filter(
    (s) => Number(s.organization_id) === Number(organizationId) && s.service_name,
  );
  const found =
    own.find((s) => s.service_name.toLowerCase() === 'consultation fee') ||
    own.find((s) => s.service_name.toLowerCase().includes('consult'));
  if (found) return found;

  const created = {
    service_id: maxId(dataStore.services, 'service_id', 1) + 1,
    service_name: 'Consultation Fee',
    category: 'Consultation',
    base_cost: OPD_CONSULTATION_FEE,
    organization_id: organizationId || null,
    hospital_id: hospitalId || null,
  };
  dataStore.services.push(created);
  return created;
}

function checkIn(id, payload = {}, organizationId, hospitalId, actorRole = 'PRE') {
  const request = findOne(id);
  if (!request) {
    const err = new Error(`Pre-request #${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  // Triage only applies to a patient still in the intake queue — never to
  // one already checked in, admitted, rejected or discharged.
  if (!CHECK_IN_STATUSES.includes(request.status)) {
    const err = new Error(
      `Pre-request #${id} is ${request.status} and can no longer be checked in`,
    );
    err.name = 'Conflict';
    err.statusCode = 409;
    throw err;
  }

  const visitType = payload.visit_type === 'Admit' ? 'Admit' : 'OPD';
  const orgId = organizationId || request.organization_id;
  const hospId = hospitalId || request.hospital_id;

  // PRE may allocate the on-duty doctor at triage time.
  if (payload.doctor_id) request.doctor_id = Number(payload.doctor_id);

  if (visitType === 'OPD') {
    // 1. Prepare / resolve admission
    let admission = request.admission_id
      ? dataStore.admissions.find((a) => Number(a.admission_id) === Number(request.admission_id))
      : null;

    let stagedAdmission = null;
    if (!admission) {
      stagedAdmission = {
        admission_id: maxId(dataStore.admissions, 'admission_id', 701) + 1,
        patient_id: Number(request.patient_id),
        doctor_id: request.doctor_id ? Number(request.doctor_id) : null,
        department: request.department || 'General',
        visit_type: 'OPD',
        admit_time: new Date().toISOString(),
        admission_date: new Date().toISOString(),
        status: 'ADMITTED',
        organization_id: Number(orgId),
        hospital_id: Number(hospId),
        created_at: new Date().toISOString(),
      };
      admission = stagedAdmission;
    }

    // 2. Prepare / resolve ledger and entry
    let ledger = dataStore.ledgers.find((l) => Number(l.admission_id) === Number(admission.admission_id));
    let stagedLedger = null;
    let stagedEntry = null;

    if (!ledger) {
      stagedLedger = {
        ledger_id: maxId(dataStore.ledgers, 'ledger_id', 801) + 1,
        admission_id: Number(admission.admission_id),
        status: 'OPEN',
        organization_id: Number(orgId),
        hospital_id: Number(hospId),
        created_at: new Date().toISOString(),
      };
      ledger = stagedLedger;

      const service = consultationServiceFor(orgId, hospId);
      const serviceId = Number(service.service_id);
      const unitPrice = Number(service.base_cost) || OPD_CONSULTATION_FEE;

      const existingEntries = dataStore.ledgerEntries.filter((e) => Number(e.ledger_id) === Number(ledger.ledger_id));
      const nextEntryId = existingEntries.reduce((max, e) => Math.max(max, Number(e.entry_id) || 0), 0) + 1;

      stagedEntry = {
        entry_id: nextEntryId,
        ledger_id: Number(ledger.ledger_id),
        service_id: serviceId,
        quantity: 1,
        unit_price: unitPrice,
        amount: unitPrice,
        entry_time: new Date().toISOString(),
        organization_id: Number(orgId),
        hospital_id: Number(hospId),
        created_at: new Date().toISOString(),
      };
    }

    // 3. Atomically commit staged records together
    if (stagedAdmission) dataStore.admissions.push(stagedAdmission);
    if (stagedLedger) dataStore.ledgers.push(stagedLedger);
    if (stagedEntry) dataStore.ledgerEntries.push(stagedEntry);

    request.admission_id = admission.admission_id;
    request.status = 'CONSULTATION_DONE';
    request.visit_type = 'OPD';
    request.updated_at = new Date().toISOString();

    // Synchronize appointment status
    if (request.appointment_id) {
      const appt = dataStore.appointments.find((a) => Number(a.appointment_id) === Number(request.appointment_id));
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
    // and queues a bed request for HOM. The inpatient admission itself is
    // created when HOM allocates the bed (ward.controller.js), so no existing
    // admission is touched here - this used to relabel whatever active
    // admission the patient had (e.g. an unpaid OPD visit) as 'Admit'.
    request.visit_type = 'Admit';
    request.status = 'APPROVED';
    request.updated_at = new Date().toISOString();

    let bedRequest = dataStore.bedRequests.find(
      (b) => b.pre_request_id === request.pre_request_id && (b.status === 'PENDING' || b.status === 'ALLOCATED'),
    );
    if (!bedRequest) {
      const targetWardId = payload.ward_id
        ? Number(payload.ward_id)
        : (dataStore.wards.find((w) => Number(w.organization_id) === Number(orgId))?.ward_id || 1);

      const preStaff = dataStore.users.find((u) => Number(u.organization_id) === Number(orgId) && u.role_id === 2);
      const numericRequestedBy = typeof actorRole === 'number'
        ? actorRole
        : !isNaN(Number(actorRole))
          ? Number(actorRole)
          : (preStaff ? preStaff.user_id : 102);

      bedRequest = {
        bed_request_id:
          maxId(dataStore.bedRequests, 'bed_request_id', 1) + 1,
        pre_request_id: request.pre_request_id,
        patient_id: Number(request.patient_id),
        ward_id: targetWardId,
        priority: payload.priority || 'NORMAL',
        status: 'PENDING',
        bed_id: null,
        requested_by: numericRequestedBy,
        organization_id: orgId,
        hospital_id: hospId,
        requested_at: new Date().toISOString(),
        decided_at: null,
      };
      dataStore.bedRequests.push(bedRequest);
    } else if (payload.priority && bedRequest.status === 'PENDING') {
      bedRequest.priority = payload.priority;
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
  rejectAdmissionRequest,
  checkIn,
};
