'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { createSession, getSession } = require('../store/sessionStore');
const dataStore = require('../store/dataStore');
const wardService = require('../services/ward.service');
const preRequestService = require('../services/preRequest.service');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service');
const billingService = require('../services/billing.service');
const provisioningService = require('../services/provisioning.service');

/**
 * Locks in the concurrency / availability / billing guards:
 *  - a bed can't be allocated twice (409), and ADMITTED/DISCHARGED keep the
 *    physical bed status in step;
 *  - one doctor can't be double-booked into the same slot (409), and doctors
 *    with no calendar rows follow the Mon–Fri 09:00–17:00 roster;
 *  - a discharge summary's final_amount always tracks the ledger entries;
 *  - OPD check-in only bills the caller's own tenant's consultation tariff.
 */
describe('Allocation, booking and billing guards', () => {
  let app;
  let homTok;

  beforeAll(() => {
    app = createApp();
    homTok = createSession({ userId: 101, role: 'HOM', organizationId: 1, hospitalId: 1 });
  });

  function freeBed(orgId = 1) {
    return dataStore.beds.find((b) => b.organization_id === orgId && b.status === 'AVAILABLE');
  }

  function pendingBedRequest(patientId, orgId = 1) {
    return wardService.createBedRequest({ patient_id: patientId, organization_id: orgId, hospital_id: orgId }, 101);
  }

  describe('bed allocation', () => {
    it('refuses to allocate an OCCUPIED bed with 409 and leaves the request pending', async () => {
      const bed = freeBed();
      wardService.updateBedStatus(bed.bed_id, 'OCCUPIED');
      const req = pendingBedRequest(dataStore.patients.find((p) => p.organization_id === 1).patient_id);

      const res = await request(app)
        .put(`/ward/bed-requests/${req.bed_request_id}`)
        .set('Authorization', `Bearer ${homTok}`)
        .send({ bed_id: bed.bed_id });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Bed is already occupied');
      expect(req.status).toBe('PENDING');
      expect(req.bed_id).toBeNull();
      wardService.updateBedStatus(bed.bed_id, 'AVAILABLE');
    });

    it('refuses to allocate a second bed to an already-allocated request', () => {
      const req = pendingBedRequest(dataStore.patients.find((p) => p.organization_id === 1).patient_id);
      const first = freeBed();
      wardService.updateBedRequest(req.bed_request_id, { bed_id: first.bed_id });
      const second = freeBed();

      expect(() => wardService.updateBedRequest(req.bed_request_id, { bed_id: second.bed_id })).toThrow(
        /already been allocated/,
      );
      expect(second.status).toBe('AVAILABLE');
      wardService.updateBedStatus(first.bed_id, 'AVAILABLE');
    });

    it('marks the bed OCCUPIED on ADMITTED and AVAILABLE again on DISCHARGED', () => {
      const bed = freeBed();
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const pre = preRequestService.create({
        patient_id: patient.patient_id,
        department: 'General Medicine',
        visit_type: 'Admit',
        organization_id: 1,
        hospital_id: 1,
      });
      preRequestService.transition(pre.pre_request_id, 'APPROVED', 'PRE');

      preRequestService.transition(pre.pre_request_id, 'ADMITTED', 'HOM', { bed_id: bed.bed_id });
      expect(bed.status).toBe('OCCUPIED');

      preRequestService.transition(pre.pre_request_id, 'DISCHARGED', 'PRE');
      expect(bed.status).toBe('AVAILABLE');
    });
  });

  describe('doctor availability and double booking', () => {
    const doctorId = 401;
    // 2099-03-02 is a Monday, 2099-03-07 a Saturday; neither has calendar rows.
    const monday = '2099-03-02';
    const saturday = '2099-03-07';

    it('applies the Mon–Fri 09:00–17:00 duty roster when no calendar rows exist', () => {
      expect(doctorService.isDoctorAvailableAt(doctorId, monday, '10:00').available).toBe(true);
      expect(doctorService.isDoctorAvailableAt(doctorId, monday, '04:30 PM').available).toBe(true);
      expect(doctorService.isDoctorAvailableAt(doctorId, monday, '17:00').available).toBe(false);
      expect(doctorService.isDoctorAvailableAt(doctorId, monday, '08:30').available).toBe(false);
      expect(doctorService.isDoctorAvailableAt(doctorId, saturday, '10:00').available).toBe(false);
    });

    it('rejects a second booking for the same doctor in an overlapping slot with 409', () => {
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const base = {
        patient_id: patient.patient_id,
        doctor_id: doctorId,
        appointment_date: monday,
        organization_id: 1,
        hospital_id: 1,
      };

      const first = appointmentService.create({ ...base, appointment_time: '11:00' });
      expect(first.appointment_id).toBeDefined();

      let error;
      try {
        appointmentService.create({ ...base, appointment_time: '11:15' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(409);

      // A different slot, or a different doctor, is fine.
      expect(appointmentService.create({ ...base, appointment_time: '12:00' }).appointment_id).toBeDefined();
      expect(
        appointmentService.create({ ...base, doctor_id: 402, appointment_time: '11:00' }).appointment_id,
      ).toBeDefined();

      // Once the doctor's slot is taken, approval for that slot is refused too.
      expect(doctorService.isDoctorAvailableAt(doctorId, monday, '11:00').available).toBe(false);
      // ...unless it is the very appointment being confirmed.
      expect(
        doctorService.isDoctorAvailableAt(doctorId, monday, '11:00', first.appointment_id).available,
      ).toBe(true);
    });

    it('books the slot when PRE schedules straight into APPROVED, and 409s an overlapping one', async () => {
      const preTok = createSession({ userId: 105, role: 'PRE', organizationId: 1, hospitalId: 1 });
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const body = {
        patient_id: patient.patient_id,
        department: 'Cardiology',
        visit_type: 'Consultation',
        doctor_id: 403,
        requested_date: '2099-03-03', // Tuesday
        requested_time: '10:00 AM',
        status: 'APPROVED',
      };

      const first = await request(app).post('/pre-requests').set('Authorization', `Bearer ${preTok}`).send(body);
      expect(first.status).toBe(201);
      expect(first.body.appointment_id).toBeTruthy();

      const clash = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${preTok}`)
        .send({ ...body, requested_time: '10:15 AM' });
      expect(clash.status).toBe(409);
    });

    it("ignores a patient's attempt to create their own request as APPROVED", async () => {
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const patientTok = createSession({
        userId: 999001,
        role: 'Patient',
        patientId: patient.patient_id,
        organizationId: 1,
        hospitalId: 1,
      });
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientTok}`)
        .send({ patient_id: patient.patient_id, department: 'Neurology', visit_type: 'Consultation', status: 'APPROVED' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
    });

    it('seed appointments carry the doctor resolved from their availability slot', () => {
      const seeded = dataStore.appointments.filter((a) => a.appointment_id >= 601 && a.appointment_id <= 611);
      expect(seeded).toHaveLength(11);
      expect(seeded.every((a) => Number.isInteger(a.doctor_id))).toBe(true);
      expect(appointmentService.backfillDoctorIds()).toBe(0);
    });
  });

  describe('discharge summary final amount', () => {
    it('derives final_amount from ledger entries and keeps it in step with later charges', () => {
      const admission =
        dataStore.admissions.find(
          (a) => a.organization_id === 1 && !billingService.findLedgerByAdmission(a.admission_id),
        ) ||
        (() => {
          const maxId = dataStore.admissions.reduce((m, a) => Math.max(m, a.admission_id), 0);
          const newAdm = {
            admission_id: maxId + 1,
            patient_id: 201,
            bed_id: 11,
            status: 'ADMITTED',
            admit_time: new Date().toISOString(),
            discharge_time: null,
            receipt_sent_to_hom: false,
            organization_id: 1,
            hospital_id: 1,
          };
          dataStore.admissions.push(newAdm);
          return newAdm;
        })();
      const ledger = billingService.createLedger({ admission_id: admission.admission_id });
      billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 2, unit_price: 500 });

      // The client claims 900 is due on a 1000 gross: that implies a 100 deduction.
      const summary = billingService.createDischargeSummary({
        admission_id: admission.admission_id,
        discharge_notes: 'ok',
        final_amount: 900,
      });
      expect(summary.gross_amount).toBe(1000);
      expect(summary.insurance_deduction).toBe(100);
      expect(summary.final_amount).toBe(900);

      billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 1, unit_price: 300 });
      const refreshed = billingService.findDischargeSummaryByAdmission(admission.admission_id);
      expect(refreshed.gross_amount).toBe(1300);
      expect(refreshed.final_amount).toBe(1200);
    });

    it('never lets the deduction exceed the gross or go negative', () => {
      const admission =
        dataStore.admissions.find(
          (a) => a.organization_id === 1 && !billingService.findLedgerByAdmission(a.admission_id),
        ) ||
        (() => {
          const maxId = dataStore.admissions.reduce((m, a) => Math.max(m, a.admission_id), 0);
          const newAdm = {
            admission_id: maxId + 1,
            patient_id: 201,
            bed_id: 11,
            status: 'ADMITTED',
            admit_time: new Date().toISOString(),
            discharge_time: null,
            receipt_sent_to_hom: false,
            organization_id: 1,
            hospital_id: 1,
          };
          dataStore.admissions.push(newAdm);
          return newAdm;
        })();
      const ledger = billingService.createLedger({ admission_id: admission.admission_id });
      billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 1, unit_price: 400 });

      const summary = billingService.createDischargeSummary({
        admission_id: admission.admission_id,
        discharge_notes: 'ok',
        final_amount: 5000, // more than the gross -> no deduction, not a negative one
      });
      expect(summary.insurance_deduction).toBe(0);
      expect(summary.final_amount).toBe(400);
    });
  });

  describe('staff directory role dropdown', () => {
    it('changes a staff role within the org, revokes their sessions, and rejects other roles/orgs', async () => {
      const adminTok = createSession({ userId: 1, role: 'Admin', organizationId: 1, hospitalId: 1 });
      const staff = dataStore.users.find((u) => u.user_id === 105); // PRE, org 1
      const staffTok = createSession({ userId: 105, role: 'PRE', organizationId: 1, hospitalId: 1 });

      const ok = await request(app)
        .put('/rbac/staff/105/actor-role')
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ actor_role: 'FA' });
      expect(ok.status).toBe(200);
      expect(ok.body.actor_role).toBe('FA');
      expect(staff.role_id).toBe(3);
      expect(getSession(staffTok)).toBeNull();

      const bad = await request(app)
        .put('/rbac/staff/105/actor-role')
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ actor_role: 'Admin' });
      expect(bad.status).toBe(400);

      const otherOrg = await request(app)
        .put('/rbac/staff/108/actor-role')
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ actor_role: 'HOM' });
      expect(otherOrg.status).toBe(403);

      staff.role_id = 4;
    });
  });

  describe('OPD check-in', () => {
    it("posts the tenant's own consultation fee and refuses a second check-in", () => {
      const { organization, hospital } = provisioningService.provision({
        name: 'Guards Test Clinic',
        admin_name: 'Guard Admin',
        email_domain: 'guards.example',
        admin_email: 'guard.admin@guards.example',
        admin_password: 'Guard@12345',
        plan_id: 1,
      });
      const orgId = organization.organization_id;
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const pre = preRequestService.create({
        patient_id: patient.patient_id,
        department: 'General Medicine',
        visit_type: 'Consultation',
        organization_id: orgId,
        hospital_id: hospital.hospital_id,
      });

      const { ledger } = preRequestService.checkIn(pre.pre_request_id, { visit_type: 'OPD' }, orgId, hospital.hospital_id);
      const [entry] = billingService.findLedgerEntries(ledger.ledger_id);
      const service = dataStore.services.find((s) => s.service_id === entry.service_id);

      expect(service.organization_id).toBe(orgId);
      expect(entry.amount).toBe(500);

      expect(() => preRequestService.checkIn(pre.pre_request_id, { visit_type: 'OPD' }, orgId)).toThrow(
        /can no longer be checked in/,
      );
    });

    it('bills every OPD visit separately, even while an earlier visit is unpaid', () => {
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const visit = () =>
        preRequestService.create({
          patient_id: patient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          organization_id: 1,
          hospital_id: 1,
        });

      const first = preRequestService.checkIn(visit().pre_request_id, { visit_type: 'OPD' }, 1, 1);
      const second = preRequestService.checkIn(visit().pre_request_id, { visit_type: 'OPD' }, 1, 1);

      expect(second.admission.admission_id).not.toBe(first.admission.admission_id);
      expect(second.ledger.ledger_id).not.toBe(first.ledger.ledger_id);
      expect(billingService.findLedgerEntries(second.ledger.ledger_id)).toHaveLength(1);
      expect(second.admission.visit_type).toBe('OPD');
    });

    it('sends an IPD admission to HOM as a PENDING bed request with the chosen priority', () => {
      const patient = dataStore.patients.find((p) => p.organization_id === 1);
      const pre = preRequestService.create({
        patient_id: patient.patient_id,
        department: 'Cardiology',
        visit_type: 'Consultation',
        organization_id: 1,
        hospital_id: 1,
      });

      const { preRequest, bedRequest } = preRequestService.checkIn(
        pre.pre_request_id,
        { visit_type: 'Admit', priority: 'URGENT' },
        1,
        1,
      );
      expect(preRequest.visit_type).toBe('Admit');
      expect(bedRequest.status).toBe('PENDING');
      expect(bedRequest.priority).toBe('URGENT');
      expect(bedRequest.pre_request_id).toBe(pre.pre_request_id);
    });
  });
});
