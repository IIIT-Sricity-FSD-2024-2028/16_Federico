'use strict';

const metrics = require('./metrics.service');
const dataStore = require('../store/dataStore');

const ORG = 992002;

describe('metrics.service — usage store access', () => {
  beforeEach(() => {
    if (dataStore.moduleUsage) delete dataStore.moduleUsage[String(ORG)];
  });

  it('derives a UTC YYYY-MM period', () => {
    expect(metrics.period(new Date('2026-08-30T23:00:00Z'))).toBe('2026-08');
    expect(metrics.period(new Date('2026-12-31T18:30:00Z'))).toBe('2026-12');
    expect(metrics.period()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('increment builds the nested bucket and advances timestamps', () => {
    metrics.increment(ORG, 'INVENTORY', 'POST', new Date('2026-08-01T00:00:00Z'));
    metrics.increment(ORG, 'INVENTORY', 'PUT', new Date('2026-08-05T00:00:00Z'));

    const bucket = dataStore.moduleUsage[String(ORG)].INVENTORY['2026-08'];
    expect(bucket.billable_hits).toBe(2);
    expect(bucket.by_method).toEqual({ POST: 1, PUT: 1 });
    expect(bucket.first_hit_at).toBe('2026-08-01T00:00:00.000Z');
    expect(bucket.last_hit_at).toBe('2026-08-05T00:00:00.000Z');
  });

  it('hitsFor is zero-safe for missing org / module / period', () => {
    expect(metrics.hitsFor(ORG, 'BILLING')).toBe(0);
    metrics.increment(ORG, 'BILLING', 'POST');
    expect(metrics.hitsFor(ORG, 'BILLING')).toBe(1);
    expect(metrics.hitsFor(ORG, 'ADMISSIONS')).toBe(0);
    expect(metrics.hitsFor(123456789, 'BILLING')).toBe(0);
    expect(metrics.hitsFor(ORG, 'BILLING', '1999-01')).toBe(0);
  });

  it('hitMap returns only enabled metered modules', () => {
    metrics.increment(ORG, 'BILLING', 'POST');
    const map = metrics.hitMap(ORG, ['BILLING', 'INSURANCE', 'ANALYTICS'], metrics.period());
    expect(map).toEqual({ BILLING: 1 }); // INSURANCE flat + ANALYTICS unbilled are excluded
  });

  it('usageForOrg and aggregatePlatform roll counts up', () => {
    metrics.increment(ORG, 'BILLING', 'POST');
    metrics.increment(ORG, 'ADMISSIONS', 'POST');
    metrics.increment(ORG, 'ADMISSIONS', 'PUT');

    const rollup = metrics.usageForOrg(ORG);
    expect(rollup.total_hits).toBe(3);
    expect(rollup.modules.ADMISSIONS.billable_hits).toBe(2);

    const platform = metrics.aggregatePlatform(metrics.period());
    expect(platform.by_org[String(ORG)].total_hits).toBe(3);
    expect(platform.hits_by_module.ADMISSIONS).toBeGreaterThanOrEqual(2);
  });
});
