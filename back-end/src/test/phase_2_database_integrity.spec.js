'use strict';

const dataStore = require('../store/dataStore');
const patientService = require('../services/patient.service');
const preRequestService = require('../services/preRequest.service');
const appointmentService = require('../services/appointment.service');
const billingService = require('../services/billing.service');
const wardService = require('../services/ward.service');
const inventoryService = require('../services/inventory.service');
const { createAdmissionRules } = require('../validators/admission.validators');
const { validateBody } = require('../validators/engine');

describe('Database Relational Integrity & Operational Constraints', () => {
  describe('Doctor Appointment Double-Booking Guards', () => {
    it('ensures no doctor has multiple appointments at the exact same scheduled datetime', () => {
      const doctorSlots = new Map();
      for (const apt of dataStore.appointments) {
        const key = `${apt.doctor_id}_${apt.scheduled_datetime}`;
        expect(doctorSlots.has(key)).toBe(false);
        doctorSlots.set(key, apt.appointment_id);
      }
    });

    it('confirms appointment 608 is scheduled at 13:00 to avoid colliding with 601', () => {
      const apt601 = dataStore.appointments.find((a) => a.appointment_id === 601);
      const apt608 = dataStore.appointments.find((a) => a.appointment_id === 608);
      expect(apt601.doctor_id).toBe(403);
      expect(apt608.doctor_id).toBe(403);
      expect(apt601.scheduled_datetime).toBe('2026-08-19T12:00:00');
      expect(apt608.scheduled_datetime).toBe('2026-08-19T13:00:00');
    });
  });

  describe('Single-Occupancy Inpatient Admission Enforcement', () => {
    it('ensures no patient has more than one admission with status ADMITTED', () => {
      const activePatientIds = new Set();
      for (const adm of dataStore.admissions) {
        if (adm.status === 'ADMITTED') {
          expect(activePatientIds.has(adm.patient_id)).toBe(false);
          activePatientIds.add(adm.patient_id);
        }
      }
    });

    it('verifies prior admissions 711 and 703 are marked DISCHARGED with available beds', () => {
      const adm711 = dataStore.admissions.find((a) => a.admission_id === 711);
      const adm703 = dataStore.admissions.find((a) => a.admission_id === 703);
      expect(adm711.status).toBe('DISCHARGED');
      expect(adm703.status).toBe('DISCHARGED');

      const bed56 = dataStore.beds.find((b) => b.bed_id === 56);
      const bed43 = dataStore.beds.find((b) => b.bed_id === 43);
      expect(bed56.status).toBe('AVAILABLE');
      expect(bed43.status).toBe('AVAILABLE');
    });
  });

  describe('Appointment User Referential Integrity', () => {
    it('ensures every appointment created_by references a valid user_id in users collection', () => {
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      for (const apt of dataStore.appointments) {
        expect(userIds.has(apt.created_by)).toBe(true);
      }
    });
  });

  describe('Receipt & Payment Referential Integrity', () => {
    it('ensures every receipt payment_id references a valid payment in payments collection', () => {
      const paymentIds = new Set(dataStore.payments.map((p) => p.payment_id));
      for (const receipt of dataStore.receipts) {
        expect(paymentIds.has(receipt.payment_id)).toBe(true);
      }
    });

    it('confirms payment 990 exists for receipt 8', () => {
      const payment990 = dataStore.payments.find((p) => p.payment_id === 990);
      expect(payment990).toBeDefined();
      expect(payment990.ledger_id).toBe(809);
      expect(payment990.amount_paid).toBe(500);
    });
  });

  describe('Elective and Emergency Admission Workflows', () => {
    it('links elective admissions to their corresponding appointments', () => {
      const electiveAdmissions = [705, 707, 710, 712, 717, 718];
      for (const admId of electiveAdmissions) {
        const adm = dataStore.admissions.find((a) => a.admission_id === admId);
        expect(adm).toBeDefined();
        expect(adm.appointment_id).not.toBeNull();
        expect(typeof adm.appointment_id).toBe('number');
      }
    });

    it('allows emergency walk-in admission without appointment_id in admission validator', () => {
      const emergencyPayload = {
        patient_id: 201,
        bed_id: 11,
        status: 'ADMITTED',
      };
      const middleware = validateBody(createAdmissionRules);
      const req = { body: emergencyPayload };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Ward Physical Bed Capacity Invariant', () => {
    it('verifies total_beds declared on each ward equals actual count of physical beds in beds collection', () => {
      for (const ward of dataStore.wards) {
        const physicalBeds = dataStore.beds.filter((b) => b.ward_id === ward.ward_id);
        expect(physicalBeds.length).toBe(ward.total_beds);
      }
    });
  });

  describe('Per-Ledger Entry Indexing in OPD Check-in Workflow', () => {
    it('checks in OPD pre-request and ensures generated ledger entry follows per-ledger 1-based indexing', () => {
      const preReq = preRequestService.create({
        patient_id: 201,
        department: 'Cardiology',
        visit_type: 'OPD',
        organization_id: 1,
        hospital_id: 1,
        created_by: 105,
      });

      const checkedIn = preRequestService.checkIn(preReq.pre_request_id, { visit_type: 'OPD' });
      expect(checkedIn.preRequest.status).toBe('CONSULTATION_DONE');

      const createdAdmission = checkedIn.admission;
      expect(createdAdmission).toBeDefined();

      const createdLedger = checkedIn.ledger;
      expect(createdLedger).toBeDefined();

      const entriesForLedger = dataStore.ledgerEntries.filter((e) => e.ledger_id === createdLedger.ledger_id);
      expect(entriesForLedger.length).toBe(1);
      expect(entriesForLedger[0].entry_id).toBe(1);
      expect(entriesForLedger[0].entry_time).toBeDefined();

      // Clean up newly created test records
      dataStore.ledgerEntries = dataStore.ledgerEntries.filter((e) => e.ledger_id !== createdLedger.ledger_id);
      dataStore.ledgers = dataStore.ledgers.filter((l) => l.ledger_id !== createdLedger.ledger_id);
      dataStore.admissions = dataStore.admissions.filter((a) => a.admission_id !== createdAdmission.admission_id);
      dataStore.preRequests = dataStore.preRequests.filter((r) => r.pre_request_id !== preReq.pre_request_id);
    });
  });

  describe('Protected Patient Deletion with Active Admission Guard', () => {
    it('throws HTTP 409 Conflict when attempting to delete a patient with an active admission', () => {
      const activeAdm = dataStore.admissions.find((a) => a.status === 'ADMITTED');
      expect(activeAdm).toBeDefined();

      expect(() => {
        patientService.remove(activeAdm.patient_id);
      }).toThrow();

      try {
        patientService.remove(activeAdm.patient_id);
      } catch (err) {
        expect(err.statusCode).toBe(409);
        expect(err.message).toMatch(/active admission/);
      }
    });

    it('allows deleting a patient who has no active admission', () => {
      const tempPatient = patientService.create({
        name: 'Transient Patient',
        phone: '9999999999',
        organization_id: 1,
        hospital_id: 1,
      });

      const res = patientService.remove(tempPatient.patient_id);
      expect(res.deleted).toBe(true);
      expect(patientService.findOne(tempPatient.patient_id)).toBeNull();
    });
  });

  describe('Entity Creation Type & Timestamp Invariants', () => {
    it('creates appointment with proper number IDs, valid ISO datetime, and valid created_by', () => {
      const apt = appointmentService.create({
        patient_id: '201',
        doctor_id: '401',
        appointment_date: '2026-09-01',
        appointment_time: '10:00:00',
        organization_id: '1',
        hospital_id: '1',
      });

      expect(typeof apt.appointment_id).toBe('number');
      expect(typeof apt.patient_id).toBe('number');
      expect(typeof apt.doctor_id).toBe('number');
      expect(typeof apt.created_by).toBe('number');
      expect(typeof apt.organization_id).toBe('number');
      expect(typeof apt.hospital_id).toBe('number');
      expect(apt.visit_type).toBe('Consultation');
      expect(apt.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      dataStore.appointments = dataStore.appointments.filter((a) => a.appointment_id !== apt.appointment_id);
    });

    it('creates patient with all schema fields properly typed including user_id and emergency contacts', () => {
      const p = patientService.create({
        name: 'Format Test Patient',
        user_id: '102',
        phone: '1234567890',
        emergency_contact_name: 'Contact Name',
        emergency_contact_phone: '0987654321',
        organization_id: '1',
        hospital_id: '1',
      });

      expect(typeof p.patient_id).toBe('number');
      expect(typeof p.user_id).toBe('number');
      expect(p.user_id).toBe(102);
      expect(p.emergency_contact_name).toBe('Contact Name');
      expect(p.emergency_contact_phone).toBe('0987654321');
      expect(typeof p.organization_id).toBe('number');
      expect(typeof p.hospital_id).toBe('number');
      expect(p.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      dataStore.patients = dataStore.patients.filter((item) => item.patient_id !== p.patient_id);
    });

    it('adds ledger entries with proper numeric types, per-ledger sequence, and ISO entry_time', () => {
      const ledger = dataStore.ledgers.find((l) => l.status === 'OPEN');
      expect(ledger).toBeDefined();

      const entry = billingService.addLedgerEntry({
        ledger_id: String(ledger.ledger_id),
        service_id: '1',
        quantity: '2',
        unit_price: '250',
        amount: '500',
        organization_id: '1',
        hospital_id: '1',
      });

      expect(typeof entry.entry_id).toBe('number');
      expect(typeof entry.ledger_id).toBe('number');
      expect(typeof entry.service_id).toBe('number');
      expect(typeof entry.quantity).toBe('number');
      expect(typeof entry.unit_price).toBe('number');
      expect(typeof entry.amount).toBe('number');
      expect(typeof entry.organization_id).toBe('number');
      expect(typeof entry.hospital_id).toBe('number');
      expect(entry.entry_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      dataStore.ledgerEntries = dataStore.ledgerEntries.filter(
        (e) => !(e.ledger_id === entry.ledger_id && e.entry_id === entry.entry_id),
      );
    });

    it('confirms emergency notification methods are retired', () => {
      expect(wardService.createEmergency).toBeUndefined();
    });

    it('creates purchase request with numeric requested_by and quantity', () => {
      const item = dataStore.inventoryItems[0];
      expect(item).toBeDefined();

      const pr = inventoryService.createRequest({
        item_id: String(item.item_id),
        quantity: '5',
        requested_by: '101',
        organization_id: '1',
        hospital_id: '1',
      });

      expect(typeof pr.request_id).toBe('number');
      expect(typeof pr.item_id).toBe('number');
      expect(typeof pr.quantity).toBe('number');
      expect(typeof pr.quantity_requested).toBe('number');
      expect(typeof pr.requested_by).toBe('number');
      expect(pr.requested_by).toBe(101);
      expect(typeof pr.organization_id).toBe('number');
      expect(typeof pr.hospital_id).toBe('number');
      expect(pr.requested_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      dataStore.purchaseRequests = dataStore.purchaseRequests.filter(
        (r) => r.request_id !== pr.request_id,
      );
    });
  });
});
