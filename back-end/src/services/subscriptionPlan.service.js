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
    plan_id: dataStore.subscriptionPlans.length > 0 ? Math.max(...dataStore.subscriptionPlans.map((p) => p.plan_id)) + 1 : 1,
    name: payload.name,
    max_beds: payload.max_beds,
    max_users: payload.max_users,
    max_hospitals: payload.max_hospitals,
    storage_gb: payload.storage_gb,
    api_rate_limit: payload.api_rate_limit,
    included_modules: payload.included_modules || [],
    price_monthly: payload.price_monthly,
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
