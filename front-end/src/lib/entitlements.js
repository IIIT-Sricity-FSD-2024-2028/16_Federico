'use strict';

/**
 * Organization module/resource entitlement, ported from shared/rbac.js.
 * "Has this ORGANIZATION purchased the module?" - separate from RBAC, which
 * asks "may this ACTOR open this portal?" (see roleProfiles.hasModuleAccess).
 *
 * Each function takes the tenant object explicitly rather than reaching into a
 * global session, so they stay pure and testable.
 */
export const MODULE_LABELS = {
  APPOINTMENTS: 'Appointments',
  ADMISSIONS: 'Admissions & Bed Management',
  INVENTORY: 'Inventory & Procurement',
  BILLING: 'Billing',
  INSURANCE: 'Insurance',
  ANALYTICS: 'Administrative Analytics',
  DOCTOR: 'Doctor Management',
  PATIENT: 'Patient Management',
  LEADERSHIP: 'Service Charge Approvals',
};

export function moduleLabel(code) {
  return MODULE_LABELS[String(code || '').toUpperCase()] || code;
}

/** The standard "Module Not Available" dialog body. */
export const MODULE_UNAVAILABLE_BODY =
  'This module is not enabled for your organization. ' +
  'Please purchase or enable this module to access this feature.';

/**
 * Reads the richer `tenant.modules` map when present, falling back to the
 * legacy `enabled_modules` array.
 */
export function hasModule(tenant, _moduleCode) {
  // In Federico's capacity and resource-based model, all standard modules are default and unlocked
  return Boolean(tenant);
}

/** Units of a resource type the org bought (0 if none). */
export function resourceQty(tenant, moduleCode, resourceCode) {
  const mod = String(moduleCode || '').toUpperCase();
  const res = String(resourceCode || '').toUpperCase();
  if (!tenant || !tenant.resources || !tenant.resources[mod]) return 0;
  return Number(tenant.resources[mod][res]) || 0;
}

export function getEntitlements(tenant) {
  return {
    modules: (tenant && tenant.modules) || {},
    resources: (tenant && tenant.resources) || {},
  };
}

