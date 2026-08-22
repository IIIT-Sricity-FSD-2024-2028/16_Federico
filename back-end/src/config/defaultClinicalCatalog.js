'use strict';

/**
 * The standard department/ward and inventory baseline every newly
 * provisioned hospital starts with (Admin can add/remove from here
 * afterwards — see wardAdmin/inventoryCatalog in middleware/actorAccess.js).
 * Previously a brand-new tenant got zero wards, zero departments and zero
 * inventory (provisioning.service.js never seeded any), so every org's
 * data shape was whatever got typed in by hand.
 *
 * Mirrors front-end/shared/constants.js's DEFAULT_DEPARTMENTS — the two
 * runtimes share no package, so this is deliberately the backend's single
 * copy of the same list (down from the 3 independent, disagreeing
 * department lists that existed across the frontend before this fix).
 * Keep both files in sync if this list changes.
 */
const DEFAULT_DEPARTMENTS = [
  { department: 'Critical Care', wardName: 'ICU', defaultBeds: 8 },
  { department: 'General Medicine', wardName: 'General Ward', defaultBeds: 20 },
  { department: 'Surgery', wardName: 'Surgical Ward', defaultBeds: 12 },
  { department: 'Pediatrics', wardName: 'Pediatric Ward', defaultBeds: 10 },
  { department: 'Emergency', wardName: 'Emergency Ward', defaultBeds: 8 },
  { department: 'Obstetrics', wardName: 'Maternity Ward', defaultBeds: 10 },
];

const DEFAULT_INVENTORY_ITEMS = [
  { item_name: 'Paracetamol 500mg', category: 'Medication', stock_quantity: 1000, reorder_level: 200 },
  { item_name: 'Amoxicillin 500mg', category: 'Medication', stock_quantity: 500, reorder_level: 100 },
  { item_name: 'IV Normal Saline 500ml', category: 'Consumable', stock_quantity: 300, reorder_level: 60 },
  { item_name: 'Surgical Gloves (Box of 100)', category: 'Consumable', stock_quantity: 200, reorder_level: 50 },
  { item_name: 'Syringe 5ml', category: 'Consumable', stock_quantity: 500, reorder_level: 100 },
  { item_name: 'Gauze Roll', category: 'Consumable', stock_quantity: 300, reorder_level: 75 },
  { item_name: 'N95 Mask', category: 'Consumable', stock_quantity: 1000, reorder_level: 200 },
  { item_name: 'Digital Thermometer', category: 'Equipment', stock_quantity: 30, reorder_level: 10 },
  { item_name: 'Blood Pressure Monitor', category: 'Equipment', stock_quantity: 20, reorder_level: 5 },
  { item_name: 'Oxygen Cylinder', category: 'Equipment', stock_quantity: 15, reorder_level: 5 },
];

module.exports = { DEFAULT_DEPARTMENTS, DEFAULT_INVENTORY_ITEMS };
