'use strict';

const serviceCatalog = require('./serviceCatalog');

describe('serviceCatalog — usage-based ("per-hit") billing helpers', () => {
  it('bills chargeable hits at the module rate', () => {
    const fee = serviceCatalog.computeUsageFee({ BILLING: 100 });
    expect(fee.lines).toHaveLength(1);
    const [line] = fee.lines;
    expect(line.code).toBe('BILLING');
    expect(line.billable_hits).toBe(100);
    expect(line.included_hits).toBe(serviceCatalog.INCLUDED_HITS.BILLING || 0);
    expect(line.chargeable_hits).toBe(100 - (serviceCatalog.INCLUDED_HITS.BILLING || 0));
    expect(line.unit_rate).toBe(serviceCatalog.HIT_RATES.BILLING);
    expect(line.amount).toBe(line.chargeable_hits * serviceCatalog.HIT_RATES.BILLING);
    expect(fee.total).toBe(line.amount);
  });

  it('honours an included-hit tier when configured', () => {
    const rate = serviceCatalog.HIT_RATES.APPOINTMENTS;
    const fee = serviceCatalog.computeUsageFee(
      { APPOINTMENTS: 10 },
      { includedTier: true },
    );
    const included = serviceCatalog.INCLUDED_HITS.APPOINTMENTS || 0;
    expect(fee.total).toBe(Math.max(0, 10 - included) * rate);

    // includedTier:false ignores the free allowance entirely.
    const noTier = serviceCatalog.computeUsageFee(
      { APPOINTMENTS: 10 },
      { includedTier: false },
    );
    expect(noTier.total).toBe(10 * rate);
  });

  it('treats an unknown / non-metered module as rate 0 without throwing', () => {
    expect(() => serviceCatalog.computeUsageFee({ NOPE: 50 })).not.toThrow();
    const fee = serviceCatalog.computeUsageFee({ NOPE: 50, ANALYTICS: 999 });
    expect(fee.total).toBe(0);
  });

  it('returns an empty result for no hits', () => {
    expect(serviceCatalog.computeUsageFee({})).toEqual({ lines: [], total: 0 });
    expect(serviceCatalog.computeUsageFee(null)).toEqual({ lines: [], total: 0 });
  });

  it('computes a flat platform base fee per branch', () => {
    expect(serviceCatalog.computeBaseFee(3)).toBe(
      3 * serviceCatalog.PLATFORM_BASE_FEE_PER_BRANCH,
    );
    expect(serviceCatalog.computeBaseFee(0)).toBe(0);
    expect(serviceCatalog.computeBaseFee(undefined)).toBe(0);
  });

  it('keeps the legacy per-module monthly computeCost behaviour intact', () => {
    const cost = serviceCatalog.computeCost(['INSURANCE'], 1);
    expect(cost.total).toBe(serviceCatalog.SERVICE_PRICES.INSURANCE);
    expect(cost.lines).toHaveLength(1);
  });

  it('classifies modules: 4 metered, INSURANCE flat, ANALYTICS unbilled', () => {
    expect(serviceCatalog.METERED_MODULES.sort()).toEqual(
      ['ADMISSIONS', 'APPOINTMENTS', 'BILLING', 'INVENTORY'].sort(),
    );
    expect(serviceCatalog.FLAT_MODULES).toEqual(['INSURANCE']);
    expect(serviceCatalog.METERED_MODULES).not.toContain('ANALYTICS');
    expect(serviceCatalog.FLAT_MODULES).not.toContain('ANALYTICS');
  });
});
