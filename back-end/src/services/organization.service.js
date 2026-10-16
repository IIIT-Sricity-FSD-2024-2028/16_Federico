'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
const serviceCatalog = require('../config/serviceCatalog');
const resourceCatalog = require('../config/resourceCatalog');
const { destroySessionsForUser } = require('../store/sessionStore');
const {
  parseEmail,
  normalizeDomain,
  isValidDomainFormat,
  isReservedDomain,
  suggestEmailDomainBase,
} = require('../utils/emailIdentity');

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

function findByEmailDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;
  return (
    dataStore.organizations.find((o) => o.email_domain === normalized) || null
  );
}

/**
 * Unique email domain suggested from a hospital name ("City General
 * Hospital" → "citygen.com"; "citygen2.com" if that is taken). Same
 * uniqueness loop as slugify().
 */
function suggestEmailDomain(name) {
  const base = suggestEmailDomainBase(name);
  const [label, ...rest] = base.split('.');
  const tld = rest.join('.');
  let domain = base;
  let suffix = 1;
  while (findByEmailDomain(domain) || isReservedDomain(domain)) {
    domain = `${label}${++suffix}.${tld}`;
  }
  return domain;
}

/**
 * The normalized domain, or { error } — INVALID_EMAIL_DOMAIN for a bad or
 * reserved (public mailbox / platform) domain, EMAIL_DOMAIN_TAKEN when another
 * organization already owns it. `exceptOrganizationId` lets an org keep its own.
 */
function validateEmailDomain(domain, exceptOrganizationId) {
  const normalized = normalizeDomain(domain);
  if (!isValidDomainFormat(normalized) || isReservedDomain(normalized)) {
    return { error: 'INVALID_EMAIL_DOMAIN' };
  }
  const owner = findByEmailDomain(normalized);
  if (owner && owner.organization_id !== Number(exceptOrganizationId)) {
    return { error: 'EMAIL_DOMAIN_TAKEN' };
  }
  return { domain: normalized };
}

/** Boot-time: orgs saved before email domains existed get a suggested one. */
function backfillEmailDomains() {
  dataStore.organizations.forEach((o) => {
    if (!o.email_domain) o.email_domain = suggestEmailDomain(o.name);
  });
}

function findAll() {
  return dataStore.organizations;
}

function findById(id) {
  const numId = Number(id);
  return dataStore.organizations.find((o) => Number(o.organization_id) === numId) || null;
}

function create(payload) {
  const newOrg = {
    organization_id:
      maxId(dataStore.organizations, 'organization_id', 1) + 1,
    name: payload.name,
    slug: slugify(payload.name),
    // Callers validate a supplied domain first (validateEmailDomain).
    email_domain: payload.email_domain
      ? normalizeDomain(payload.email_domain)
      : suggestEmailDomain(payload.name),
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

/**
 * Moves an organization to a new email domain. Every staff/admin login
 * (everyone but patients, who use personal emails) is renamed from
 * name.tag@old to name.tag@new and signed out so they log in again with the
 * new address. Returns { organization, renamedUsers } or { error }.
 */
function changeEmailDomain(id, newDomain) {
  const org = findById(id);
  if (!org) return { error: 'NOT_FOUND' };
  const checked = validateEmailDomain(newDomain, org.organization_id);
  if (checked.error) return checked;

  const oldDomain = org.email_domain;
  const renamedUsers = [];
  dataStore.users.forEach((u) => {
    if (u.organization_id !== org.organization_id || u.role_id === 2) return;
    const parsed = parseEmail(u.email);
    if (!parsed || parsed.domain !== oldDomain) return;
    const local = String(u.email).trim().split('@')[0];
    u.email = `${local}@${checked.domain}`;
    destroySessionsForUser(u.user_id);
    renamedUsers.push({ user_id: u.user_id, email: u.email });
  });

  update(org.organization_id, { email_domain: checked.domain });
  return { organization: org, previousDomain: oldDomain, renamedUsers };
}

/** Staff/admin logins that a domain change would rename (for the confirm step). */
function staffLoginCount(id) {
  const org = findById(id);
  if (!org) return 0;
  return dataStore.users.filter((u) => {
    if (u.organization_id !== org.organization_id || u.role_id === 2)
      return false;
    const parsed = parseEmail(u.email);
    return Boolean(parsed && parsed.domain === org.email_domain);
  }).length;
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
      maxId(dataStore.hospitals, 'hospital_id') + 1 || 1,
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

// ---- Resource-level entitlements (organizationResources) ----

/**
 * Writes per-resource-type quantities for an org.
 * `resourcesMap` shape: { MODULE_CODE: { RESOURCE_CODE: quantity } }.
 * Only resource types that exist in config/resourceCatalog.js are stored;
 * unknown codes are ignored. The unit price in effect at write time is
 * snapshotted onto the row so later catalog price changes don't re-bill.
 */
function setResourceQuantities(organizationId, resourcesMap) {
  const oid = Number(organizationId);
  if (!Array.isArray(dataStore.organizationResources)) {
    dataStore.organizationResources = [];
  }
  const map = resourcesMap || {};
  Object.keys(map).forEach((rawModule) => {
    const moduleCode = String(rawModule).toUpperCase();
    const defs = resourceCatalog.resourceTypesFor(moduleCode);
    if (!defs.length) return;
    const perModule = map[rawModule] || {};
    defs.forEach((def) => {
      if (!(def.code in perModule)) return;
      const quantity = Math.max(0, Number(perModule[def.code]) || 0);
      const existing = dataStore.organizationResources.find(
        (r) =>
          r.organization_id === oid &&
          r.module_code === moduleCode &&
          r.resource_code === def.code,
      );
      if (existing) {
        existing.quantity = quantity;
        existing.unit_price_at_purchase = def.unit_price;
        existing.updated_at = new Date().toISOString();
      } else {
        dataStore.organizationResources.push({
          organization_id: oid,
          module_code: moduleCode,
          resource_code: def.code,
          quantity,
          unit_price_at_purchase: def.unit_price,
          updated_at: new Date().toISOString(),
        });
      }
    });
  });
  return resourceQuantitiesFor(oid);
}

/** { MODULE_CODE: { RESOURCE_CODE: quantity } } for ALL stored rows (enabled or not). */
function resourceQuantitiesFor(organizationId) {
  const oid = Number(organizationId);
  const out = {};
  (dataStore.organizationResources || [])
    .filter((r) => r.organization_id === oid)
    .forEach((r) => {
      if (!out[r.module_code]) out[r.module_code] = {};
      out[r.module_code][r.resource_code] = Math.max(0, Number(r.quantity) || 0);
    });
  return out;
}

/**
 * Full resource picture for a platform/admin editor: every catalog resource
 * type for every module, with the org's configured quantity (default 0)
 * and current unit price. Shape:
 *   [{ module_code, resource_code, name, unit, unit_price, quantity }]
 */
function resourceCatalogFor(organizationId) {
  const stored = resourceQuantitiesFor(organizationId);
  const out = [];
  resourceCatalog.modulesWithResources().forEach((moduleCode) => {
    resourceCatalog.resourceTypesFor(moduleCode).forEach((def) => {
      out.push({
        module_code: moduleCode,
        resource_code: def.code,
        name: def.name,
        unit: def.unit,
        unit_price: def.unit_price,
        quantity: (stored[moduleCode] && stored[moduleCode][def.code]) || 0,
      });
    });
  });
  return out;
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

  const branchCount = hospitalsFor(oid).length || 1;
  const cost = serviceCatalog.computeCost(
    branchCount,
    resourceQuantitiesFor(oid),
  );

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
          resource_lines: cost.resource_lines || [],
          base_total: cost.base_total,
          resource_total: cost.resource_total,
          instances: cost.instances,
          status: sub.status,
          started_at: sub.started_at,
          renews_at: sub.renews_at,
        }
      : null,
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
      email_domain: o.email_domain || null,
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
  findByEmailDomain,
  suggestEmailDomain,
  validateEmailDomain,
  changeEmailDomain,
  staffLoginCount,
  backfillEmailDomains,
  create,
  update,
  setStatus,
  remove,
  hospitalsFor,
  primaryHospitalFor,
  createHospital,
  setResourceQuantities,
  resourceQuantitiesFor,
  resourceCatalogFor,
  quotasFor,
  usageFor,
  marketplaceListing,
};
