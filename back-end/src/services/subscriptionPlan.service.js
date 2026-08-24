'use strict';

const { organizationRepository } = require('../repositories');

function findAll() {
  return organizationRepository.findAllPlans();
}

function findById(id) {
  return organizationRepository.findPlanById(id);
}

function create(payload) {
  return organizationRepository.createPlan({
    name: payload.name,
    max_beds: Number(payload.max_beds) || 0,
    max_users: Number(payload.max_users) || 0,
    max_hospitals: Number(payload.max_hospitals) || 1,
    storage_gb: Number(payload.storage_gb) || 10,
    api_rate_limit: Number(payload.api_rate_limit) || 1000,
    included_modules: payload.included_modules || [],
    price_monthly: Number(payload.price_monthly) || 0,
  });
}

function update(id, patch) {
  return organizationRepository.plansRepo.update(id, patch);
}

module.exports = { findAll, findById, create, update };
