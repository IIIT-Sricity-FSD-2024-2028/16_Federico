'use strict';

/**
 * Challenger 2 — Milestone M4 Verification Gate (Iteration 2)
 * Independent Empirical Verification Harness
 *
 * Verifies the 4 critical lifecycle and physical invariants across both:
 * 1. Persistent Seed Store: back-end/data/db.json
 * 2. In-Memory Store:       back-end/src/store/dataStore.js
 */

const fs = require('fs');
const path = require('path');

const DB_JSON_PATH = path.resolve(__dirname, '../data/db.json');
const DATASTORE_JS_PATH = path.resolve(__dirname, '../src/store/dataStore.js');

function loadTargets() {
  if (!fs.existsSync(DB_JSON_PATH)) throw new Error(`Missing ${DB_JSON_PATH}`);
  if (!fs.existsSync(DATASTORE_JS_PATH)) throw new Error(`Missing ${DATASTORE_JS_PATH}`);

  const dbJson = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
  delete require.cache[require.resolve(DATASTORE_JS_PATH)];
  const dataStore = require(DATASTORE_JS_PATH);

  return [
    { targetName: 'Persistent Seed (db.json)', data: dbJson },
    { targetName: 'In-Memory Store (dataStore.js)', data: dataStore }
  ];
}

class ChallengerGateVerifier {
  constructor(targetName, data) {
    this.targetName = targetName;
    this.data = data;
    this.checksRun = 0;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
  }

  assert(condition, desc, ctx = {}) {
    this.checksRun++;
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      this.failures.push({ desc, ctx });
      console.error(`  [FAIL] ${desc}`, JSON.stringify(ctx, null, 2));
    }
  }

  run() {
    console.log(`\n======================================================================`);
    console.log(`VERIFYING TARGET: [${this.targetName}]`);
    console.log(`======================================================================\n`);

    this.verifyBedsAdmissionsPreRequests();
    this.verifyAdmissionsLedgersDischargeSummaries();
    this.verifyAppointmentsDoctorAvailabilities();
    this.verifyWardPhysicalCapacity();

    console.log(`\nTarget [${this.targetName}] Results:`);
    console.log(`  Total Checks: ${this.checksRun}`);
    console.log(`  Passed:       ${this.passed}`);
    console.log(`  Failed:       ${this.failed}`);

    if (this.failed > 0) {
      console.error(`  Failures Log:\n`, JSON.stringify(this.failures, null, 2));
      return false;
    }
    return true;
  }

  // 1. Beds ⇄ Admissions ⇄ Pre-Requests
  verifyBedsAdmissionsPreRequests() {
    console.log('--- [1/4] Verifying Beds ⇄ Admissions ⇄ Pre-Requests ---');
    const { beds, admissions, preRequests, bedRequests } = this.data;

    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED');
    const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE');

    const activeAdmissions = admissions.filter((a) => a.status === 'ADMITTED');
    const activePrStatuses = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'];
    const activePreRequests = preRequests.filter((pr) => activePrStatuses.includes(pr.status));

    // Parity of counts
    this.assert(
      occupiedBeds.length === activeAdmissions.length,
      `Occupied beds count (${occupiedBeds.length}) strictly equals active admissions count (${activeAdmissions.length})`,
      { occupiedCount: occupiedBeds.length, activeAdmissionsCount: activeAdmissions.length }
    );
    this.assert(
      occupiedBeds.length === activePreRequests.length,
      `Occupied beds count (${occupiedBeds.length}) strictly equals active pre-requests count (${activePreRequests.length})`,
      { occupiedCount: occupiedBeds.length, activePreRequestsCount: activePreRequests.length }
    );

    // Every OCCUPIED bed held by exactly 1 active admission and 1 active pre-request
    for (const bed of occupiedBeds) {
      const holdingAdmissions = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const holdingPreRequests = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        holdingAdmissions.length === 1,
        `OCCUPIED Bed #${bed.bed_id} (Ward #${bed.ward_id}, Bed '${bed.bed_number}') held by EXACTLY 1 active admission`,
        { bed_id: bed.bed_id, admissions: holdingAdmissions.map((a) => a.admission_id) }
      );

      this.assert(
        holdingPreRequests.length === 1,
        `OCCUPIED Bed #${bed.bed_id} (Ward #${bed.ward_id}, Bed '${bed.bed_number}') held by EXACTLY 1 active pre-request`,
        { bed_id: bed.bed_id, preRequests: holdingPreRequests.map((pr) => pr.pre_request_id) }
      );

      if (holdingAdmissions.length === 1 && holdingPreRequests.length === 1) {
        const adm = holdingAdmissions[0];
        const pr = holdingPreRequests[0];

        this.assert(
          adm.patient_id === pr.patient_id,
          `OCCUPIED Bed #${bed.bed_id}: admission patient #${adm.patient_id} === pre-request patient #${pr.patient_id}`,
          { bed_id: bed.bed_id, adm_id: adm.admission_id, pr_id: pr.pre_request_id }
        );

        this.assert(
          bed.organization_id === adm.organization_id && bed.organization_id === pr.organization_id,
          `OCCUPIED Bed #${bed.bed_id}: org_id matches across bed (${bed.organization_id}), adm (${adm.organization_id}), pr (${pr.organization_id})`
        );

        this.assert(
          bed.hospital_id === adm.hospital_id && bed.hospital_id === pr.hospital_id,
          `OCCUPIED Bed #${bed.bed_id}: hospital_id matches across bed (${bed.hospital_id}), adm (${adm.hospital_id}), pr (${pr.hospital_id})`
        );

        const linkedBedReq = bedRequests.find(
          (br) => br.pre_request_id === pr.pre_request_id && br.bed_id === bed.bed_id && br.status === 'ALLOCATED'
        );
        this.assert(
          linkedBedReq !== undefined,
          `OCCUPIED Bed #${bed.bed_id}: has active ALLOCATED bedRequest for pre-request #${pr.pre_request_id}`
        );
      }
    }

    // Every AVAILABLE bed has 0 active stays
    for (const bed of availableBeds) {
      const activeAdms = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const activePrs = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        activeAdms.length === 0,
        `AVAILABLE Bed #${bed.bed_id} has 0 active admissions`,
        { bed_id: bed.bed_id, activeAdms: activeAdms.map((a) => a.admission_id) }
      );
      this.assert(
        activePrs.length === 0,
        `AVAILABLE Bed #${bed.bed_id} has 0 active pre-requests`,
        { bed_id: bed.bed_id, activePrs: activePrs.map((pr) => pr.pre_request_id) }
      );
    }

    // Every MAINTENANCE bed has 0 active stays
    for (const bed of maintenanceBeds) {
      const activeAdms = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
      const activePrs = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

      this.assert(
        activeAdms.length === 0,
        `MAINTENANCE Bed #${bed.bed_id} has 0 active admissions`,
        { bed_id: bed.bed_id, activeAdms: activeAdms.map((a) => a.admission_id) }
      );
      this.assert(
        activePrs.length === 0,
        `MAINTENANCE Bed #${bed.bed_id} has 0 active pre-requests`,
        { bed_id: bed.bed_id, activePrs: activePrs.map((pr) => pr.pre_request_id) }
      );
    }

    // Single active stay per patient invariant
    const patientStays = new Map();
    for (const adm of activeAdmissions) {
      this.assert(
        !patientStays.has(adm.patient_id),
        `Single Active Stay: Patient #${adm.patient_id} has only 1 active admission (#${adm.admission_id})`,
        { patient_id: adm.patient_id, firstAdm: patientStays.get(adm.patient_id), secondAdm: adm.admission_id }
      );
      patientStays.set(adm.patient_id, adm.admission_id);
    }
  }

  // 2. Admissions ⇄ Ledgers ⇄ Discharge Summaries
  verifyAdmissionsLedgersDischargeSummaries() {
    console.log('--- [2/4] Verifying Admissions ⇄ Ledgers ⇄ Discharge Summaries ---');
    const { admissions, ledgers, ledgerEntries, dischargeSummaries, payments, receipts } = this.data;

    const dischargedAdmissions = admissions.filter((a) => a.status === 'DISCHARGED');
    const activeAdmissions = admissions.filter((a) => a.status === 'ADMITTED');

    this.assert(dischargedAdmissions.length > 0, 'Discharged admissions exist in collection');

    // 1:1 admission to ledger mapping
    const ledgerMap = new Map();
    for (const l of ledgers) {
      this.assert(!ledgerMap.has(l.admission_id), `Ledger admission_id #${l.admission_id} is 1:1`);
      ledgerMap.set(l.admission_id, l);
    }

    // 1:1 admission to dischargeSummary mapping
    const summaryMap = new Map();
    for (const s of dischargeSummaries) {
      this.assert(!summaryMap.has(s.admission_id), `Discharge summary admission_id #${s.admission_id} is 1:1`);
      summaryMap.set(s.admission_id, s);
    }

    // Active admissions must have NO discharge summary
    for (const adm of activeAdmissions) {
      this.assert(
        !summaryMap.has(adm.admission_id),
        `Active admission #${adm.admission_id} has NO discharge summary`,
        { admission_id: adm.admission_id }
      );
    }

    // All discharged admissions have settled ledgers, completed receipts, and valid discharge summaries
    for (const adm of dischargedAdmissions) {
      const ledger = ledgerMap.get(adm.admission_id);
      this.assert(
        ledger !== undefined && ledger.status === 'PAID',
        `Discharged admission #${adm.admission_id} has settled (PAID) ledger #${ledger?.ledger_id}`,
        { admission_id: adm.admission_id, ledger_id: ledger?.ledger_id, status: ledger?.status }
      );

      const admReceipts = receipts.filter((r) => r.admission_id === adm.admission_id);
      this.assert(
        admReceipts.length >= 1,
        `Discharged admission #${adm.admission_id} has completed receipt(s)`,
        { admission_id: adm.admission_id, receiptCount: admReceipts.length }
      );

      const summary = summaryMap.get(adm.admission_id);
      this.assert(
        summary !== undefined,
        `Discharged admission #${adm.admission_id} has valid discharge summary #${summary?.summary_id}`,
        { admission_id: adm.admission_id }
      );

      if (summary && ledger) {
        // Mathematical invariant: final_amount === gross_amount - insurance_deduction
        const calculatedFinal = Number((summary.gross_amount - summary.insurance_deduction).toFixed(2));
        const recordedFinal = Number(Number(summary.final_amount).toFixed(2));
        this.assert(
          recordedFinal === calculatedFinal,
          `Summary #${summary.summary_id}: final_amount (${recordedFinal}) === gross (${summary.gross_amount}) - insurance (${summary.insurance_deduction}) = ${calculatedFinal}`,
          { summary_id: summary.summary_id, recordedFinal, calculatedFinal }
        );

        // Ledger entries reconciliation
        const entries = ledgerEntries.filter((e) => e.ledger_id === ledger.ledger_id);
        const entriesTotal = Number(entries.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2));
        this.assert(
          Number(Number(summary.gross_amount).toFixed(2)) === entriesTotal,
          `Summary #${summary.summary_id} gross_amount (${summary.gross_amount}) strictly equals ledger #${ledger.ledger_id} entries total (${entriesTotal})`,
          { gross: summary.gross_amount, entriesTotal }
        );

        // Payments reconciliation
        const ledgerPayments = payments.filter((p) => p.ledger_id === ledger.ledger_id);
        const paymentsTotal = Number(ledgerPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0).toFixed(2));
        this.assert(
          paymentsTotal === recordedFinal,
          `Ledger #${ledger.ledger_id} total payments (${paymentsTotal}) strictly equals summary final_amount (${recordedFinal})`,
          { paymentsTotal, recordedFinal }
        );
      }
    }
  }

  // 3. Appointments ⇄ Doctor Availabilities
  verifyAppointmentsDoctorAvailabilities() {
    console.log('--- [3/4] Verifying Appointments ⇄ Doctor Availabilities ---');
    const { appointments, doctorAvailabilities } = this.data;

    // Doctor availability slot #547 specific verification
    const slot547 = doctorAvailabilities.find((a) => a.availability_id === 547);
    this.assert(slot547 !== undefined, 'Doctor availability slot #547 exists');
    if (slot547) {
      this.assert(
        slot547.start_time === '09:00:00',
        `Slot #547 start_time strictly equals '09:00:00' (standard 2-digit hour padding)`,
        { slot547 }
      );
      this.assert(
        slot547.end_time === '11:00:00',
        `Slot #547 end_time strictly equals '11:00:00'`,
        { slot547 }
      );
      this.assert(
        slot547.available_date === '2026-08-20',
        `Slot #547 available_date strictly equals '2026-08-20'`,
        { slot547 }
      );
      this.assert(
        slot547.doctor_id === 415,
        `Slot #547 doctor_id strictly equals 415`,
        { slot547 }
      );
    }

    // Zero double-booking check
    const bookedDoctorSlots = new Set();
    for (const apt of appointments) {
      if (apt.status !== 'CANCELLED') {
        const slotKey = `${apt.doctor_id}::${apt.scheduled_datetime}`;
        this.assert(
          !bookedDoctorSlots.has(slotKey),
          `Zero Double-Booking: Doctor #${apt.doctor_id} at ${apt.scheduled_datetime} has no conflicting appointment`,
          { doctor_id: apt.doctor_id, scheduled_datetime: apt.scheduled_datetime, appointment_id: apt.appointment_id }
        );
        bookedDoctorSlots.add(slotKey);
      }

      // Appointment alignment with doctor availability
      if (apt.availability_id !== null && apt.availability_id !== undefined) {
        const avail = doctorAvailabilities.find((a) => a.availability_id === apt.availability_id);
        this.assert(
          avail !== undefined,
          `Appointment #${apt.appointment_id} availability #${apt.availability_id} exists`,
          { appointment_id: apt.appointment_id, availability_id: apt.availability_id }
        );

        if (avail) {
          this.assert(
            apt.doctor_id === avail.doctor_id,
            `Appointment #${apt.appointment_id} doctor_id (${apt.doctor_id}) === availability doctor_id (${avail.doctor_id})`,
            { appointment_id: apt.appointment_id }
          );
          this.assert(
            apt.organization_id === avail.organization_id,
            `Appointment #${apt.appointment_id} org_id (${apt.organization_id}) === availability org_id (${avail.organization_id})`,
            { appointment_id: apt.appointment_id }
          );
          const aptDate = apt.scheduled_datetime.slice(0, 10);
          this.assert(
            aptDate === avail.available_date,
            `Appointment #${apt.appointment_id} date (${aptDate}) === availability date (${avail.available_date})`,
            { appointment_id: apt.appointment_id }
          );
          const aptTime = apt.scheduled_datetime.slice(11, 19);
          const withinSlot = aptTime >= avail.start_time && aptTime <= avail.end_time;
          this.assert(
            withinSlot,
            `Appointment #${apt.appointment_id} time (${aptTime}) in [${avail.start_time}, ${avail.end_time}]`,
            { appointment_id: apt.appointment_id, aptTime, start: avail.start_time, end: avail.end_time }
          );
        }
      }
    }
  }

  // 4. Ward Physical Bed Capacity
  verifyWardPhysicalCapacity() {
    console.log('--- [4/4] Verifying Ward Physical Bed Capacity ---');
    const { wards, beds } = this.data;

    let cumulativeTotalBeds = 0;
    const seenTuples = new Set();

    for (const ward of wards) {
      cumulativeTotalBeds += ward.total_beds;
      const physicalBeds = beds.filter((b) => b.ward_id === ward.ward_id);

      this.assert(
        physicalBeds.length === ward.total_beds,
        `Ward #${ward.ward_id} ('${ward.ward_name}') physical beds (${physicalBeds.length}) strictly equals declared total_beds (${ward.total_beds})`,
        { ward_id: ward.ward_id, physicalBeds: physicalBeds.length, declaredTotal: ward.total_beds }
      );

      const occupied = physicalBeds.filter((b) => b.status === 'OCCUPIED').length;
      const available = physicalBeds.filter((b) => b.status === 'AVAILABLE').length;
      const maintenance = physicalBeds.filter((b) => b.status === 'MAINTENANCE').length;

      this.assert(
        occupied + available + maintenance === ward.total_beds,
        `Ward #${ward.ward_id} status partition sum (${occupied} + ${available} + ${maintenance}) === total_beds (${ward.total_beds})`,
        { ward_id: ward.ward_id, occupied, available, maintenance, total_beds: ward.total_beds }
      );
    }

    this.assert(
      beds.length === cumulativeTotalBeds,
      `Total physical beds (${beds.length}) strictly equals cumulative declared total_beds (${cumulativeTotalBeds})`,
      { totalPhysicalBeds: beds.length, cumulativeTotalBeds }
    );

    for (const bed of beds) {
      const tupleKey = `${bed.ward_id}::${bed.bed_number}`;
      this.assert(
        !seenTuples.has(tupleKey),
        `Unique (ward_id, bed_number) tuple for bed #${bed.bed_id}: (${bed.ward_id}, '${bed.bed_number}')`,
        { bed_id: bed.bed_id, tupleKey }
      );
      seenTuples.add(tupleKey);
    }
  }
}

function main() {
  console.log('======================================================================');
  console.log('CHALLENGER 2: GATE VERIFICATION (ITERATION 2) TEST HARNESS');
  console.log('======================================================================');

  const targets = loadTargets();
  let allTargetsPassed = true;
  let totalChecks = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const t of targets) {
    const verifier = new ChallengerGateVerifier(t.targetName, t.data);
    const passed = verifier.run();
    if (!passed) allTargetsPassed = false;
    totalChecks += verifier.checksRun;
    totalPassed += verifier.passed;
    totalFailed += verifier.failed;
  }

  console.log('\n======================================================================');
  console.log('CHALLENGER 2 GATE VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log(`  Targets Tested:               ${targets.length}`);
  console.log(`  Total Invariant Checks Run:   ${totalChecks}`);
  console.log(`  Total Checks Passed:          ${totalPassed}`);
  console.log(`  Total Checks Failed:          ${totalFailed}`);
  console.log(`  Overall Gate Result:          ${allTargetsPassed ? 'PASSED (100% CORRECTNESS CONFIRMED)' : 'FAILED'}`);

  if (!allTargetsPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
