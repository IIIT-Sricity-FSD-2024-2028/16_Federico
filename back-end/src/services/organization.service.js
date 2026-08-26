'use strict';

const dataStore = require('../store/dataStore');
const { MODULE_CODES } = require('../utils/tenant');

function slugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  let slug = base || 'organization';
  let suffix = 1;
  while (dataStore.organizations.some((o) => o.slug === slug)) {
    slug = `${base}-${++suffix}`;
  }
  return slug;
}

function findAll() {
  return dataStore.organizations;
}

function findById(id) {
  return dataStore.organizations.find((o) => o.organization_id === id) || null;
}

function create(payload) {
  const newOrg = {
    organization_id:
      dataStore.organizations.length > 0
        ? Math.max(...dataStore.organizations.map((o) => o.organization_id)) + 1
        : 1,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  dataStore.organizations.push(newOrg);
  return newOrg;
}

function update(id, patch) {
  const org = findById(id);
  if (!org) return null;
  Object.assign(org, patch, { updated_at: new Date().toISOString() });
  return org;
}

function setStatus(id, status) {
  return update(id, { status });
}

/** Soft delete — preserves historical business data instead of leaving dangling foreign keys (see organization.service header note). */
function remove(id) {
  return update(id, { status: 'DELETED' });
}

// ---- Hospitals (branches) ----

function hospitalsFor(organizationId) {
  const oid = Number(organizationId);
  return dataStore.hospitals.filter((h) => h.organization_id === oid);
}

function primaryHospitalFor(organizationId) {
  const branches = hospitalsFor(organizationId);
  return branches.find((h) => h.is_primary) || branches[0] || null;
}

function createHospital(organizationId, payload) {
  const isFirst = hospitalsFor(organizationId).length === 0;
  const newHospital = {
    hospital_id:
      dataStore.hospitals.length > 0
        ? Math.max(...dataStore.hospitals.map((h) => h.hospital_id)) + 1
        : 1,
    organization_id: Number(organizationId),
    name: payload.name,
    city: payload.city || null,
    address: payload.address || null,
    phone: payload.phone || null,
    is_primary: isFirst || Boolean(payload.is_primary),
    created_at: new Date().toISOString(),
  };
  dataStore.hospitals.push(newHospital);
  return newHospital;
}

// ---- Feature flags (organizationModules) ----

/** Every module gets an explicit row (true or false) — see requireModule() in middleware/tenant.js, which treats a missing row as "not configured" rather than implicitly enabled. */
function setModuleFlags(organizationId, enabledCodes) {
  const oid = Number(organizationId);
  const enabledSet = new Set(enabledCodes || []);
  MODULE_CODES.forEach((code) => {
    setModuleFlag(oid, code, enabledSet.has(code));
  });
  return enabledModulesFor(oid);
}

function setModuleFlag(organizationId, moduleCode, enabled) {
  const oid = Number(organizationId);
  const code = String(moduleCode).toUpperCase();
  const existing = dataStore.organizationModules.find(
    (m) => m.organization_id === oid && m.module_code === code,
  );
  if (existing) {
    existing.enabled = enabled;
    existing.updated_at = new Date().toISOString();
    return existing;
  }
  const newFlag = {
    organization_id: oid,
    module_code: code,
    enabled,
    updated_at: new Date().toISOString(),
  };
  dataStore.organizationModules.push(newFlag);
  return newFlag;
}

function enabledModulesFor(organizationId) {
  const oid = Number(organizationId);
  return dataStore.organizationModules
    .filter((m) => m.organization_id === oid && m.enabled)
    .map((m) => m.module_code);
}

function allModuleFlagsFor(organizationId) {
  const oid = Number(organizationId);
  return MODULE_CODES.map((code) => {
    const flag = dataStore.organizationModules.find(
      (m) => m.organization_id === oid && m.module_code === code,
    );
    return { module_code: code, enabled: flag ? flag.enabled : false };
  });
}

// ---- Usage / quotas ----

function quotasFor(organizationId) {
  const oid = Number(organizationId);
  return (
    dataStore.resourceQuotas.find((q) => q.organization_id === oid) || null
  );
}

function usageFor(organizationId) {
  const oid = Number(organizationId);
  const count = (arr) => arr.filter((r) => r.organization_id === oid).length;
  const sub =
    dataStore.subscriptions.find((s) => s.organization_id === oid) || null;
  const plan = sub
    ? dataStore.subscriptionPlans.find((p) => p.plan_id === sub.plan_id) || null
    : null;

  return {
    hospitals: hospitalsFor(oid).length,
    users: count(dataStore.users),
    patients: count(dataStore.patients),
    beds: count(dataStore.beds),
    beds_occupied: dataStore.beds.filter(
      (b) => b.organization_id === oid && b.status === 'OCCUPIED',
    ).length,
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

// ---- Marketplace (public) ----

function marketplaceListing() {
  return dataStore.organizations
    .filter((o) => o.status === 'ACTIVE')
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
