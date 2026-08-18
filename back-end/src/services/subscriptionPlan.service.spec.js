'use strict';

const planService = require('./subscriptionPlan.service');

describe('services/subscriptionPlan.service', () => {
  it('create() assigns an incrementing plan_id and persists every field', () => {
    const plan = planService.create({
      name: 'Unit Test Tier',
      max_beds: 10,
      max_users: 5,
      max_hospitals: 1,
      storage_gb: 5,
      api_rate_limit: 30,
      included_modules: ['APPOINTMENTS'],
      price_monthly: 999,
    });
    expect(plan.plan_id).toBeGreaterThan(0);
    expect(planService.findById(plan.plan_id)).toEqual(plan);
  });

  it('update() merges a patch onto an existing plan', () => {
    const plan = planService.create({
      name: 'Unit Test Tier 2',
      max_beds: 10,
      max_users: 5,
      max_hospitals: 1,
      storage_gb: 5,
      api_rate_limit: 30,
      included_modules: [],
      price_monthly: 100,
    });
    const updated = planService.update(plan.plan_id, { price_monthly: 150 });
    expect(updated.price_monthly).toBe(150);
    expect(updated.name).toBe('Unit Test Tier 2');
  });

  it('update() on an unknown id returns null', () => {
    expect(planService.update(999999, { price_monthly: 1 })).toBeNull();
  });
});
