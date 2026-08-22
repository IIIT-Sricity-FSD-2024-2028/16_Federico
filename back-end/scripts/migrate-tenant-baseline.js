'use strict';

/**
 * One-time migration: stamps `organization_id`/`hospital_id: 1` onto every
 * existing record (the single tenant this app had before multi-tenancy —
 * "Federico General Hospital"), and adds the new empty tenant-layer tables.
 * Run once with `node scripts/migrate-tenant-baseline.js`, then
 * `scripts/seed-multitenant.js` layers the Platform Super User + plans +
 * a second demo organization on top via the real new services (same
 * "drive through real services, don't hand-author JSON" philosophy as
 * `seed-demo-data.js`). Do not re-run this script after seed-multitenant
 * has run — it would re-stamp org 1 over records that may by then belong
 * to other organizations.
 */

const fs = require('fs');
const path = require('path');
const dataStore = require('../src/store/dataStore');

const ORG_ID = 1;
const HOSPITAL_ID = 1;

const TENANT_KEYS = [
  'users',
  'patients',
  'patientInsurances',
  'doctors',
  'doctorAvailabilities',
  'appointments',
  'wards',
  'beds',
  'admissions',
  'dischargeSummaries',
  'services',
  'ledgers',
  'ledgerEntries',
  'payments',
  'inventoryItems',
  'purchaseRequests',
  'preRequests',
  'bedRequests',
  'emergencyNotifications',
  'receipts',
  'activityLog',
];

TENANT_KEYS.forEach((key) => {
  (dataStore[key] || []).forEach((record) => {
    record.organization_id = ORG_ID;
    record.hospital_id = HOSPITAL_ID;
  });
});

dataStore.organizations = [
  {
    organization_id: ORG_ID,
    name: 'Federico General Hospital',
    slug: 'federico-general',
    status: 'ACTIVE',
    branding: { initial: 'F', primary_color: '#6750A4' },
    contact: { phone: '+91-4000000001', email: 'contact@federicogeneral.hosp.com', address: '1 Federico Way, Hyderabad' },
    specialties: ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency Medicine'],
    emergency_available: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

dataStore.hospitals = [
  {
    hospital_id: HOSPITAL_ID,
    organization_id: ORG_ID,
    name: 'Federico General — Main Campus',
    city: 'Hyderabad',
    address: '1 Federico Way, Hyderabad',
    phone: '+91-4000000001',
    is_primary: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// New tenant-layer tables — populated by seed-multitenant.js via the real
// services (subscriptions, feature flags, RBAC catalog, provisioning log,
// etc.), not hand-authored here.
dataStore.subscriptionPlans = [];
dataStore.subscriptions = [];
dataStore.organizationModules = [];
dataStore.resourceQuotas = [];
dataStore.apiKeys = [];
dataStore.customRoles = [];
dataStore.permissions = [];
dataStore.rolePermissions = [];
dataStore.staffRoleAssignments = [];
dataStore.platformSuperUsers = [];
dataStore.provisioningLog = [];
dataStore.platformActivityLog = [];

// ---------------------------------------------------------------------
// Write back to dataStore.js — same header/jsBlock format as
// seed-demo-data.js, extended with the new sections.
// ---------------------------------------------------------------------
function jsBlock(name, value) {
  return `  ${name}: ${JSON.stringify(value, null, 2).split('\n').join('\n  ')},\n`;
}

const header = `'use strict';

/**
 * In-memory data store — direct port of the NestJS `+'`'+`DataService`+'`'+`, extended
 * with a realistic demo dataset and, from the multi-tenancy phase onward,
 * a full Organization/Platform layer. A `+'`'+`require()`+'`'+`'d module is cached by
 * Node, so every file that requires this module shares the same object
 * reference (equivalent to the `+'`'+`@Global() @Injectable()`+'`'+` singleton it
 * replaces).
 *
 * The original demo dataset (patients, doctors, wards/beds, appointments,
 * every patient's pre-request/admission/billing lifecycle) was generated
 * by scripts/seed-demo-data.js. All of it belongs to organization_id 1,
 * "Federico General Hospital" — stamped by scripts/migrate-tenant-baseline.js
 * — so every pre-multi-tenancy demo credential below still works exactly
 * as before. A second demo organization ("Apollo Hospitals",
 * organization_id 2) plus the Platform Super User account were added by
 * scripts/seed-multitenant.js. Do not hand-edit the generated sections
 * below — re-run the relevant script instead.
 *
 * Demo credentials:
 *   Federico General Hospital (organization_id 1):
 *     HOM     admin@hosp.com      / Hom@123
 *     PRE     rekha.pre@hosp.com  / Pre@123
 *     FA      farah.fa@hosp.com   / Fa@123
 *     Patient hamiz@hosp.com      / Hamiz@123
 *     Patient salma@hosp.com      / Salma@123
 *     Patient john@hosp.com       / John@123
 *   (see scripts/seed-multitenant.js's own header comment for Apollo
 *   Hospitals' and the Platform Super User's demo credentials)
 */
const dataStore = {
  stateVersion: '4.0.0',

`;

const sections = [
  ['roles', dataStore.roles],
  ['users', dataStore.users],
  ['patients', dataStore.patients],
  ['patientInsurances', dataStore.patientInsurances],
  ['patientInsuranceDocuments', dataStore.patientInsuranceDocuments],
  ['doctors', dataStore.doctors],
  ['doctorAvailabilities', dataStore.doctorAvailabilities],
  ['appointments', dataStore.appointments],
  ['wards', dataStore.wards],
  ['beds', dataStore.beds],
  ['admissions', dataStore.admissions],
  ['dischargeSummaries', dataStore.dischargeSummaries],
  ['services', dataStore.services],
  ['ledgers', dataStore.ledgers],
  ['ledgerEntries', dataStore.ledgerEntries],
  ['insurances', dataStore.insurances],
  ['payments', dataStore.payments],
  ['inventoryItems', dataStore.inventoryItems],
  ['purchaseRequests', dataStore.purchaseRequests],
  ['preRequests', dataStore.preRequests],
  ['bedRequests', dataStore.bedRequests],
  ['emergencyNotifications', dataStore.emergencyNotifications],
  ['receipts', dataStore.receipts],
  ['activityLog', dataStore.activityLog],
  ['organizations', dataStore.organizations],
  ['hospitals', dataStore.hospitals],
  ['subscriptionPlans', dataStore.subscriptionPlans],
  ['subscriptions', dataStore.subscriptions],
  ['organizationModules', dataStore.organizationModules],
  ['resourceQuotas', dataStore.resourceQuotas],
  ['apiKeys', dataStore.apiKeys],
  ['customRoles', dataStore.customRoles],
  ['permissions', dataStore.permissions],
  ['rolePermissions', dataStore.rolePermissions],
  ['staffRoleAssignments', dataStore.staffRoleAssignments],
  ['platformSuperUsers', dataStore.platformSuperUsers],
  ['provisioningLog', dataStore.provisioningLog],
  ['platformActivityLog', dataStore.platformActivityLog],
];

let body = header;
sections.forEach(([name, value]) => {
  body += jsBlock(name, value);
});
body += `};\n\nmodule.exports = dataStore;\n`;

const outPath = path.resolve(__dirname, '../src/store/dataStore.js');
fs.writeFileSync(outPath, body);

console.log(`Tenant baseline migration complete. Wrote ${outPath}`);
console.log(`  organizations: ${dataStore.organizations.length}, hospitals: ${dataStore.hospitals.length}`);
TENANT_KEYS.forEach((key) => console.log(`  ${key}: ${dataStore[key].length} (stamped org=${ORG_ID})`));
