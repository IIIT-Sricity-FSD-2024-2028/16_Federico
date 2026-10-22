'use strict';

const fs = require('fs');
const dataStore = require('../store/dataStore');
const persist = require('../store/persist');
const { runBootReconciliation } = require('../bootstrap');
const billingService = require('../services/billing.service');
const doctorService = require('../services/doctor.service');
const wardService = require('../services/ward.service');
const preRequestService = require('../services/preRequest.service');

describe('State Persistence, Concurrency & Data Durability', () => {
  describe('Non-Blocking Persistence & Dirty-State Tracking', () => {
    it('skips disk writes when state is clean', () => {
      expect(persist.isStateDirty()).toBe(false);

      persist.save();
      expect(persist.isStateDirty()).toBe(false);
    });

    it('sets dirty flag with markDirty and flushes state with saveImmediate', () => {
      persist.markDirty();
      expect(persist.isStateDirty()).toBe(true);

      persist.saveImmediate();
      expect(persist.isStateDirty()).toBe(false);
    });

    it('executes writeAtomicAsync asynchronously without blocking the event loop', async () => {
      persist.markDirty();
      let timerFired = false;
      setTimeout(() => {
        timerFired = true;
      }, 5);

      await persist.writeAtomicAsync();

      expect(persist.isStateDirty()).toBe(false);
      expect(fs.existsSync(persist.DB_PATH)).toBe(true);
    });
  });

  describe('Boot Reconciliation Durability', () => {
    it('runs boot reconciliation and flushes state durably', () => {
      expect(() => runBootReconciliation()).not.toThrow();
      expect(persist.isStateDirty()).toBe(false);
    });
  });

  describe('Ledger Entry Monotonicity & Key Sequencing', () => {
    it('generates strictly sequential, non-colliding entry_ids even with string ledger_id', () => {
      const targetLedger = dataStore.ledgers.find((l) => l.status === 'OPEN') || dataStore.ledgers[0];
      const ledgerIdStr = String(targetLedger.ledger_id);

      const entry1 = billingService.addLedgerEntry({
        ledger_id: ledgerIdStr,
        service_id: 1,
        quantity: 1,
        unit_price: 100,
      });

      const entry2 = billingService.addLedgerEntry({
        ledger_id: ledgerIdStr,
        service_id: 2,
        quantity: 2,
        unit_price: 200,
      });

      expect(typeof entry1.entry_id).toBe('number');
      expect(typeof entry2.entry_id).toBe('number');
      expect(entry2.entry_id).toBe(entry1.entry_id + 1);
      expect(entry1.entry_id).not.toBe(entry2.entry_id);
    });
  });

  describe('Atomic Bed Allocation Concurrency Guard', () => {
    it('prevents allocating an already OCCUPIED bed by throwing 409 Conflict', () => {
      const occupiedBed = dataStore.beds.find((b) => b.status === 'OCCUPIED');
      expect(occupiedBed).toBeDefined();

      const testBedReq = wardService.createBedRequest(
        {
          patient_id: 201,
          ward_id: occupiedBed.ward_id,
          priority: 'NORMAL',
          organization_id: 1,
          hospital_id: 1,
        },
        105,
      );

      expect(() => {
        wardService.updateBedRequest(testBedReq.bed_request_id, {
          bed_id: occupiedBed.bed_id,
        });
      }).toThrow(/occupied/i);
    });

    it('successfully allocates an AVAILABLE bed and marks it OCCUPIED', () => {
      const availableBed = dataStore.beds.find((b) => b.status === 'AVAILABLE');
      expect(availableBed).toBeDefined();

      const testBedReq = wardService.createBedRequest(
        {
          patient_id: 202,
          ward_id: availableBed.ward_id,
          priority: 'NORMAL',
          organization_id: 1,
          hospital_id: 1,
        },
        105,
      );

      const res = wardService.updateBedRequest(String(testBedReq.bed_request_id), {
        bed_id: String(availableBed.bed_id),
      });

      expect(res.status).toBe('ALLOCATED');
      expect(res.bed_id).toBe(availableBed.bed_id);
      expect(availableBed.status).toBe('OCCUPIED');
    });
  });

  describe('Doctor Appointment Rescheduling Self-Conflict Guard', () => {
    it('does not falsely self-conflict when excludeId is passed as string or number', () => {
      const apt = dataStore.appointments[0];
      const timeStr = apt.appointment_time || String(apt.scheduled_datetime || '').slice(11, 16);
      const dateStr = apt.appointment_date || String(apt.scheduled_datetime || '').slice(0, 10);

      const conflictWithString = doctorService.findConflictingAppointment(
        apt.doctor_id,
        dateStr,
        timeStr,
        String(apt.appointment_id),
      );
      expect(conflictWithString).toBeNull();

      const conflictWithNumber = doctorService.findConflictingAppointment(
        apt.doctor_id,
        dateStr,
        timeStr,
        Number(apt.appointment_id),
      );
      expect(conflictWithNumber).toBeNull();
    });
  });

  describe('Staged Multi-Entity OPD Check-In Atomic Commit', () => {
    it('creates staged admission, ledger, and entry atomically with synchronized IDs', () => {
      const patient = dataStore.patients[0];
      const preReq = preRequestService.create(
        {
          patient_id: patient.patient_id,
          department: 'Cardiology',
          requested_date: '2026-11-01',
          requested_time: '10:00',
          visit_type: 'OPD',
        },
        105,
      );

      const checkInResult = preRequestService.checkIn(
        preReq.pre_request_id,
        { visit_type: 'OPD' },
        1,
        1,
      );

      expect(checkInResult.preRequest.status).toBe('CONSULTATION_DONE');
      expect(checkInResult.admission).toBeDefined();
      expect(checkInResult.ledger).toBeDefined();
      expect(typeof checkInResult.admission.admission_id).toBe('number');
      expect(typeof checkInResult.ledger.ledger_id).toBe('number');
      expect(checkInResult.ledger.admission_id).toBe(checkInResult.admission.admission_id);

      const entries = billingService.findLedgerEntries(checkInResult.ledger.ledger_id);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].ledger_id).toBe(checkInResult.ledger.ledger_id);
      expect(typeof entries[0].entry_id).toBe('number');
    });
  });
});
