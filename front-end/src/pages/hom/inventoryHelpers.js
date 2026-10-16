'use strict';

/** Shared derivations for the HOM inventory screen, from HOM/inventory.js. */

export const DEFAULT_RESTOCK_QUANTITY = 20;
export const MAX_NOTES_LENGTH = 240;

/** Critical at or below half the reorder level, Low below it, Adequate otherwise. */
export function computeItemStatus(item) {
  if (!item) return { label: 'Unknown', variant: 'neutral' };
  if (item.stock_quantity <= Math.floor(item.reorder_level / 2)) return { label: 'Critical', variant: 'error' };
  if (item.stock_quantity < item.reorder_level) return { label: 'Low Stock', variant: 'warning' };
  return { label: 'Adequate', variant: 'success' };
}

export function serviceForItem(item, services) {
  if (!item || !item.service_id) return null;
  return (services || []).find((s) => s.service_id === item.service_id) || null;
}

/** Unit cost comes from the linked billing service; null means non-billable. */
export function itemCost(item, services) {
  const service = serviceForItem(item, services);
  return service ? Number(service.base_cost || 0) : null;
}

export function findPatientByUhid(uhid, patients) {
  if (!uhid) return null;
  const normalized = String(uhid).trim().toLowerCase();
  return (patients || []).find((p) => String(p.uhid).toLowerCase() === normalized) || null;
}

/**
 * Validation for posting supply usage. Returns the first failing message, or
 * '' when valid. Wording is verbatim from the original.
 */
export function validateUsageDetails({ uhid, itemId, qty }, { patients, items }) {
  if (!uhid) return 'Enter a valid patient UHID before posting supply usage.';
  const patient = findPatientByUhid(uhid, patients);
  if (!patient) return 'Patient with UHID "' + uhid + '" was not found.';
  if (!itemId) return 'Select a supply item from the list.';
  if (!Number.isInteger(qty) || qty < 1) return 'Quantity must be a positive whole number greater than 0.';

  const item = (items || []).find((i) => i.item_id === Number(itemId));
  if (!item) return 'Selected supply item does not exist.';
  if (qty > item.stock_quantity) {
    return (
      'Insufficient stock: only ' + item.stock_quantity + ' unit' +
      (item.stock_quantity === 1 ? '' : 's') + ' of ' + item.item_name + ' currently available.'
    );
  }
  return '';
}

