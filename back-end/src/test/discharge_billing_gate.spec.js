'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { createSession } = require('../store/sessionStore');
const dataStore = require('../store/dataStore');
const billingService = require('../services/billing.service');

/**
 * Locks in two flow rules changed for the Finance Associate workflow:
 *  1. Admission does NOT auto-create a billing ledger — FA opens it.
 *  2. PRE cannot finalise a discharge (DISCHARGE_APPROVED -> DISCHARGED,
 *     which releases the bed) until the patient's ledger is PAID.
 */
describe('Discharge is gated on Finance clearing the bill', () => {
  let app;
  let preTok;
  let homTok;
  let faTok;
  let preRequest;
  let admission;

  beforeAll(() => {
    app = createApp();
    preTok = createSession({ userId: 101, role: 'PRE', organizationId: 1, hospitalId: 1 });
    homTok = createSession({ userId: 101, role: 'HOM', organizationId: 1, hospitalId: 1 });
    faTok = createSession({ userId: 101, role: 'FA', organizationId: 1, hospitalId: 1 });

    // An admitted, non-emergency inpatient from the seed set.
    preRequest = dataStore.preRequests.find(
      (p) => p.status === 'ADMITTED' && p.visit_type !== 'Emergency',
    );
    admission = dataStore.admissions.find(
      (a) => a.patient_id === preRequest.patient_id && a.status !== 'DISCHARGED',
    );
    // Start from a clean billing slate for this admission.
    dataStore.ledgers = dataStore.ledgers.filter(
      (l) => l.admission_id !== admission.admission_id,
    );
  });

  it('has no ledger until FA opens one', () => {
    expect(billingService.findLedgerByAdmission(admission.admission_id)).toBeNull();
  });

  it('blocks PRE final discharge sign-off while the bill is unpaid', async () => {
    await request(app)
      .put(`/pre-requests/${preRequest.pre_request_id}`)
      .set('Authorization', `Bearer ${preTok}`)
      .send({ status: 'DISCHARGE_REQUESTED' });
    await request(app)
      .put(`/pre-requests/${preRequest.pre_request_id}`)
      .set('Authorization', `Bearer ${homTok}`)
      .send({ status: 'DISCHARGE_APPROVED' });

    // FA opens the ledger and posts a charge, but no payment yet.
    const ledger = await request(app)
      .post('/billing/ledger')
      .set('Authorization', `Bearer ${faTok}`)
      .send({ admission_id: admission.admission_id, status: 'OPEN' });
    await request(app)
      .post('/billing/ledger/entry')
      .set('Authorization', `Bearer ${faTok}`)
      .send({
        ledger_id: ledger.body.ledger_id,
        service_id: 5,
        quantity: 1,
        unit_price: 6000,
        amount: 6000,
      });

    const blocked = await request(app)
      .put(`/pre-requests/${preRequest.pre_request_id}`)
      .set('Authorization', `Bearer ${preTok}`)
      .send({ status: 'DISCHARGED' });

    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/bill has not been cleared/i);

    // Pay it off -> the gate opens.
    await request(app)
      .put(`/billing/ledger/${ledger.body.ledger_id}/dispatch`)
      .set('Authorization', `Bearer ${faTok}`);
    await request(app)
      .post('/billing/payments')
      .set('Authorization', `Bearer ${faTok}`)
      .send({ ledger_id: ledger.body.ledger_id, amount_paid: 6000, payment_mode: 'UPI' });

    const ok = await request(app)
      .put(`/pre-requests/${preRequest.pre_request_id}`)
      .set('Authorization', `Bearer ${preTok}`)
      .send({ status: 'DISCHARGED' });

    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('DISCHARGED');

    const bed = dataStore.beds.find((b) => b.bed_id === preRequest.bed_id);
    if (bed) expect(bed.status).toBe('AVAILABLE');
  });
});
