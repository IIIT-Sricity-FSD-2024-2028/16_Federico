'use strict';

/**
 * Challenger 2: Empirical Lifecycle State Machines & Physical Constraints Verification Harness
 *
 * Verifies:
 * 1. Beds ⇄ Admissions ⇄ Pre-Requests Lifecycle Triad & State Machine Consistency:
 *    - Every OCCUPIED bed held by exactly 1 active admission (ADMITTED) and 1 active pre-request (ADMITTED, DISCHARGE_REQUESTED, DISCHARGE_APPROVED).
 *    - Every AVAILABLE/MAINTENANCE bed has 0 active admissions and 0 active pre-requests.
 * 2. Admissions ⇄ Ledgers ⇄ Discharge Summaries Financial Settlement:
 *    - All discharged admissions have settled (PAID) ledgers.
 *    - Completed receipts for all discharged admissions.
 *    - Valid discharge summaries where final_amount === gross_amount - insurance_deduction.
 * 3. Appointments ⇄ Doctor Availabilities Scheduling Alignment & Zero Double-Booking:
 *    - All appointments align with doctor available days and times.
 *    - Zero double-bookings for any doctor at the same datetime slot.
 * 4. Physical Ward Capacity & Resource Invariants:
 *    - Count of physical beds per ward strictly equals wards.total_beds.
 *    - (ward_id, bed_number) uniqueness.
 *
 * Targets Tested Independently:
 * - Persistent Seed Store: back-end/data/db.json
 * - In-Memory Store:       back-end/src/store/dataStore.js
 */

const fs = require('fs');
const path = require('path');

const DB_JSON_PATH = path.resolve(__dirname, '../data/db.json');
const DATASTORE_JS_PATH = path.resolve(__dirname, '../src/store/dataStore.js');

function loadStores() {
  if (!fs.existsSync(DB_JSON_PATH)) {
    throw new Error(`db.json not found at ${DB_JSON_PATH}`);
  }
  if (!fs.existsSync(DATASTORE_JS_PATH)) {
    throw new Error(`dataStore.js not found at ${DATASTORE_JS_PATH}`);
  }

  const dbContent = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
  delete require.cache[require.resolve(DATASTORE_JS_PATH)];
  const dataStoreContent = require(DATASTORE_JS_PATH);

  return { dbContent, dataStoreContent };
}

class LifecycleConstraintVerifier {
  constructor(name, data) {
    this.name = name;
    this.data = data;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.observations = [];
  }

  assert(condition, testName, context = {}) {
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      const failureObj = { status: 'FAIL', testName, context };
      this.failures.push(failureObj);
      console.error(`  [FAIL] ${testName}`, JSON.stringify(context, null, 2));
    }
  }

  recordObservation(text) {
    this.observations.push(text);
  }

  runAll() {
    console.log(`\n======================================================================`);
    console.log(`Running Verification Suite: [${this.name}]`);
    console.log(`======================================================================\n`);

    this.verifyPhysicalWardCapacity();
    this.verifyBedsAdmissionsPreRequests();
    this.verifyAdmissionsLedgersDischargeSummaries();
    this.verifyAppointmentsDoctorAvailabilities();
    this.verifyAdversarialStressScenarios();

    console.log(`\nSuite [${this.name}] Execution Summary:`);
    console.log(`  Total Invariant Checks: ${this.passed + this.failed}`);
    console.log(`  Passed Checks:          ${this.passed}`);
    console.log(`  Failed Checks:          ${this.failed}`);

    if (this.failed > 0) {
      console.log(`  Failures Encountered:\n`, JSON.stringify(this.failures, null, 2));
    } else {
      console.log(`  ALL CHECKS PASSED (100% Correctness Confirmed)`);
    }

    return this.failed === 0;
  }

  // -------------------------------------------------------------------------
  // 1. Physical Ward Capacity
  // -------------------------------------------------------------------------
  verifyPhysicalWardCapacity() {
    console.log(`--- [1/4] Verifying Physical Ward Capacity (wards.total_beds === count(beds)) ---`);
    const { wards, beds } = this.data;

    this.assert(Array.isArray(wards) && wards.length > 0, 'wards collection is valid non-empty array');
    this.assert(Array.isArray(beds) && beds.length > 0, 'beds collection is valid non-empty array');

    let cumulativeDeclaredCapacity = 0;
    const wardBedMap = new Map();

    for (const ward of wards) {
      cumulativeDeclaredCapacity += ward.total_beds;
      const physicalBeds = beds.filter((b) => b.ward_id === ward.ward_id);

      // Core Invariant: Count of physical beds per ward strictly equals wards.total_beds
      this.assert(
        physicalBeds.length === ward.total_beds,
        `Ward #${ward.ward_id} ('${ward.ward_name}') physical beds (${physicalBeds.length}) === declared total_beds (${ward.total_beds})`,
        { ward_id: ward.ward_id, physicalBeds: physicalBeds.length, total_beds: ward.total_beds }
      );

      // Partition check
      const occupied = physicalBeds.filter((b) => b.status === 'OCCUPIED').length;
      const available = physicalBeds.filter((b) => b.status === 'AVAILABLE').length;
      const maintenance = physicalBeds.filter((b) => b.status === 'MAINTENANCE').length;

      this.assert(
        occupied + available + maintenance === ward.total_beds,
        `Ward #${ward.ward_id} status partition sum (OCCUPIED: ${occupied}, AVAILABLE: ${available}, MAINTENANCE: ${maintenance}) === total_beds (${ward.total_beds})`
      );

      wardBedMap.set(ward.ward_id, physicalBeds);
    }

    // System-wide sum invariant
    this.assert(
      beds.length === cumulativeDeclaredCapacity,
      `System total physical beds (${beds.length}) === cumulative wards.total_beds (${cumulativeDeclaredCapacity})`,
      { totalPhysical: beds.length, cumulativeDeclaredCapacity }
    );

    // Bed number uniqueness per ward: UNIQUE KEY uq_ward_bed (ward_id, bed_number)
    const seenTuples = new Set();
    for (const bed of beds) {
      const tupleKey = `${bed.ward_id}::${bed.bed_number}`;
      this.assert(
        !seenTuples.has(tupleKey),
        `Unique (ward_id, bed_number) tuple for bed #${bed.bed_id}: (${bed.ward_id}, '${bed.bed_number}')`,
        { bed_id: bed.bed_id, tupleKey }
      );
      seenTuples.add(tupleKey);

      // Multi-tenant ward-bed matching
      const parentWard = wards.find((w) => w.ward_id === bed.ward_id);
      this.assert(
        parentWard && bed.organization_id === parentWard.organization_id,
        `Bed #${bed.bed_id} organization_id (${bed.organization_id}) matches ward #${parentWard?.ward_id} organization_id (${parentWard?.organization_id})`
      );
      this.assert(
        parentWard && bed.hospital_id === parentWard.hospital_id,
        `Bed #${bed.bed_id} hospital_id (${bed.hospital_id}) matches ward #${parentWard?.ward_id} hospital_id (${parentWard?.hospital_id})`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Beds ⇄ Admissions ⇄ Pre-Requests Lifecycle Triad & State Machine
  // -------------------------------------------------------------------------
  verifyBedsAdmissionsPreRequests() {
    console.log(`--- [2/4] Verifying Beds ⇄ Admissions ⇄ Pre-Requests State Machine Invariants ---`);
    const { beds, admissions, preRequests, bedRequests } = this.data;

    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED');
    const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE');

    const activeAdmissions = admissions.filter((a) => a.status === 'ADMITTED');
    const activePreRequestStatuses = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'];
    const activePreRequests = preRequests.filter((pr) => activePreRequestStatuses.includes(pr.status));

    console.log(`  Counts: Occupied Beds: ${occupiedBeds.length}, Active Admissions: ${activeAdmissions.length}, Active PreRequests: ${activePreRequests.length}`);

    // System-wide active count matching
    this.assert(
      occupiedBeds.length === activeAdmissions.length,
      `Exact parity: Count of OCCUPIED beds (${occupiedBeds.length}) === Count of active ADMITTED admissions (${activeAdmissions.length})`
    );
    this.assert(
      occupiedBeds.length === activePreRequests.length,
      `Exact parity: Count of OCCUPIED beds (${occupiedBeds.length}) === Count of active pre-requests (${activePreRequests.length})`
    );

    // Rule 1: Every OCCUPIED bed held by exactly 1 active admission and 1 active pre-request
    for (const bed of occupiedBeds) {
      const holdingAdmissions = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const holdingPreRequests = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        holdingAdmissions.length === 1,
        `OCCUPIED Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') held by EXACTLY 1 active admission (found: ${holdingAdmissions.length})`,
        { bed_id: bed.bed_id, admissions: holdingAdmissions.map((a) => a.admission_id) }
      );

      this.assert(
        holdingPreRequests.length === 1,
        `OCCUPIED Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') held by EXACTLY 1 active pre-request (found: ${holdingPreRequests.length})`,
        { bed_id: bed.bed_id, preRequests: holdingPreRequests.map((pr) => pr.pre_request_id) }
      );

      if (holdingAdmissions.length === 1 && holdingPreRequests.length === 1) {
        const adm = holdingAdmissions[0];
        const pr = holdingPreRequests[0];

        // Patient consistency
        this.assert(
          adm.patient_id === pr.patient_id,
          `Patient ID matches across active stay on Bed #${bed.bed_id}: adm patient #${adm.patient_id} === pr patient #${pr.patient_id}`,
          { bed_id: bed.bed_id, adm_id: adm.admission_id, pr_id: pr.pre_request_id }
        );

        // Tenant organization consistency
        this.assert(
          bed.organization_id === adm.organization_id && bed.organization_id === pr.organization_id,
          `Tenant organization matches across Bed #${bed.bed_id} (org ${bed.organization_id}), adm #${adm.admission_id} (org ${adm.organization_id}), pr #${pr.pre_request_id} (org ${pr.organization_id})`
        );

        // Hospital facility consistency
        this.assert(
          bed.hospital_id === adm.hospital_id && bed.hospital_id === pr.hospital_id,
          `Hospital facility matches across Bed #${bed.bed_id} (hosp ${bed.hospital_id}), adm #${adm.admission_id} (hosp ${adm.hospital_id}), pr #${pr.pre_request_id} (hosp ${pr.hospital_id})`
        );

        // Active bedRequest linkage
        const matchingBedRequest = bedRequests.find(
          (br) => br.pre_request_id === pr.pre_request_id && br.bed_id === bed.bed_id && br.status === 'ALLOCATED'
        );
        this.assert(
          matchingBedRequest !== undefined,
          `Active ALLOCATED bedRequest exists for preRequest #${pr.pre_request_id} on Bed #${bed.bed_id}`,
          { bed_id: bed.bed_id, pre_request_id: pr.pre_request_id }
        );
      }
    }

    // Rule 2: Every AVAILABLE bed has 0 active admissions and 0 active pre-requests
    for (const bed of availableBeds) {
      const activeAdmissionsOnBed = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const activePreRequestsOnBed = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        activeAdmissionsOnBed.length === 0,
        `AVAILABLE Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') has 0 active admissions`,
        { bed_id: bed.bed_id, activeAdmissions: activeAdmissionsOnBed.map((a) => a.admission_id) }
      );

      this.assert(
        activePreRequestsOnBed.length === 0,
        `AVAILABLE Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') has 0 active pre-requests`,
        { bed_id: bed.bed_id, activePreRequests: activePreRequestsOnBed.map((pr) => pr.pre_request_id) }
      );

      // Verify no active pre-request has an active ALLOCATED bedRequest targeting this available bed
      const activeBedReqs = bedRequests.filter((br) => {
        if (br.bed_id !== bed.bed_id || br.status !== 'ALLOCATED') return false;
        const linkedPr = preRequests.find((p) => p.pre_request_id === br.pre_request_id);
        return linkedPr && activePreRequestStatuses.includes(linkedPr.status);
      });
      this.assert(
        activeBedReqs.length === 0,
        `AVAILABLE Bed #${bed.bed_id} has 0 active ALLOCATED bedRequests`,
        { bed_id: bed.bed_id, activeBedReqs: activeBedReqs.map((b) => b.bed_request_id) }
      );
    }

    // Rule 3: Every MAINTENANCE bed has 0 active admissions and 0 active pre-requests
    for (const bed of maintenanceBeds) {
      const activeAdmissionsOnBed = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const activePreRequestsOnBed = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        activeAdmissionsOnBed.length === 0,
        `MAINTENANCE Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') has 0 active admissions`,
        { bed_id: bed.bed_id, activeAdmissions: activeAdmissionsOnBed.map((a) => a.admission_id) }
      );

      this.assert(
        activePreRequestsOnBed.length === 0,
        `MAINTENANCE Bed #${bed.bed_id} (Ward #${bed.ward_id}, '${bed.bed_number}') has 0 active pre-requests`,
        { bed_id: bed.bed_id, activePreRequests: activePreRequestsOnBed.map((pr) => pr.pre_request_id) }
      );

      const activeBedReqs = bedRequests.filter((br) => {
        if (br.bed_id !== bed.bed_id || br.status !== 'ALLOCATED') return false;
        const linkedPr = preRequests.find((p) => p.pre_request_id === br.pre_request_id);
        return linkedPr && activePreRequestStatuses.includes(linkedPr.status);
      });
      this.assert(
        activeBedReqs.length === 0,
        `MAINTENANCE Bed #${bed.bed_id} has 0 active ALLOCATED bedRequests`,
        { bed_id: bed.bed_id, activeBedReqs: activeBedReqs.map((b) => b.bed_request_id) }
      );
    }

    // Rule 4: Single active inpatient stay per patient (Zero concurrent ADMITTED stays)
    const admittedPatientIds = new Set();
    for (const adm of activeAdmissions) {
      this.assert(
        !admittedPatientIds.has(adm.patient_id),
        `Single active stay invariant: Patient #${adm.patient_id} has only 1 active admission`,
        { patient_id: adm.patient_id, admission_id: adm.admission_id }
      );
      admittedPatientIds.add(adm.patient_id);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Admissions ⇄ Ledgers ⇄ Discharge Summaries Financial Accounting & Settlement
  // -------------------------------------------------------------------------
  verifyAdmissionsLedgersDischargeSummaries() {
    console.log(`--- [3/4] Verifying Admissions ⇄ Ledgers ⇄ Discharge Summaries Settlement ---`);
    const { admissions, ledgers, ledgerEntries, dischargeSummaries, payments, receipts } = this.data;

    const dischargedAdmissions = admissions.filter((a) => a.status === 'DISCHARGED');
    const activeAdmissions = admissions.filter((a) => a.status === 'ADMITTED');

    console.log(`  Counts: Total Admissions: ${admissions.length}, Discharged: ${dischargedAdmissions.length}, Active: ${activeAdmissions.length}`);

    this.assert(dischargedAdmissions.length > 0, 'Discharged admissions present in dataset');

    // 1:1 Invariant: Every admission has exactly one ledger
    const ledgerByAdmId = new Map();
    for (const l of ledgers) {
      this.assert(
        !ledgerByAdmId.has(l.admission_id),
        `1:1 Ledger Invariant: admission_id #${l.admission_id} appears in only 1 ledger (ledger #${l.ledger_id})`,
        { ledger_id: l.ledger_id, admission_id: l.admission_id }
      );
      ledgerByAdmId.set(l.admission_id, l);
    }

    for (const adm of admissions) {
      const ledger = ledgerByAdmId.get(adm.admission_id);
      this.assert(
        ledger !== undefined,
        `Admission #${adm.admission_id} (status: ${adm.status}) has an associated ledger`,
        { admission_id: adm.admission_id, status: adm.status }
      );
    }

    // 1:1 Invariant: Every discharge summary has unique admission_id
    const summaryByAdmId = new Map();
    for (const s of dischargeSummaries) {
      this.assert(
        !summaryByAdmId.has(s.admission_id),
        `1:1 DischargeSummary Invariant: admission_id #${s.admission_id} appears in only 1 summary (summary #${s.summary_id})`,
        { summary_id: s.summary_id, admission_id: s.admission_id }
      );
      summaryByAdmId.set(s.admission_id, s);

      // Must belong to a DISCHARGED admission
      const linkedAdm = admissions.find((a) => a.admission_id === s.admission_id);
      this.assert(
        linkedAdm && linkedAdm.status === 'DISCHARGED',
        `DischargeSummary #${s.summary_id} belongs to a DISCHARGED admission (adm status: ${linkedAdm?.status})`,
        { summary_id: s.summary_id, admission_id: s.admission_id }
      );
    }

    // Active admissions must have NO discharge summaries
    for (const adm of activeAdmissions) {
      const summary = summaryByAdmId.get(adm.admission_id);
      this.assert(
        summary === undefined,
        `Active Admission #${adm.admission_id} (ADMITTED) has NO discharge summary`,
        { admission_id: adm.admission_id, summary_id: summary?.summary_id }
      );
    }

    // Requirement: All discharged admissions have settled (PAID) ledgers, completed receipts, and valid discharge summaries
    for (const adm of dischargedAdmissions) {
      // 1. Settled (PAID) ledger
      const ledger = ledgerByAdmId.get(adm.admission_id);
      this.assert(
        ledger !== undefined && ledger.status === 'PAID',
        `Discharged Admission #${adm.admission_id} has settled (PAID) ledger (ledger #${ledger?.ledger_id}, status: ${ledger?.status})`,
        { admission_id: adm.admission_id, ledger_id: ledger?.ledger_id, status: ledger?.status }
      );

      // 2. Completed receipts
      const admReceipts = receipts.filter((r) => r.admission_id === adm.admission_id);
      this.assert(
        admReceipts.length >= 1,
        `Discharged Admission #${adm.admission_id} has completed receipts (found: ${admReceipts.length})`,
        { admission_id: adm.admission_id, receiptsCount: admReceipts.length, receiptIds: admReceipts.map((r) => r.receipt_id) }
      );

      // 3. Valid discharge summary where final_amount === gross_amount - insurance_deduction
      const summary = summaryByAdmId.get(adm.admission_id);
      this.assert(
        summary !== undefined,
        `Discharged Admission #${adm.admission_id} has a valid discharge summary (summary #${summary?.summary_id})`,
        { admission_id: adm.admission_id }
      );

      if (summary) {
        // Mathematical invariant: final_amount === gross_amount - insurance_deduction
        const calculatedFinal = Number((summary.gross_amount - summary.insurance_deduction).toFixed(2));
        const recordedFinal = Number(Number(summary.final_amount).toFixed(2));

        this.assert(
          recordedFinal === calculatedFinal,
          `DischargeSummary #${summary.summary_id} Math Invariant: final_amount (${recordedFinal}) === gross (${summary.gross_amount}) - insurance_deduction (${summary.insurance_deduction}) = ${calculatedFinal}`,
          { summary_id: summary.summary_id, gross: summary.gross_amount, insurance: summary.insurance_deduction, final: recordedFinal, calculatedFinal }
        );

        this.assert(
          summary.final_amount >= 0 && summary.gross_amount >= 0 && summary.insurance_deduction >= 0,
          `DischargeSummary #${summary.summary_id} amounts are non-negative`,
          { summary_id: summary.summary_id, gross: summary.gross_amount, deduction: summary.insurance_deduction, final: summary.final_amount }
        );

        // Financial ledger reconciliation: gross_amount matches ledger entries total
        if (ledger) {
          const entries = ledgerEntries.filter((e) => e.ledger_id === ledger.ledger_id);
          const entriesTotal = Number(entries.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2));
          this.assert(
            Number(Number(summary.gross_amount).toFixed(2)) === entriesTotal,
            `DischargeSummary #${summary.summary_id} gross_amount (${summary.gross_amount}) === Ledger #${ledger.ledger_id} entries total (${entriesTotal})`,
            { summary_id: summary.summary_id, ledger_id: ledger.ledger_id, gross: summary.gross_amount, entriesTotal }
          );

          // Payment settlement reconciliation: total paid matches final_amount
          const ledgerPayments = payments.filter((p) => p.ledger_id === ledger.ledger_id);
          const totalPaid = Number(ledgerPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0).toFixed(2));
          this.assert(
            totalPaid === recordedFinal,
            `Ledger #${ledger.ledger_id} total payments (${totalPaid}) === DischargeSummary #${summary.summary_id} final_amount (${recordedFinal})`,
            { ledger_id: ledger.ledger_id, totalPaid, recordedFinal }
          );
        }
      }
    }

    // 1:1 Invariant: Receipts ⇄ Payments
    const receiptPaymentMap = new Map();
    for (const r of receipts) {
      this.assert(
        !receiptPaymentMap.has(r.payment_id),
        `1:1 Receipt Invariant: payment_id #${r.payment_id} appears in only 1 receipt (receipt #${r.receipt_id})`,
        { receipt_id: r.receipt_id, payment_id: r.payment_id }
      );
      receiptPaymentMap.set(r.payment_id, r);

      const p = payments.find((pay) => pay.payment_id === r.payment_id);
      this.assert(
        p !== undefined,
        `Receipt #${r.receipt_id} links to existing payment #${r.payment_id}`,
        { receipt_id: r.receipt_id, payment_id: r.payment_id }
      );

      if (p) {
        this.assert(
          Number(r.amount) === Number(p.amount_paid),
          `Receipt #${r.receipt_id} amount (${r.amount}) === Payment #${p.payment_id} amount_paid (${p.amount_paid})`
        );
        this.assert(
          r.payment_mode === p.payment_mode,
          `Receipt #${r.receipt_id} mode (${r.payment_mode}) === Payment #${p.payment_id} mode (${p.payment_mode})`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Appointments ⇄ Doctor Availabilities Scheduling & Zero Double-Booking
  // -------------------------------------------------------------------------
  verifyAppointmentsDoctorAvailabilities() {
    console.log(`--- [4/4] Verifying Appointments ⇄ Doctor Availabilities & Zero Double-Booking ---`);
    const { appointments, doctorAvailabilities, doctors } = this.data;

    console.log(`  Counts: Appointments: ${appointments.length}, Doctor Availabilities: ${doctorAvailabilities.length}, Doctors: ${doctors.length}`);

    this.assert(appointments.length > 0, 'appointments collection is non-empty');
    this.assert(doctorAvailabilities.length > 0, 'doctorAvailabilities collection is non-empty');

    const doctorSlotMap = new Map();

    for (const apt of appointments) {
      // Invariant: Status enum integrity
      this.assert(
        ['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(apt.status),
        `Appointment #${apt.appointment_id} has valid status ('${apt.status}')`,
        { appointment_id: apt.appointment_id, status: apt.status }
      );

      // Invariant: Zero Double-Booking
      // For any doctor, no two non-cancelled appointments may share the same scheduled_datetime
      const slotKey = `${apt.doctor_id}::${apt.scheduled_datetime}`;
      const existingApt = doctorSlotMap.get(slotKey);

      if (existingApt) {
        const conflict = apt.status !== 'CANCELLED' && existingApt.status !== 'CANCELLED';
        this.assert(
          !conflict,
          `Zero Double-Booking: Doctor #${apt.doctor_id} has NO concurrent appointment at ${apt.scheduled_datetime}`,
          { doctor_id: apt.doctor_id, scheduled_datetime: apt.scheduled_datetime, apt1: apt.appointment_id, apt2: existingApt.appointment_id }
        );
      } else {
        doctorSlotMap.set(slotKey, apt);
        this.assert(true, `Appointment #${apt.appointment_id} scheduled slot (${apt.doctor_id}, ${apt.scheduled_datetime}) registered`);
      }

      // Invariant: Appointment aligns with doctor availability slot
      if (apt.availability_id !== null && apt.availability_id !== undefined) {
        const avail = doctorAvailabilities.find((a) => a.availability_id === apt.availability_id);
        this.assert(
          avail !== undefined,
          `Appointment #${apt.appointment_id} availability #${apt.availability_id} exists`,
          { appointment_id: apt.appointment_id, availability_id: apt.availability_id }
        );

        if (avail) {
          // Doctor alignment
          this.assert(
            apt.doctor_id === avail.doctor_id,
            `Doctor alignment: Appointment #${apt.appointment_id} doctor (${apt.doctor_id}) === Availability #${avail.availability_id} doctor (${avail.doctor_id})`,
            { appointment_id: apt.appointment_id, availability_id: avail.availability_id }
          );

          // Tenant organization alignment
          this.assert(
            apt.organization_id === avail.organization_id,
            `Tenant organization alignment: Appointment #${apt.appointment_id} org (${apt.organization_id}) === Availability #${avail.availability_id} org (${avail.organization_id})`,
            { appointment_id: apt.appointment_id, availability_id: avail.availability_id }
          );

          // Date alignment (ISO string YYYY-MM-DD)
          const aptDate = apt.scheduled_datetime.slice(0, 10);
          this.assert(
            aptDate === avail.available_date,
            `Date alignment: Appointment #${apt.appointment_id} date (${aptDate}) === Availability date (${avail.available_date})`,
            { appointment_id: apt.appointment_id, aptDate, availDate: avail.available_date }
          );

          // Time window alignment (HH:MM:SS)
          const aptTime = apt.scheduled_datetime.slice(11, 19);
          const inWindow = aptTime >= avail.start_time && aptTime <= avail.end_time;
          this.assert(
            inWindow,
            `Time window alignment: Appointment #${apt.appointment_id} time (${aptTime}) in [${avail.start_time}, ${avail.end_time}]`,
            { appointment_id: apt.appointment_id, aptTime, start: avail.start_time, end: avail.end_time }
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Adversarial Stress & Edge Case Scenarios
  // -------------------------------------------------------------------------
  verifyAdversarialStressScenarios() {
    console.log(`--- Adversarial Stress & Edge Case Scenarios ---`);
    const { beds, admissions, preRequests, ledgers, ledgerEntries, dischargeSummaries, payments, receipts } = this.data;

    // 1. Stress: Check if any admission has bed_id pointing to a nonexistent bed
    const bedIdSet = new Set(beds.map((b) => b.bed_id));
    for (const adm of admissions) {
      if (adm.bed_id !== null && adm.bed_id !== undefined) {
        this.assert(
          bedIdSet.has(adm.bed_id),
          `Adversarial: Admission #${adm.admission_id} bed_id #${adm.bed_id} exists in beds`,
          { admission_id: adm.admission_id, bed_id: adm.bed_id }
        );
      }
    }

    // 2. Stress: Check if any pre-request has bed_id pointing to a nonexistent bed
    for (const pr of preRequests) {
      if (pr.bed_id !== null && pr.bed_id !== undefined) {
        this.assert(
          bedIdSet.has(pr.bed_id),
          `Adversarial: PreRequest #${pr.pre_request_id} bed_id #${pr.bed_id} exists in beds`,
          { pre_request_id: pr.pre_request_id, bed_id: pr.bed_id }
        );
      }
    }

    // 3. Stress: Monotonic sequential entry_id in ledgerEntries without gaps or duplicate sequence numbers
    for (const ledger of ledgers) {
      const entries = ledgerEntries
        .filter((e) => e.ledger_id === ledger.ledger_id)
        .sort((a, b) => a.entry_id - b.entry_id);

      entries.forEach((e, idx) => {
        this.assert(
          e.entry_id === idx + 1,
          `Adversarial: Ledger #${ledger.ledger_id} entry_id #${e.entry_id} strictly follows 1-based sequential ordering (expected: ${idx + 1})`,
          { ledger_id: ledger.ledger_id, entry_id: e.entry_id, expected: idx + 1 }
        );
      });
    }

    // 4. Stress: Floating point rounding check on all discharge summaries
    for (const s of dischargeSummaries) {
      const diff = Math.abs(s.final_amount - (s.gross_amount - s.insurance_deduction));
      this.assert(
        diff < 0.0001,
        `Adversarial: Summary #${s.summary_id} floating point exactness (delta: ${diff})`,
        { summary_id: s.summary_id, diff }
      );
    }

    // 5. Stress: Check for any orphaned payment without a receipt
    const receiptPaymentIds = new Set(receipts.map((r) => r.payment_id));
    for (const p of payments) {
      this.assert(
        receiptPaymentIds.has(p.payment_id),
        `Adversarial: Payment #${p.payment_id} has a corresponding receipt`,
        { payment_id: p.payment_id }
      );
    }
  }
}

function main() {
  console.log(`Starting Empirical Verification Harness for Lifecycle State Machines & Physical Constraints...`);
  const { dbContent, dataStoreContent } = loadStores();

  const dbVerifier = new LifecycleConstraintVerifier('back-end/data/db.json (Persistent DB)', dbContent);
  const dbSuccess = dbVerifier.runAll();

  const dsVerifier = new LifecycleConstraintVerifier('back-end/src/store/dataStore.js (In-Memory DataStore)', dataStoreContent);
  const dsSuccess = dsVerifier.runAll();

  console.log(`\n======================================================================`);
  console.log(`FINAL EMPIRICAL VERIFICATION REPORT`);
  console.log(`======================================================================`);
  console.log(`  back-end/data/db.json:                 ${dbSuccess ? 'PASSED (100% compliant)' : 'FAILED'}`);
  console.log(`  back-end/src/store/dataStore.js:       ${dsSuccess ? 'PASSED (100% compliant)' : 'FAILED'}`);
  console.log(`  Total Checks Executed Across Targets:  ${dbVerifier.passed + dbVerifier.failed + dsVerifier.passed + dsVerifier.failed}`);
  console.log(`  Total Checks Passed:                   ${dbVerifier.passed + dsVerifier.passed}`);
  console.log(`  Total Checks Failed:                   ${dbVerifier.failed + dsVerifier.failed}`);

  if (!dbSuccess || !dsSuccess) {
    console.error(`Verification Failed! Exiting with code 1.`);
    process.exit(1);
  } else {
    console.log(`All Lifecycle State Machines and Physical Constraints Successfully Verified!`);
    process.exit(0);
  }
}

main();
