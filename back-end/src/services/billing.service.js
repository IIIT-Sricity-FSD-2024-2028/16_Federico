'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
const activityService = require('./activity.service');

// SERVICE
function findAllServices() {
  return dataStore.services;
}

function createService(service) {
  const newSvc = {
    service_id:
      maxId(dataStore.services, 'service_id') + 1 || 1,
    service_name: service.service_name,
    category: service.category || 'General',
    base_cost: Number(service.base_cost) || 0,
    organization_id: service.organization_id ? Number(service.organization_id) : null,
    hospital_id: service.hospital_id ? Number(service.hospital_id) : null,
  };
  dataStore.services.push(newSvc);
  return newSvc;
}

// LEDGER
function findAllLedgers() {
  return dataStore.ledgers;
}

function findLedgerByAdmission(admission_id) {
  const numId = Number(admission_id);
  return dataStore.ledgers.find((l) => l.admission_id === numId) || null;
}

function findLedgerById(ledger_id) {
  const numId = Number(ledger_id);
  return dataStore.ledgers.find((l) => l.ledger_id === numId) || null;
}

function createLedger(ledger) {
  const admissionId = Number(ledger.admission_id);
  const admission = dataStore.admissions.find(
    (a) => a.admission_id === admissionId,
  );
  if (!admission) {
    const err = new Error(`Admission #${ledger.admission_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const existing = findLedgerByAdmission(admissionId);
  if (existing) {
    return existing;
  }

  const newLedger = {
    ledger_id:
      maxId(dataStore.ledgers, 'ledger_id', 801) + 1,
    admission_id: admissionId,
    status: ledger.status || 'OPEN',
    organization_id: ledger.organization_id ? Number(ledger.organization_id) : (admission.organization_id ? Number(admission.organization_id) : null),
    hospital_id: ledger.hospital_id ? Number(ledger.hospital_id) : (admission.hospital_id ? Number(admission.hospital_id) : null),
    created_at: new Date().toISOString(),
  };
  dataStore.ledgers.push(newLedger);
  return newLedger;
}

// LEDGER_ENTRY — entry_id is a PER-LEDGER sequence (count of that ledger's
// existing entries + 1), NOT a global max. This is intentional original
// behavior, preserved as-is.
function findLedgerEntries(ledger_id) {
  const numId = Number(ledger_id);
  return dataStore.ledgerEntries.filter((e) => Number(e.ledger_id) === numId);
}

function addLedgerEntry(entry) {
  const ledgerId = Number(entry.ledger_id);
  const ledger = dataStore.ledgers.find((l) => l.ledger_id === ledgerId);
  if (!ledger) {
    const err = new Error(`Ledger #${entry.ledger_id} not found`);
    err.statusCode = 404;
    throw err;
  }
  if (ledger.status === 'PAID') {
    const err = new Error(`Cannot add charges to settled PAID ledger #${entry.ledger_id}`);
    err.statusCode = 400;
    throw err;
  }

  const quantity = Number(entry.quantity) || 1;
  const unit_price = Number(entry.unit_price) || 0;
  const amount = Number(entry.amount) || unit_price * quantity;

  const existingEntries = dataStore.ledgerEntries.filter((e) => Number(e.ledger_id) === ledgerId);
  const nextEntryId = existingEntries.reduce((max, e) => Math.max(max, Number(e.entry_id) || 0), 0) + 1;

  const newEntry = {
    entry_id: nextEntryId,
    ledger_id: ledgerId,
    service_id: Number(entry.service_id),
    quantity,
    unit_price,
    amount,
    entry_time: entry.entry_time || new Date().toISOString(),
    organization_id: entry.organization_id ? Number(entry.organization_id) : (ledger.organization_id ? Number(ledger.organization_id) : null),
    hospital_id: entry.hospital_id ? Number(entry.hospital_id) : (ledger.hospital_id ? Number(ledger.hospital_id) : null),
  };
  dataStore.ledgerEntries.push(newEntry);
  return newEntry;
}

// PAYMENT
function findAllPayments() {
  return dataStore.payments;
}

function createPayment(payment) {
  const ledgerId = Number(payment.ledger_id);
  const ledger = dataStore.ledgers.find((l) => l.ledger_id === ledgerId);
  if (!ledger) {
    const err = new Error(`Ledger #${payment.ledger_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (ledger.status === 'PAID') {
    const existingPayment = dataStore.payments.find((p) => p.ledger_id === ledgerId);
    if (existingPayment) {
      return existingPayment;
    }
  }

  const modeMap = { cash: 'Cash', card: 'Card', upi: 'UPI', cheque: 'Card', bank: 'Card' };
  const rawMode = String(payment.payment_mode || 'Cash').trim();
  const normalizedMode = modeMap[rawMode.toLowerCase()] || (rawMode.charAt(0).toUpperCase() + rawMode.slice(1).toLowerCase());

  const newPayment = {
    payment_id:
      maxId(dataStore.payments, 'payment_id', 901) + 1,
    ledger_id: ledgerId,
    amount_paid: Number(payment.amount_paid),
    payment_mode: normalizedMode,
    payment_time: new Date().toISOString(),
    organization_id: payment.organization_id ? Number(payment.organization_id) : (ledger.organization_id ? Number(ledger.organization_id) : null),
    hospital_id: payment.hospital_id ? Number(payment.hospital_id) : (ledger.hospital_id ? Number(ledger.hospital_id) : null),
  };
  dataStore.payments.push(newPayment);

  // Compute cumulative payments for this ledger
  const allLedgerPayments = dataStore.payments.filter((p) => p.ledger_id === ledgerId);
  const totalPaid = allLedgerPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const entries = findLedgerEntries(ledgerId);
  const grossTotal = entries.reduce((s, e) => s + Number(e.amount || 0), 0);

  const admission = dataStore.admissions.find(
    (a) => a.admission_id === ledger.admission_id,
  );
  const dischargeSummary = admission ? findDischargeSummaryByAdmission(admission.admission_id) : null;
  const netDue = dischargeSummary ? Number(dischargeSummary.final_amount) : grossTotal;

  // Generate receipt for this payment transaction
  const newReceipt = {
    receipt_id:
      maxId(dataStore.receipts, 'receipt_id', 1) + 1,
    payment_id: newPayment.payment_id,
    ledger_id: ledger.ledger_id,
    admission_id: admission ? admission.admission_id : null,
    patient_id: admission ? admission.patient_id : null,
    amount: newPayment.amount_paid,
    payment_mode: newPayment.payment_mode,
    organization_id: newPayment.organization_id ? Number(newPayment.organization_id) : null,
    hospital_id: newPayment.hospital_id ? Number(newPayment.hospital_id) : null,
    generated_at: new Date().toISOString(),
  };
  dataStore.receipts.push(newReceipt);

  if (totalPaid >= netDue || payment.amount_paid >= grossTotal || grossTotal === 0) {
    ledger.status = 'PAID';
    ledger.cleared_at = new Date().toISOString();

    if (admission) {
      admission.receipt_sent_to_hom = true;
      admission.bills_cleared = true;
      admission.status = 'PAYMENT_CONFIRMED';
    }

    activityService.log(
      'success',
      `Bill cleared for admission #${ledger.admission_id} — total payments of ${totalPaid} received. Bed may now be released by PRE.`,
      {
        paymentId: newPayment.payment_id,
        receiptId: newReceipt.receipt_id,
        admissionId: ledger.admission_id,
        billsCleared: true,
      },
      newPayment.organization_id,
    );
  } else {
    ledger.status = 'PARTIALLY_PAID';
    activityService.log(
      'info',
      `Partial payment of ${newPayment.amount_paid} received for ledger #${ledger.ledger_id} (Total paid: ${totalPaid}/${netDue}).`,
      { paymentId: newPayment.payment_id, ledgerId: ledger.ledger_id, balanceRemaining: Math.max(0, netDue - totalPaid) },
      newPayment.organization_id,
    );
  }

  return newPayment;
}

// --- Phase 2: dispatch (FA marks a ledger ready for the patient to
// review/pay), receipts, and a combined patient-facing bill view — all
// built on the existing ledger/ledgerEntry/payment/dischargeSummary
// tables above rather than new parallel billing structures. ---

function dispatchLedger(ledger_id) {
  const numId = Number(ledger_id);
  const ledger = dataStore.ledgers.find((l) => Number(l.ledger_id) === numId);
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
  const pid = Number(patient_id);
  const admissions = dataStore.admissions.filter(
    (a) => a.patient_id === pid,
  );
  return admissions.map((admission) => {
    const ledger = findLedgerByAdmission(admission.admission_id);
    const entries = ledger ? findLedgerEntries(ledger.ledger_id) : [];
    const dischargeSummary = findDischargeSummaryByAdmission(admission.admission_id) || null;
    return { admission, ledger, entries, dischargeSummary };
  });
}

function findAllReceipts() {
  return dataStore.receipts;
}

function findReceiptsByPatient(patient_id) {
  const pid = Number(patient_id);
  return dataStore.receipts.filter((r) => r.patient_id === pid);
}

/** Sum of every itemized ledgerEntries row for an admission's ledger. */
function grossTotalForAdmission(admission_id) {
  const ledger = findLedgerByAdmission(admission_id);
  if (!ledger) return 0;
  return findLedgerEntries(ledger.ledger_id).reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
}

/**
 * Re-derives final_amount from the ledger's current line items minus the
 * insurance deduction recorded when the summary was generated. The stored
 * figure used to be whatever the client sent at generation time, so any
 * charge approved afterwards left the summary (and the payment gate in
 * createPayment, which trusts it) disagreeing with the ledger.
 */
function refreshFinalAmount(summary) {
  const gross = grossTotalForAdmission(summary.admission_id);
  const deduction = Math.min(Math.max(Number(summary.insurance_deduction) || 0, 0), gross);
  summary.gross_amount = gross;
  summary.final_amount = gross - deduction;
  return summary;
}

function findDischargeSummaryByAdmission(admission_id) {
  const numId = Number(admission_id);
  const summary =
    dataStore.dischargeSummaries.find((s) => Number(s.admission_id) === numId) ||
    null;
  return summary ? refreshFinalAmount(summary) : null;
}

// DISCHARGE_SUMMARY
function createDischargeSummary(summary) {
  const admissionId = Number(summary.admission_id);
  const admission = dataStore.admissions.find(
    (a) => a.admission_id === admissionId,
  );
  if (!admission) {
    const err = new Error(`Admission #${summary.admission_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  // The gross always comes from ledgerEntries. A caller-supplied
  // final_amount is only used to infer the insurance deduction it implies
  // (gross - final_amount); an explicit insurance_deduction wins.
  const gross = grossTotalForAdmission(admissionId);
  const requestedDeduction =
    summary.insurance_deduction !== undefined
      ? Number(summary.insurance_deduction)
      : summary.final_amount !== undefined
        ? gross - Number(summary.final_amount)
        : 0;

  const newSummary = {
    summary_id:
      maxId(dataStore.dischargeSummaries, 'summary_id', 1) + 1,
    admission_id: admissionId,
    patient_id: Number(summary.patient_id) || admission.patient_id,
    discharge_notes: summary.discharge_notes || 'Fit for discharge',
    insurance_deduction: Math.min(Math.max(requestedDeduction || 0, 0), gross),
    final_amount: 0,
    generated_at: new Date().toISOString(),
    organization_id: summary.organization_id ? Number(summary.organization_id) : (admission.organization_id ? Number(admission.organization_id) : null),
    hospital_id: summary.hospital_id ? Number(summary.hospital_id) : (admission.hospital_id ? Number(admission.hospital_id) : null),
  };
  refreshFinalAmount(newSummary);
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
  const numId = Number(leader_id);
  return dataStore.leaders.find((l) => Number(l.leader_id) === numId) || null;
}

function createLeader(payload) {
  if (!dataStore.leaders) dataStore.leaders = [];

  const admissionId = Number(payload.admission_id);
  const admission = dataStore.admissions.find(
    (a) => a.admission_id === admissionId,
  );
  if (!admission) {
    const err = new Error(`Admission #${payload.admission_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const serviceId = Number(payload.service_id);
  const service = dataStore.services.find((s) => s.service_id === serviceId);
  if (!service) {
    const err = new Error(`Service #${payload.service_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const qty = Number(payload.quantity) || 1;
  const unit_price = service ? Number(service.base_cost) : Number(payload.unit_price || 0);
  const amount = Number(payload.amount) || unit_price * qty;

  const newLeader = {
    leader_id:
      maxId(dataStore.leaders, 'leader_id', 1) + 1,
    admission_id: admissionId,
    patient_id: payload.patient_id ? Number(payload.patient_id) : admission.patient_id,
    service_id: serviceId,
    quantity: qty,
    unit_price,
    amount,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    approved_at: null,
    organization_id: payload.organization_id ? Number(payload.organization_id) : (admission.organization_id ? Number(admission.organization_id) : null),
    hospital_id: payload.hospital_id ? Number(payload.hospital_id) : (admission.hospital_id ? Number(admission.hospital_id) : null),
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
  if (ledger && ledger.status === 'PAID') {
    return { error: 'LEDGER_SETTLED', message: `Cannot approve charges into settled PAID ledger #${ledger.ledger_id}` };
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
  grossTotalForAdmission,
  findAllLeaders,
  findLeaderById,
  createLeader,
  approveLeader,
};
