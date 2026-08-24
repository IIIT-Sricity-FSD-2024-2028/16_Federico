'use strict';

const {
  organizationRepository,
  userRepository,
  patientRepository,
  wardRepository,
} = require('../repositories');
const { MODULE_CODES } = require('../utils/tenant');

function slugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  let slug = base || 'organization';
  let suffix = 1;
  const existingOrgs = organizationRepository.findAll();
  while (existingOrgs.some((o) => o.slug === slug)) {
    slug = `${base}-${++suffix}`;
  }
  return slug;
}

function findAll() {
  return organizationRepository.findAll();
}

function findById(id) {
  return organizationRepository.findById(id);
}

function create(payload) {
  return organizationRepository.create({
    name: payload.name,
    slug: slugify(payload.name),
    status: 'ACTIVE',
    branding: payload.branding || {
      initial: (payload.name || '?').trim().charAt(0).toUpperCase(),
      primary_color: '#6750A4',
    },
    contact: payload.contact || { phone: null, email: null, address: null },
    specialties: payload.specialties || [],
    emergency_available: Boolean(payload.emergency_available),
  });
}

function update(id, patch) {
  return organizationRepository.update(id, patch);
}

function setStatus(id, status) {
  return update(id, { status });
}

function remove(id) {
  return update(id, { status: 'DELETED' });
}

// Hospitals (branches)
function hospitalsFor(organizationId) {
  return organizationRepository.findHospitalsByOrg(organizationId);
}

function primaryHospitalFor(organizationId) {
  const branches = hospitalsFor(organizationId);
  return branches.find((h) => h.is_primary) || branches[0] || null;
}

function createHospital(organizationId, payload) {
  const isFirst = hospitalsFor(organizationId).length === 0;
  return organizationRepository.createHospital({
    organization_id: Number(organizationId),
    name: payload.name,
    city: payload.city || null,
    address: payload.address || null,
    phone: payload.phone || null,
    is_primary: isFirst || Boolean(payload.is_primary),
  });
}

// Feature flags (organizationModules)
function setModuleFlags(organizationId, enabledCodes) {
  const oid = Number(organizationId);
  const enabledSet = new Set(enabledCodes || []);
  MODULE_CODES.forEach((code) => {
    organizationRepository.setModuleFlag(oid, code, enabledSet.has(code));
  });
  return enabledModulesFor(oid);
}

function setModuleFlag(organizationId, moduleCode, enabled) {
  return organizationRepository.setModuleFlag(organizationId, moduleCode, enabled);
}

function enabledModulesFor(organizationId) {
  const oid = Number(organizationId);
  return organizationRepository
    .findModulesByOrg(oid)
    .filter((m) => m.enabled)
    .map((m) => m.module_code);
}

function allModuleFlagsFor(organizationId) {
  const oid = Number(organizationId);
  const orgModules = organizationRepository.findModulesByOrg(oid);
  return MODULE_CODES.map((code) => {
    const flag = orgModules.find((m) => m.module_code === code);
    return { module_code: code, enabled: flag ? flag.enabled : false };
  });
}

// Usage / Quotas
function quotasFor(organizationId) {
  return organizationRepository.findQuotaByOrg(organizationId);
}

function usageFor(organizationId) {
  const oid = Number(organizationId);
  const usersCount = userRepository.findAll((u) => u.organization_id === oid).length;
  const patientsCount = patientRepository.findAll((p) => p.organization_id === oid).length;
  const allBeds = wardRepository.findAllBeds((b) => b.organization_id === oid);
  const bedsCount = allBeds.length;
  const bedsOccupied = allBeds.filter((b) => b.status === 'OCCUPIED').length;

  const sub = organizationRepository.findSubscriptionByOrg(oid);
  const plan = sub ? organizationRepository.findPlanById(sub.plan_id) : null;

  return {
    hospitals: hospitalsFor(oid).length,
    users: usersCount,
    patients: patientsCount,
    beds: bedsCount,
    beds_occupied: bedsOccupied,
    quotas: quotasFor(oid),
    subscription: sub
      ? {
          subscription_id: sub.subscription_id,
          plan_id: sub.plan_id,
          plan_name: plan ? plan.name : 'Unknown',
          price_monthly: plan ? Number(plan.price_monthly) || 0 : 0,
          status: sub.status,
          started_at: sub.started_at,
          renews_at: sub.renews_at,
        }
      : null,
    enabled_modules: enabledModulesFor(oid),
  };
}

// Marketplace (public)
function marketplaceListing() {
  return organizationRepository
    .findAll((o) => o.status === 'ACTIVE')
    .map((o) => ({
      organization_id: o.organization_id,
      name: o.name,
      slug: o.slug,
      branding: o.branding,
      branches: hospitalsFor(o.organization_id).map((h) => ({
        hospital_id: h.hospital_id,
        name: h.name,
        city: h.city,
      })),
      specialties: o.specialties,
      emergency_available: o.emergency_available,
      contact: o.contact,
    }));
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  setStatus,
  remove,
  hospitalsFor,
  primaryHospitalFor,
  createHospital,
  setModuleFlags,
  setModuleFlag,
  enabledModulesFor,
  allModuleFlagsFor,
  quotasFor,
  usageFor,
  marketplaceListing,
};
