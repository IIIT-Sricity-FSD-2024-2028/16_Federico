'use strict';

const preRequestService = require('../services/preRequest.service');
const billingService = require('../services/billing.service');
const doctorService = require('../services/doctor.service');
const dataStore = require('../store/dataStore');
const { sendResult } = require('../utils/sendResult');
const { forbidsOtherPatient, isPatientSession } = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');
const { validateBookingDate } = require('../validators/bookingDate.validator');

// PRE's final discharge sign-off (DISCHARGE_APPROVED -> DISCHARGED) is the
// step that physically releases the bed. It must not happen until Finance
// has confirmed the patient's bill is fully paid. Returns a human-readable
// reason string when discharge should be blocked, or null when it may
// proceed.
function dischargeBlockReason(patientId) {
  const pid = Number(patientId);
  const patientAdmissions = dataStore.admissions.filter((a) => a.patient_id === pid);
  if (patientAdmissions.length === 0) return null;
  const admission =
    patientAdmissions.find((a) => a.status !== 'DISCHARGED') ||
    patientAdmissions[patientAdmissions.length - 1];

  const ledger = billingService.findLedgerByAdmission(admission.admission_id);
  if (!ledger) {
    return 'Cannot finalize discharge — Finance has not opened a billing ledger for this admission yet.';
  }
  if (ledger.status !== 'PAID') {
    return 'Cannot finalize discharge — the patient bill has not been cleared by Finance yet.';
  }
  return null;
}

const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

// A Patient session sees/touches only their own pre-requests; HOM/PRE/FA
// see everything (within their own organization).
function findAll(req, res) {
  const all = scopeToOrg(preRequestService.findAll(), req);
  const visible =
    req.session && req.session.role === 'Patient'
      ? all.filter((p) => p.patient_id === req.session.patientId)
      : all;
  sendResult(res, visible, 200);
}

function findOne(req, res) {
  const request = preRequestService.findOne(+req.params.id);
  if (
    request &&
    (forbidsOtherPatient(req, request.patient_id) ||
      !belongsToOrg(request, req))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, request, 200);
}

function create(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const payload = { ...req.body };
  // A patient's booking always starts PENDING for PRE review — the body's
  // `status` is not stripped by the validator, so drop it explicitly.
  if (isPatientSession(req)) delete payload.status;

  const tenantPayload = withTenant(req, payload);
  const patient = dataStore.patients.find((item) => Number(item.patient_id) === Number(tenantPayload.patient_id));
  if (!belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
  if (tenantPayload.doctor_id) {
    const doctor = dataStore.doctors.find((item) => Number(item.doctor_id) === Number(tenantPayload.doctor_id));
    if (!belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  if (tenantPayload.appointment_id) {
    const appointment = dataStore.appointments.find((item) => Number(item.appointment_id) === Number(tenantPayload.appointment_id));
    if (!belongsToOrg(appointment, req) || Number(appointment.patient_id) !== Number(tenantPayload.patient_id)) return res.status(404).json({ message: 'Appointment not found for this patient in this organization', error: 'Not Found', statusCode: 404 });
  }

  // Patient booking horizon constraint: appointments cannot be scheduled in the past
  // or more than MAX_ADVANCE_BOOKING_DAYS (default 14 days) in advance.
  const isPatientBooking =
    isPatientSession(req) ||
    (req.session && req.session.role === 'Patient') ||
    (!req.session && req.headers['x-role'] === 'Patient') ||
    payload.status === 'PENDING' ||
    !payload.status;

  if (isPatientBooking && payload.requested_date) {
    const dateCheck = validateBookingDate(payload.requested_date);
    if (!dateCheck.valid) {
      return res.status(400).json({
        message: dateCheck.message,
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }

  // PRE scheduling directly into APPROVED books the doctor's slot now, so it
  // gets the same availability / double-booking check as an approval.
  if (payload.status === 'APPROVED' && payload.doctor_id) {
    const availability = doctorService.isDoctorAvailableAt(
      payload.doctor_id,
      payload.requested_date,
      payload.requested_time,
    );
    if (!availability.available) {
      return res.status(409).json({
        message: availability.message,
        error: 'Conflict',
        statusCode: 409,
      });
    }
  }

  const createdBy = req.session ? req.session.userId : null;
  sendResult(
    res,
    preRequestService.create(tenantPayload, createdBy),
    201,
  );
}

// ADMITTED is reachable ONLY through the ward bed-allocation cascade
// (ward.service.js#updateBedRequest calling preRequestService.transition
// internally) — never directly via this endpoint, so there is exactly
// one code path that assigns a bed and flips this status, not the three
// different uncoordinated ones the original frontend had.
const PUBLICLY_SETTABLE_STATUSES = new Set([
  'APPROVED',
  'REJECTED',
  'CRITICAL',
  'EMERGENCY',
  'CONSULTATION_DONE',
  'DISCHARGE_REQUESTED',
  'DISCHARGE_APPROVED',
  'DISCHARGED',
]);

/**
 * PUT /pre-requests/:id — two distinct kinds of update, split by whether
 * `status` is present in the body:
 *  - status present -> a state transition. Validated against the actor's
 *    permitted moves in preRequestService.TRANSITIONS. A session-less
 *    legacy x-role SUPER_USER call skips the actor check (same "admin can
 *    do anything" bypass every other resource already has).
 *  - status absent -> a field update (doctor/date/time/department), PRE
 *    only (rescheduling), never Patient.
 */
function update(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendResult(res, null, 200);

  if (
    forbidsOtherPatient(req, existing.patient_id) ||
    !belongsToOrg(existing, req)
  )
    return res.status(403).json(FORBIDDEN);

  if (req.body.doctor_id !== undefined) {
    const doctor = doctorService.findDoctorById(req.body.doctor_id);
    if (!belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
  }

  const requestedStatus = req.body.status;

  if (requestedStatus !== undefined) {
    if (requestedStatus === 'ADMITTED') return res.status(403).json(FORBIDDEN);

    if (req.session && req.session.role === 'Patient') {
      const requestedFields = Object.keys(req.body);
      const onlyAllowedFields = requestedFields.every((field) =>
        ['status', 'reject_reason'].includes(field),
      );
      if (!onlyAllowedFields) return res.status(403).json(FORBIDDEN);
    }

    if (!PUBLICLY_SETTABLE_STATUSES.has(requestedStatus))
      return res.status(403).json(FORBIDDEN);

    if (requestedStatus === 'DISCHARGED') {
      const blockReason = dischargeBlockReason(existing.patient_id);
      if (blockReason) {
        return res
          .status(409)
          .json({ message: blockReason, error: 'Conflict', statusCode: 409 });
      }
    }

    if (requestedStatus === 'APPROVED') {
      const doctorId = req.body.doctor_id || existing.doctor_id;
      if (doctorId) {
        const doctor = doctorService.findDoctorById(doctorId);
        if (!belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
      }
      const requestedDate = req.body.requested_date || existing.requested_date;
      const requestedTime = req.body.requested_time || existing.requested_time;
      const availability = doctorService.isDoctorAvailableAt(
        doctorId,
        requestedDate,
        requestedTime,
        existing.appointment_id || null,
      );
      if (!availability.available) {
        return res.status(409).json({
          message: availability.message,
          error: 'Conflict',
          statusCode: 409,
        });
      }
    }

    if (
      !req.session ||
      !preRequestService.canTransition(
        existing.status,
        requestedStatus,
        req.session.role,
      )
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    return sendResult(
      res,
      preRequestService.transition(
        existing.pre_request_id,
        requestedStatus,
        req.session?.role,
        req.body,
      ),
      200,
    );
  }

  const actor = req.session?.actor || req.session?.role;
  if (req.session && actor !== 'PRE' && actor !== 'HOM' && actor !== 'OPERATIONS') {
    return res.status(403).json(FORBIDDEN);
  }

  sendResult(
    res,
    preRequestService.updateFields(existing.pre_request_id, req.body),
    200,
  );
}

function checkIn(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendResult(res, null, 404);

  // Triage is a reception action: a Patient session (which has general
  // preRequest write access for its own requests) may never check itself in.
  if (!belongsToOrg(existing, req) || isPatientSession(req)) {
    return res.status(403).json(FORBIDDEN);
  }

  const result = preRequestService.checkIn(
    existing.pre_request_id,
    req.body,
    req.tenant?.organizationId,
    req.tenant?.hospitalId,
    req.session?.role || 'PRE',
  );

  sendResult(res, result, 200);
}

module.exports = { findAll, findOne, create, update, checkIn };
