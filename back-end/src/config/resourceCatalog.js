'use strict';

/**
 * resourceCatalog.js — Module → Resource Types → Price.
 *
 * Extends the flat "module → N instances" revenue model into a generic
 * resource-level one:
 *
 *   Ward (ADMISSIONS)
 *    ├── GENERAL_BEDS      → qty × unit_price
 *    ├── ICU_BEDS          → qty × unit_price
 *    ├── PRIVATE_BEDS      → qty × unit_price
 *    └── SEMI_PRIVATE_BEDS → qty × unit_price
 *
 * The catalog is keyed by the purchasable module code (utils/tenant.js#MODULES)
 * so a module can declare its own resource types without any other module
 * needing to change. A module with no entry here simply has no resource
 * lines — it is billed on its flat base price alone (serviceCatalog.js).
 *
 * `unit_price` is the default ₹/month per unit at purchase time; the actual
 * price an org pays is snapshotted onto `organizationResources` when it is
 * provisioned, so later catalog price changes don't silently re-bill.
 */

const RESOURCE_CATALOG = {
  ADMISSIONS: [
    { code: 'GENERAL_BEDS', name: 'General Ward Beds', unit: 'bed', unit_price: 150, default_qty: 0 },
    { code: 'ICU_BEDS', name: 'ICU Beds', unit: 'bed', unit_price: 600, default_qty: 0 },
    { code: 'PRIVATE_BEDS', name: 'Private Beds', unit: 'bed', unit_price: 400, default_qty: 0 },
    { code: 'SEMI_PRIVATE_BEDS', name: 'Semi-Private Beds', unit: 'bed', unit_price: 250, default_qty: 0 },
  ],
  INVENTORY: [
    { code: 'STORAGE_UNITS', name: 'Storage Units', unit: 'unit', unit_price: 200, default_qty: 0 },
    { code: 'WAREHOUSES', name: 'Warehouses', unit: 'warehouse', unit_price: 1200, default_qty: 0 },
    { code: 'INVENTORY_USERS', name: 'Inventory Users', unit: 'seat', unit_price: 300, default_qty: 0 },
  ],
  BILLING: [
    { code: 'BILLING_USERS', name: 'Billing Users', unit: 'seat', unit_price: 350, default_qty: 0 },
    { code: 'BILLING_TERMINALS', name: 'Billing Terminals', unit: 'terminal', unit_price: 500, default_qty: 0 },
  ],
  DOCTOR: [
    { code: 'DOCTOR_SEATS', name: 'Doctor Directory Seats', unit: 'seat', unit_price: 120, default_qty: 0 },
  ],
  APPOINTMENTS: [
    { code: 'BOOKING_CHANNELS', name: 'Online Booking Channels', unit: 'channel', unit_price: 400, default_qty: 0 },
  ],
};

/** Every module code that declares at least one resource type. */
function modulesWithResources() {
  return Object.keys(RESOURCE_CATALOG);
}

/** Resource-type definitions for a module code (empty array if none). */
function resourceTypesFor(moduleCode) {
  return RESOURCE_CATALOG[String(moduleCode).toUpperCase()] || [];
}

/** One resource-type definition, or null. */
function resourceTypeDef(moduleCode, resourceCode) {
  return (
    resourceTypesFor(moduleCode).find(
      (r) => r.code === String(resourceCode).toUpperCase(),
    ) || null
  );
}

/** Default unit price for a resource type (0 if unknown). */
function unitPriceFor(moduleCode, resourceCode) {
  const def = resourceTypeDef(moduleCode, resourceCode);
  return def ? Number(def.unit_price) || 0 : 0;
}

/**
 * Cost lines for one module's resources.
 * @param {string} moduleCode
 * @param {Object<string,{quantity:number,unit_price_at_purchase?:number}>|Object<string,number>} resources
 * @returns {{ lines: Array, total: number }}
 */
function computeResourceCost(moduleCode, resources) {
  const defs = resourceTypesFor(moduleCode);
  const lines = [];
  defs.forEach((def) => {
    const raw = resources ? resources[def.code] : undefined;
    if (raw === undefined || raw === null) return;
    const quantity =
      typeof raw === 'object' ? Math.max(0, Number(raw.quantity) || 0) : Math.max(0, Number(raw) || 0);
    if (quantity <= 0) return;
    const unit_price =
      typeof raw === 'object' && raw.unit_price_at_purchase !== undefined
        ? Number(raw.unit_price_at_purchase) || 0
        : def.unit_price;
    lines.push({
      module_code: String(moduleCode).toUpperCase(),
      resource_code: def.code,
      name: def.name,
      unit_price,
      quantity,
      amount: unit_price * quantity,
    });
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}

module.exports = {
  RESOURCE_CATALOG,
  modulesWithResources,
  resourceTypesFor,
  resourceTypeDef,
  unitPriceFor,
  computeResourceCost,
};
