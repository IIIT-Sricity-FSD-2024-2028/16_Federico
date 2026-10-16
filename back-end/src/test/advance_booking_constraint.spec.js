'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { createSession } = require('../store/sessionStore');
const dataStore = require('../store/dataStore');
const {
  extractDatePart,
  getBookingDateBounds,
  validateBookingDate,
} = require('../validators/bookingDate.validator');

describe('Patient Appointment Advance Booking Constraint Suite', () => {
  let app;
  let patientSession;
  let testPatient;

  function toIso(date) {
    return date.toISOString().split('T')[0];
  }

  function addDays(baseIso, days) {
    const [y, m, d] = baseIso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return toIso(date);
  }

  function getNextWeekday(baseIso, daysAhead = 1) {
    let dateStr = addDays(baseIso, daysAhead);
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay(); // 0 is Sun, 6 is Sat
    if (day === 0) dateStr = addDays(dateStr, 1);
    else if (day === 6) dateStr = addDays(dateStr, 2);
    return dateStr;
  }

  const TODAY = toIso(new Date());

  beforeAll(() => {
    app = createApp();
    testPatient = dataStore.patients.find((p) => p.organization_id === 1) || dataStore.patients[0];
    patientSession = createSession({
      userId: 999111,
      role: 'Patient',
      patientId: testPatient.patient_id,
      organizationId: testPatient.organization_id || 1,
      hospitalId: testPatient.hospital_id || 1,
    });
  });

  describe('Date Validator Utility', () => {
    it('extracts date part from various ISO string formats', () => {
      expect(extractDatePart('2026-10-15')).toBe('2026-10-15');
      expect(extractDatePart('2026-10-15T09:30:00.000Z')).toBe('2026-10-15');
      expect(extractDatePart('2026-10-15 14:00:00')).toBe('2026-10-15');
      expect(extractDatePart(new Date(Date.UTC(2026, 9, 15)))).toBe('2026-10-15');
      expect(extractDatePart(null)).toBeNull();
      expect(extractDatePart('invalid-date')).toBeNull();
    });

    it('calculates booking bounds correctly for 14 days window', () => {
      const bounds = getBookingDateBounds('2026-10-15', 14, 0);
      expect(bounds.minDate).toBe('2026-10-15');
      expect(bounds.maxDate).toBe('2026-10-29');
      expect(bounds.maxDays).toBe(14);
    });

    it('rejects past dates and dates beyond max advance days', () => {
      const base = '2026-10-15';
      expect(validateBookingDate('2026-10-14', 14, base)).toEqual({
        valid: false,
        message: 'Appointment date cannot be in the past',
      });
      expect(validateBookingDate('2026-10-15', 14, base).valid).toBe(true);
      expect(validateBookingDate('2026-10-29', 14, base).valid).toBe(true);
      expect(validateBookingDate('2026-10-30', 14, base)).toEqual({
        valid: false,
        message: 'Appointment date cannot be scheduled more than 14 days in advance',
      });
    });
  });

  describe('Patient API Advance Booking Enforcement', () => {
    it('allows patient to book an appointment for today', async () => {
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: TODAY,
          requested_time: '10:00 AM',
        });

      expect(res.status).toBe(201);
      expect(res.body.pre_request_id).toBeDefined();
      expect(res.body.requested_date).toBe(TODAY);
      expect(res.body.status).toBe('PENDING');
    });

    it('allows patient to book an appointment within the 14-day window (day 7)', async () => {
      const targetDate = addDays(TODAY, 7);
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: targetDate,
          requested_time: '11:00 AM',
        });

      expect(res.status).toBe(201);
      expect(res.body.requested_date).toBe(targetDate);
    });

    it('allows patient to book an appointment on the exact 14th day horizon', async () => {
      const targetDate = addDays(TODAY, 14);
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: targetDate,
          requested_time: '02:00 PM',
        });

      expect(res.status).toBe(201);
      expect(res.body.requested_date).toBe(targetDate);
    });

    it('refuses booking with 400 Bad Request when appointment date is in the past', async () => {
      const pastDate = addDays(TODAY, -1);
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: pastDate,
          requested_time: '10:00 AM',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cannot be in the past/i);
    });

    it('refuses booking with 400 Bad Request when appointment date is beyond 14 days (day 15)', async () => {
      const futureDate = addDays(TODAY, 15);
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: futureDate,
          requested_time: '10:00 AM',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cannot be scheduled more than 14 days in advance/i);
    });

    it('refuses booking with 400 Bad Request when appointment date is 1 year ahead (day 365)', async () => {
      const nextYear = addDays(TODAY, 365);
      const res = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: nextYear,
          requested_time: '10:00 AM',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cannot be scheduled more than 14 days in advance/i);
    });

    it('stores symptoms note and document_urls and propagates them to confirmed appointment', async () => {
      const preTok = createSession({ userId: 105, role: 'PRE', organizationId: 1, hospitalId: 1 });
      // Ensure targetDate is an on-duty weekday (Mon-Fri) for doctor 401
      const targetDate = getNextWeekday(TODAY, 1);
      const symptomsText = 'Severe migraine and fever for 2 days';
      const fileUrls = ['/api/uploads/documents/rx-101.pdf', '/api/uploads/documents/lab-202.png'];

      const createRes = await request(app)
        .post('/pre-requests')
        .set('Authorization', `Bearer ${patientSession}`)
        .send({
          patient_id: testPatient.patient_id,
          department: 'General Medicine',
          visit_type: 'Consultation',
          requested_date: targetDate,
          requested_time: '11:00 AM',
          note: symptomsText,
          document_urls: fileUrls,
        });

      expect(createRes.status).toBe(201);
      const preRequestId = createRes.body.pre_request_id;
      expect(createRes.body.note).toBe(symptomsText);
      expect(createRes.body.document_urls).toEqual(fileUrls);

      // PRE approves the request
      const approveRes = await request(app)
        .put(`/pre-requests/${preRequestId}`)
        .set('Authorization', `Bearer ${preTok}`)
        .send({
          status: 'APPROVED',
          doctor_id: 401,
          requested_date: targetDate,
          requested_time: '11:00 AM',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('APPROVED');
      const appointmentId = approveRes.body.appointment_id;
      expect(appointmentId).toBeDefined();

      const linkedAppointment = dataStore.appointments.find((a) => a.appointment_id === appointmentId);
      expect(linkedAppointment).toBeDefined();
      expect(linkedAppointment.note).toBe(symptomsText);
      expect(linkedAppointment.document_urls).toEqual(fileUrls);
    });
  });
});
