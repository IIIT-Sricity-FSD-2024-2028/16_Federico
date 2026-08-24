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

const DEFAULT_INVENTORY_ITEMS = Object.freeze([
  Object.freeze({ item_name: 'Paracetamol 500mg', category: 'Medicine', stock_quantity: 1000, reorder_level: 200 }),
  Object.freeze({ item_name: 'Amoxicillin 500mg', category: 'Medicine', stock_quantity: 500, reorder_level: 100 }),
  Object.freeze({ item_name: 'IV Normal Saline 500ml', category: 'Consumable', stock_quantity: 300, reorder_level: 60 }),
  Object.freeze({ item_name: 'Surgical Gloves (Box of 100)', category: 'Consumable', stock_quantity: 200, reorder_level: 50 }),
  Object.freeze({ item_name: 'Syringe 5ml', category: 'Consumable', stock_quantity: 500, reorder_level: 100 }),
  Object.freeze({ item_name: 'Gauze Roll', category: 'Consumable', stock_quantity: 300, reorder_level: 75 }),
  Object.freeze({ item_name: 'N95 Mask', category: 'Consumable', stock_quantity: 1000, reorder_level: 200 }),
  Object.freeze({ item_name: 'Digital Thermometer', category: 'Equipment', stock_quantity: 30, reorder_level: 10 }),
  Object.freeze({ item_name: 'Blood Pressure Monitor', category: 'Equipment', stock_quantity: 20, reorder_level: 5 }),
  Object.freeze({ item_name: 'Oxygen Cylinder', category: 'Equipment', stock_quantity: 15, reorder_level: 5 }),
]);

module.exports = { DEFAULT_DEPARTMENTS, DEFAULT_INVENTORY_ITEMS };
