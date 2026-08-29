'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { createSession } = require('../store/sessionStore');
const dataStore = require('../store/dataStore');
const metrics = require('../metering/metrics.service');

/**
 * End-to-end coverage for the usage-based ("per-hit platform fee") revenue
 * model. Counters in dataStore.moduleUsage are process-global and other specs
 * also drive org 1 traffic, so every assertion here is a DELTA around the
 * action under test.
 */
describe('Usage metering — per-hit platform fee', () => {
  let app;
  let faTok; // org 1, billing writes
  let preTok; // org 1, appointment writes
  let apolloTok; // org 2 (Apollo) — INVENTORY module disabled in seed
  let platformTok;
  const P = metrics.period();

  beforeAll(async () => {
    app = createApp();
    faTok = createSession({ userId: 106, role: 'FA', organizationId: 1, hospitalId: 1 });
    preTok = createSession({ userId: 102, role: 'PRE', organizationId: 1, hospitalId: 1 });
    apolloTok = createSession({ userId: 201, role: 'FA', organizationId: 2, hospitalId: 2 });

    const login = await request(app)
      .post('/platform/auth/login')
      .send({ email: 'platform@federico.com', password: 'Federico@Platform123' });
    expect(login.status).toBe(200);
    platformTok = login.body.token;
  });

  it('counts one billable hit per successful state-changing request', async () => {
    const before = metrics.hitsFor(1, 'BILLING', P);
    const res = await request(app)
      .post('/billing/services')
      .set('Authorization', `Bearer ${faTok}`)
      .send({ service_name: 'Metering probe service', base_cost: 100 });
    expect(res.status).toBe(201);
    expect(metrics.hitsFor(1, 'BILLING', P)).toBe(before + 1);

    const view = await request(app)
      .get('/platform/organizations/1/usage/metered')
      .set('Authorization', `Bearer ${platformTok}`);
    expect(view.status).toBe(200);
    expect(view.body.modules.BILLING.billable_hits).toBeGreaterThanOrEqual(1);
    expect(view.body.fee_lines.find((l) => l.code === 'BILLING')).toBeDefined();
  });

  it('never counts reads', async () => {
    const before = metrics.hitsFor(1, 'BILLING', P);
    const res = await request(app)
      .get('/billing/services')
      .set('Authorization', `Bearer ${faTok}`);
    expect(res.status).toBe(200);
    expect(metrics.hitsFor(1, 'BILLING', P)).toBe(before);
  });

  it('never counts a request blocked by the module entitlement gate', async () => {
    const before = metrics.hitsFor(2, 'INVENTORY', P);
    const res = await request(app)
      .post('/inventory/items')
      .set('Authorization', `Bearer ${apolloTok}`)
      .send({ item_name: 'x', category: 'y', stock_quantity: 1, reorder_level: 1 });
    expect(res.status).toBe(403); // requireModule('INVENTORY') — Apollo has it disabled
    expect(metrics.hitsFor(2, 'INVENTORY', P)).toBe(before);
  });

  it('meters the /appointment and /request alias as one hit each (no double count)', async () => {
    const before = metrics.hitsFor(1, 'APPOINTMENTS', P);
    const a = await request(app)
      .post('/appointment')
      .set('Authorization', `Bearer ${preTok}`)
      .send({ patient_id: 201 });
    const b = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${preTok}`)
      .send({ patient_id: 202 });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(metrics.hitsFor(1, 'APPOINTMENTS', P)).toBe(before + 2);
  });

  it('exposes a tenant-facing "my usage" view', async () => {
    const res = await request(app)
      .get('/account/usage')
      .set('Authorization', `Bearer ${faTok}`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBe(P);
    expect(typeof res.body.base_fee).toBe('number');
    expect(typeof res.body.insurance_flat_fee).toBe('number');
    expect(typeof res.body.usage_fee_total).toBe('number');
    expect(typeof res.body.total_monthly).toBe('number');
    expect(res.body.modules.BILLING).toBeDefined();
  });

  it('closes a billing period into an idempotent invoice snapshot', async () => {
    const first = await request(app)
      .post('/platform/billing/close-period')
      .set('Authorization', `Bearer ${platformTok}`)
      .send({});
    expect(first.status).toBe(200);
    expect(first.body.period).toBe(P);

    const rowsAfterFirst = dataStore.usageInvoices.filter(
      (r) => r.organization_id === 1 && r.period === P,
    );
    expect(rowsAfterFirst).toHaveLength(1);
    const invoice = rowsAfterFirst[0];
    expect(invoice.status).toBe('CLOSED');
    expect(Array.isArray(invoice.usage_lines)).toBe(true);
    expect(invoice.hit_snapshot).toBeDefined();
    expect(invoice.total_amount).toBe(
      invoice.base_fee + invoice.insurance_flat_fee + invoice.usage_fee_total,
    );

    // Re-close -> replace, not duplicate; invoice_id is stable.
    const second = await request(app)
      .post('/platform/billing/close-period')
      .set('Authorization', `Bearer ${platformTok}`)
      .send({ period: P });
    expect(second.status).toBe(200);
    const rowsAfterSecond = dataStore.usageInvoices.filter(
      (r) => r.organization_id === 1 && r.period === P,
    );
    expect(rowsAfterSecond).toHaveLength(1);
    expect(rowsAfterSecond[0].invoice_id).toBe(invoice.invoice_id);
  });

  it('adds usage rollup keys to GET /platform/usage without dropping MRR/ARR', async () => {
    const res = await request(app)
      .get('/platform/usage')
      .set('Authorization', `Bearer ${platformTok}`);
    expect(res.status).toBe(200);
    expect(res.body.billing_period).toBe(P);
    expect(typeof res.body.total_usage_fee).toBe('number');
    expect(typeof res.body.total_billable_hits).toBe('number');
    expect(res.body.usage_by_module).toBeDefined();
    expect(res.body.total_arr).toBe(res.body.total_mrr * 12);
  });
});
