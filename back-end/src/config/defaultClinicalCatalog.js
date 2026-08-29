'use strict';

/**
 * defaultClinicalCatalog.js
 *
 * The standard department/ward and inventory baseline every newly
 * provisioned hospital starts with (Admin can add/remove from here
 * afterwards — see wardAdmin/inventoryCatalog in middleware/actorAccess.js).
 *
 * Mirrors front-end/shared/constants.js's DEFAULT_DEPARTMENTS — the two
 * runtimes share no package, so this is deliberately the backend's single
 * copy of the same list.
 */
const DEFAULT_DEPARTMENTS = Object.freeze([
  Object.freeze({ department: 'Critical Care', wardName: 'ICU', defaultBeds: 8 }),
  Object.freeze({ department: 'General Medicine', wardName: 'General Ward', defaultBeds: 20 }),
  Object.freeze({ department: 'Surgery', wardName: 'Surgical Ward', defaultBeds: 12 }),
  Object.freeze({ department: 'Pediatrics', wardName: 'Pediatric Ward', defaultBeds: 10 }),
  Object.freeze({ department: 'Emergency', wardName: 'Emergency Ward', defaultBeds: 8 }),
  Object.freeze({ department: 'Obstetrics', wardName: 'Maternity Ward', defaultBeds: 10 }),
]);

/**
 * Standard billable services (clinical service charge catalog) every newly
 * provisioned hospital starts with, so FA/HOM have real services to post
 * charges against from day one — not just "Consultation Fee". Admin can add
 * or edit these afterwards. `base_cost` is the default unit price in ₹.
 */
const DEFAULT_SERVICES = Object.freeze([
  Object.freeze({ service_name: 'Consultation Fee', category: 'Consultation', base_cost: 500 }),
  Object.freeze({ service_name: 'Room Rent (per day)', category: 'Accommodation', base_cost: 3000 }),
  Object.freeze({ service_name: 'ICU Charges (per day)', category: 'Accommodation', base_cost: 9500 }),
  Object.freeze({ service_name: 'Nursing Care (per day)', category: 'Nursing', base_cost: 1200 }),
  Object.freeze({ service_name: 'Pharmacy / Medicines', category: 'Pharmacy', base_cost: 300 }),
  Object.freeze({ service_name: 'IV Fluids & Infusion', category: 'Pharmacy', base_cost: 300 }),
  Object.freeze({ service_name: 'Surgical Consumables', category: 'Consumables', base_cost: 400 }),
  Object.freeze({ service_name: 'Oxygen Supply (per hour)', category: 'Consumables', base_cost: 250 }),
  Object.freeze({ service_name: 'Dressing / Wound Care', category: 'Procedure', base_cost: 350 }),
  Object.freeze({ service_name: 'Minor Procedure', category: 'Procedure', base_cost: 1500 }),
  Object.freeze({ service_name: 'Blood Test / Pathology', category: 'Diagnostics', base_cost: 400 }),
  Object.freeze({ service_name: 'X-Ray', category: 'Diagnostics', base_cost: 1500 }),
  Object.freeze({ service_name: 'CT Scan', category: 'Diagnostics', base_cost: 6000 }),
  Object.freeze({ service_name: 'MRI Scan', category: 'Diagnostics', base_cost: 12000 }),
  Object.freeze({ service_name: 'ECG', category: 'Diagnostics', base_cost: 900 }),
  Object.freeze({ service_name: 'Ultrasound', category: 'Diagnostics', base_cost: 1800 }),
  Object.freeze({ service_name: 'Physiotherapy Session', category: 'Therapy', base_cost: 900 }),
  Object.freeze({ service_name: 'Dialysis Session', category: 'Therapy', base_cost: 8000 }),
  Object.freeze({ service_name: 'Ambulance Service', category: 'Transport', base_cost: 2000 }),
]);

/**
 * `billable_service` links a consumable item to the service it should be
 * charged under, so HOM's "log supply usage" posts a charge with the
 * correct service name. Items with no `billable_service` are stock-only
 * (equipment / linen — not billed per patient).
 */
const DEFAULT_INVENTORY_ITEMS = Object.freeze([
  Object.freeze({ item_name: 'Paracetamol 500mg', category: 'Medicine', stock_quantity: 1000, reorder_level: 200, billable_service: 'Pharmacy / Medicines' }),
  Object.freeze({ item_name: 'Amoxicillin 500mg', category: 'Medicine', stock_quantity: 500, reorder_level: 100, billable_service: 'Pharmacy / Medicines' }),
  Object.freeze({ item_name: 'Insulin Vial', category: 'Medicine', stock_quantity: 150, reorder_level: 40, billable_service: 'Pharmacy / Medicines' }),
  Object.freeze({ item_name: 'IV Normal Saline 500ml', category: 'Consumable', stock_quantity: 300, reorder_level: 60, billable_service: 'IV Fluids & Infusion' }),
  Object.freeze({ item_name: 'IV Cannula Set', category: 'Consumable', stock_quantity: 250, reorder_level: 60, billable_service: 'IV Fluids & Infusion' }),
  Object.freeze({ item_name: 'Surgical Gloves (Box of 100)', category: 'Consumable', stock_quantity: 200, reorder_level: 50, billable_service: 'Surgical Consumables' }),
  Object.freeze({ item_name: 'Syringe 5ml', category: 'Consumable', stock_quantity: 500, reorder_level: 100, billable_service: 'Surgical Consumables' }),
  Object.freeze({ item_name: 'Catheter Set', category: 'Consumable', stock_quantity: 120, reorder_level: 40, billable_service: 'Surgical Consumables' }),
  Object.freeze({ item_name: 'Gauze Roll', category: 'Consumable', stock_quantity: 300, reorder_level: 75, billable_service: 'Dressing / Wound Care' }),
  Object.freeze({ item_name: 'N95 Mask', category: 'Consumable', stock_quantity: 1000, reorder_level: 200, billable_service: 'Surgical Consumables' }),
  Object.freeze({ item_name: 'Oxygen Mask', category: 'Consumable', stock_quantity: 200, reorder_level: 50, billable_service: 'Oxygen Supply (per hour)' }),
  Object.freeze({ item_name: 'Digital Thermometer', category: 'Equipment', stock_quantity: 30, reorder_level: 10 }),
  Object.freeze({ item_name: 'Blood Pressure Monitor', category: 'Equipment', stock_quantity: 20, reorder_level: 5 }),
  Object.freeze({ item_name: 'Oxygen Cylinder', category: 'Equipment', stock_quantity: 15, reorder_level: 5 }),
]);

module.exports = { DEFAULT_DEPARTMENTS, DEFAULT_SERVICES, DEFAULT_INVENTORY_ITEMS };
