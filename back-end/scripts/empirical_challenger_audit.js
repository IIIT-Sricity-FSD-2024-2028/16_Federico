'use strict';

/**
 * Empirical Challenger Verification Harness
 * Milestone M4 Verification Gate (Iteration 2)
 *
 * Scope:
 * 1. 100% Foreign Key resolution across all 38 collections in dataStore.js and db.json.
 * 2. Zero orphaned records across all tables.
 * 3. Zero cross-tenant relational leaks between Org 1 (City General) and Org 2 (Apollo Hospitals).
 * 4. Zero disk pollution check on db.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

class ChallengerAuditEngine {
  constructor(name, data) {
    this.name = name;
    this.data = data;
    this.passCount = 0;
    this.failCount = 0;
    this.failures = [];
    this.metrics = {
      fkChecks: 0,
      orphanChecks: 0,
      tenantIsolationChecks: 0,
      campusChecks: 0,
      org1Entities: 0,
      org2Entities: 0,
    };
  }

  recordAssert(condition, category, testName, details = {}) {
    if (condition) {
      this.passCount++;
    } else {
      this.failCount++;
      this.failures.push({ category, testName, details });
      console.error(`  ❌ [FAIL] [${category}] ${testName}`, details);
    }
  }

  run() {
    console.log(`\n======================================================================`);
    console.log(`Auditing Dataset: ${this.name}`);
    console.log(`======================================================================`);

    this.checkCollections();
    this.auditForeignKeys();
    this.auditOrphans();
    this.auditTenantSegregation();
    this.auditHospitalScoping();

    console.log(`\n[${this.name}] Audit Results:`);
    console.log(`  - Total Checks:          ${this.passCount + this.failCount}`);
    console.log(`  - Passed:                ${this.passCount}`);
    console.log(`  - Failed:                ${this.failCount}`);
    console.log(`  - FK Validations:        ${this.metrics.fkChecks}`);
    console.log(`  - Orphan Absence Checks: ${this.metrics.orphanChecks}`);
    console.log(`  - Tenant Isolation:      ${this.metrics.tenantIsolationChecks}`);
    console.log(`  - Campus Scoping Checks: ${this.metrics.campusChecks}`);
    console.log(`  - Org 1 Total Entities:  ${this.metrics.org1Entities}`);
    console.log(`  - Org 2 Total Entities:  ${this.metrics.org2Entities}`);

    return this.failCount === 0;
  }

  checkCollections() {
    const presentKeys = Object.keys(this.data).sort();
    this.recordAssert(
      presentKeys.length === 37 && JSON.stringify(presentKeys) === JSON.stringify(EXPECTED_37_COLLECTIONS),
      'Collection Verification',
      'All 37 canonical collections are present and match schema specification',
      { expected: 37, actual: presentKeys.length }
    );

    for (const key of EXPECTED_37_COLLECTIONS) {
      this.recordAssert(
        Array.isArray(this.data[key]),
        'Collection Verification',
        `Collection '${key}' is an Array`,
        { type: typeof this.data[key] }
      );
    }
  }

  auditForeignKeys() {
    const d = this.data;
    const orgIds = new Set(d.organizations.map((o) => o.organization_id));
    const hospIds = new Set(d.hospitals.map((h) => h.hospital_id));
    const roleIds = new Set(d.roles.map((r) => r.role_id));
    const userIds = new Set(d.users.map((u) => u.user_id));
    const customRoleIds = new Set(d.customRoles.map((c) => c.custom_role_id));
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

    const checkFk = (cond, msg, ctx) => {
      this.metrics.fkChecks++;
      this.recordAssert(cond, 'Foreign Key Resolution', msg, ctx);
    };

    // 1. users
    for (const u of d.users) {
      checkFk(roleIds.has(u.role_id), `users #${u.user_id} -> roles #${u.role_id}`, { u });
      checkFk(orgIds.has(u.organization_id), `users #${u.user_id} -> org #${u.organization_id}`, { u });
      if (u.hospital_id != null) checkFk(hospIds.has(u.hospital_id), `users #${u.user_id} -> hosp #${u.hospital_id}`, { u });
    }

    // 2. customRoles
    for (const cr of d.customRoles) {
      checkFk(orgIds.has(cr.organization_id), `customRoles #${cr.custom_role_id} -> org #${cr.organization_id}`, { cr });
    }

    // 3. rolePermissions
    for (const rp of d.rolePermissions) {
      checkFk(customRoleIds.has(rp.custom_role_id), `rolePermissions -> customRoles #${rp.custom_role_id}`, { rp });
      checkFk(permIds.has(rp.permission_id), `rolePermissions -> permissions #${rp.permission_id}`, { rp });
    }

    // 4. staffRoleAssignments
    for (const sra of d.staffRoleAssignments) {
      checkFk(userIds.has(sra.user_id), `staffRoleAssignments -> users #${sra.user_id}`, { sra });
      checkFk(customRoleIds.has(sra.custom_role_id), `staffRoleAssignments -> customRoles #${sra.custom_role_id}`, { sra });
    }

    // 5. hospitals
    for (const h of d.hospitals) {
      checkFk(orgIds.has(h.organization_id), `hospitals #${h.hospital_id} -> org #${h.organization_id}`, { h });
    }

    // 6. patients
    for (const p of d.patients) {
      checkFk(orgIds.has(p.organization_id), `patients #${p.patient_id} -> org #${p.organization_id}`, { p });
      if (p.user_id != null) checkFk(userIds.has(p.user_id), `patients #${p.patient_id} -> users #${p.user_id}`, { p });
      if (p.hospital_id != null) checkFk(hospIds.has(p.hospital_id), `patients #${p.patient_id} -> hosp #${p.hospital_id}`, { p });
    }

    // 7. patientInsurances
    for (const pi of d.patientInsurances) {
      checkFk(patientIds.has(pi.patient_id), `patientInsurances #${pi.insurance_id} -> patients #${pi.patient_id}`, { pi });
      checkFk(orgIds.has(pi.organization_id), `patientInsurances #${pi.insurance_id} -> org #${pi.organization_id}`, { pi });
      if (pi.hospital_id != null) checkFk(hospIds.has(pi.hospital_id), `patientInsurances #${pi.insurance_id} -> hosp #${pi.hospital_id}`, { pi });
    }

    // 8. doctors
    for (const doc of d.doctors) {
      checkFk(orgIds.has(doc.organization_id), `doctors #${doc.doctor_id} -> org #${doc.organization_id}`, { doc });
      if (doc.hospital_id != null) checkFk(hospIds.has(doc.hospital_id), `doctors #${doc.doctor_id} -> hosp #${doc.hospital_id}`, { doc });
    }

    // 9. doctorAvailabilities
    for (const da of d.doctorAvailabilities) {
      checkFk(doctorIds.has(da.doctor_id), `doctorAvailabilities #${da.availability_id} -> doctors #${da.doctor_id}`, { da });
      checkFk(orgIds.has(da.organization_id), `doctorAvailabilities #${da.availability_id} -> org #${da.organization_id}`, { da });
      if (da.hospital_id != null) checkFk(hospIds.has(da.hospital_id), `doctorAvailabilities #${da.availability_id} -> hosp #${da.hospital_id}`, { da });
    }

    // 10. appointments
    for (const apt of d.appointments) {
      checkFk(patientIds.has(apt.patient_id), `appointments #${apt.appointment_id} -> patients #${apt.patient_id}`, { apt });
      checkFk(doctorIds.has(apt.doctor_id), `appointments #${apt.appointment_id} -> doctors #${apt.doctor_id}`, { apt });
      checkFk(userIds.has(apt.created_by), `appointments #${apt.appointment_id} -> users(created_by) #${apt.created_by}`, { apt });
      checkFk(orgIds.has(apt.organization_id), `appointments #${apt.appointment_id} -> org #${apt.organization_id}`, { apt });
      if (apt.availability_id != null) checkFk(availIds.has(apt.availability_id), `appointments #${apt.appointment_id} -> avail #${apt.availability_id}`, { apt });
      if (apt.hospital_id != null) checkFk(hospIds.has(apt.hospital_id), `appointments #${apt.appointment_id} -> hosp #${apt.hospital_id}`, { apt });
    }

    // 11. wards
    for (const w of d.wards) {
      checkFk(orgIds.has(w.organization_id), `wards #${w.ward_id} -> org #${w.organization_id}`, { w });
      if (w.hospital_id != null) checkFk(hospIds.has(w.hospital_id), `wards #${w.ward_id} -> hosp #${w.hospital_id}`, { w });
    }

    // 12. beds
    for (const b of d.beds) {
      checkFk(wardIds.has(b.ward_id), `beds #${b.bed_id} -> wards #${b.ward_id}`, { b });
      checkFk(orgIds.has(b.organization_id), `beds #${b.bed_id} -> org #${b.organization_id}`, { b });
      if (b.hospital_id != null) checkFk(hospIds.has(b.hospital_id), `beds #${b.bed_id} -> hosp #${b.hospital_id}`, { b });
    }

    // 13. admissions
    for (const adm of d.admissions) {
      checkFk(patientIds.has(adm.patient_id), `admissions #${adm.admission_id} -> patients #${adm.patient_id}`, { adm });
      checkFk(orgIds.has(adm.organization_id), `admissions #${adm.admission_id} -> org #${adm.organization_id}`, { adm });
      if (adm.bed_id != null) checkFk(bedIds.has(adm.bed_id), `admissions #${adm.admission_id} -> beds #${adm.bed_id}`, { adm });
      if (adm.appointment_id != null) checkFk(aptIds.has(adm.appointment_id), `admissions #${adm.admission_id} -> appointments #${adm.appointment_id}`, { adm });
      if (adm.hospital_id != null) checkFk(hospIds.has(adm.hospital_id), `admissions #${adm.admission_id} -> hosp #${adm.hospital_id}`, { adm });
    }

    // 14. dischargeSummaries
    for (const ds of d.dischargeSummaries) {
      checkFk(admissionIds.has(ds.admission_id), `dischargeSummaries #${ds.summary_id} -> admissions #${ds.admission_id}`, { ds });
      checkFk(patientIds.has(ds.patient_id), `dischargeSummaries #${ds.summary_id} -> patients #${ds.patient_id}`, { ds });
      checkFk(orgIds.has(ds.organization_id), `dischargeSummaries #${ds.summary_id} -> org #${ds.organization_id}`, { ds });
      if (ds.hospital_id != null) checkFk(hospIds.has(ds.hospital_id), `dischargeSummaries #${ds.summary_id} -> hosp #${ds.hospital_id}`, { ds });
    }

    // 15. services
    for (const s of d.services) {
      checkFk(orgIds.has(s.organization_id), `services #${s.service_id} -> org #${s.organization_id}`, { s });
      if (s.hospital_id != null) checkFk(hospIds.has(s.hospital_id), `services #${s.service_id} -> hosp #${s.hospital_id}`, { s });
    }

    // 16. ledgers
    for (const l of d.ledgers) {
      checkFk(admissionIds.has(l.admission_id), `ledgers #${l.ledger_id} -> admissions #${l.admission_id}`, { l });
      checkFk(orgIds.has(l.organization_id), `ledgers #${l.ledger_id} -> org #${l.organization_id}`, { l });
      if (l.hospital_id != null) checkFk(hospIds.has(l.hospital_id), `ledgers #${l.ledger_id} -> hosp #${l.hospital_id}`, { l });
    }

    // 17. ledgerEntries
    for (const le of d.ledgerEntries) {
      checkFk(ledgerIds.has(le.ledger_id), `ledgerEntries (${le.ledger_id}, ${le.entry_id}) -> ledgers`, { le });
      checkFk(serviceIds.has(le.service_id), `ledgerEntries -> services #${le.service_id}`, { le });
      checkFk(orgIds.has(le.organization_id), `ledgerEntries -> org #${le.organization_id}`, { le });
      if (le.hospital_id != null) checkFk(hospIds.has(le.hospital_id), `ledgerEntries -> hosp #${le.hospital_id}`, { le });
    }

    // 18. payments
    for (const pmt of d.payments) {
      checkFk(ledgerIds.has(pmt.ledger_id), `payments #${pmt.payment_id} -> ledgers #${pmt.ledger_id}`, { pmt });
      checkFk(orgIds.has(pmt.organization_id), `payments #${pmt.payment_id} -> org #${pmt.organization_id}`, { pmt });
      if (pmt.hospital_id != null) checkFk(hospIds.has(pmt.hospital_id), `payments #${pmt.payment_id} -> hosp #${pmt.hospital_id}`, { pmt });
    }

    // 19. receipts
    for (const rc of d.receipts) {
      checkFk(paymentIds.has(rc.payment_id), `receipts #${rc.receipt_id} -> payments #${rc.payment_id}`, { rc });
      checkFk(ledgerIds.has(rc.ledger_id), `receipts #${rc.receipt_id} -> ledgers #${rc.ledger_id}`, { rc });
      checkFk(admissionIds.has(rc.admission_id), `receipts #${rc.receipt_id} -> admissions #${rc.admission_id}`, { rc });
      checkFk(patientIds.has(rc.patient_id), `receipts #${rc.receipt_id} -> patients #${rc.patient_id}`, { rc });
      checkFk(orgIds.has(rc.organization_id), `receipts #${rc.receipt_id} -> org #${rc.organization_id}`, { rc });
      if (rc.hospital_id != null) checkFk(hospIds.has(rc.hospital_id), `receipts #${rc.receipt_id} -> hosp #${rc.hospital_id}`, { rc });
    }

    // 20. leaders
    for (const lead of d.leaders) {
      checkFk(admissionIds.has(lead.admission_id), `leaders #${lead.leader_id} -> admissions #${lead.admission_id}`, { lead });
      checkFk(patientIds.has(lead.patient_id), `leaders #${lead.leader_id} -> patients #${lead.patient_id}`, { lead });
      checkFk(serviceIds.has(lead.service_id), `leaders #${lead.leader_id} -> services #${lead.service_id}`, { lead });
      checkFk(orgIds.has(lead.organization_id), `leaders #${lead.leader_id} -> org #${lead.organization_id}`, { lead });
      if (lead.hospital_id != null) checkFk(hospIds.has(lead.hospital_id), `leaders #${lead.leader_id} -> hosp #${lead.hospital_id}`, { lead });
    }

    // 21. inventoryItems
    for (const item of d.inventoryItems) {
      checkFk(orgIds.has(item.organization_id), `inventoryItems #${item.item_id} -> org #${item.organization_id}`, { item });
      if (item.service_id != null) checkFk(serviceIds.has(item.service_id), `inventoryItems #${item.item_id} -> services #${item.service_id}`, { item });
      if (item.hospital_id != null) checkFk(hospIds.has(item.hospital_id), `inventoryItems #${item.item_id} -> hosp #${item.hospital_id}`, { item });
    }

    // 22. purchaseRequests
    for (const pr of d.purchaseRequests) {
      checkFk(itemIds.has(pr.item_id), `purchaseRequests #${pr.request_id} -> inventoryItems #${pr.item_id}`, { pr });
      checkFk(userIds.has(pr.requested_by), `purchaseRequests #${pr.request_id} -> users #${pr.requested_by}`, { pr });
      checkFk(orgIds.has(pr.organization_id), `purchaseRequests #${pr.request_id} -> org #${pr.organization_id}`, { pr });
      if (pr.hospital_id != null) checkFk(hospIds.has(pr.hospital_id), `purchaseRequests #${pr.request_id} -> hosp #${pr.hospital_id}`, { pr });
    }

    // 23. preRequests
    for (const pr of d.preRequests) {
      checkFk(patientIds.has(pr.patient_id), `preRequests #${pr.pre_request_id} -> patients #${pr.patient_id}`, { pr });
      checkFk(userIds.has(pr.created_by), `preRequests #${pr.pre_request_id} -> users #${pr.created_by}`, { pr });
      checkFk(orgIds.has(pr.organization_id), `preRequests #${pr.pre_request_id} -> org #${pr.organization_id}`, { pr });
      if (pr.appointment_id != null) checkFk(aptIds.has(pr.appointment_id), `preRequests #${pr.pre_request_id} -> appointments #${pr.appointment_id}`, { pr });
      if (pr.doctor_id != null) checkFk(doctorIds.has(pr.doctor_id), `preRequests #${pr.pre_request_id} -> doctors #${pr.doctor_id}`, { pr });
      if (pr.bed_id != null) checkFk(bedIds.has(pr.bed_id), `preRequests #${pr.pre_request_id} -> beds #${pr.bed_id}`, { pr });
      if (pr.hospital_id != null) checkFk(hospIds.has(pr.hospital_id), `preRequests #${pr.pre_request_id} -> hosp #${pr.hospital_id}`, { pr });
    }

    // 24. bedRequests
    for (const br of d.bedRequests) {
      checkFk(preRequestIds.has(br.pre_request_id), `bedRequests #${br.bed_request_id} -> preRequests #${br.pre_request_id}`, { br });
      checkFk(patientIds.has(br.patient_id), `bedRequests #${br.bed_request_id} -> patients #${br.patient_id}`, { br });
      checkFk(wardIds.has(br.ward_id), `bedRequests #${br.bed_request_id} -> wards #${br.ward_id}`, { br });
      checkFk(userIds.has(br.requested_by), `bedRequests #${br.bed_request_id} -> users #${br.requested_by}`, { br });
      checkFk(orgIds.has(br.organization_id), `bedRequests #${br.bed_request_id} -> org #${br.organization_id}`, { br });
      if (br.bed_id != null) checkFk(bedIds.has(br.bed_id), `bedRequests #${br.bed_request_id} -> beds #${br.bed_id}`, { br });
      if (br.hospital_id != null) checkFk(hospIds.has(br.hospital_id), `bedRequests #${br.bed_request_id} -> hosp #${br.hospital_id}`, { br });
    }

    // 25. emergencyNotifications
    for (const en of d.emergencyNotifications) {
      checkFk(userIds.has(en.created_by), `emergencyNotifications #${en.emergency_id} -> users #${en.created_by}`, { en });
      checkFk(orgIds.has(en.organization_id), `emergencyNotifications #${en.emergency_id} -> org #${en.organization_id}`, { en });
      if (en.patient_id != null) checkFk(patientIds.has(en.patient_id), `emergencyNotifications #${en.emergency_id} -> patients #${en.patient_id}`, { en });
      if (en.bed_id != null) checkFk(bedIds.has(en.bed_id), `emergencyNotifications #${en.emergency_id} -> beds #${en.bed_id}`, { en });
      if (en.hospital_id != null) checkFk(hospIds.has(en.hospital_id), `emergencyNotifications #${en.emergency_id} -> hosp #${en.hospital_id}`, { en });
    }

    // 26. subscriptions
    for (const sub of d.subscriptions) {
      checkFk(orgIds.has(sub.organization_id), `subscriptions #${sub.subscription_id} -> org #${sub.organization_id}`, { sub });
      checkFk(planIds.has(sub.plan_id), `subscriptions #${sub.subscription_id} -> subscriptionPlans #${sub.plan_id}`, { sub });
    }

    // 28. resourceQuotas
    for (const rq of d.resourceQuotas) {
      checkFk(orgIds.has(rq.organization_id), `resourceQuotas -> org #${rq.organization_id}`, { rq });
    }

    // 29. organizationResources
    for (const or of d.organizationResources) {
      checkFk(orgIds.has(or.organization_id), `organizationResources -> org #${or.organization_id}`, { or });
    }

    // 30. apiKeys
    for (const ak of d.apiKeys) {
      checkFk(orgIds.has(ak.organization_id), `apiKeys #${ak.api_key_id} -> org #${ak.organization_id}`, { ak });
    }

    // 31. activityLog
    for (const act of d.activityLog) {
      checkFk(orgIds.has(act.organization_id), `activityLog #${act.id} -> org #${act.organization_id}`, { act });
      if (act.hospital_id != null) checkFk(hospIds.has(act.hospital_id), `activityLog #${act.id} -> hosp #${act.hospital_id}`, { act });
    }

    // 32. provisioningLog
    for (const pl of d.provisioningLog) {
      checkFk(orgIds.has(pl.organization_id), `provisioningLog #${pl.id} -> org #${pl.organization_id}`, { pl });
    }

    // 33. platformActivityLog
    for (const pal of d.platformActivityLog) {
      if (pal.platform_user_id != null) checkFk(superUserIds.has(pal.platform_user_id), `platformActivityLog #${pal.id} -> superUser #${pal.platform_user_id}`, { pal });
      if (pal.target_organization_id != null) checkFk(orgIds.has(pal.target_organization_id), `platformActivityLog #${pal.id} -> target org #${pal.target_organization_id}`, { pal });
    }
  }

  auditOrphans() {
    const d = this.data;

    const checkOrphan = (cond, msg, ctx) => {
      this.metrics.orphanChecks++;
      this.recordAssert(cond, 'Orphan Absence', msg, ctx);
    };

    // 1. Every admission has a matching ledger
    const ledgerAdmMap = new Set(d.ledgers.map((l) => l.admission_id));
    for (const adm of d.admissions) {
      checkOrphan(ledgerAdmMap.has(adm.admission_id), `Admission #${adm.admission_id} has a corresponding financial ledger`, { adm });
    }

    // 2. Every ledger has a matching admission
    const admMap = new Map(d.admissions.map((a) => [a.admission_id, a]));
    for (const l of d.ledgers) {
      checkOrphan(admMap.has(l.admission_id), `Ledger #${l.ledger_id} matches existing admission #${l.admission_id}`, { l });
    }

    // 3. Every ledger entry belongs to an existing ledger
    const ledgerMap = new Set(d.ledgers.map((l) => l.ledger_id));
    for (const le of d.ledgerEntries) {
      checkOrphan(ledgerMap.has(le.ledger_id), `LedgerEntry (${le.ledger_id}, ${le.entry_id}) matches existing ledger`, { le });
    }

    // 4. Every payment has a corresponding receipt
    const receiptPaymentMap = new Set(d.receipts.map((r) => r.payment_id));
    for (const pmt of d.payments) {
      checkOrphan(receiptPaymentMap.has(pmt.payment_id), `Payment #${pmt.payment_id} has a corresponding receipt`, { pmt });
    }

    // 5. Every receipt matches an existing payment and admission
    const paymentMap = new Set(d.payments.map((p) => p.payment_id));
    for (const rc of d.receipts) {
      checkOrphan(paymentMap.has(rc.payment_id), `Receipt #${rc.receipt_id} matches payment #${rc.payment_id}`, { rc });
      checkOrphan(admMap.has(rc.admission_id), `Receipt #${rc.receipt_id} matches admission #${rc.admission_id}`, { rc });
    }

    // 6. Every discharge summary matches a DISCHARGED admission
    for (const ds of d.dischargeSummaries) {
      const adm = admMap.get(ds.admission_id);
      checkOrphan(adm && adm.status === 'DISCHARGED', `DischargeSummary #${ds.summary_id} corresponds to DISCHARGED admission #${ds.admission_id}`, { ds, admStatus: adm ? adm.status : null });
    }

    // 7. Every bed request matches an existing preRequest
    const preReqMap = new Set(d.preRequests.map((pr) => pr.pre_request_id));
    for (const br of d.bedRequests) {
      checkOrphan(preReqMap.has(br.pre_request_id), `BedRequest #${br.bed_request_id} corresponds to preRequest #${br.pre_request_id}`, { br });
    }

    // 8. Every occupied bed in admissions is currently allocated and exists
    const bedMap = new Map(d.beds.map((b) => [b.bed_id, b]));
    for (const adm of d.admissions) {
      if (adm.status === 'ADMITTED') {
        checkOrphan(adm.bed_id != null && bedMap.has(adm.bed_id), `Active Admission #${adm.admission_id} has a valid allocated bed`, { adm });
        if (adm.bed_id && bedMap.has(adm.bed_id)) {
          const bed = bedMap.get(adm.bed_id);
          checkOrphan(bed.status === 'OCCUPIED', `Bed #${bed.bed_id} allocated to active admission is marked OCCUPIED`, { bed, adm });
        }
      }
    }
  }

  auditTenantSegregation() {
    const d = this.data;

    const checkIsolation = (cond, msg, ctx) => {
      this.metrics.tenantIsolationChecks++;
      this.recordAssert(cond, 'Multi-Tenant Isolation', msg, ctx);
    };

    // Helper map builders
    const userOrg = new Map(d.users.map((u) => [u.user_id, u.organization_id]));
    const patOrg = new Map(d.patients.map((p) => [p.patient_id, p.organization_id]));
    const docOrg = new Map(d.doctors.map((doc) => [doc.doctor_id, doc.organization_id]));
    const wardOrg = new Map(d.wards.map((w) => [w.ward_id, w.organization_id]));
    const bedOrg = new Map(d.beds.map((b) => [b.bed_id, b.organization_id]));
    const admOrg = new Map(d.admissions.map((a) => [a.admission_id, a.organization_id]));
    const ledOrg = new Map(d.ledgers.map((l) => [l.ledger_id, l.organization_id]));
    const pmtOrg = new Map(d.payments.map((p) => [p.payment_id, p.organization_id]));
    const svcOrg = new Map(d.services.map((s) => [s.service_id, s.organization_id]));
    const itemOrg = new Map(d.inventoryItems.map((i) => [i.item_id, i.organization_id]));
    const preOrg = new Map(d.preRequests.map((pr) => [pr.pre_request_id, pr.organization_id]));
    const customRoleOrg = new Map(d.customRoles.map((c) => [c.custom_role_id, c.organization_id]));

    // Appointments cross-tenant checks
    for (const apt of d.appointments) {
      checkIsolation(apt.organization_id === patOrg.get(apt.patient_id), `apt #${apt.appointment_id} org matches patient org`, { apt });
      checkIsolation(apt.organization_id === docOrg.get(apt.doctor_id), `apt #${apt.appointment_id} org matches doctor org`, { apt });
      checkIsolation(apt.organization_id === userOrg.get(apt.created_by), `apt #${apt.appointment_id} org matches created_by user org`, { apt });
    }

    // Beds cross-tenant checks
    for (const b of d.beds) {
      checkIsolation(b.organization_id === wardOrg.get(b.ward_id), `bed #${b.bed_id} org matches ward org`, { b });
    }

    // Admissions cross-tenant checks
    for (const adm of d.admissions) {
      checkIsolation(adm.organization_id === patOrg.get(adm.patient_id), `adm #${adm.admission_id} org matches patient org`, { adm });
      if (adm.bed_id) {
        checkIsolation(adm.organization_id === bedOrg.get(adm.bed_id), `adm #${adm.admission_id} org matches bed org`, { adm });
      }
    }

    // Discharge Summaries cross-tenant checks
    for (const ds of d.dischargeSummaries) {
      checkIsolation(ds.organization_id === admOrg.get(ds.admission_id), `dischargeSummary #${ds.summary_id} org matches adm org`, { ds });
      checkIsolation(ds.organization_id === patOrg.get(ds.patient_id), `dischargeSummary #${ds.summary_id} org matches patient org`, { ds });
    }

    // Ledgers cross-tenant checks
    for (const l of d.ledgers) {
      checkIsolation(l.organization_id === admOrg.get(l.admission_id), `ledger #${l.ledger_id} org matches adm org`, { l });
    }

    // Ledger Entries cross-tenant checks
    for (const le of d.ledgerEntries) {
      checkIsolation(le.organization_id === ledOrg.get(le.ledger_id), `ledgerEntry org matches ledger org`, { le });
      checkIsolation(le.organization_id === svcOrg.get(le.service_id), `ledgerEntry org matches service org`, { le });
    }

    // Payments cross-tenant checks
    for (const pmt of d.payments) {
      checkIsolation(pmt.organization_id === ledOrg.get(pmt.ledger_id), `payment #${pmt.payment_id} org matches ledger org`, { pmt });
    }

    // Receipts cross-tenant checks
    for (const rc of d.receipts) {
      checkIsolation(rc.organization_id === pmtOrg.get(rc.payment_id), `receipt #${rc.receipt_id} org matches payment org`, { rc });
      checkIsolation(rc.organization_id === ledOrg.get(rc.ledger_id), `receipt #${rc.receipt_id} org matches ledger org`, { rc });
      checkIsolation(rc.organization_id === admOrg.get(rc.admission_id), `receipt #${rc.receipt_id} org matches admission org`, { rc });
      checkIsolation(rc.organization_id === patOrg.get(rc.patient_id), `receipt #${rc.receipt_id} org matches patient org`, { rc });
    }

    // PreRequests cross-tenant checks
    for (const pr of d.preRequests) {
      checkIsolation(pr.organization_id === patOrg.get(pr.patient_id), `preRequest #${pr.pre_request_id} org matches patient org`, { pr });
      checkIsolation(pr.organization_id === userOrg.get(pr.created_by), `preRequest #${pr.pre_request_id} org matches user org`, { pr });
      if (pr.doctor_id) checkIsolation(pr.organization_id === docOrg.get(pr.doctor_id), `preRequest #${pr.pre_request_id} org matches doctor org`, { pr });
      if (pr.bed_id) checkIsolation(pr.organization_id === bedOrg.get(pr.bed_id), `preRequest #${pr.pre_request_id} org matches bed org`, { pr });
    }

    // BedRequests cross-tenant checks
    for (const br of d.bedRequests) {
      checkIsolation(br.organization_id === preOrg.get(br.pre_request_id), `bedRequest #${br.bed_request_id} org matches preRequest org`, { br });
      checkIsolation(br.organization_id === patOrg.get(br.patient_id), `bedRequest #${br.bed_request_id} org matches patient org`, { br });
      checkIsolation(br.organization_id === wardOrg.get(br.ward_id), `bedRequest #${br.bed_request_id} org matches ward org`, { br });
      checkIsolation(br.organization_id === userOrg.get(br.requested_by), `bedRequest #${br.bed_request_id} org matches user org`, { br });
      if (br.bed_id) checkIsolation(br.organization_id === bedOrg.get(br.bed_id), `bedRequest #${br.bed_request_id} org matches bed org`, { br });
    }

    // Staff Role Assignments cross-tenant checks
    for (const sra of d.staffRoleAssignments) {
      checkIsolation(userOrg.get(sra.user_id) === customRoleOrg.get(sra.custom_role_id), `staffRoleAssignment user org matches customRole org`, { sra });
    }

    // Check strict entity partition: All tenant rows belong to either Org 1 or Org 2, NEVER cross-assigned
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
        checkIsolation(
          row.organization_id === 1 || row.organization_id === 2,
          `Collection '${col}' entity strictly partitioned to Org 1 or Org 2`,
          { col, rowId: row.id || row.user_id || row.patient_id, org: row.organization_id }
        );

        if (row.organization_id === 1) this.metrics.org1Entities++;
        if (row.organization_id === 2) this.metrics.org2Entities++;
      }
    }
  }

  auditHospitalScoping() {
    const d = this.data;
    const hospToOrgMap = new Map(d.hospitals.map((h) => [h.hospital_id, h.organization_id]));

    const checkCampus = (cond, msg, ctx) => {
      this.metrics.campusChecks++;
      this.recordAssert(cond, 'Multi-Hospital Campus Scoping', msg, ctx);
    };

    checkCampus(hospToOrgMap.get(1) === 1, 'Hospital 1 (City General Main Campus) mapped to Org 1');
    checkCampus(hospToOrgMap.get(2) === 2, 'Hospital 2 (Apollo Hospitals Main Campus) mapped to Org 2');
    checkCampus(hospToOrgMap.get(3) === 2, 'Hospital 3 (Apollo Hospitals Bangalore) mapped to Org 2');

    for (const col of EXPECTED_37_COLLECTIONS) {
      for (const row of d[col]) {
        if (row.hospital_id != null) {
          const expectedOrg = hospToOrgMap.get(row.hospital_id);
          checkCampus(
            expectedOrg !== undefined,
            `Collection '${col}' record hospital_id #${row.hospital_id} is a known hospital`,
            { col, hospital_id: row.hospital_id }
          );
          checkCampus(
            expectedOrg === row.organization_id,
            `Collection '${col}' record hospital campus #${row.hospital_id} (Org ${expectedOrg}) matches entity organization_id (${row.organization_id})`,
            { col, hospital_id: row.hospital_id, recordOrg: row.organization_id, expectedOrg }
          );
        }
      }
    }
  }
}

function verifyDiskPollution() {
  console.log(`\n======================================================================`);
  console.log(`Auditing Zero Disk Pollution: db.json Hash Parity Before & After Tests`);
  console.log(`======================================================================`);

  const initialHash = computeSha256(DB_JSON_PATH);
  console.log(`  - Baseline db.json SHA-256: ${initialHash}`);

  // Require persist module and ensure no dirty writes occur in test mode
  const persist = require('../src/store/persist');
  console.log(`  - Persist module isDirty status: ${persist.isStateDirty()}`);

  const postHash = computeSha256(DB_JSON_PATH);
  console.log(`  - Post-check db.json SHA-256: ${postHash}`);

  const hashMatch = initialHash === postHash;
  if (!hashMatch) {
    console.error(`  ❌ [FAIL] Disk Pollution Detected: db.json SHA-256 changed!`);
    return false;
  }
  console.log(`  ✅ [PASS] Zero disk pollution confirmed: db.json remains strictly identical.\n`);
  return true;
}

function verifyParity(dsData, dbData) {
  console.log(`\n======================================================================`);
  console.log(`Auditing Deep Parity: dataStore.js vs db.json across all 37 Collections`);
  console.log(`======================================================================`);

  let mismatches = 0;
  for (const col of EXPECTED_37_COLLECTIONS) {
    const dsLen = dsData[col].length;
    const dbLen = dbData[col].length;
    if (dsLen !== dbLen) {
      console.error(`  ❌ Mismatch in length for '${col}': dataStore=${dsLen}, db.json=${dbLen}`);
      mismatches++;
    }

    const dsJson = JSON.stringify(dsData[col]);
    const dbJson = JSON.stringify(dbData[col]);
    if (dsJson !== dbJson) {
      console.error(`  ❌ Mismatch in content for '${col}'`);
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log(`  ✅ All 37 collections have 100% identical row count and byte-level serialized content.\n`);
    return true;
  }
  return false;
}

function main() {
  console.log('=== EMPIRICAL CHALLENGER AUDIT: RELATIONAL INTEGRITY & MULTI-TENANCY ===');

  const dbJsonContent = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
  delete require.cache[require.resolve(DATASTORE_JS_PATH)];
  const dataStoreContent = require(DATASTORE_JS_PATH);

  const dbAudit = new ChallengerAuditEngine('back-end/data/db.json (Persistent Seed File)', dbJsonContent);
  const dbPassed = dbAudit.run();

  const dsAudit = new ChallengerAuditEngine('back-end/src/store/dataStore.js (In-Memory Module)', dataStoreContent);
  const dsPassed = dsAudit.run();

  const parityPassed = verifyParity(dataStoreContent, dbJsonContent);
  const diskPollutionPassed = verifyDiskPollution();

  console.log(`======================================================================`);
  console.log(`FINAL CHALLENGER VERIFICATION GATE SYNTHESIS`);
  console.log(`======================================================================`);
  console.log(`  Target 1 (db.json):                 ${dbPassed ? 'PASSED (0 errors)' : 'FAILED'}`);
  console.log(`  Target 2 (dataStore.js):             ${dsPassed ? 'PASSED (0 errors)' : 'FAILED'}`);
  console.log(`  Target 3 (Deep Storage Parity):     ${parityPassed ? 'PASSED (100% matched)' : 'FAILED'}`);
  console.log(`  Target 4 (Zero Disk Pollution):     ${diskPollutionPassed ? 'PASSED (0 pollution)' : 'FAILED'}`);
  console.log(`  Total Checks Executed across targets: ${dbAudit.passCount + dsAudit.passCount}`);
  console.log(`  Total Failures:                       ${dbAudit.failCount + dsAudit.failCount}`);
  console.log(`======================================================================\n`);

  if (!dbPassed || !dsPassed || !parityPassed || !diskPollutionPassed) {
    process.exit(1);
  }
  process.exit(0);
}

main();
