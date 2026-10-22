'use strict';

/**
 * Challenger 1: Empirical Relational Integrity, Foreign Keys, Multi-Tenant Isolation & Storage Parity
 * Milestone M4 Verification Gate
 *
 * Ground Truth: Database/Federico_Schemas.md
 * Targets Tested Independently:
 * - Persistent Seed Store: back-end/data/db.json
 * - In-Memory Store:       back-end/src/store/dataStore.js
 */

const fs = require('fs');
const path = require('path');

const DB_JSON_PATH = path.resolve(__dirname, '../data/db.json');
const DATASTORE_JS_PATH = path.resolve(__dirname, '../src/store/dataStore.js');

const EXPECTED_37_COLLECTIONS = [
  'activityLog',
  'admissions',
  'apiKeys',
  'appointments',
  'bedRequests',
  'beds',
  'customRoles',
  'dischargeSummaries',
  'doctorAvailabilities',
  'doctors',
  'emergencyNotifications',
  'hospitals',
  'inventoryItems',
  'leaders',
  'ledgerEntries',
  'ledgers',
  'organizationResources',
  'organizations',
  'patientInsurances',
  'patients',
  'payments',
  'permissions',
  'platformActivityLog',
  'platformSuperUsers',
  'preRequests',
  'provisioningLog',
  'purchaseRequests',
  'receipts',
  'resourceQuotas',
  'rolePermissions',
  'roles',
  'services',
  'staffRoleAssignments',
  'subscriptionPlans',
  'subscriptions',
  'users',
  'wards',
].sort();

function loadStores() {
  if (!fs.existsSync(DB_JSON_PATH)) {
    throw new Error(`db.json not found at ${DB_JSON_PATH}`);
  }
  if (!fs.existsSync(DATASTORE_JS_PATH)) {
    throw new Error(`dataStore.js not found at ${DATASTORE_JS_PATH}`);
  }

  const dbContent = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
  delete require.cache[require.resolve(DATASTORE_JS_PATH)];
  const dataStoreContent = require(DATASTORE_JS_PATH);

  return { dbContent, dataStoreContent };
}

class RelationalIntegrityAuditor {
  constructor(name, data) {
    this.name = name;
    this.data = data;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.categoryCounts = {};
  }

  assert(condition, category, testName, context = {}) {
    if (!this.categoryCounts[category]) {
      this.categoryCounts[category] = { passed: 0, failed: 0 };
    }

    if (condition) {
      this.passed++;
      this.categoryCounts[category].passed++;
    } else {
      this.failed++;
      this.categoryCounts[category].failed++;
      const failureObj = { status: 'FAIL', category, testName, context };
      this.failures.push(failureObj);
      console.error(`  ❌ [FAIL] [${category}] ${testName}`, JSON.stringify(context, null, 2));
    }
  }

  runAll() {
    console.log(`\n======================================================================`);
    console.log(`Running Verification Suite: [${this.name}]`);
    console.log(`======================================================================\n`);

    this.verifyCollectionStructure();
    this.verifyPrimaryKeysAndUniqueness();
    this.verifyForeignKeysAcrossAllCollections();
    this.verifyZeroOrphanedRecords();
    this.verifyMultiTenantIsolation();
    this.verifyMultiHospitalCampusScoping();
    this.verifyFinancialAndClinicalInvariants();

    console.log(`\nSuite [${this.name}] Breakdown by Category:`);
    for (const [cat, counts] of Object.entries(this.categoryCounts)) {
      console.log(`  - ${cat.padEnd(32)}: Passed ${String(counts.passed).padStart(5)}, Failed ${String(counts.failed).padStart(2)}`);
    }

    console.log(`\nSuite [${this.name}] Execution Summary:`);
    console.log(`  Total Invariant Checks: ${this.passed + this.failed}`);
    console.log(`  Passed Checks:          ${this.passed}`);
    console.log(`  Failed Checks:          ${this.failed}`);

    if (this.failed > 0) {
      console.error(`  FAILURES ENCOUNTERED (${this.failed} checks failed)`);
    } else {
      console.log(`  ALL CHECKS PASSED (100% Correctness Confirmed)`);
    }

    return this.failed === 0;
  }

  // -------------------------------------------------------------------------
  // 1. Collection Structure & Schema Conformance
  // -------------------------------------------------------------------------
  verifyCollectionStructure() {
    const keys = Object.keys(this.data).sort();
    this.assert(
      JSON.stringify(keys) === JSON.stringify(EXPECTED_37_COLLECTIONS),
      'Collection Structure',
      'Target contains exactly the expected 37 collections',
      { actualCount: keys.length, expectedCount: EXPECTED_37_COLLECTIONS.length }
    );

    for (const col of EXPECTED_37_COLLECTIONS) {
      this.assert(
        Array.isArray(this.data[col]),
        'Collection Structure',
        `Collection '${col}' is an Array`,
        { type: typeof this.data[col] }
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Primary Keys & Unique Constraints
  // -------------------------------------------------------------------------
  verifyPrimaryKeysAndUniqueness() {
    const d = this.data;

    // Single-key primary key tables
    const pkSpecs = [
      { col: 'organizations', pk: 'organization_id' },
      { col: 'hospitals', pk: 'hospital_id' },
      { col: 'roles', pk: 'role_id' },
      { col: 'users', pk: 'user_id' },
      { col: 'customRoles', pk: 'custom_role_id' },
      { col: 'permissions', pk: 'permission_id' },
      { col: 'platformSuperUsers', pk: 'platform_user_id' },
      { col: 'patients', pk: 'patient_id' },
      { col: 'patientInsurances', pk: 'insurance_id' },
      { col: 'doctors', pk: 'doctor_id' },
      { col: 'doctorAvailabilities', pk: 'availability_id' },
      { col: 'appointments', pk: 'appointment_id' },
      { col: 'wards', pk: 'ward_id' },
      { col: 'beds', pk: 'bed_id' },
      { col: 'admissions', pk: 'admission_id' },
      { col: 'dischargeSummaries', pk: 'summary_id' },
      { col: 'services', pk: 'service_id' },
      { col: 'ledgers', pk: 'ledger_id' },
      { col: 'payments', pk: 'payment_id' },
      { col: 'receipts', pk: 'receipt_id' },
      { col: 'leaders', pk: 'leader_id' },
      { col: 'inventoryItems', pk: 'item_id' },
      { col: 'purchaseRequests', pk: 'request_id' },
      { col: 'preRequests', pk: 'pre_request_id' },
      { col: 'bedRequests', pk: 'bed_request_id' },
      { col: 'emergencyNotifications', pk: 'emergency_id' },
      { col: 'subscriptionPlans', pk: 'plan_id' },
      { col: 'subscriptions', pk: 'subscription_id' },
      { col: 'resourceQuotas', pk: 'organization_id' },
      { col: 'apiKeys', pk: 'api_key_id' },
      { col: 'activityLog', pk: 'id' },
      { col: 'provisioningLog', pk: 'id' },
      { col: 'platformActivityLog', pk: 'id' },
    ];

    for (const spec of pkSpecs) {
      const rows = d[spec.col];
      const ids = rows.map((r) => r[spec.pk]);
      const uniqueIds = new Set(ids);

      this.assert(
        uniqueIds.size === ids.length,
        'Primary Key Uniqueness',
        `Collection '${spec.col}' PK '${spec.pk}' is strictly unique`,
        { total: ids.length, unique: uniqueIds.size }
      );

      // Verify each PK is a valid positive integer
      for (const row of rows) {
        const val = row[spec.pk];
        this.assert(
          typeof val === 'number' && Number.isInteger(val) && val > 0,
          'Data Types',
          `PK ${spec.col}.${spec.pk} is a positive integer`,
          { id: val }
        );
      }
    }

    // Composite primary keys
    // ledger_entries: (ledger_id, entry_id)
    const ledgerEntryKeys = d.ledgerEntries.map((e) => `${e.ledger_id}::${e.entry_id}`);
    this.assert(
      new Set(ledgerEntryKeys).size === ledgerEntryKeys.length,
      'Composite Primary Keys',
      'ledgerEntries (ledger_id, entry_id) composite key is strictly unique',
      { total: ledgerEntryKeys.length, unique: new Set(ledgerEntryKeys).size }
    );

    // role_permissions: (custom_role_id, permission_id)
    const rolePermKeys = d.rolePermissions.map((rp) => `${rp.custom_role_id}::${rp.permission_id}`);
    this.assert(
      new Set(rolePermKeys).size === rolePermKeys.length,
      'Composite Primary Keys',
      'rolePermissions (custom_role_id, permission_id) composite key is strictly unique',
      { total: rolePermKeys.length, unique: new Set(rolePermKeys).size }
    );

    // staff_role_assignments: (user_id, custom_role_id)
    const staffRoleKeys = d.staffRoleAssignments.map((sra) => `${sra.user_id}::${sra.custom_role_id}`);
    this.assert(
      new Set(staffRoleKeys).size === staffRoleKeys.length,
      'Composite Primary Keys',
      'staffRoleAssignments (user_id, custom_role_id) composite key is strictly unique',
      { total: staffRoleKeys.length, unique: new Set(staffRoleKeys).size }
    );

    // organization_resources: (organization_id, module_code, resource_code)
    const orgResKeys = d.organizationResources.map(
      (or) => `${or.organization_id}::${or.module_code}::${or.resource_code}`
    );
    this.assert(
      new Set(orgResKeys).size === orgResKeys.length,
      'Composite Primary Keys',
      'organizationResources (organization_id, module_code, resource_code) composite key is strictly unique',
      { total: orgResKeys.length, unique: new Set(orgResKeys).size }
    );

    // Additional unique constraints:
    // 1. uq_doctor_slot (doctor_id, scheduled_datetime)
    const doctorSlots = new Set();
    for (const apt of d.appointments) {
      if (apt.status !== 'CANCELLED') {
        const slotKey = `${apt.doctor_id}::${apt.scheduled_datetime}`;
        this.assert(
          !doctorSlots.has(slotKey),
          'Unique Constraints',
          `uq_doctor_slot: Doctor #${apt.doctor_id} at ${apt.scheduled_datetime} has zero concurrent non-cancelled appointments`,
          { doctor_id: apt.doctor_id, slot: apt.scheduled_datetime }
        );
        doctorSlots.add(slotKey);
      }
    }

    // 2. uq_ward_bed (ward_id, bed_number)
    const wardBedTuples = new Set();
    for (const bed of d.beds) {
      const tuple = `${bed.ward_id}::${bed.bed_number}`;
      this.assert(
        !wardBedTuples.has(tuple),
        'Unique Constraints',
        `uq_ward_bed: Bed tuple (${bed.ward_id}, '${bed.bed_number}') is unique`,
        { bed_id: bed.bed_id, tuple }
      );
      wardBedTuples.add(tuple);
    }

    // 3. users.email uniqueness
    const userEmails = d.users.map((u) => u.email.toLowerCase().trim());
    this.assert(
      new Set(userEmails).size === userEmails.length,
      'Unique Constraints',
      'users.email is strictly unique across all users',
      { total: userEmails.length, unique: new Set(userEmails).size }
    );

    // 4. patients.uhid uniqueness
    const uhids = d.patients.map((p) => p.uhid.trim());
    this.assert(
      new Set(uhids).size === uhids.length,
      'Unique Constraints',
      'patients.uhid is strictly unique across all patients',
      { total: uhids.length, unique: new Set(uhids).size }
    );

    // 5. ledgers.admission_id uniqueness (1:1 admission ledger)
    const ledgerAdmIds = d.ledgers.map((l) => l.admission_id);
    this.assert(
      new Set(ledgerAdmIds).size === ledgerAdmIds.length,
      'Unique Constraints',
      'ledgers.admission_id is strictly unique (1:1 admission financial ledger)',
      { total: ledgerAdmIds.length, unique: new Set(ledgerAdmIds).size }
    );

    // 6. dischargeSummaries.admission_id uniqueness (1:1 discharge summary)
    const summaryAdmIds = d.dischargeSummaries.map((ds) => ds.admission_id);
    this.assert(
      new Set(summaryAdmIds).size === summaryAdmIds.length,
      'Unique Constraints',
      'dischargeSummaries.admission_id is strictly unique (1:1 discharge summary)',
      { total: summaryAdmIds.length, unique: new Set(summaryAdmIds).size }
    );

    // 7. receipts.payment_id uniqueness (1:1 payment receipt)
    const receiptPmtIds = d.receipts.map((r) => r.payment_id);
    this.assert(
      new Set(receiptPmtIds).size === receiptPmtIds.length,
      'Unique Constraints',
      'receipts.payment_id is strictly unique (1:1 payment receipt)',
      { total: receiptPmtIds.length, unique: new Set(receiptPmtIds).size }
    );
  }

  // -------------------------------------------------------------------------
  // 3. Foreign Key Integrity Across All 38 Collections
  // -------------------------------------------------------------------------
  verifyForeignKeysAcrossAllCollections() {
    const d = this.data;

    // Build ID sets for instant O(1) resolution
    const orgIds = new Set(d.organizations.map((o) => o.organization_id));
    const hospIds = new Set(d.hospitals.map((h) => h.hospital_id));
    const roleIds = new Set(d.roles.map((r) => r.role_id));
    const userIds = new Set(d.users.map((u) => u.user_id));
    const customRoleIds = new Set(d.customRoles.map((cr) => cr.custom_role_id));
    const permIds = new Set(d.permissions.map((p) => p.permission_id));
    const superUserIds = new Set(d.platformSuperUsers.map((su) => su.platform_user_id));
    const patientIds = new Set(d.patients.map((p) => p.patient_id));
    const doctorIds = new Set(d.doctors.map((doc) => doc.doctor_id));
    const availIds = new Set(d.doctorAvailabilities.map((da) => da.availability_id));
    const aptIds = new Set(d.appointments.map((a) => a.appointment_id));
    const wardIds = new Set(d.wards.map((w) => w.ward_id));
    const bedIds = new Set(d.beds.map((b) => b.bed_id));
    const admissionIds = new Set(d.admissions.map((a) => a.admission_id));
    const serviceIds = new Set(d.services.map((s) => s.service_id));
    const ledgerIds = new Set(d.ledgers.map((l) => l.ledger_id));
    const paymentIds = new Set(d.payments.map((p) => p.payment_id));
    const itemIds = new Set(d.inventoryItems.map((i) => i.item_id));
    const preRequestIds = new Set(d.preRequests.map((pr) => pr.pre_request_id));
    const planIds = new Set(d.subscriptionPlans.map((sp) => sp.plan_id));

    // users
    for (const u of d.users) {
      this.assert(roleIds.has(u.role_id), 'Foreign Keys', `user #${u.user_id} role_id #${u.role_id} resolves to roles`);
      this.assert(orgIds.has(u.organization_id), 'Foreign Keys', `user #${u.user_id} organization_id #${u.organization_id} resolves to organizations`);
      if (u.hospital_id !== null && u.hospital_id !== undefined) {
        this.assert(hospIds.has(u.hospital_id), 'Foreign Keys', `user #${u.user_id} hospital_id #${u.hospital_id} resolves to hospitals`);
      }
    }

    // customRoles
    for (const cr of d.customRoles) {
      this.assert(orgIds.has(cr.organization_id), 'Foreign Keys', `customRole #${cr.custom_role_id} organization_id resolves`);
    }

    // rolePermissions
    for (const rp of d.rolePermissions) {
      this.assert(customRoleIds.has(rp.custom_role_id), 'Foreign Keys', `rolePermission custom_role_id #${rp.custom_role_id} resolves`);
      this.assert(permIds.has(rp.permission_id), 'Foreign Keys', `rolePermission permission_id #${rp.permission_id} resolves`);
    }

    // staffRoleAssignments
    for (const sra of d.staffRoleAssignments) {
      this.assert(userIds.has(sra.user_id), 'Foreign Keys', `staffRoleAssignment user_id #${sra.user_id} resolves`);
      this.assert(customRoleIds.has(sra.custom_role_id), 'Foreign Keys', `staffRoleAssignment custom_role_id #${sra.custom_role_id} resolves`);
    }

    // hospitals
    for (const h of d.hospitals) {
      this.assert(orgIds.has(h.organization_id), 'Foreign Keys', `hospital #${h.hospital_id} organization_id resolves`);
    }

    // patients
    for (const p of d.patients) {
      this.assert(orgIds.has(p.organization_id), 'Foreign Keys', `patient #${p.patient_id} organization_id resolves`);
      if (p.user_id !== null && p.user_id !== undefined) {
        this.assert(userIds.has(p.user_id), 'Foreign Keys', `patient #${p.patient_id} user_id #${p.user_id} resolves`);
      }
      if (p.hospital_id !== null && p.hospital_id !== undefined) {
        this.assert(hospIds.has(p.hospital_id), 'Foreign Keys', `patient #${p.patient_id} hospital_id #${p.hospital_id} resolves`);
      }
    }

    // patientInsurances
    for (const ins of d.patientInsurances) {
      this.assert(patientIds.has(ins.patient_id), 'Foreign Keys', `patientInsurance #${ins.insurance_id} patient_id #${ins.patient_id} resolves`);
      this.assert(orgIds.has(ins.organization_id), 'Foreign Keys', `patientInsurance #${ins.insurance_id} organization_id resolves`);
      if (ins.hospital_id !== null && ins.hospital_id !== undefined) {
        this.assert(hospIds.has(ins.hospital_id), 'Foreign Keys', `patientInsurance #${ins.insurance_id} hospital_id resolves`);
      }
    }

    // doctors
    for (const doc of d.doctors) {
      this.assert(orgIds.has(doc.organization_id), 'Foreign Keys', `doctor #${doc.doctor_id} organization_id resolves`);
      if (doc.hospital_id !== null && doc.hospital_id !== undefined) {
        this.assert(hospIds.has(doc.hospital_id), 'Foreign Keys', `doctor #${doc.doctor_id} hospital_id resolves`);
      }
    }

    // doctorAvailabilities
    for (const da of d.doctorAvailabilities) {
      this.assert(doctorIds.has(da.doctor_id), 'Foreign Keys', `doctorAvailability #${da.availability_id} doctor_id #${da.doctor_id} resolves`);
      this.assert(orgIds.has(da.organization_id), 'Foreign Keys', `doctorAvailability #${da.availability_id} organization_id resolves`);
      if (da.hospital_id !== null && da.hospital_id !== undefined) {
        this.assert(hospIds.has(da.hospital_id), 'Foreign Keys', `doctorAvailability #${da.availability_id} hospital_id resolves`);
      }
    }

    // appointments
    for (const apt of d.appointments) {
      this.assert(patientIds.has(apt.patient_id), 'Foreign Keys', `appointment #${apt.appointment_id} patient_id #${apt.patient_id} resolves`);
      this.assert(doctorIds.has(apt.doctor_id), 'Foreign Keys', `appointment #${apt.appointment_id} doctor_id #${apt.doctor_id} resolves`);
      this.assert(userIds.has(apt.created_by), 'Foreign Keys', `appointment #${apt.appointment_id} created_by #${apt.created_by} resolves`);
      this.assert(orgIds.has(apt.organization_id), 'Foreign Keys', `appointment #${apt.appointment_id} organization_id resolves`);
      if (apt.availability_id !== null && apt.availability_id !== undefined) {
        this.assert(availIds.has(apt.availability_id), 'Foreign Keys', `appointment #${apt.appointment_id} availability_id #${apt.availability_id} resolves`);
      }
      if (apt.hospital_id !== null && apt.hospital_id !== undefined) {
        this.assert(hospIds.has(apt.hospital_id), 'Foreign Keys', `appointment #${apt.appointment_id} hospital_id resolves`);
      }
    }

    // wards
    for (const w of d.wards) {
      this.assert(orgIds.has(w.organization_id), 'Foreign Keys', `ward #${w.ward_id} organization_id resolves`);
      if (w.hospital_id !== null && w.hospital_id !== undefined) {
        this.assert(hospIds.has(w.hospital_id), 'Foreign Keys', `ward #${w.ward_id} hospital_id resolves`);
      }
    }

    // beds
    for (const b of d.beds) {
      this.assert(wardIds.has(b.ward_id), 'Foreign Keys', `bed #${b.bed_id} ward_id #${b.ward_id} resolves`);
      this.assert(orgIds.has(b.organization_id), 'Foreign Keys', `bed #${b.bed_id} organization_id resolves`);
      if (b.hospital_id !== null && b.hospital_id !== undefined) {
        this.assert(hospIds.has(b.hospital_id), 'Foreign Keys', `bed #${b.bed_id} hospital_id resolves`);
      }
    }

    // admissions
    for (const adm of d.admissions) {
      this.assert(patientIds.has(adm.patient_id), 'Foreign Keys', `admission #${adm.admission_id} patient_id #${adm.patient_id} resolves`);
      this.assert(orgIds.has(adm.organization_id), 'Foreign Keys', `admission #${adm.admission_id} organization_id resolves`);
      if (adm.bed_id !== null && adm.bed_id !== undefined) {
        this.assert(bedIds.has(adm.bed_id), 'Foreign Keys', `admission #${adm.admission_id} bed_id #${adm.bed_id} resolves`);
      }
      if (adm.appointment_id !== null && adm.appointment_id !== undefined) {
        this.assert(aptIds.has(adm.appointment_id), 'Foreign Keys', `admission #${adm.admission_id} appointment_id #${adm.appointment_id} resolves`);
      }
      if (adm.hospital_id !== null && adm.hospital_id !== undefined) {
        this.assert(hospIds.has(adm.hospital_id), 'Foreign Keys', `admission #${adm.admission_id} hospital_id resolves`);
      }
    }

    // dischargeSummaries
    for (const ds of d.dischargeSummaries) {
      this.assert(admissionIds.has(ds.admission_id), 'Foreign Keys', `dischargeSummary #${ds.summary_id} admission_id #${ds.admission_id} resolves`);
      this.assert(patientIds.has(ds.patient_id), 'Foreign Keys', `dischargeSummary #${ds.summary_id} patient_id #${ds.patient_id} resolves`);
      this.assert(orgIds.has(ds.organization_id), 'Foreign Keys', `dischargeSummary #${ds.summary_id} organization_id resolves`);
      if (ds.hospital_id !== null && ds.hospital_id !== undefined) {
        this.assert(hospIds.has(ds.hospital_id), 'Foreign Keys', `dischargeSummary #${ds.summary_id} hospital_id resolves`);
      }
    }

    // services
    for (const svc of d.services) {
      this.assert(orgIds.has(svc.organization_id), 'Foreign Keys', `service #${svc.service_id} organization_id resolves`);
      if (svc.hospital_id !== null && svc.hospital_id !== undefined) {
        this.assert(hospIds.has(svc.hospital_id), 'Foreign Keys', `service #${svc.service_id} hospital_id resolves`);
      }
    }

    // ledgers
    for (const l of d.ledgers) {
      this.assert(admissionIds.has(l.admission_id), 'Foreign Keys', `ledger #${l.ledger_id} admission_id #${l.admission_id} resolves`);
      this.assert(orgIds.has(l.organization_id), 'Foreign Keys', `ledger #${l.ledger_id} organization_id resolves`);
      if (l.hospital_id !== null && l.hospital_id !== undefined) {
        this.assert(hospIds.has(l.hospital_id), 'Foreign Keys', `ledger #${l.ledger_id} hospital_id resolves`);
      }
    }

    // ledgerEntries
    for (const le of d.ledgerEntries) {
      this.assert(ledgerIds.has(le.ledger_id), 'Foreign Keys', `ledgerEntry (${le.ledger_id}, ${le.entry_id}) ledger_id resolves`);
      this.assert(serviceIds.has(le.service_id), 'Foreign Keys', `ledgerEntry (${le.ledger_id}, ${le.entry_id}) service_id #${le.service_id} resolves`);
      this.assert(orgIds.has(le.organization_id), 'Foreign Keys', `ledgerEntry organization_id resolves`);
      if (le.hospital_id !== null && le.hospital_id !== undefined) {
        this.assert(hospIds.has(le.hospital_id), 'Foreign Keys', `ledgerEntry hospital_id resolves`);
      }
    }

    // payments
    for (const pmt of d.payments) {
      this.assert(ledgerIds.has(pmt.ledger_id), 'Foreign Keys', `payment #${pmt.payment_id} ledger_id #${pmt.ledger_id} resolves`);
      this.assert(orgIds.has(pmt.organization_id), 'Foreign Keys', `payment #${pmt.payment_id} organization_id resolves`);
      if (pmt.hospital_id !== null && pmt.hospital_id !== undefined) {
        this.assert(hospIds.has(pmt.hospital_id), 'Foreign Keys', `payment #${pmt.payment_id} hospital_id resolves`);
      }
    }

    // receipts
    for (const rc of d.receipts) {
      this.assert(paymentIds.has(rc.payment_id), 'Foreign Keys', `receipt #${rc.receipt_id} payment_id #${rc.payment_id} resolves`);
      this.assert(ledgerIds.has(rc.ledger_id), 'Foreign Keys', `receipt #${rc.receipt_id} ledger_id #${rc.ledger_id} resolves`);
      this.assert(admissionIds.has(rc.admission_id), 'Foreign Keys', `receipt #${rc.receipt_id} admission_id #${rc.admission_id} resolves`);
      this.assert(patientIds.has(rc.patient_id), 'Foreign Keys', `receipt #${rc.receipt_id} patient_id #${rc.patient_id} resolves`);
      this.assert(orgIds.has(rc.organization_id), 'Foreign Keys', `receipt #${rc.receipt_id} organization_id resolves`);
      if (rc.hospital_id !== null && rc.hospital_id !== undefined) {
        this.assert(hospIds.has(rc.hospital_id), 'Foreign Keys', `receipt #${rc.receipt_id} hospital_id resolves`);
      }
    }

    // leaders
    for (const lead of d.leaders) {
      this.assert(admissionIds.has(lead.admission_id), 'Foreign Keys', `leader #${lead.leader_id} admission_id #${lead.admission_id} resolves`);
      this.assert(patientIds.has(lead.patient_id), 'Foreign Keys', `leader #${lead.leader_id} patient_id #${lead.patient_id} resolves`);
      this.assert(serviceIds.has(lead.service_id), 'Foreign Keys', `leader #${lead.leader_id} service_id #${lead.service_id} resolves`);
      this.assert(orgIds.has(lead.organization_id), 'Foreign Keys', `leader #${lead.leader_id} organization_id resolves`);
      if (lead.hospital_id !== null && lead.hospital_id !== undefined) {
        this.assert(hospIds.has(lead.hospital_id), 'Foreign Keys', `leader #${lead.leader_id} hospital_id resolves`);
      }
    }

    // inventoryItems
    for (const item of d.inventoryItems) {
      this.assert(orgIds.has(item.organization_id), 'Foreign Keys', `inventoryItem #${item.item_id} organization_id resolves`);
      if (item.service_id !== null && item.service_id !== undefined) {
        this.assert(serviceIds.has(item.service_id), 'Foreign Keys', `inventoryItem #${item.item_id} service_id #${item.service_id} resolves`);
      }
      if (item.hospital_id !== null && item.hospital_id !== undefined) {
        this.assert(hospIds.has(item.hospital_id), 'Foreign Keys', `inventoryItem #${item.item_id} hospital_id resolves`);
      }
    }

    // purchaseRequests
    for (const pr of d.purchaseRequests) {
      this.assert(itemIds.has(pr.item_id), 'Foreign Keys', `purchaseRequest #${pr.request_id} item_id #${pr.item_id} resolves`);
      this.assert(userIds.has(pr.requested_by), 'Foreign Keys', `purchaseRequest #${pr.request_id} requested_by #${pr.requested_by} resolves`);
      this.assert(orgIds.has(pr.organization_id), 'Foreign Keys', `purchaseRequest #${pr.request_id} organization_id resolves`);
      if (pr.hospital_id !== null && pr.hospital_id !== undefined) {
        this.assert(hospIds.has(pr.hospital_id), 'Foreign Keys', `purchaseRequest #${pr.request_id} hospital_id resolves`);
      }
    }

    // preRequests
    for (const pr of d.preRequests) {
      this.assert(patientIds.has(pr.patient_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} patient_id #${pr.patient_id} resolves`);
      this.assert(userIds.has(pr.created_by), 'Foreign Keys', `preRequest #${pr.pre_request_id} created_by #${pr.created_by} resolves`);
      this.assert(orgIds.has(pr.organization_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} organization_id resolves`);
      if (pr.appointment_id !== null && pr.appointment_id !== undefined) {
        this.assert(aptIds.has(pr.appointment_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} appointment_id resolves`);
      }
      if (pr.doctor_id !== null && pr.doctor_id !== undefined) {
        this.assert(doctorIds.has(pr.doctor_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} doctor_id resolves`);
      }
      if (pr.bed_id !== null && pr.bed_id !== undefined) {
        this.assert(bedIds.has(pr.bed_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} bed_id resolves`);
      }
      if (pr.hospital_id !== null && pr.hospital_id !== undefined) {
        this.assert(hospIds.has(pr.hospital_id), 'Foreign Keys', `preRequest #${pr.pre_request_id} hospital_id resolves`);
      }
    }

    // bedRequests
    for (const br of d.bedRequests) {
      this.assert(preRequestIds.has(br.pre_request_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} pre_request_id #${br.pre_request_id} resolves`);
      this.assert(patientIds.has(br.patient_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} patient_id #${br.patient_id} resolves`);
      this.assert(wardIds.has(br.ward_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} ward_id #${br.ward_id} resolves`);
      this.assert(userIds.has(br.requested_by), 'Foreign Keys', `bedRequest #${br.bed_request_id} requested_by #${br.requested_by} resolves`);
      this.assert(orgIds.has(br.organization_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} organization_id resolves`);
      if (br.bed_id !== null && br.bed_id !== undefined) {
        this.assert(bedIds.has(br.bed_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} bed_id resolves`);
      }
      if (br.hospital_id !== null && br.hospital_id !== undefined) {
        this.assert(hospIds.has(br.hospital_id), 'Foreign Keys', `bedRequest #${br.bed_request_id} hospital_id resolves`);
      }
    }

    // emergencyNotifications
    for (const en of d.emergencyNotifications) {
      this.assert(userIds.has(en.created_by), 'Foreign Keys', `emergencyNotification #${en.emergency_id} created_by resolves`);
      this.assert(orgIds.has(en.organization_id), 'Foreign Keys', `emergencyNotification #${en.emergency_id} organization_id resolves`);
      if (en.patient_id !== null && en.patient_id !== undefined) {
        this.assert(patientIds.has(en.patient_id), 'Foreign Keys', `emergencyNotification #${en.emergency_id} patient_id resolves`);
      }
      if (en.bed_id !== null && en.bed_id !== undefined) {
        this.assert(bedIds.has(en.bed_id), 'Foreign Keys', `emergencyNotification #${en.emergency_id} bed_id resolves`);
      }
      if (en.hospital_id !== null && en.hospital_id !== undefined) {
        this.assert(hospIds.has(en.hospital_id), 'Foreign Keys', `emergencyNotification #${en.emergency_id} hospital_id resolves`);
      }
    }

    // subscriptions
    for (const sub of d.subscriptions) {
      this.assert(orgIds.has(sub.organization_id), 'Foreign Keys', `subscription #${sub.subscription_id} organization_id resolves`);
      this.assert(planIds.has(sub.plan_id), 'Foreign Keys', `subscription #${sub.subscription_id} plan_id #${sub.plan_id} resolves`);
    }

    // resourceQuotas
    for (const rq of d.resourceQuotas) {
      this.assert(orgIds.has(rq.organization_id), 'Foreign Keys', `resourceQuota organization_id #${rq.organization_id} resolves`);
    }

    // organizationResources
    for (const or of d.organizationResources) {
      this.assert(orgIds.has(or.organization_id), 'Foreign Keys', `organizationResource organization_id #${or.organization_id} resolves`);
    }

    // apiKeys
    for (const ak of d.apiKeys) {
      this.assert(orgIds.has(ak.organization_id), 'Foreign Keys', `apiKey #${ak.api_key_id} organization_id resolves`);
    }

    // activityLog
    for (const act of d.activityLog) {
      this.assert(orgIds.has(act.organization_id), 'Foreign Keys', `activityLog #${act.id} organization_id resolves`);
      if (act.hospital_id !== null && act.hospital_id !== undefined) {
        this.assert(hospIds.has(act.hospital_id), 'Foreign Keys', `activityLog #${act.id} hospital_id resolves`);
      }
    }

    // provisioningLog
    for (const pl of d.provisioningLog) {
      this.assert(orgIds.has(pl.organization_id), 'Foreign Keys', `provisioningLog #${pl.id} organization_id resolves`);
    }

    // platformActivityLog
    for (const pal of d.platformActivityLog) {
      if (pal.platform_user_id !== null && pal.platform_user_id !== undefined) {
        this.assert(superUserIds.has(pal.platform_user_id), 'Foreign Keys', `platformActivityLog #${pal.id} superUser resolves`);
      }
      if (pal.target_organization_id !== null && pal.target_organization_id !== undefined) {
        this.assert(orgIds.has(pal.target_organization_id), 'Foreign Keys', `platformActivityLog #${pal.id} target org resolves`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Zero Orphaned Records
  // -------------------------------------------------------------------------
  verifyZeroOrphanedRecords() {
    const d = this.data;

    // 1. Zero orphaned admissions: Every admission must have an associated ledger
    const ledgerAdmIds = new Set(d.ledgers.map((l) => l.admission_id));
    for (const adm of d.admissions) {
      this.assert(
        ledgerAdmIds.has(adm.admission_id),
        'Orphan Absence',
        `Admission #${adm.admission_id} has a corresponding financial ledger`,
        { admission_id: adm.admission_id }
      );
    }

    // 2. Zero orphaned ledgers: Every ledger must point to a real admission
    const admissionIds = new Set(d.admissions.map((a) => a.admission_id));
    for (const l of d.ledgers) {
      this.assert(
        admissionIds.has(l.admission_id),
        'Orphan Absence',
        `Ledger #${l.ledger_id} points to an existing admission #${l.admission_id}`,
        { ledger_id: l.ledger_id, admission_id: l.admission_id }
      );
    }

    // 3. Zero orphaned ledger entries: Every ledger entry must point to an existing ledger
    const ledgerIds = new Set(d.ledgers.map((l) => l.ledger_id));
    for (const le of d.ledgerEntries) {
      this.assert(
        ledgerIds.has(le.ledger_id),
        'Orphan Absence',
        `Ledger entry (${le.ledger_id}, ${le.entry_id}) points to existing ledger #${le.ledger_id}`,
        { ledger_id: le.ledger_id, entry_id: le.entry_id }
      );
    }

    // 4. Zero orphaned payments: Every payment must have a corresponding receipt
    const receiptPaymentIds = new Set(d.receipts.map((r) => r.payment_id));
    for (const pmt of d.payments) {
      this.assert(
        receiptPaymentIds.has(pmt.payment_id),
        'Orphan Absence',
        `Payment #${pmt.payment_id} has a corresponding issued receipt`,
        { payment_id: pmt.payment_id }
      );
    }

    // 5. Zero orphaned receipts: Every receipt points to an existing payment and admission
    const paymentIds = new Set(d.payments.map((p) => p.payment_id));
    for (const rc of d.receipts) {
      this.assert(
        paymentIds.has(rc.payment_id),
        'Orphan Absence',
        `Receipt #${rc.receipt_id} points to existing payment #${rc.payment_id}`,
        { receipt_id: rc.receipt_id, payment_id: rc.payment_id }
      );
      this.assert(
        admissionIds.has(rc.admission_id),
        'Orphan Absence',
        `Receipt #${rc.receipt_id} points to existing admission #${rc.admission_id}`,
        { receipt_id: rc.receipt_id, admission_id: rc.admission_id }
      );
    }

    // 6. Zero orphaned discharge summaries: Every discharge summary points to a DISCHARGED admission
    for (const ds of d.dischargeSummaries) {
      const adm = d.admissions.find((a) => a.admission_id === ds.admission_id);
      this.assert(
        adm && adm.status === 'DISCHARGED',
        'Orphan Absence',
        `Discharge summary #${ds.summary_id} points to DISCHARGED admission #${ds.admission_id}`,
        { summary_id: ds.summary_id, admission_id: ds.admission_id, status: adm?.status }
      );
    }

    // 7. Zero orphaned bed requests: Every bed request points to an existing preRequest
    const preRequestIds = new Set(d.preRequests.map((pr) => pr.pre_request_id));
    for (const br of d.bedRequests) {
      this.assert(
        preRequestIds.has(br.pre_request_id),
        'Orphan Absence',
        `BedRequest #${br.bed_request_id} points to existing preRequest #${br.pre_request_id}`,
        { bed_request_id: br.bed_request_id, pre_request_id: br.pre_request_id }
      );
    }

    // 8. Zero orphaned beds in admissions or preRequests
    const bedIds = new Set(d.beds.map((b) => b.bed_id));
    for (const adm of d.admissions) {
      if (adm.bed_id !== null && adm.bed_id !== undefined) {
        this.assert(
          bedIds.has(adm.bed_id),
          'Orphan Absence',
          `Admission #${adm.admission_id} bed_id #${adm.bed_id} exists in beds`,
          { admission_id: adm.admission_id, bed_id: adm.bed_id }
        );
      }
    }
    for (const pr of d.preRequests) {
      if (pr.bed_id !== null && pr.bed_id !== undefined) {
        this.assert(
          bedIds.has(pr.bed_id),
          'Orphan Absence',
          `PreRequest #${pr.pre_request_id} bed_id #${pr.bed_id} exists in beds`,
          { pre_request_id: pr.pre_request_id, bed_id: pr.bed_id }
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Multi-Tenant Boundary Enforcement & Zero Leaks
  // -------------------------------------------------------------------------
  verifyMultiTenantIsolation() {
    const d = this.data;

    // Helper to check org match
    const checkOrgMatch = (child, parent, relName) => {
      this.assert(
        child.organization_id === parent.organization_id,
        'Multi-Tenant Isolation',
        `Relational link '${relName}' shares organization_id (${child.organization_id})`,
        { relName, childOrg: child.organization_id, parentOrg: parent.organization_id }
      );
    };

    // 1. users ⇄ patients
    for (const pat of d.patients) {
      if (pat.user_id) {
        const u = d.users.find((user) => user.user_id === pat.user_id);
        checkOrgMatch(pat, u, 'patients -> users');
      }
    }

    // 2. patientInsurances ⇄ patients
    for (const ins of d.patientInsurances) {
      const p = d.patients.find((pat) => pat.patient_id === ins.patient_id);
      checkOrgMatch(ins, p, 'patientInsurances -> patients');
    }

    // 3. doctors ⇄ doctorAvailabilities
    for (const da of d.doctorAvailabilities) {
      const doc = d.doctors.find((dr) => dr.doctor_id === da.doctor_id);
      checkOrgMatch(da, doc, 'doctorAvailabilities -> doctors');
    }

    // 4. appointments ⇄ patients, doctors, users (created_by)
    for (const apt of d.appointments) {
      const p = d.patients.find((pat) => pat.patient_id === apt.patient_id);
      const doc = d.doctors.find((dr) => dr.doctor_id === apt.doctor_id);
      const creator = d.users.find((u) => u.user_id === apt.created_by);
      checkOrgMatch(apt, p, 'appointments -> patients');
      checkOrgMatch(apt, doc, 'appointments -> doctors');
      checkOrgMatch(apt, creator, 'appointments -> users(created_by)');
    }

    // 5. wards ⇄ beds
    for (const b of d.beds) {
      const w = d.wards.find((ward) => ward.ward_id === b.ward_id);
      checkOrgMatch(b, w, 'beds -> wards');
    }

    // 6. admissions ⇄ patients, beds, appointments
    for (const adm of d.admissions) {
      const p = d.patients.find((pat) => pat.patient_id === adm.patient_id);
      checkOrgMatch(adm, p, 'admissions -> patients');
      if (adm.bed_id) {
        const b = d.beds.find((bed) => bed.bed_id === adm.bed_id);
        checkOrgMatch(adm, b, 'admissions -> beds');
      }
      if (adm.appointment_id) {
        const apt = d.appointments.find((a) => a.appointment_id === adm.appointment_id);
        checkOrgMatch(adm, apt, 'admissions -> appointments');
      }
    }

    // 7. dischargeSummaries ⇄ admissions, patients
    for (const ds of d.dischargeSummaries) {
      const adm = d.admissions.find((a) => a.admission_id === ds.admission_id);
      const p = d.patients.find((pat) => pat.patient_id === ds.patient_id);
      checkOrgMatch(ds, adm, 'dischargeSummaries -> admissions');
      checkOrgMatch(ds, p, 'dischargeSummaries -> patients');
    }

    // 8. ledgers ⇄ admissions
    for (const l of d.ledgers) {
      const adm = d.admissions.find((a) => a.admission_id === l.admission_id);
      checkOrgMatch(l, adm, 'ledgers -> admissions');
    }

    // 9. ledgerEntries ⇄ ledgers, services
    for (const le of d.ledgerEntries) {
      const l = d.ledgers.find((led) => led.ledger_id === le.ledger_id);
      const s = d.services.find((svc) => svc.service_id === le.service_id);
      checkOrgMatch(le, l, 'ledgerEntries -> ledgers');
      checkOrgMatch(le, s, 'ledgerEntries -> services');
    }

    // 10. payments ⇄ ledgers
    for (const pmt of d.payments) {
      const l = d.ledgers.find((led) => led.ledger_id === pmt.ledger_id);
      checkOrgMatch(pmt, l, 'payments -> ledgers');
    }

    // 11. receipts ⇄ payments, ledgers, admissions, patients
    for (const rc of d.receipts) {
      const pmt = d.payments.find((p) => p.payment_id === rc.payment_id);
      const l = d.ledgers.find((led) => led.ledger_id === rc.ledger_id);
      const adm = d.admissions.find((a) => a.admission_id === rc.admission_id);
      const p = d.patients.find((pat) => pat.patient_id === rc.patient_id);
      checkOrgMatch(rc, pmt, 'receipts -> payments');
      checkOrgMatch(rc, l, 'receipts -> ledgers');
      checkOrgMatch(rc, adm, 'receipts -> admissions');
      checkOrgMatch(rc, p, 'receipts -> patients');
    }

    // 12. inventoryItems ⇄ services; purchaseRequests ⇄ inventoryItems, users
    for (const item of d.inventoryItems) {
      if (item.service_id) {
        const s = d.services.find((svc) => svc.service_id === item.service_id);
        checkOrgMatch(item, s, 'inventoryItems -> services');
      }
    }
    for (const pr of d.purchaseRequests) {
      const item = d.inventoryItems.find((i) => i.item_id === pr.item_id);
      const creator = d.users.find((u) => u.user_id === pr.requested_by);
      checkOrgMatch(pr, item, 'purchaseRequests -> inventoryItems');
      checkOrgMatch(pr, creator, 'purchaseRequests -> users(requested_by)');
    }

    // 13. preRequests ⇄ patients, doctors, beds, users
    for (const pr of d.preRequests) {
      const p = d.patients.find((pat) => pat.patient_id === pr.patient_id);
      const creator = d.users.find((u) => u.user_id === pr.created_by);
      checkOrgMatch(pr, p, 'preRequests -> patients');
      checkOrgMatch(pr, creator, 'preRequests -> users(created_by)');
      if (pr.doctor_id) {
        const doc = d.doctors.find((dr) => dr.doctor_id === pr.doctor_id);
        checkOrgMatch(pr, doc, 'preRequests -> doctors');
      }
      if (pr.bed_id) {
        const b = d.beds.find((bed) => bed.bed_id === pr.bed_id);
        checkOrgMatch(pr, b, 'preRequests -> beds');
      }
    }

    // 14. bedRequests ⇄ preRequests, patients, wards, beds, users
    for (const br of d.bedRequests) {
      const pr = d.preRequests.find((p) => p.pre_request_id === br.pre_request_id);
      const p = d.patients.find((pat) => pat.patient_id === br.patient_id);
      const w = d.wards.find((ward) => ward.ward_id === br.ward_id);
      const creator = d.users.find((u) => u.user_id === br.requested_by);
      checkOrgMatch(br, pr, 'bedRequests -> preRequests');
      checkOrgMatch(br, p, 'bedRequests -> patients');
      checkOrgMatch(br, w, 'bedRequests -> wards');
      checkOrgMatch(br, creator, 'bedRequests -> users(requested_by)');
      if (br.bed_id) {
        const b = d.beds.find((bed) => bed.bed_id === br.bed_id);
        checkOrgMatch(br, b, 'bedRequests -> beds');
      }
    }

    // 15. emergencyNotifications ⇄ patients, beds, users
    for (const en of d.emergencyNotifications) {
      const creator = d.users.find((u) => u.user_id === en.created_by);
      checkOrgMatch(en, creator, 'emergencyNotifications -> users(created_by)');
      if (en.patient_id) {
        const p = d.patients.find((pat) => pat.patient_id === en.patient_id);
        checkOrgMatch(en, p, 'emergencyNotifications -> patients');
      }
      if (en.bed_id) {
        const b = d.beds.find((bed) => bed.bed_id === en.bed_id);
        checkOrgMatch(en, b, 'emergencyNotifications -> beds');
      }
    }

    // 16. staffRoleAssignments ⇄ users, customRoles
    for (const sra of d.staffRoleAssignments) {
      const u = d.users.find((user) => user.user_id === sra.user_id);
      const cr = d.customRoles.find((c) => c.custom_role_id === sra.custom_role_id);
      checkOrgMatch(u, cr, 'staffRoleAssignments: users -> customRoles');
    }

    // 17. Strict Tenant Segregation: All tenant collections only reference Org 1 or Org 2
    const tenantCollections = [
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
      'subscriptions',
      'resourceQuotas',
      'apiKeys',
      'customRoles',
      'provisioningLog',
      'organizationResources',
    ];

    for (const col of tenantCollections) {
      for (const row of d[col]) {
        this.assert(
          row.organization_id === 1 || row.organization_id === 2,
          'Multi-Tenant Isolation',
          `Collection '${col}' record #${row.id || row[`${col.slice(0, -1)}_id`] || row.user_id} belongs strictly to Org 1 or Org 2`,
          { organization_id: row.organization_id }
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. Multi-Hospital Campus Scoping
  // -------------------------------------------------------------------------
  verifyMultiHospitalCampusScoping() {
    const d = this.data;
    const hospToOrgMap = new Map(d.hospitals.map((h) => [h.hospital_id, h.organization_id]));

    // Known canonical ground truth:
    // Hospital 1: City General Main Campus (Org 1)
    // Hospital 2: Apollo Hospitals Main Campus (Org 2)
    // Hospital 3: Apollo Hospitals Bangalore (Org 2)
    this.assert(hospToOrgMap.get(1) === 1, 'Hospital Scoping', 'Hospital 1 mapped to Org 1');
    this.assert(hospToOrgMap.get(2) === 2, 'Hospital Scoping', 'Hospital 2 mapped to Org 2');
    this.assert(hospToOrgMap.get(3) === 2, 'Hospital Scoping', 'Hospital 3 mapped to Org 2');

    for (const col of EXPECTED_37_COLLECTIONS) {
      for (const row of d[col]) {
        if (row.hospital_id !== null && row.hospital_id !== undefined) {
          const parentOrg = hospToOrgMap.get(row.hospital_id);
          this.assert(
            parentOrg !== undefined,
            'Hospital Scoping',
            `Collection '${col}' record references a valid existing hospital_id #${row.hospital_id}`,
            { hospital_id: row.hospital_id }
          );

          this.assert(
            parentOrg === row.organization_id,
            'Hospital Scoping',
            `Multi-Hospital Scoping Invariant: '${col}' row hospital #${row.hospital_id} (Org ${parentOrg}) matches record organization_id (${row.organization_id})`,
            { collection: col, rowId: row.id || row.user_id || row.patient_id, hospital_id: row.hospital_id, recordOrg: row.organization_id, parentOrg }
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. Financial & Clinical Invariants
  // -------------------------------------------------------------------------
  verifyFinancialAndClinicalInvariants() {
    const d = this.data;

    // 1. Discharge Summary Math Invariant
    for (const ds of d.dischargeSummaries) {
      const calcFinal = Number((ds.gross_amount - ds.insurance_deduction).toFixed(2));
      const actualFinal = Number(Number(ds.final_amount).toFixed(2));
      this.assert(
        actualFinal === calcFinal,
        'Financial Invariants',
        `DischargeSummary #${ds.summary_id} final_amount (${actualFinal}) === gross (${ds.gross_amount}) - insurance_deduction (${ds.insurance_deduction}) = ${calcFinal}`,
        { summary_id: ds.summary_id }
      );
    }

    // 2. Monotonic Ledger Entry Sequence (1, 2, 3...)
    for (const l of d.ledgers) {
      const entries = d.ledgerEntries
        .filter((e) => e.ledger_id === l.ledger_id)
        .sort((a, b) => a.entry_id - b.entry_id);

      entries.forEach((entry, idx) => {
        this.assert(
          entry.entry_id === idx + 1,
          'Financial Invariants',
          `Ledger #${l.ledger_id} entry_id is 1-based sequential (index: ${idx + 1}, entry_id: ${entry.entry_id})`,
          { ledger_id: l.ledger_id, entry_id: entry.entry_id, expected: idx + 1 }
        );
      });
    }

    // 3. Physical Ward Capacity (wards.total_beds === count(beds))
    for (const w of d.wards) {
      const bedsInWard = d.beds.filter((b) => b.ward_id === w.ward_id);
      this.assert(
        bedsInWard.length === w.total_beds,
        'Clinical Invariants',
        `Ward #${w.ward_id} physical beds (${bedsInWard.length}) === declared total_beds (${w.total_beds})`,
        { ward_id: w.ward_id, physical: bedsInWard.length, declared: w.total_beds }
      );
    }
  }
}

function verifyDeepStoreParity(dataStoreContent, dbContent) {
  console.log(`\n======================================================================`);
  console.log(`Deep Storage & Content Parity Audit (dataStore.js vs db.json)`);
  console.log(`======================================================================\n`);

  let parityPass = 0;
  let parityFail = 0;

  for (const col of EXPECTED_37_COLLECTIONS) {
    const dsLen = dataStoreContent[col].length;
    const dbLen = dbContent[col].length;
    const lenMatch = dsLen === dbLen;

    if (lenMatch) {
      parityPass++;
    } else {
      parityFail++;
      console.error(`  ❌ [FAIL] Length mismatch in '${col}': dataStore.js=${dsLen}, db.json=${dbLen}`);
    }

    const dsJson = JSON.stringify(dataStoreContent[col]);
    const dbJson = JSON.stringify(dbContent[col]);
    const contentMatch = dsJson === dbJson;

    if (contentMatch) {
      parityPass++;
    } else {
      parityFail++;
      console.error(`  ❌ [FAIL] Deep content mismatch in '${col}'`);
    }
  }

  console.log(`Parity Audit Summary:`);
  console.log(`  Passed Parity Checks: ${parityPass} / ${parityPass + parityFail}`);
  console.log(`  Failed Parity Checks: ${parityFail}`);

  return parityFail === 0;
}

function main() {
  console.log('Initiating Challenger 1 Independent Relational & Multi-Tenant Audit...');

  const { dbContent, dataStoreContent } = loadStores();

  const dbAuditor = new RelationalIntegrityAuditor('back-end/data/db.json (Persistent Seed File)', dbContent);
  const dbOk = dbAuditor.runAll();

  const dsAuditor = new RelationalIntegrityAuditor('back-end/src/store/dataStore.js (In-Memory Module)', dataStoreContent);
  const dsOk = dsAuditor.runAll();

  const parityOk = verifyDeepStoreParity(dataStoreContent, dbContent);

  console.log(`\n======================================================================`);
  console.log(`CHALLENGER 1 OVERALL VERIFICATION GATE REPORT`);
  console.log(`======================================================================`);
  console.log(`  Target 1 (db.json):           ${dbOk ? 'PASSED (100% compliant)' : 'FAILED'}`);
  console.log(`  Target 2 (dataStore.js):       ${dsOk ? 'PASSED (100% compliant)' : 'FAILED'}`);
  console.log(`  Storage & Content Parity:     ${parityOk ? 'PASSED (100% identical)' : 'FAILED'}`);
  console.log(`  Total Invariant Checks Run:   ${dbAuditor.passed + dbAuditor.failed + dsAuditor.passed + dsAuditor.failed}`);
  console.log(`  Total Checks Passed:          ${dbAuditor.passed + dsAuditor.passed}`);
  console.log(`  Total Checks Failed:          ${dbAuditor.failed + dsAuditor.failed}`);
  console.log(`======================================================================\n`);

  if (!dbOk || !dsOk || !parityOk) {
    console.error('Audit failed! Please review error output above.');
    process.exit(1);
  } else {
    console.log('CHALLENGER 1 VERIFICATION GATE FULLY PASSED: 0 FK ERRORS, 0 ORPHANS, 0 CROSS-TENANT LEAKS, 100% PARITY.');
    process.exit(0);
  }
}

main();
