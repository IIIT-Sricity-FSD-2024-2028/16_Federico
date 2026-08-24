'use strict';

const { organizationRepository } = require('../repositories');
const planService = require('./subscriptionPlan.service');

function findByOrg(organizationId) {
  return organizationRepository.findSubscriptionByOrg(organizationId);
}

function materializeQuotas(organizationId, plan) {
  const oid = Number(organizationId);
  const existing = organizationRepository.findQuotaByOrg(oid);
  const values = {
    max_beds: plan.max_beds,
    max_users: plan.max_users,
    max_hospitals: plan.max_hospitals,
    storage_gb: plan.storage_gb,
    api_rate_limit: plan.api_rate_limit,
  };
  if (existing) {
    return organizationRepository.updateQuota(existing.quota_id, values);
  }
  return organizationRepository.createQuota({
    organization_id: oid,
    ...values,
  });
}

function setPlan(organizationId, planId) {
  const oid = Number(organizationId);
  const pid = Number(planId);
  const plan = planService.findById(pid);
  if (!plan) return { error: 'PLAN_NOT_FOUND' };

  let subscription = findByOrg(oid);
  const now = new Date();
  const renewsAt = new Date(now);
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + 1);

  if (subscription) {
    subscription = organizationRepository.updateSubscription(subscription.subscription_id, {
      plan_id: pid,
      status: 'ACTIVE',
      updated_at: now.toISOString(),
    });
  } else {
    subscription = organizationRepository.createSubscription({
      organization_id: oid,
      plan_id: pid,
      status: 'ACTIVE',
      started_at: now.toISOString(),
      renews_at: renewsAt.toISOString(),
    });
  }

  materializeQuotas(oid, plan);
  return { subscription, plan };
}

function renew(organizationId) {
  const subscription = findByOrg(organizationId);
  if (!subscription) return null;
  const renewsAt = new Date();
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + 1);
  return organizationRepository.updateSubscription(subscription.subscription_id, {
    status: 'ACTIVE',
    renews_at: renewsAt.toISOString(),
  });
}

module.exports = { findByOrg, setPlan, renew, materializeQuotas };
