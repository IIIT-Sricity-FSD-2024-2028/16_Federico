'use strict';

/**
 * Service & Capacity-based (usage) pricing catalog.
 *
 * Federico operates on a pure capacity and resource-based model:
 * Every organization gets ALL 8 core clinical and operational modules
 * (Appointments, Admissions & Bed Management, Doctor Directory, Patient Portal,
 * Inventory & Procurement, Billing & Ledger, Insurance, Analytics)
 * included by default with zero artificial feature locks.
 *
 * Pricing is structured around:
 *   1. Base Platform License: ₹3,000 / month per hospital branch.
 *   2. Capacity & Resource Quotas (resourceCatalog.js):
 *      - Inpatient Beds (General ₹150, ICU ₹600, Private ₹350, Semi-Private ₹350)
 *      - Staff / User Accounts (₹200/seat)
 *      - Billing Terminals (₹500/terminal)
 *      - Inventory Warehouses (₹1,000/warehouse) & Storage Units (₹200/unit)
 *      - Doctor Directory Seats (₹150/doctor)
 *      - Patient Admissions Volume (₹10/admission)
 *      - Online Booking Channels (₹400/channel)
 */

const BASE_PLATFORM_FEE = 3000;

const SERVICE_NAMES = {
  PLATFORM: 'Base Platform License',
  APPOINTMENTS: 'Appointments',
  ADMISSIONS: 'Admissions & Bed Management',
  INVENTORY: 'Inventory & Procurement',
  BILLING: 'Billing',
  INSURANCE: 'Insurance',
  ANALYTICS: 'Administrative Analytics',
  DOCTOR: 'Doctor Management',
  PATIENT: 'Patient Management',
  LEADERSHIP: 'Service Charge Approvals (Leaders)',
};

const { computeResourceCost, modulesWithResources } = require('./resourceCatalog');

function priceFor(moduleCode) {
  const code = String(moduleCode).toUpperCase();
  if (code === 'PLATFORM' || code === 'PLATFORM_BASE') {
    return BASE_PLATFORM_FEE;
  }
  // All operational modules are included by default (₹0 add-on cost)
  return 0;
}

/**
 * Computes line-item and total monthly subscription charge for an organization.
 *
 * @param {number|Array|Object} branchesOrConfig  Number of hospital branches, or legacy module array/config
 * @param {number|Object} [defaultCountOrResources=1]  Fallback count or resources map
 * @param {Object} [resourcesByModule={}]  { MODULE: { RESOURCE: qty } }
 * @returns {{ lines: Array, resource_lines: Array, total: number, instances: number, base_total: number, resource_total: number }}
 */
function computeCost(branchesOrConfig = 1, defaultCountOrResources = 1, resourcesByModule = {}) {
  let branchCount = 1;
  let resources = {};

  if (typeof branchesOrConfig === 'number') {
    branchCount = Math.max(1, branchesOrConfig);
    resources = typeof defaultCountOrResources === 'object' && defaultCountOrResources !== null
      ? defaultCountOrResources
      : (resourcesByModule || {});
  } else if (typeof branchesOrConfig === 'object' && !Array.isArray(branchesOrConfig) && branchesOrConfig !== null) {
    if (branchesOrConfig.branches !== undefined || branchesOrConfig.branchCount !== undefined) {
      branchCount = Math.max(1, Number(branchesOrConfig.branches || branchesOrConfig.branchCount) || 1);
      resources = branchesOrConfig.resources || {};
    } else {
      branchCount = Math.max(1, Number(defaultCountOrResources) || 1);
      resources = resourcesByModule || {};
    }
  } else if (Array.isArray(branchesOrConfig)) {
    branchCount = Math.max(1, Number(defaultCountOrResources) || 1);
    resources = resourcesByModule || {};
  }

  const lines = [
    {
      code: 'PLATFORM_BASE',
      name: 'Base Platform License (Unlimited Hospital Suite)',
      unit_price: BASE_PLATFORM_FEE,
      instances: branchCount,
      amount: BASE_PLATFORM_FEE * branchCount,
    },
  ];

  const resource_lines = [];
  const catalogModules = modulesWithResources();

  catalogModules.forEach((modCode) => {
    const resMap = resources[modCode] || resources[modCode.toLowerCase()];
    if (resMap) {
      const { lines: rl } = computeResourceCost(modCode, resMap);
      resource_lines.push(...rl);
    }
  });

  const base_total = lines.reduce((sum, l) => sum + l.amount, 0);
  const resource_total = resource_lines.reduce((sum, l) => sum + l.amount, 0);
  const total = base_total + resource_total;
  const instances = branchCount;

  return { lines, resource_lines, total, instances, base_total, resource_total };
}

module.exports = {
  BASE_PLATFORM_FEE,
  SERVICE_NAMES,
  priceFor,
  computeCost,
};
