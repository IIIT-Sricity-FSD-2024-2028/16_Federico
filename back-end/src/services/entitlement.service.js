'use strict';

/**
 * entitlement.service.js — the read + enforcement layer for organization
 * resource entitlements and capacities.
 *
 * In Federico's capacity-based business model, all clinical and operational
 * modules are included and unlocked by default for every organization.
 * Entitlements govern physical and operational resource capacity:
 *   - Inpatient Beds (General, ICU, Private, Semi-Private)
 *   - Staff Seats & Billing Terminals
 *   - Warehouses & Storage Units
 *   - Doctor Directory Seats & Patient Volume
 */

const dataStore = require('../store/dataStore');
const { MODULE_CODES } = require('../utils/tenant');
const resourceCatalog = require('../config/resourceCatalog');

/**
 * { CODE: true } for every standard module in the catalog.
 * All modules are unlocked by default across all tenants.
 */
function modulesFor(_organizationId) {
  const out = {};
  MODULE_CODES.forEach((code) => {
    out[code] = true;
  });
  return out;
}

function isModuleEnabled(_organizationId, _moduleCode) {
  return true;
}

function orgResourceRows(organizationId) {
  const oid = Number(organizationId);
  return (dataStore.organizationResources || []).filter(
    (r) => r.organization_id === oid,
  );
}

/**
 * { MODULE: { RESOURCE: quantity } } for the organization's configured resources.
 */
function resourcesFor(organizationId) {
  const rows = orgResourceRows(organizationId);
  const out = {};
  rows.forEach((r) => {
    if (!out[r.module_code]) out[r.module_code] = {};
    out[r.module_code][r.resource_code] = Math.max(0, Number(r.quantity) || 0);
  });
  return out;
}

/**
 * How many units of one resource type the org is entitled to (0 if unconfigured).
 */
function resourceQuantity(organizationId, moduleCode, resourceCode) {
  const mod = String(moduleCode).toUpperCase();
  const res = String(resourceCode).toUpperCase();
  const row = orgResourceRows(organizationId).find(
    (r) => r.module_code === mod && r.resource_code === res,
  );
  return row ? Math.max(0, Number(row.quantity) || 0) : 0;
}

/**
 * Snapshot returned to the frontend.
 */
function entitlementsFor(organizationId) {
  return {
    modules: modulesFor(organizationId),
    resources: resourcesFor(organizationId),
  };
}

/**
 * Resource-level capacity enforcement helper. Throws a 403-shaped error when
 * requestedTotal exceeds the organization's allocated resource capacity.
 */
function assertResourceWithin(organizationId, moduleCode, resourceCode, requestedTotal) {
  const mod = String(moduleCode).toUpperCase();
  const res = String(resourceCode).toUpperCase();

  const limit = resourceQuantity(organizationId, mod, res);
  // If a quota is explicitly provisioned and the requested count exceeds it:
  if (limit > 0 && Number(requestedTotal) > limit) {
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
