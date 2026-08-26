'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.subscriptionPlans;
}

function findById(id) {
  return dataStore.subscriptionPlans.find((p) => p.plan_id === id) || null;
}

function create(payload) {
  const newPlan = {
    plan_id:
      dataStore.subscriptionPlans.length > 0
        ? Math.max(...dataStore.subscriptionPlans.map((p) => p.plan_id)) + 1
        : 1,
    name: payload.name,
    max_beds: Number(payload.max_beds) || 0,
    max_users: Number(payload.max_users) || 0,
    max_hospitals: Number(payload.max_hospitals) || 1,
    storage_gb: Number(payload.storage_gb) || 10,
    api_rate_limit: Number(payload.api_rate_limit) || 1000,
    included_modules: payload.included_modules || [],
    price_monthly: Number(payload.price_monthly) || 0,
    created_at: new Date().toISOString(),
  };
  dataStore.subscriptionPlans.push(newPlan);
  return newPlan;
}

function update(id, patch) {
  const plan = findById(id);
  if (!plan) return null;
  Object.assign(plan, patch);
  return plan;
}

module.exports = { findAll, findById, create, update };
