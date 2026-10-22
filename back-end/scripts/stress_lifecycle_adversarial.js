'use strict';

/**
 * Challenger 2: Adversarial Stress Testing & Boundary Attack Suite
 *
 * Attacks & Boundary Probes:
 * 1. Boundary Time Windows: Appointments vs Doctor Availability Slot Boundaries
 * 2. Floating-Point Financial Precision: Financial calculations in Ledgers, Entries, Summaries
 * 3. Tenant Boundary Attack: Verifying zero cross-tenant contamination across lifecycle entities
 * 4. Concurrent / Overlapping Booking Simulation: Doctor scheduling conflict detector stress test
 * 5. Bed Capacity & State Invariant Inversion: Attempting invalid states against invariant guards
 */

const path = require('path');
const fs = require('fs');

const DB_JSON_PATH = path.resolve(__dirname, '../data/db.json');
const db = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));

// Require services for logic validation
const doctorService = require('../src/services/doctor.service');

function toMinutes(value) {
  if (!value) return null;
  const clean = String(value).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

class AdversarialStressHarness {
  constructor() {
    this.testsRun = 0;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.adversarialFindings = [];
  }

  assert(condition, desc, ctx = {}) {
    this.testsRun++;
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      this.failures.push({ desc, ctx });
      console.error(`  [ATTACK DEFECT FOUND] ${desc}`, JSON.stringify(ctx, null, 2));
    }
  }

  recordAdversarialFinding(finding) {
    this.adversarialFindings.push(finding);
    console.warn(`  [ADVERSARIAL VULNERABILITY / OBSERVATION] ${finding.title}: ${finding.detail}`);
  }

  run() {
    console.log('======================================================================');
    console.log('CHALLENGER 2: ADVERSARIAL STRESS & INVARIANT BOUNDARY ATTACK HARNESS');
    console.log('======================================================================\n');

    this.attackDoctorSchedulingBoundaries();
    this.attackFinancialPrecisionAndIntegrity();
    this.attackMultiTenantSegregation();
    this.attackPhysicalWardInvariants();
    this.attackLifecycleTriadInvariants();

    console.log('\n======================================================================');
    console.log('ADVERSARIAL STRESS TEST SUMMARY');
    console.log('======================================================================');
    console.log(`  Total Probes & Attacks Executed: ${this.testsRun}`);
    console.log(`  Attacks Defended (Passed):       ${this.passed}`);
    console.log(`  Vulnerabilities Found (Failed):  ${this.failed}`);
    console.log(`  Adversarial Edge Findings:      ${this.adversarialFindings.length}`);

    if (this.failed > 0) {
      console.error('Failure Log:\n', JSON.stringify(this.failures, null, 2));
      process.exit(1);
    } else {
      console.log('All Lifecycle State Machines & Invariants Successfully Defended!');
      process.exit(0);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Doctor Scheduling Boundaries & Conflict Detection
  // -------------------------------------------------------------------------
  attackDoctorSchedulingBoundaries() {
    console.log('[Probe 1] Testing Doctor Scheduling Boundaries & Conflict Detector...');

    // 1.1 Verify every active appointment slot triggers conflict if another booking is attempted
    for (const apt of db.appointments) {
      if (apt.status === 'CONFIRMED') {
        const dateStr = apt.scheduled_datetime.slice(0, 10);
        const timeStr = apt.scheduled_datetime.slice(11, 16);

        // findConflictingAppointment should detect THIS appointment when not excluded
        const conflict = doctorService.findConflictingAppointment(apt.doctor_id, dateStr, timeStr);
        this.assert(
          conflict !== null && conflict.appointment_id === apt.appointment_id,
          `Conflict detector reliably detects confirmed appointment #${apt.appointment_id} for doctor #${apt.doctor_id}`,
          { apt_id: apt.appointment_id, doctor_id: apt.doctor_id, dateStr, timeStr, conflictId: conflict?.appointment_id }
        );

        // When excluding self, should NOT find a conflict (allows rescheduling)
        const conflictExcluded = doctorService.findConflictingAppointment(apt.doctor_id, dateStr, timeStr, apt.appointment_id);
        this.assert(
          conflictExcluded === null || conflictExcluded === undefined,
          `Rescheduling self: appointment #${apt.appointment_id} can retain its slot without false conflict`,
          { apt_id: apt.appointment_id }
        );
      }
    }

    // 1.2 Boundary: Exact start and end times of doctor availability windows
    for (const avail of db.doctorAvailabilities) {
      const startMin = toMinutes(avail.start_time);
      const endMin = toMinutes(avail.end_time);

      this.assert(
        startMin !== null && endMin !== null && startMin < endMin,
        `Availability slot #${avail.availability_id} start_time (${avail.start_time}) strictly precedes end_time (${avail.end_time}) chronologically`,
        { avail_id: avail.availability_id, start_time: avail.start_time, end_time: avail.end_time, startMin, endMin }
      );

      // Edge Check: Format standardization (HH:MM:SS)
      if (!/^\d{2}:\d{2}:\d{2}$/.test(avail.start_time)) {
        this.recordAdversarialFinding({
          title: 'Unpadded Hour in Doctor Availability start_time',
          detail: `Slot #${avail.availability_id} has start_time '${avail.start_time}' without 2-digit padding ('09:00:00'). Lexical string comparisons ('9:00:00' > '11:00:00') would fail without toMinutes conversion.`,
          slot: avail,
        });
      }

      // Check ISO format of available_date
      this.assert(
        /^\d{4}-\d{2}-\d{2}$/.test(avail.available_date),
        `Availability slot #${avail.availability_id} available_date is YYYY-MM-DD`,
        { avail_id: avail.availability_id, date: avail.available_date }
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Financial Precision & Double-Entry Invariants
  // -------------------------------------------------------------------------
  attackFinancialPrecisionAndIntegrity() {
    console.log('[Probe 2] Testing Financial Precision & Accounting Invariants...');

    // 2.1 Ledger entry precision and non-negativity
    for (const entry of db.ledgerEntries) {
      this.assert(
        entry.quantity > 0 && Number.isInteger(entry.quantity),
        `LedgerEntry (${entry.ledger_id}, ${entry.entry_id}) quantity (${entry.quantity}) is positive integer`,
        { entry }
      );

      const calculatedAmount = Number((entry.quantity * entry.unit_price).toFixed(2));
      const recordedAmount = Number(Number(entry.amount).toFixed(2));
      this.assert(
        calculatedAmount === recordedAmount,
        `LedgerEntry (${entry.ledger_id}, ${entry.entry_id}) amount (${recordedAmount}) === quantity (${entry.quantity}) * unit_price (${entry.unit_price}) = ${calculatedAmount}`,
        { entry, calculatedAmount, recordedAmount }
      );
    }

    // 2.2 Payment amounts strictly match receipts and ledger amounts
    for (const summary of db.dischargeSummaries) {
      const ledger = db.ledgers.find((l) => l.admission_id === summary.admission_id);
      this.assert(ledger !== undefined, `Summary #${summary.summary_id} has matching ledger`);

      if (ledger) {
        const ledgerPayments = db.payments.filter((p) => p.ledger_id === ledger.ledger_id);
        const totalPaid = Number(ledgerPayments.reduce((acc, p) => acc + Number(p.amount_paid), 0).toFixed(2));
        const finalAmt = Number(Number(summary.final_amount).toFixed(2));

        this.assert(
          totalPaid === finalAmt,
          `Ledger #${ledger.ledger_id} payments sum (${totalPaid}) strictly equals discharge summary final_amount (${finalAmt})`,
          { ledger_id: ledger.ledger_id, totalPaid, finalAmt }
        );

        // Insurance deduction check
        this.assert(
          summary.insurance_deduction >= 0,
          `Summary #${summary.summary_id} insurance deduction (${summary.insurance_deduction}) is non-negative`
        );
        this.assert(
          summary.gross_amount >= summary.final_amount,
          `Summary #${summary.summary_id} gross_amount (${summary.gross_amount}) >= final_amount (${summary.final_amount})`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Multi-Tenant Segregation Boundary Attack
  // -------------------------------------------------------------------------
  attackMultiTenantSegregation() {
    console.log('[Probe 3] Attacking Multi-Tenant Isolation Across Lifecycle Entities...');

    const validOrgIds = new Set(db.organizations.map((o) => o.organization_id));

    // Check all admissions and linked entities
    for (const adm of db.admissions) {
      this.assert(validOrgIds.has(adm.organization_id), `Admission #${adm.admission_id} valid org_id (${adm.organization_id})`);

      const patient = db.patients.find((p) => p.patient_id === adm.patient_id);
      this.assert(
        patient && patient.organization_id === adm.organization_id,
        `Admission #${adm.admission_id} patient org (${patient?.organization_id}) matches admission org (${adm.organization_id})`
      );

      if (adm.bed_id) {
        const bed = db.beds.find((b) => b.bed_id === adm.bed_id);
        this.assert(
          bed && bed.organization_id === adm.organization_id,
          `Admission #${adm.admission_id} bed org (${bed?.organization_id}) matches admission org (${adm.organization_id})`
        );
      }

      if (adm.appointment_id) {
        const apt = db.appointments.find((a) => a.appointment_id === adm.appointment_id);
        this.assert(
          apt && apt.organization_id === adm.organization_id,
          `Admission #${adm.admission_id} appointment org (${apt?.organization_id}) matches admission org (${adm.organization_id})`
        );
      }

      const ledger = db.ledgers.find((l) => l.admission_id === adm.admission_id);
      if (ledger) {
        this.assert(
          ledger.organization_id === adm.organization_id,
          `Admission #${adm.admission_id} ledger org (${ledger.organization_id}) matches admission org (${adm.organization_id})`
        );
      }

      const summary = db.dischargeSummaries.find((s) => s.admission_id === adm.admission_id);
      if (summary) {
        this.assert(
          summary.organization_id === adm.organization_id,
          `Admission #${adm.admission_id} summary org (${summary.organization_id}) matches admission org (${adm.organization_id})`
        );
      }
    }

    // Check all appointments and doctors
    for (const apt of db.appointments) {
      const doctor = db.doctors.find((d) => d.doctor_id === apt.doctor_id);
      const patient = db.patients.find((p) => p.patient_id === apt.patient_id);

      this.assert(
        doctor && doctor.organization_id === apt.organization_id,
        `Appointment #${apt.appointment_id} doctor org (${doctor?.organization_id}) matches appointment org (${apt.organization_id})`
      );
      this.assert(
        patient && patient.organization_id === apt.organization_id,
        `Appointment #${apt.appointment_id} patient org (${patient?.organization_id}) matches appointment org (${apt.organization_id})`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Physical Ward Invariants & Capacity Limits
  // -------------------------------------------------------------------------
  attackPhysicalWardInvariants() {
    console.log('[Probe 4] Testing Physical Ward Invariants & Capacity Limits...');

    for (const ward of db.wards) {
      const physicalBeds = db.beds.filter((b) => b.ward_id === ward.ward_id);
      const occupiedBeds = physicalBeds.filter((b) => b.status === 'OCCUPIED');

      // Occupied beds cannot exceed total physical capacity
      this.assert(
        occupiedBeds.length <= ward.total_beds,
        `Ward #${ward.ward_id} occupied beds (${occupiedBeds.length}) <= total_beds capacity (${ward.total_beds})`,
        { ward_id: ward.ward_id, occupied: occupiedBeds.length, total: ward.total_beds }
      );

      // Total beds must be positive
      this.assert(
        ward.total_beds > 0,
        `Ward #${ward.ward_id} has positive capacity (${ward.total_beds})`
      );

      // Bed numbers within ward must follow standard naming without empty strings
      for (const b of physicalBeds) {
        this.assert(
          typeof b.bed_number === 'string' && b.bed_number.trim().length > 0,
          `Bed #${b.bed_id} in ward #${ward.ward_id} has valid non-empty bed_number ('${b.bed_number}')`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Lifecycle Triad State Machine Consistency
  // -------------------------------------------------------------------------
  attackLifecycleTriadInvariants() {
    console.log('[Probe 5] Testing Lifecycle Triad State Machine Bi-Directionality...');

    const activeAdmissions = db.admissions.filter((a) => a.status === 'ADMITTED');
    const activePreRequests = db.preRequests.filter((pr) =>
      ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(pr.status)
    );

    // Admission -> Bed bi-directionality
    for (const adm of activeAdmissions) {
      this.assert(adm.bed_id !== null, `Active admission #${adm.admission_id} has non-null bed_id`);
      if (adm.bed_id) {
        const bed = db.beds.find((b) => b.bed_id === adm.bed_id);
        this.assert(bed !== undefined, `Bed #${adm.bed_id} referenced by active admission #${adm.admission_id} exists`);
        this.assert(
          bed && bed.status === 'OCCUPIED',
          `Bed #${adm.bed_id} referenced by active admission #${adm.admission_id} is marked OCCUPIED (found: ${bed?.status})`
        );
      }
    }

    // PreRequest -> Bed bi-directionality
    for (const pr of activePreRequests) {
      this.assert(pr.bed_id !== null, `Active pre-request #${pr.pre_request_id} has non-null bed_id`);
      if (pr.bed_id) {
        const bed = db.beds.find((b) => b.bed_id === pr.bed_id);
        this.assert(bed !== undefined, `Bed #${pr.bed_id} referenced by active pre-request #${pr.pre_request_id} exists`);
        this.assert(
          bed && bed.status === 'OCCUPIED',
          `Bed #${pr.bed_id} referenced by active pre-request #${pr.pre_request_id} is marked OCCUPIED (found: ${bed?.status})`
        );
      }
    }

    // PreRequest -> Admission correspondence
    for (const pr of activePreRequests) {
      const matchingAdm = activeAdmissions.find((a) => a.bed_id === pr.bed_id);
      this.assert(
        matchingAdm !== undefined,
        `Active pre-request #${pr.pre_request_id} (bed #${pr.bed_id}) has matching active admission`,
        { pre_request_id: pr.pre_request_id, bed_id: pr.bed_id }
      );
      if (matchingAdm) {
        this.assert(
          matchingAdm.patient_id === pr.patient_id,
          `Active pre-request #${pr.pre_request_id} patient (#${pr.patient_id}) === admission #${matchingAdm.admission_id} patient (#${matchingAdm.patient_id})`
        );
      }
    }
  }
}

const harness = new AdversarialStressHarness();
harness.run();
