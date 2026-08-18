'use strict';

const billingService = require('./billing.service');
const admissionService = require('./admission.service');
const dataStore = require('../store/dataStore');

describe('services/billing.service', () => {
  function makeAdmission() {
    return admissionService.create({ patient_id: 201, bed_id: 1, status: 'ADMITTED', organization_id: 1, hospital_id: 1 });
  }

  it('addLedgerEntry() mints a PER-LEDGER entry_id sequence, not a global max (documented intentional behavior)', () => {
    const admission = makeAdmission();
    const ledger = billingService.createLedger({ admission_id: admission.admission_id, status: 'OPEN', organization_id: 1, hospital_id: 1 });

    const entryA = billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 1, unit_price: 100, amount: 100 });
    const entryB = billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 2, quantity: 1, unit_price: 200, amount: 200 });
    expect(entryA.entry_id).toBe(1);
    expect(entryB.entry_id).toBe(2);

    // A second, unrelated ledger starts its own entry_id sequence back at 1.
    const admission2 = makeAdmission();
    const ledger2 = billingService.createLedger({ admission_id: admission2.admission_id, status: 'OPEN', organization_id: 1, hospital_id: 1 });
    const entryC = billingService.addLedgerEntry({ ledger_id: ledger2.ledger_id, service_id: 1, quantity: 1, unit_price: 50, amount: 50 });
    expect(entryC.entry_id).toBe(1);
  });

  it('createPayment() marks the ledger PAID, the admission PAYMENT_CONFIRMED, and auto-generates a receipt carrying the tenant stamp', () => {
    const admission = makeAdmission();
    const ledger = billingService.createLedger({ admission_id: admission.admission_id, status: 'OPEN', organization_id: 1, hospital_id: 1 });
    billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 1, unit_price: 500, amount: 500 });

    const receiptCountBefore = dataStore.receipts.length;
    const payment = billingService.createPayment({ ledger_id: ledger.ledger_id, amount_paid: 500, payment_mode: 'CASH', organization_id: 1, hospital_id: 1 });

    expect(dataStore.ledgers.find((l) => l.ledger_id === ledger.ledger_id).status).toBe('PAID');
    expect(dataStore.admissions.find((a) => a.admission_id === admission.admission_id).status).toBe('PAYMENT_CONFIRMED');
    expect(dataStore.receipts.length).toBe(receiptCountBefore + 1);

    const receipt = dataStore.receipts.find((r) => r.payment_id === payment.payment_id);
    expect(receipt.organization_id).toBe(1);
    expect(receipt.patient_id).toBe(admission.patient_id);
  });

  it('dispatchLedger() moves status to DISPATCHED and stamps dispatched_at; unknown ledger returns null', () => {
    const admission = makeAdmission();
    const ledger = billingService.createLedger({ admission_id: admission.admission_id, status: 'OPEN', organization_id: 1, hospital_id: 1 });

    const dispatched = billingService.dispatchLedger(ledger.ledger_id);
    expect(dispatched.status).toBe('DISPATCHED');
    expect(dispatched.dispatched_at).toBeTruthy();

    expect(billingService.dispatchLedger(999999)).toBeNull();
  });

  it('findPatientBills() pairs every admission with its ledger and entries, even when a ledger does not exist yet', () => {
    const admissionWithLedger = makeAdmission();
    billingService.createLedger({ admission_id: admissionWithLedger.admission_id, status: 'OPEN', organization_id: 1, hospital_id: 1 });
    const admissionWithoutLedger = makeAdmission();

    const bills = billingService.findPatientBills(201);
    const withLedgerEntry = bills.find((b) => b.admission.admission_id === admissionWithLedger.admission_id);
    const withoutLedgerEntry = bills.find((b) => b.admission.admission_id === admissionWithoutLedger.admission_id);

    expect(withLedgerEntry.ledger).not.toBeNull();
    expect(withoutLedgerEntry.ledger).toBeNull();
    expect(withoutLedgerEntry.entries).toEqual([]);
  });
});
