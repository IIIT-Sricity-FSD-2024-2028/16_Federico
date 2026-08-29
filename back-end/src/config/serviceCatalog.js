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

module.exports = { SERVICE_PRICES, SERVICE_NAMES, priceFor, computeCost };
