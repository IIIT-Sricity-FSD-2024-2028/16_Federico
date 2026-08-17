'use strict';

const dataStore = require('../store/dataStore');

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
    }
  }

  return newPayment;
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
  createLedger,
  findLedgerEntries,
  addLedgerEntry,
  findAllPayments,
  createPayment,
  createDischargeSummary,
};
