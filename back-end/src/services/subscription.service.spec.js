'use strict';

const subscriptionService = require('./subscription.service');
const planService = require('./subscriptionPlan.service');
const organizationService = require('./organization.service');

describe('services/subscription.service', () => {
  function makePlan(overrides) {
    return planService.create({
      name: 'Plan',
      max_beds: 10,
      max_users: 5,
      max_hospitals: 1,
      storage_gb: 5,
      api_rate_limit: 30,
      included_modules: [],
      price_monthly: 100,
      ...overrides,
    });
  }

  it('setPlan() creates a subscription and materializes matching resource quotas on first subscribe', () => {
    const org = organizationService.create({ name: 'Sub Test Org A' });
    const plan = makePlan({ max_beds: 25 });

    const { subscription, plan: returnedPlan } = subscriptionService.setPlan(org.organization_id, plan.plan_id);
    expect(subscription.organization_id).toBe(org.organization_id);
    expect(subscription.status).toBe('ACTIVE');
    expect(returnedPlan.plan_id).toBe(plan.plan_id);

    const quotas = organizationService.quotasFor(org.organization_id);
    expect(quotas.max_beds).toBe(25);
  });

  it('setPlan() called again re-points the SAME subscription row (upgrade/downgrade), not a new one', () => {
    const org = organizationService.create({ name: 'Sub Test Org B' });
    const starter = makePlan({ name: 'Starter', max_beds: 25 });
    const pro = makePlan({ name: 'Pro', max_beds: 100 });

    const first = subscriptionService.setPlan(org.organization_id, starter.plan_id);
    const second = subscriptionService.setPlan(org.organization_id, pro.plan_id);

    expect(second.subscription.subscription_id).toBe(first.subscription.subscription_id);
    expect(second.subscription.plan_id).toBe(pro.plan_id);
    expect(organizationService.quotasFor(org.organization_id).max_beds).toBe(100);
  });

  it('setPlan() with an unknown plan id returns an error instead of throwing', () => {
    const org = organizationService.create({ name: 'Sub Test Org C' });
    const result = subscriptionService.setPlan(org.organization_id, 999999);
    expect(result.error).toBe('PLAN_NOT_FOUND');
  });

  it('renew() sets an active subscription\'s renews_at roughly a month out, and returns null if none exists', () => {
    const org = organizationService.create({ name: 'Sub Test Org D' });
    expect(subscriptionService.renew(org.organization_id)).toBeNull();

    const plan = makePlan();
    subscriptionService.setPlan(org.organization_id, plan.plan_id);
    const renewed = subscriptionService.renew(org.organization_id);
    expect(renewed.status).toBe('ACTIVE');
    const daysUntilRenewal = (new Date(renewed.renews_at) - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilRenewal).toBeGreaterThan(25);
    expect(daysUntilRenewal).toBeLessThan(32);
  });
});
