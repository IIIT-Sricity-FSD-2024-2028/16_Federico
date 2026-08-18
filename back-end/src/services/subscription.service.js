'use strict';

const dataStore = require('../store/dataStore');
const planService = require('./subscriptionPlan.service');

function findByOrg(organizationId) {
  return dataStore.subscriptions.find((s) => s.organization_id === organizationId) || null;
}

function materializeQuotas(organizationId, plan) {
  const existing = dataStore.resourceQuotas.find((q) => q.organization_id === organizationId);
  const values = {
    max_beds: plan.max_beds,
    max_users: plan.max_users,
    max_hospitals: plan.max_hospitals,
    storage_gb: plan.storage_gb,
    api_rate_limit: plan.api_rate_limit,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    Object.assign(existing, values);
    return existing;
  }
  const newQuota = { organization_id: organizationId, ...values };
  dataStore.resourceQuotas.push(newQuota);
  return newQuota;
}

/** Subscribe (first time), upgrade, or downgrade — all the same operation: point the org's one subscription row at a different plan. */
function setPlan(organizationId, planId) {
  const plan = planService.findById(planId);
  if (!plan) return { error: 'PLAN_NOT_FOUND' };

  let subscription = findByOrg(organizationId);
  const now = new Date();
  const renewsAt = new Date(now);
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + 1);

  if (subscription) {
    subscription.plan_id = planId;
    subscription.status = 'ACTIVE';
    subscription.updated_at = now.toISOString();
  } else {
    subscription = {
      subscription_id: dataStore.subscriptions.length > 0 ? Math.max(...dataStore.subscriptions.map((s) => s.subscription_id)) + 1 : 1,
      organization_id: organizationId,
      plan_id: planId,
      status: 'ACTIVE',
      started_at: now.toISOString(),
      renews_at: renewsAt.toISOString(),
      updated_at: now.toISOString(),
    };
    dataStore.subscriptions.push(subscription);
  }

  materializeQuotas(organizationId, plan);
  return { subscription, plan };
}

function renew(organizationId) {
  const subscription = findByOrg(organizationId);
  if (!subscription) return null;
  const renewsAt = new Date();
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + 1);
  subscription.status = 'ACTIVE';
  subscription.renews_at = renewsAt.toISOString();
  subscription.updated_at = new Date().toISOString();
  return subscription;
}

module.exports = { findByOrg, setPlan, renew, materializeQuotas };
