'use strict';

const dataStore = require('../store/dataStore');
const { MODULE_CODES } = require('../utils/tenant');
const serviceCatalog = require('../config/serviceCatalog');

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

/**
 * Every module gets an explicit row (true or false) — see requireModule() in
 * middleware/tenant.js, which treats a missing row as "not configured" rather
 * than implicitly enabled.
 *
 * `instancesMap` (optional) is { CODE: count } — how many billable instances
 * of that service the org provisioned. Usage-based billing multiplies each
 * enabled service's unit price by its instance count. Missing / <1 -> 1.
 */
function setModuleFlags(organizationId, enabledCodes, instancesMap) {
  const oid = Number(organizationId);
  const enabledSet = new Set(enabledCodes || []);
  const instances = instancesMap || {};
  MODULE_CODES.forEach((code) => {
    setModuleFlag(oid, code, enabledSet.has(code), instances[code]);
  });
  return enabledModulesFor(oid);
}

function setModuleFlag(organizationId, moduleCode, enabled, instanceCount) {
  const oid = Number(organizationId);
  const code = String(moduleCode).toUpperCase();
  const existing = dataStore.organizationModules.find(
    (m) => m.organization_id === oid && m.module_code === code,
  );
  const normalizedInstances =
    instanceCount === undefined ? undefined : Math.max(1, Number(instanceCount) || 1);
  if (existing) {
    existing.enabled = enabled;
    if (normalizedInstances !== undefined) existing.instances = normalizedInstances;
    if (existing.instances === undefined) existing.instances = 1;
    existing.updated_at = new Date().toISOString();
    return existing;
  }
  const newFlag = {
    organization_id: oid,
    module_code: code,
    enabled,
    instances: normalizedInstances === undefined ? 1 : normalizedInstances,
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

/** { CODE: instanceCount } for the org's ENABLED services only. */
function moduleInstancesFor(organizationId) {
  const oid = Number(organizationId);
  const out = {};
  dataStore.organizationModules
    .filter((m) => m.organization_id === oid && m.enabled)
    .forEach((m) => {
      out[m.module_code] = Math.max(1, Number(m.instances) || 1);
    });
  return out;
}

function allModuleFlagsFor(organizationId) {
  const oid = Number(organizationId);
  return MODULE_CODES.map((code) => {
    const flag = dataStore.organizationModules.find(
      (m) => m.organization_id === oid && m.module_code === code,
    );
    return {
      module_code: code,
      enabled: flag ? flag.enabled : false,
      instances: flag && flag.instances ? Math.max(1, Number(flag.instances) || 1) : 1,
    };
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

  const enabledModules = enabledModulesFor(oid);
  // Usage-based billing: pay per enabled service × the number of instances
  // of that service the org provisioned at onboarding.
  const cost = serviceCatalog.computeCost(moduleInstancesFor(oid));

  // Patient-flow snapshot for this organization — lets the Platform Super
  // User see how actively each tenant is using the system, not just how
  // many records it holds.
  const orgPre = dataStore.preRequests.filter((p) => p.organization_id === oid);
  const orgAdm = dataStore.admissions.filter((a) => a.organization_id === oid);
  const byStatus = (arr, s) => arr.filter((r) => r.status === s).length;
  const patientFlow = {
    appointments: count(dataStore.appointments),
    pre_requests_total: orgPre.length,
    pre_requests_pending: byStatus(orgPre, 'PENDING'),
    admitted: byStatus(orgPre, 'ADMITTED'),
    discharge_in_progress:
      byStatus(orgPre, 'DISCHARGE_REQUESTED') + byStatus(orgPre, 'DISCHARGE_APPROVED'),
    discharged: byStatus(orgPre, 'DISCHARGED'),
    admissions_active: orgAdm.filter((a) => a.status !== 'DISCHARGED').length,
    admissions_total: orgAdm.length,
  };
  const orgLedgers = dataStore.ledgers.filter((l) => l.organization_id === oid);
  const orgPayments = dataStore.payments.filter((p) => p.organization_id === oid);
  const revenue = {
    payments_collected: orgPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
    open_ledgers: orgLedgers.filter((l) => l.status !== 'PAID').length,
    paid_ledgers: orgLedgers.filter((l) => l.status === 'PAID').length,
  };

  return {
    hospitals: hospitalsFor(oid).length,
    users: count(dataStore.users),
    patients: count(dataStore.patients),
    beds: count(dataStore.beds),
    beds_occupied: dataStore.beds.filter(
      (b) => b.organization_id === oid && b.status === 'OCCUPIED',
    ).length,
    patient_flow: patientFlow,
    revenue,
    quotas: quotasFor(oid),
    subscription: sub
      ? {
          subscription_id: sub.subscription_id,
          plan_id: sub.plan_id,
          // Retained keys (plan_name / price_monthly) so existing platform
          // dashboard rendering keeps working — but the value is now the
          // computed usage charge, not a fixed tier price.
          plan_name: 'Usage-based',
          price_monthly: cost.total,
          billing_model: 'USAGE',
          service_lines: cost.lines,
          instances: cost.instances,
          status: sub.status,
          started_at: sub.started_at,
          renews_at: sub.renews_at,
        }
      : null,
    enabled_modules: enabledModules,
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
  moduleInstancesFor,
  allModuleFlagsFor,
  quotasFor,
  usageFor,
  marketplaceListing,
};
