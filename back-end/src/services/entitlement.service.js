'use strict';

/**
 * entitlement.service.js — the read + enforcement layer for organization
 * module + resource entitlements. Sits beside (not instead of) RBAC:
 *
 *   Module Entitlement : "did this ORGANIZATION buy the module?"
 *   Resource Entitlement: "how many ICU beds / billing seats did it buy?"
 *
 * RBAC ("may this USER's role act here?") stays in middleware/actorAccess.js.
 *
 * Backend is the source of truth: middleware/tenant.js#requireModule reads
 * the same organizationModules rows this service exposes, so the frontend
 * entitlement snapshot and the 403 gate can never drift apart.
 */

const dataStore = require('../store/dataStore');
const { MODULE_CODES } = require('../utils/tenant');
const resourceCatalog = require('../config/resourceCatalog');

function orgModuleRows(organizationId) {
  const oid = Number(organizationId);
  return dataStore.organizationModules.filter((m) => m.organization_id === oid);
}

/** { CODE: true|false } for EVERY module in the catalog (missing row = false). */
function modulesFor(organizationId) {
  const rows = orgModuleRows(organizationId);
  const out = {};
  MODULE_CODES.forEach((code) => {
    const row = rows.find((r) => r.module_code === code);
    out[code] = Boolean(row && row.enabled === true);
  });
  return out;
}

function isModuleEnabled(organizationId, moduleCode) {
  return Boolean(modulesFor(organizationId)[String(moduleCode).toUpperCase()]);
}

function orgResourceRows(organizationId) {
  const oid = Number(organizationId);
  return (dataStore.organizationResources || []).filter(
    (r) => r.organization_id === oid,
  );
}

/**
 * { MODULE: { RESOURCE: quantity } } for the org's ENABLED modules only.
 * Resource types the org never configured are omitted (not zero-filled) —
 * callers that want the full catalog shape use resourceCatalog directly.
 */
function resourcesFor(organizationId) {
  const enabled = modulesFor(organizationId);
  const rows = orgResourceRows(organizationId);
  const out = {};
  rows.forEach((r) => {
    if (!enabled[r.module_code]) return;
    if (!out[r.module_code]) out[r.module_code] = {};
    out[r.module_code][r.resource_code] = Math.max(0, Number(r.quantity) || 0);
  });
  return out;
}

/** How many units of one resource type the org is entitled to (0 if none / module off). */
function resourceQuantity(organizationId, moduleCode, resourceCode) {
  const mod = String(moduleCode).toUpperCase();
  const res = String(resourceCode).toUpperCase();
  if (!isModuleEnabled(organizationId, mod)) return 0;
  const row = orgResourceRows(organizationId).find(
    (r) => r.module_code === mod && r.resource_code === res,
  );
  return row ? Math.max(0, Number(row.quantity) || 0) : 0;
}

/**
 * The full snapshot the frontend needs to make the existing UI dynamic
 * without any extra round-trip. Shape intentionally matches tasks.md §9:
 *   { modules: { CODE: bool }, resources: { MODULE: { RES: qty } } }
 */
function entitlementsFor(organizationId) {
  return {
    modules: modulesFor(organizationId),
    resources: resourcesFor(organizationId),
  };
}

/**
 * Resource-level enforcement helper. Throws a 403-shaped error when
 * `requestedTotal` units of `resourceCode` would exceed what the org
 * bought. `requestedTotal` is the TOTAL after the pending change (caller
 * computes current usage + delta). A resource type the org configured with
 * quantity 0, or never configured, is treated as "not entitled".
 *
 * Deliberately opt-in per call site — nothing forces every create path
 * through it yet (tasks.md §11: don't over-engineer runtime enforcement),
 * but the check is here and consistent for the paths that want it.
 */
function assertResourceWithin(organizationId, moduleCode, resourceCode, requestedTotal) {
  const mod = String(moduleCode).toUpperCase();
  const res = String(resourceCode).toUpperCase();

  if (!isModuleEnabled(organizationId, mod)) {
    const err = new Error(`The ${mod} module is not enabled for your organization`);
    err.statusCode = 403;
    err.error = 'Forbidden';
    throw err;
  }

  const limit = resourceQuantity(organizationId, mod, res);
  if (Number(requestedTotal) > limit) {
    const def = resourceCatalog.resourceTypeDef(mod, res);
    const label = def ? def.name : res;
    const err = new Error(
      `Resource limit reached: your organization is entitled to ${limit} ${label} (requested ${requestedTotal}). Purchase more to continue.`,
    );
    err.statusCode = 403;
    err.error = 'Forbidden';
    err.details = { module_code: mod, resource_code: res, limit, requested: Number(requestedTotal) };
    throw err;
  }
  return true;
}

module.exports = {
  modulesFor,
  isModuleEnabled,
  resourcesFor,
  resourceQuantity,
  entitlementsFor,
  assertResourceWithin,
};
