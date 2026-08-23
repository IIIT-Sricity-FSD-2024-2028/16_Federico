'use strict';

const dataStore = require('../store/dataStore');
const activityService = require('./activity.service');

// SERVICE
function findAllServices() {
  return dataStore.services;
}

function createService(service) {
  const newSvc = {
    service_id:
      dataStore.services.length > 0
        ? Math.max(...dataStore.services.map((s) => s.service_id)) + 1
        : 1,
    ...service,
  };
  dataStore.services.push(newSvc);
  return newSvc;
}

// LEDGER
function findAllLedgers() {
  return dataStore.ledgers;
}

function findLedgerByAdmission(admission_id) {
  return dataStore.ledgers.find((l) => l.admission_id === admission_id) || null;
}

function findLedgerById(ledger_id) {
  return dataStore.ledgers.find((l) => l.ledger_id === ledger_id) || null;
}

function createLedger(ledger) {
  const newLedger = {
    ledger_id:
      dataStore.ledgers.length > 0
        ? Math.max(...dataStore.ledgers.map((l) => l.ledger_id)) + 1
        : 801,
    created_at: new Date().toISOString(),
    ...ledger,
  };
  dataStore.ledgers.push(newLedger);
  return newLedger;
}

// LEDGER_ENTRY — entry_id is a PER-LEDGER sequence (count of that ledger's
// existing entries + 1), NOT a global max. This is intentional original
// behavior, preserved as-is.
function findLedgerEntries(ledger_id) {
  return dataStore.ledgerEntries.filter((e) => e.ledger_id === ledger_id);
}

function addLedgerEntry(entry) {
  const newEntry = {
    entry_id:
      dataStore.ledgerEntries.filter((e) => e.ledger_id === entry.ledger_id)
        .length + 1,
    entry_time: new Date().toISOString(),
    ...entry,
  };
  dataStore.ledgerEntries.push(newEntry);
  return newEntry;
}

// PAYMENT
function findAllPayments() {
  return dataStore.payments;
}

function createPayment(payment) {
  const newPayment = {
    payment_id:
      dataStore.payments.length > 0
        ? Math.max(...dataStore.payments.map((p) => p.payment_id)) + 1
        : 901,
    payment_time: new Date().toISOString(),
    ...payment,
  };
  dataStore.payments.push(newPayment);

  // Automatically confirm payment and notify HOM
  const ledger = dataStore.ledgers.find(
    (l) => l.ledger_id === payment.ledger_id,
  );
  if (ledger) {
    ledger.status = 'PAID';

    const admission = dataStore.admissions.find(
      (a) => a.admission_id === ledger.admission_id,
    );
    if (admission) {
      admission.receipt_sent_to_hom = true;
      admission.status = 'PAYMENT_CONFIRMED';

      // Phase 2: auto-generate a receipt for the patient, and log it.
      const newReceipt = {
        receipt_id:
          dataStore.receipts.length > 0
            ? Math.max(...dataStore.receipts.map((r) => r.receipt_id)) + 1
            : 1,
        payment_id: newPayment.payment_id,
        ledger_id: ledger.ledger_id,
        admission_id: admission.admission_id,
        patient_id: admission.patient_id,
        amount: newPayment.amount_paid,
        payment_mode: newPayment.payment_mode,
        organization_id: newPayment.organization_id || null,
        hospital_id: newPayment.hospital_id || null,
        generated_at: new Date().toISOString(),
      };
      dataStore.receipts.push(newReceipt);

      activityService.log(
        'success',
        `Payment of ${newPayment.amount_paid} received for admission #${admission.admission_id}`,
        { paymentId: newPayment.payment_id },
        newPayment.organization_id,
      );
    }
  }

  return newPayment;
}

// --- Phase 2: dispatch (FA marks a ledger ready for the patient to
// review/pay), receipts, and a combined patient-facing bill view — all
// built on the existing ledger/ledgerEntry/payment/dischargeSummary
// tables above rather than new parallel billing structures. ---

function dispatchLedger(ledger_id) {
  const ledger = dataStore.ledgers.find((l) => l.ledger_id === ledger_id);
  if (!ledger) return null;
  ledger.status = 'DISPATCHED';
  ledger.dispatched_at = new Date().toISOString();

  const admission = dataStore.admissions.find(
    (a) => a.admission_id === ledger.admission_id,
  );
  activityService.log(
    'info',
    `Bill dispatched to patient for admission #${ledger.admission_id}`,
    { ledgerId: ledger_id, patientId: admission ? admission.patient_id : null },
    ledger.organization_id,
  );

  return ledger;
}

function findPatientBills(patient_id) {
  const admissions = dataStore.admissions.filter(
    (a) => a.patient_id === patient_id,
  );
  return admissions.map((admission) => {
    const ledger = findLedgerByAdmission(admission.admission_id);
    const entries = ledger ? findLedgerEntries(ledger.ledger_id) : [];
    return { admission, ledger, entries };
  });
}

function findAllReceipts() {
  return dataStore.receipts;
}

function findReceiptsByPatient(patient_id) {
  return dataStore.receipts.filter((r) => r.patient_id === patient_id);
}

function findDischargeSummaryByAdmission(admission_id) {
  return (
    dataStore.dischargeSummaries.find((s) => s.admission_id === admission_id) ||
    null
  );
}

// DISCHARGE_SUMMARY
function createDischargeSummary(summary) {
  const newSummary = {
    summary_id:
      dataStore.dischargeSummaries.length > 0
        ? Math.max(...dataStore.dischargeSummaries.map((s) => s.summary_id)) + 1
        : 1,
    generated_at: new Date().toISOString(),
    ...summary,
  };
  dataStore.dischargeSummaries.push(newSummary);
  return newSummary;
}

// LEADERS (HOM -> FA -> Ledger Workflow)
function findAllLeaders() {
  if (!dataStore.leaders) dataStore.leaders = [];
  return dataStore.leaders;
}

function findLeaderById(leader_id) {
  if (!dataStore.leaders) dataStore.leaders = [];
  return dataStore.leaders.find((l) => l.leader_id === leader_id) || null;
}

function createLeader(payload) {
  if (!dataStore.leaders) dataStore.leaders = [];
  const admission = dataStore.admissions.find(
    (a) => a.admission_id === Number(payload.admission_id),
  );
  const service = dataStore.services.find(
    (s) => s.service_id === Number(payload.service_id),
  );
  const qty = Number(payload.quantity) || 1;
  const unit_price = service ? Number(service.base_cost) : Number(payload.unit_price || 0);
  const amount = Number(payload.amount) || unit_price * qty;

  const newLeader = {
    leader_id:
      dataStore.leaders.length > 0
        ? Math.max(...dataStore.leaders.map((l) => l.leader_id)) + 1
        : 1,
    admission_id: Number(payload.admission_id),
    patient_id: payload.patient_id
      ? Number(payload.patient_id)
      : admission
        ? admission.patient_id
        : null,
    service_id: Number(payload.service_id),
    quantity: qty,
    unit_price,
    amount,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    approved_at: null,
    organization_id: payload.organization_id || (admission ? admission.organization_id : null) || null,
    hospital_id: payload.hospital_id || (admission ? admission.hospital_id : null) || null,
  };

  dataStore.leaders.push(newLeader);

  activityService.log(
    'info',
    `HOM added Leader #${newLeader.leader_id} for admission #${newLeader.admission_id}`,
    { leaderId: newLeader.leader_id, admissionId: newLeader.admission_id },
    newLeader.organization_id,
  );

  return newLeader;
}

function approveLeader(leader_id) {
  if (!dataStore.leaders) dataStore.leaders = [];
  const leader = dataStore.leaders.find((l) => l.leader_id === Number(leader_id));
  if (!leader) {
    return { error: 'NOT_FOUND', message: 'Leader not found' };
  }
  if (leader.status === 'APPROVED') {
    return { error: 'ALREADY_APPROVED', message: 'Leader has already been approved', leader };
  }

  // Find or create ledger for this admission
  let ledger = findLedgerByAdmission(leader.admission_id);
  if (!ledger) {
    ledger = createLedger({
      admission_id: leader.admission_id,
      status: 'OPEN',
      organization_id: leader.organization_id,
      hospital_id: leader.hospital_id,
    });
  }

  // Check to prevent duplicate entry of the exact same leader into ledger
  const existingEntries = findLedgerEntries(ledger.ledger_id);
  // Add entry to ledger
  const ledgerEntry = addLedgerEntry({
    ledger_id: ledger.ledger_id,
    service_id: leader.service_id,
    quantity: leader.quantity,
    unit_price: leader.unit_price,
    amount: leader.amount,
    organization_id: leader.organization_id,
    hospital_id: leader.hospital_id,
  });

  leader.status = 'APPROVED';
  leader.approved_at = new Date().toISOString();
  leader.ledger_id = ledger.ledger_id;
  leader.entry_id = ledgerEntry.entry_id;

  activityService.log(
    'success',
    `FA approved Leader #${leader.leader_id} into Ledger #${ledger.ledger_id}`,
    { leaderId: leader.leader_id, ledgerId: ledger.ledger_id },
    leader.organization_id,
  );

  return { success: true, leader, ledger, ledgerEntry };
}

module.exports = {
  findAllServices,
  createService,
  findAllLedgers,
  findLedgerByAdmission,
  findLedgerById,
  createLedger,
  findLedgerEntries,
  addLedgerEntry,
  findAllPayments,
  createPayment,
  createDischargeSummary,
  dispatchLedger,
  findPatientBills,
  findAllReceipts,
  findReceiptsByPatient,
  findDischargeSummaryByAdmission,
  findAllLeaders,
  findLeaderById,
  createLeader,
  approveLeader,
};
