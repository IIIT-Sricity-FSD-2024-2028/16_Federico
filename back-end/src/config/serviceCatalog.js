'use strict';

/**
 * Service-based (usage) pricing catalog.
 *
 * Federico is NOT billed on fixed Basic/Pro/Enterprise plan tiers. An
 * organization pays only for the individual services (modules) it turns
 * on, multiplied by how many service instances it runs — one instance per
 * hospital branch. So the monthly charge for an org is:
 *
 *   Σ  SERVICE_PRICES[module] × (number of hospital branches)
 *   for every enabled module
 *
 * `subscription.service.js` computes this; `organization.service.js`
 * exposes it as `usage.subscription.price_monthly`; the Platform Super
 * User dashboard aggregates it into MRR / ARR and a per-service revenue
 * breakdown.
 */

// Monthly price per enabled service, per provisioned instance (branch).
const SERVICE_PRICES = {
  APPOINTMENTS: 1500,
  ADMISSIONS: 2500,
  INVENTORY: 2000,
  BILLING: 2500,
  INSURANCE: 1800,
  ANALYTICS: 3000,
};

const SERVICE_NAMES = {
  APPOINTMENTS: 'Appointments',
  ADMISSIONS: 'Admissions & Bed Management',
  INVENTORY: 'Inventory & Procurement',
  BILLING: 'Billing',
  INSURANCE: 'Insurance',
  ANALYTICS: 'Administrative Analytics',
};

function priceFor(moduleCode) {
  return Number(SERVICE_PRICES[String(moduleCode).toUpperCase()]) || 0;
}

/**
 * Line-item + total cost for one organization.
 *
 * `modules` accepts either:
 *   - an array of service codes  -> each billed at `defaultCount` instances
 *   - an object { CODE: count }  -> each billed at its own instance count
 *
 * @param {string[]|Object<string,number>} modules
 * @param {number} [defaultCount=1]  instances to use for the array form / missing counts
 * @returns {{ lines: Array<{code,name,unit_price,instances,amount}>, total: number, instances: number }}
 */
// ---------------------------------------------------------------------------
// Usage-based ("per-hit platform fee") billing — additive layer.
//
// The monthly charge for an org is now:
//
//   PLATFORM_BASE_FEE_PER_BRANCH × branch_count
//   + Σ  billable_hits[module] × HIT_RATES[module]   for METERED_MODULES it has enabled
//   + Σ  SERVICE_PRICES[module] × branch_count       for FLAT_MODULES it has enabled
//
// A "billable hit" is one successfully handled state-changing HTTP request
// (non-GET, response status < 400) to an endpoint owned by that module — see
// src/metering/meter.js. Reads are never billed. ANALYTICS is entitlement-only
// (in neither list) and never billed.
// ---------------------------------------------------------------------------

// Modules billed by usage (per-hit).
const METERED_MODULES = ['APPOINTMENTS', 'ADMISSIONS', 'INVENTORY', 'BILLING'];

// Modules still billed as a flat monthly line, per branch (unchanged behaviour).
const FLAT_MODULES = ['INSURANCE'];

// Rupees per billable hit, per metered module.
const HIT_RATES = {
  APPOINTMENTS: 12,
  ADMISSIONS: 20,
  INVENTORY: 8,
  BILLING: 15,
};

// Free hits per module per month before per-hit billing starts (bill smoothing).
const INCLUDED_HITS = {
  APPOINTMENTS: 0,
  ADMISSIONS: 0,
  INVENTORY: 0,
  BILLING: 0,
};

// Fixed platform fee per provisioned branch, charged regardless of usage.
const PLATFORM_BASE_FEE_PER_BRANCH = 5000;

function hitRateFor(moduleCode) {
  return Number(HIT_RATES[String(moduleCode).toUpperCase()]) || 0;
}

function includedHitsFor(moduleCode) {
  return Number(INCLUDED_HITS[String(moduleCode).toUpperCase()]) || 0;
}

/**
 * Metered usage fee for one organization.
 *
 * @param {Object<string,number>} hitMap  { CODE: billable_hits } — enabled metered modules only
 * @param {{ includedTier?: boolean }} [opts]  includedTier=false ignores INCLUDED_HITS
 * @returns {{ lines: Array<{code,name,billable_hits,included_hits,chargeable_hits,unit_rate,amount}>, total: number }}
 */
function computeUsageFee(hitMap, opts = {}) {
  const useTier = opts.includedTier !== false;
  const lines = Object.keys(hitMap || {}).map((raw) => {
    const code = String(raw).toUpperCase();
    const billable_hits = Math.max(0, Number(hitMap[raw]) || 0);
    const included_hits = useTier ? includedHitsFor(code) : 0;
    const chargeable_hits = Math.max(0, billable_hits - included_hits);
    const unit_rate = hitRateFor(code);
    return {
      code,
      name: SERVICE_NAMES[code] || code,
      billable_hits,
      included_hits,
      chargeable_hits,
      unit_rate,
      amount: chargeable_hits * unit_rate,
    };
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}

/** Flat platform base fee for an org given its branch/instance count. */
function computeBaseFee(branchCount) {
  return Math.max(0, Number(branchCount) || 0) * PLATFORM_BASE_FEE_PER_BRANCH;
}

function computeCost(modules, defaultCount = 1) {
  const fallback = Math.max(1, Number(defaultCount) || 1);

  let entries;
  if (Array.isArray(modules)) {
    entries = modules.map((code) => [String(code).toUpperCase(), fallback]);
  } else {
    entries = Object.keys(modules || {}).map((code) => [
      String(code).toUpperCase(),
      Math.max(1, Number(modules[code]) || fallback),
    ]);
  }

  const lines = entries.map(([code, instances]) => {
    const unit_price = priceFor(code);
    return {
      code,
      name: SERVICE_NAMES[code] || code,
      unit_price,
      instances,
      amount: unit_price * instances,
    };
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const instances = lines.reduce((sum, l) => sum + l.instances, 0);
  return { lines, total, instances };
}

module.exports = {
  SERVICE_PRICES,
  SERVICE_NAMES,
  priceFor,
  computeCost,
  METERED_MODULES,
  FLAT_MODULES,
  HIT_RATES,
  INCLUDED_HITS,
  PLATFORM_BASE_FEE_PER_BRANCH,
  hitRateFor,
  includedHitsFor,
  computeUsageFee,
  computeBaseFee,
};
