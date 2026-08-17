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
      dataStore.services.length > 0 ? Math.max(...dataStore.services.map((s) => s.service_id)) + 1 : 1,
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
    ledger_id: dataStore.ledgers.length > 0 ? Math.max(...dataStore.ledgers.map((l) => l.ledger_id)) + 1 : 801,
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
    entry_id: dataStore.ledgerEntries.filter((e) => e.ledger_id === entry.ledger_id).length + 1,
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
      dataStore.payments.length > 0 ? Math.max(...dataStore.payments.map((p) => p.payment_id)) + 1 : 901,
    payment_time: new Date().toISOString(),
    ...payment,
  };
  dataStore.payments.push(newPayment);

  // Automatically confirm payment and notify HOM
  const ledger = dataStore.ledgers.find((l) => l.ledger_id === payment.ledger_id);
  if (ledger) {
    ledger.status = 'PAID';

    const admission = dataStore.admissions.find((a) => a.admission_id === ledger.admission_id);
    if (admission) {
      admission.receipt_sent_to_hom = true;
      admission.status = 'PAYMENT_CONFIRMED';

      // Phase 2: auto-generate a receipt for the patient, and log it.
      const newReceipt = {
        receipt_id:
          dataStore.receipts.length > 0 ? Math.max(...dataStore.receipts.map((r) => r.receipt_id)) + 1 : 1,
        payment_id: newPayment.payment_id,
        ledger_id: ledger.ledger_id,
        admission_id: admission.admission_id,
        patient_id: admission.patient_id,
        amount: newPayment.amount_paid,
        payment_mode: newPayment.payment_mode,
        generated_at: new Date().toISOString(),
      };
      dataStore.receipts.push(newReceipt);

      activityService.log('success', `Payment of ${newPayment.amount_paid} received for admission #${admission.admission_id}`, {
        paymentId: newPayment.payment_id,
      });
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

  const admission = dataStore.admissions.find((a) => a.admission_id === ledger.admission_id);
  activityService.log('info', `Bill dispatched to patient for admission #${ledger.admission_id}`, {
    ledgerId: ledger_id,
    patientId: admission ? admission.patient_id : null,
  });

  return ledger;
}

function findPatientBills(patient_id) {
  const admissions = dataStore.admissions.filter((a) => a.patient_id === patient_id);
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
  return dataStore.dischargeSummaries.find((s) => s.admission_id === admission_id) || null;
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
};
