'use strict';

/**
 * Layers the Platform Super User + subscription plans + a second demo
 * organization ("Apollo Hospitals") on top of the tenant-baseline-migrated
 * dataStore.js (run `migrate-tenant-baseline.js` first — this script
 * assumes organization_id 1 / hospital_id 1 already exist and are fully
 * stamped). Drives the real service layer directly, same philosophy as
 * `seed-demo-data.js`: every ID sequence and cascade is exactly what the
 * real API would have produced, nothing hand-typed.
 *
 * Run once with `node scripts/seed-multitenant.js`. Re-running it is safe
 * for the plan/permission-catalog/org-1-module-flag steps (idempotent by
 * construction) but will create a SECOND "Apollo Hospitals" organization
 * if run twice — this is a one-time seed script, not a boot-time step.
 *
 * Demo credentials added by this script:
 *   Platform Super User:
 *     platform@federico.com / Federico@Platform123
 *   Apollo Hospitals (organization_id 2) — Insurance module OFF, to prove
 *   feature-flag gating actually differs per organization:
 *     HOM (org admin) admin@apollo.hosp.com   / Apollo@123
 *     PRE             priya.pre@apollo.hosp.com / Apollo@123
 *     FA              rajesh.fa@apollo.hosp.com / Apollo@123
 *     Patient         meera@apollo.hosp.com     / Apollo@123
 *   Dynamic RBAC demo (organization_id 1) — a PRE account with NO fixed
 *   billing access, granted billing:read via a custom "Billing Assistant"
 *   role (proves the dynamic-RBAC OR-branch in actorAccess.js works, not
 *   just the fixed 4-actor table):
 *     PRE  billing.assist@hosp.com / Assist@123
 */

const fs = require('fs');
const path = require('path');

const dataStore = require('../src/store/dataStore');
const organizationService = require('../src/services/organization.service');
const subscriptionPlanService = require('../src/services/subscriptionPlan.service');
const subscriptionService = require('../src/services/subscription.service');
const provisioningService = require('../src/services/provisioning.service');
const platformAuthService = require('../src/services/platformAuth.service');
const rbacService = require('../src/services/rbac.service');
const doctorService = require('../src/services/doctor.service');
const patientService = require('../src/services/patient.service');
const wardService = require('../src/services/ward.service');
const preRequestService = require('../src/services/preRequest.service');
const admissionService = require('../src/services/admission.service');
const billingService = require('../src/services/billing.service');
const { hashPassword } = require('../src/utils/password');
const { MODULE_CODES } = require('../src/utils/tenant');

if (dataStore.organizations.some((o) => o.slug === 'apollo-hospitals')) {
  console.error('Apollo Hospitals already seeded — refusing to run twice. Restore data/db.json-free dataStore.js from git and re-run migrate-tenant-baseline.js first if you need a clean re-seed.');
  process.exit(1);
}

// ---------------------------------------------------------------------
// 1. Subscription plans (tasks.md §19 example tiers).
// ---------------------------------------------------------------------
const starter = subscriptionPlanService.create({
  name: 'Starter',
  max_beds: 25,
  max_users: 15,
  max_hospitals: 1,
  storage_gb: 10,
  api_rate_limit: 60,
  included_modules: ['APPOINTMENTS', 'ADMISSIONS', 'BILLING'],
  price_monthly: 4999,
});
const professional = subscriptionPlanService.create({
  name: 'Professional',
  max_beds: 100,
  max_users: 60,
  max_hospitals: 3,
  storage_gb: 100,
  api_rate_limit: 300,
  included_modules: ['APPOINTMENTS', 'ADMISSIONS', 'INVENTORY', 'BILLING', 'INSURANCE'],
  price_monthly: 14999,
});
subscriptionPlanService.create({
  name: 'Enterprise',
  max_beds: 100000,
  max_users: 100000,
  max_hospitals: 100,
  storage_gb: 5000,
  api_rate_limit: 2000,
  included_modules: MODULE_CODES,
  price_monthly: 49999,
});

// Retroactively subscribe org 1 (Federico General, the pre-existing
// single-tenant baseline) to Professional and enable every module — this
// is what makes the legacy `x-role` contract's implicit "sees everything"
// behavior stay true post-migration (see middleware/tenant.js's
// LEGACY_DEFAULT_ORGANIZATION_ID comment).
subscriptionService.setPlan(1, professional.plan_id);
organizationService.setModuleFlags(1, MODULE_CODES);

// ---------------------------------------------------------------------
// 2. RBAC permission catalog (idempotent).
// ---------------------------------------------------------------------
rbacService.ensurePermissionCatalog();

// ---------------------------------------------------------------------
// 3. Platform Super User.
// ---------------------------------------------------------------------
platformAuthService.create({ name: 'Federico Platform Ops', email: 'platform@federico.com', password: 'Federico@Platform123' });

// ---------------------------------------------------------------------
// 4. Provision a second organization — Apollo Hospitals (tasks.md §4's
//    own worked example), Starter plan, Insurance intentionally OFF.
// ---------------------------------------------------------------------
const apolloResult = provisioningService.provision({
  name: 'Apollo Hospitals',
  contact: { phone: '+91-4400000002', email: 'contact@apollohospitals.example', address: '1 Cardiology Row, Chennai' },
  specialties: ['Cardiology', 'Neurology', 'Oncology'],
  emergency_available: true,
  city: 'Chennai',
  admin_name: 'Apollo Admin',
  admin_email: 'admin@apollo.hosp.com',
  admin_password: 'Apollo@123',
  plan_id: starter.plan_id,
  modules: ['APPOINTMENTS', 'ADMISSIONS', 'BILLING'], // no INVENTORY, no INSURANCE — proves feature flags differ per org
});
const apolloOrgId = apolloResult.organization.organization_id;
const apolloHospitalId = apolloResult.hospital.hospital_id;

// A second branch, matching tasks.md §4's Apollo example (Chennai + Bangalore).
organizationService.createHospital(apolloOrgId, { name: 'Apollo Hospitals — Bangalore', city: 'Bangalore', is_primary: false });

function nextUserId() {
  return dataStore.users.length > 0 ? Math.max(...dataStore.users.map((u) => u.user_id)) + 1 : 101;
}

function createStaffUser({ name, email, password, roleId }) {
  const newUser = {
    user_id: nextUserId(),
    name,
    email,
    password_hash: hashPassword(password),
    role_id: roleId,
    organization_id: apolloOrgId,
    hospital_id: apolloHospitalId,
    created_at: new Date().toISOString(),
  };
  dataStore.users.push(newUser);
  return newUser;
}

createStaffUser({ name: 'Priya Krishnan', email: 'priya.pre@apollo.hosp.com', password: 'Apollo@123', roleId: 4 }); // PRE
createStaffUser({ name: 'Rajesh Iyer', email: 'rajesh.fa@apollo.hosp.com', password: 'Apollo@123', roleId: 3 }); // FA

// ---------------------------------------------------------------------
// 5. A small but real Apollo demo dataset — doctors, wards/beds, a
//    patient with a full intake -> bed allocation -> billing -> discharge
//    journey — via the SAME services seed-demo-data.js uses for org 1,
//    explicitly stamped organization_id/hospital_id 2 on every payload.
// ---------------------------------------------------------------------
const tenant = { organization_id: apolloOrgId, hospital_id: apolloHospitalId };

const apolloDoctors = [
  { name: 'Dr. Lakshmi Menon', specialization: 'Cardiology', phone: '+91-8990001001', email: 'lakshmi.menon@apollo.hosp.com', ...tenant },
  { name: 'Dr. Arvind Nair', specialization: 'Neurology', phone: '+91-8990001002', email: 'arvind.nair@apollo.hosp.com', ...tenant },
  { name: 'Dr. Divya Krishnan', specialization: 'Oncology', phone: '+91-8990001003', email: 'divya.krishnan@apollo.hosp.com', ...tenant },
].map((d) => doctorService.createDoctor(d));

apolloDoctors.forEach((doc, idx) => {
  doctorService.createAvailability({
    doctor_id: doc.doctor_id,
    available_date: '2026-08-20',
    start_time: `${9 + idx * 2}:00:00`,
    end_time: `${11 + idx * 2}:00:00`,
    status: 'Available',
    ...tenant,
  });
});

const apolloWard = wardService.createWard({ ward_name: 'Cardiac Care Unit', total_beds: 8, description: 'Apollo Chennai — Cardiac Care Unit', ...tenant });
const apolloBeds = [];
for (let i = 1; i <= 8; i++) {
  apolloBeds.push(wardService.createBed({ ward_id: apolloWard.ward_id, bed_number: `CCU-${String(i).padStart(2, '0')}`, status: 'AVAILABLE', ...tenant }));
}

const apolloServices = [
  { service_name: 'Bed Charge (CCU)', base_cost: 3500, ...tenant },
  { service_name: 'Cardiac Consultation', base_cost: 1800, ...tenant },
  { service_name: 'ECG', base_cost: 900, ...tenant },
].map((s) => billingService.createService(s));

const apolloPatient = patientService.create({
  name: 'Meera Subramaniam',
  phone: '+91-9944556677',
  dob: '1975-03-14',
  gender: 'Female',
  blood_group: 'B+',
  address: '22 Cardiology Row, Chennai',
  emergency_contact_name: 'Karthik Subramaniam',
  emergency_contact_phone: '+91-9944556678',
  ...tenant,
});
// Login account for the demo patient, mirroring how signup wires user + patient together.
const apolloPatientUser = createStaffUser({ name: apolloPatient.name, email: 'meera@apollo.hosp.com', password: 'Apollo@123', roleId: 2 });
apolloPatientUser.hospital_id = apolloHospitalId;
apolloPatient.user_id = apolloPatientUser.user_id;

const apolloPreRequest = preRequestService.create(
  { patient_id: apolloPatient.patient_id, department: 'Cardiology', doctor_id: apolloDoctors[0].doctor_id, visit_type: 'Admit', ...tenant },
  apolloResult.admin.user_id,
);
preRequestService.transition(apolloPreRequest.pre_request_id, 'APPROVED', 'PRE');
const apolloBedRequest = wardService.createBedRequest(
  { patient_id: apolloPatient.patient_id, pre_request_id: apolloPreRequest.pre_request_id, ward_id: apolloWard.ward_id, priority: 'NORMAL', ...tenant },
  apolloResult.admin.user_id,
);
wardService.updateBedRequest(apolloBedRequest.bed_request_id, { bed_id: apolloBeds[0].bed_id });
preRequestService.transition(apolloPreRequest.pre_request_id, 'ADMITTED', 'HOM', { bed_id: apolloBeds[0].bed_id });
const apolloAdmission = admissionService.create({ patient_id: apolloPatient.patient_id, bed_id: apolloBeds[0].bed_id, status: 'ADMITTED', ...tenant });

const apolloLedger = billingService.createLedger({ admission_id: apolloAdmission.admission_id, status: 'OPEN', ...tenant });
apolloServices.forEach((service) => {
  billingService.addLedgerEntry({ ledger_id: apolloLedger.ledger_id, service_id: service.service_id, quantity: 1, unit_price: service.base_cost, amount: service.base_cost, ...tenant });
});

// ---------------------------------------------------------------------
// 6. Dynamic RBAC demo — a PRE account (org 1) granted billing:read via a
//    custom role, proving actorAccess.js's dynamic-RBAC OR-branch, not
//    just the fixed 4-actor table.
// ---------------------------------------------------------------------
const org1Tenant = { organization_id: 1, hospital_id: 1 };
const billingAssistUser = {
  user_id: nextUserId(),
  name: 'Billing Assist (PRE)',
  email: 'billing.assist@hosp.com',
  password_hash: hashPassword('Assist@123'),
  role_id: 4, // PRE — has no fixed billing access (see actorAccess.js ACTOR_ACCESS.billing)
  ...org1Tenant,
  created_at: new Date().toISOString(),
};
dataStore.users.push(billingAssistUser);

const billingReadPermission = dataStore.permissions.find((p) => p.permission_code === 'billing:read');
const assistantRole = rbacService.createRole(1, { role_name: 'Billing Assistant', description: 'Read-only billing access for front-desk billing questions' });
rbacService.assignPermission(assistantRole.custom_role_id, billingReadPermission.permission_id);
rbacService.assignStaffRole(billingAssistUser.user_id, assistantRole.custom_role_id);

// ---------------------------------------------------------------------
// 7. Write the final store back to disk (same jsBlock writer as
//    migrate-tenant-baseline.js).
// ---------------------------------------------------------------------
function jsBlock(name, value) {
  return `  ${name}: ${JSON.stringify(value, null, 2).split('\n').join('\n  ')},\n`;
}

const originalSource = fs.readFileSync(path.resolve(__dirname, '../src/store/dataStore.js'), 'utf8');
const headerMatch = originalSource.match(/^[\s\S]*?const dataStore = \{\n\n/);
const header = headerMatch ? headerMatch[0] : `'use strict';\n\nconst dataStore = {\n\n`;

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

console.log(`Multi-tenant seed complete. Wrote ${outPath}`);
console.log(`  organizations: ${dataStore.organizations.length}`);
console.log(`  hospitals: ${dataStore.hospitals.length}`);
console.log(`  subscriptionPlans: ${dataStore.subscriptionPlans.length}`);
console.log(`  platformSuperUsers: ${dataStore.platformSuperUsers.length}`);
console.log(`  customRoles: ${dataStore.customRoles.length}, permissions: ${dataStore.permissions.length}`);
console.log(`  Apollo doctors: ${apolloDoctors.length}, wards: 1, beds: ${apolloBeds.length}, admission: ${apolloAdmission.admission_id}`);
