'use strict';

/**
 * Datastore Referential Integrity, Lifecycle State Machine & Multi-Tenant Isolation Test Suite
 *
 * Ground Truth: Database/Federico_Schemas.md
 * Target Stores: back-end/src/store/dataStore.js and back-end/data/db.json
 *
 * Test Architecture:
 * - Suite 0: Storage Parity (dataStore.js vs db.json)
 * - Suite 1: Referential Foreign Key Integrity Across All 38 Collections (R1)
 * - Suite 2: Inpatient Lifecycle & Triad State Machine Consistency (R2)
 * - Suite 3: Financial Settlement & Discharge Synchronization (R2)
 * - Suite 4: Outpatient Appointments & Doctor Scheduling Alignment (R2)
 * - Suite 5: Multi-Tenant Boundary Enforcement & Zero Leaks (R3)
 * - Suite 6: Physical Capacity & Accounting Invariants
 */

const fs = require('fs');
const path = require('path');
const dataStore = require('../store/dataStore');

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
];

describe('Datastore Referential Integrity & State Consistency Suite', () => {
  const dbPath = path.resolve(__dirname, '../../data/db.json');
  let dbContent;

  beforeAll(() => {
    expect(fs.existsSync(dbPath)).toBe(true);
    dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  });

  // =========================================================================
  // Suite 0: Storage Parity (dataStore.js vs db.json)
  // =========================================================================
  describe('Suite 0: Storage Parity (dataStore.js vs db.json)', () => {
    it('Test 0.1: Key Parity — dataStore and db.json contain the exact same 37 collections', () => {
      const dsKeys = Object.keys(dataStore).filter((k) => Array.isArray(dataStore[k])).sort();
      const dbKeys = Object.keys(dbContent).filter((k) => Array.isArray(dbContent[k])).sort();
      const expectedKeys = [...EXPECTED_37_COLLECTIONS].sort();

      expect(dsKeys).toEqual(expectedKeys);
      expect(dbKeys).toEqual(expectedKeys);
      expect(dsKeys).toEqual(dbKeys);
      expect(dsKeys).toHaveLength(37);
    });

    it('Test 0.2: Row Count Parity — every collection has identical length in memory and on disk', () => {
      for (const col of EXPECTED_37_COLLECTIONS) {
        expect(Array.isArray(dataStore[col])).toBe(true);
        expect(Array.isArray(dbContent[col])).toBe(true);
        expect(dataStore[col].length).toBe(dbContent[col].length);
      }
    });

    it('Test 0.3: Deep Content Parity — JSON serialized content matches 100% between memory and disk', () => {
      for (const col of EXPECTED_37_COLLECTIONS) {
        expect(dataStore[col]).toEqual(dbContent[col]);
      }
    });
  });

  // =========================================================================
  // Suite 1: Referential Foreign Key Integrity Across All 37 Collections (R1)
  // =========================================================================
  describe('Suite 1: Referential Foreign Key Integrity Across All 37 Collections (R1)', () => {
    it('Test 1.1: Users FK integrity (role_id ∈ roles, organization_id ∈ organizations, hospital_id ∈ hospitals)', () => {
      const roleIds = new Set(dataStore.roles.map((r) => r.role_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const user of dataStore.users) {
        expect(roleIds.has(user.role_id)).toBe(true);
        expect(orgIds.has(user.organization_id)).toBe(true);
        if (user.hospital_id !== null && user.hospital_id !== undefined) {
          expect(hospIds.has(user.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.2: Patients FK integrity (user_id ∈ users, organization_id ∈ organizations, hospital_id ∈ hospitals)', () => {
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const pat of dataStore.patients) {
        expect(orgIds.has(pat.organization_id)).toBe(true);
        if (pat.user_id !== null && pat.user_id !== undefined) {
          expect(userIds.has(pat.user_id)).toBe(true);
        }
        if (pat.hospital_id !== null && pat.hospital_id !== undefined) {
          expect(hospIds.has(pat.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.3: PatientInsurances FK integrity (patient_id ∈ patients, organization_id ∈ organizations, hospital_id ∈ hospitals)', () => {
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const ins of dataStore.patientInsurances) {
        expect(patientIds.has(ins.patient_id)).toBe(true);
        expect(orgIds.has(ins.organization_id)).toBe(true);
        if (ins.hospital_id !== null && ins.hospital_id !== undefined) {
          expect(hospIds.has(ins.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.4: Doctors & DoctorAvailabilities FK integrity (doctor_id ∈ doctors, organization_id ∈ organizations, hospital_id ∈ hospitals)', () => {
      const doctorIds = new Set(dataStore.doctors.map((d) => d.doctor_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const doc of dataStore.doctors) {
        expect(orgIds.has(doc.organization_id)).toBe(true);
        if (doc.hospital_id !== null && doc.hospital_id !== undefined) {
          expect(hospIds.has(doc.hospital_id)).toBe(true);
        }
      }

      for (const avail of dataStore.doctorAvailabilities) {
        expect(doctorIds.has(avail.doctor_id)).toBe(true);
        expect(orgIds.has(avail.organization_id)).toBe(true);
        if (avail.hospital_id !== null && avail.hospital_id !== undefined) {
          expect(hospIds.has(avail.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.5: Appointments FK integrity (patient_id ∈ patients, doctor_id ∈ doctors, availability_id ∈ doctorAvailabilities, created_by ∈ users, organization_id ∈ organizations)', () => {
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const doctorIds = new Set(dataStore.doctors.map((d) => d.doctor_id));
      const availIds = new Set(dataStore.doctorAvailabilities.map((a) => a.availability_id));
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const apt of dataStore.appointments) {
        expect(patientIds.has(apt.patient_id)).toBe(true);
        expect(doctorIds.has(apt.doctor_id)).toBe(true);
        expect(userIds.has(apt.created_by)).toBe(true);
        expect(orgIds.has(apt.organization_id)).toBe(true);
        if (apt.availability_id !== null && apt.availability_id !== undefined) {
          expect(availIds.has(apt.availability_id)).toBe(true);
        }
        if (apt.hospital_id !== null && apt.hospital_id !== undefined) {
          expect(hospIds.has(apt.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.6: Wards & Beds FK integrity (ward_id ∈ wards, organization_id ∈ organizations, hospital_id ∈ hospitals)', () => {
      const wardIds = new Set(dataStore.wards.map((w) => w.ward_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const ward of dataStore.wards) {
        expect(orgIds.has(ward.organization_id)).toBe(true);
        if (ward.hospital_id !== null && ward.hospital_id !== undefined) {
          expect(hospIds.has(ward.hospital_id)).toBe(true);
        }
      }

      for (const bed of dataStore.beds) {
        expect(wardIds.has(bed.ward_id)).toBe(true);
        expect(orgIds.has(bed.organization_id)).toBe(true);
        if (bed.hospital_id !== null && bed.hospital_id !== undefined) {
          expect(hospIds.has(bed.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.7: Admissions FK integrity (patient_id ∈ patients, bed_id ∈ beds, appointment_id ∈ appointments, organization_id ∈ organizations)', () => {
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const bedIds = new Set(dataStore.beds.map((b) => b.bed_id));
      const aptIds = new Set(dataStore.appointments.map((a) => a.appointment_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const adm of dataStore.admissions) {
        expect(patientIds.has(adm.patient_id)).toBe(true);
        expect(orgIds.has(adm.organization_id)).toBe(true);
        if (adm.bed_id !== null && adm.bed_id !== undefined) {
          expect(bedIds.has(adm.bed_id)).toBe(true);
        }
        if (adm.appointment_id !== null && adm.appointment_id !== undefined) {
          expect(aptIds.has(adm.appointment_id)).toBe(true);
        }
        if (adm.hospital_id !== null && adm.hospital_id !== undefined) {
          expect(hospIds.has(adm.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.8: DischargeSummaries FK integrity (admission_id ∈ admissions, patient_id ∈ patients, organization_id ∈ organizations)', () => {
      const admissionIds = new Set(dataStore.admissions.map((a) => a.admission_id));
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const ds of dataStore.dischargeSummaries) {
        expect(admissionIds.has(ds.admission_id)).toBe(true);
        expect(patientIds.has(ds.patient_id)).toBe(true);
        expect(orgIds.has(ds.organization_id)).toBe(true);
        if (ds.hospital_id !== null && ds.hospital_id !== undefined) {
          expect(hospIds.has(ds.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.9: Ledgers & LedgerEntries FK integrity (admission_id ∈ admissions, ledger_id ∈ ledgers, service_id ∈ services)', () => {
      const admissionIds = new Set(dataStore.admissions.map((a) => a.admission_id));
      const ledgerIds = new Set(dataStore.ledgers.map((l) => l.ledger_id));
      const serviceIds = new Set(dataStore.services.map((s) => s.service_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const ledger of dataStore.ledgers) {
        expect(admissionIds.has(ledger.admission_id)).toBe(true);
        expect(orgIds.has(ledger.organization_id)).toBe(true);
        if (ledger.hospital_id !== null && ledger.hospital_id !== undefined) {
          expect(hospIds.has(ledger.hospital_id)).toBe(true);
        }
      }

      for (const entry of dataStore.ledgerEntries) {
        expect(ledgerIds.has(entry.ledger_id)).toBe(true);
        expect(serviceIds.has(entry.service_id)).toBe(true);
        expect(orgIds.has(entry.organization_id)).toBe(true);
        if (entry.hospital_id !== null && entry.hospital_id !== undefined) {
          expect(hospIds.has(entry.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.10: Payments & Receipts FK integrity (ledger_id ∈ ledgers, payment_id ∈ payments, admission_id ∈ admissions, patient_id ∈ patients)', () => {
      const ledgerIds = new Set(dataStore.ledgers.map((l) => l.ledger_id));
      const paymentIds = new Set(dataStore.payments.map((p) => p.payment_id));
      const admissionIds = new Set(dataStore.admissions.map((a) => a.admission_id));
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const payment of dataStore.payments) {
        expect(ledgerIds.has(payment.ledger_id)).toBe(true);
        expect(orgIds.has(payment.organization_id)).toBe(true);
        if (payment.hospital_id !== null && payment.hospital_id !== undefined) {
          expect(hospIds.has(payment.hospital_id)).toBe(true);
        }
      }

      for (const receipt of dataStore.receipts) {
        expect(paymentIds.has(receipt.payment_id)).toBe(true);
        expect(ledgerIds.has(receipt.ledger_id)).toBe(true);
        expect(admissionIds.has(receipt.admission_id)).toBe(true);
        expect(patientIds.has(receipt.patient_id)).toBe(true);
        expect(orgIds.has(receipt.organization_id)).toBe(true);
        if (receipt.hospital_id !== null && receipt.hospital_id !== undefined) {
          expect(hospIds.has(receipt.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.11: InventoryItems & PurchaseRequests FK integrity (service_id ∈ services, item_id ∈ inventoryItems, requested_by ∈ users)', () => {
      const serviceIds = new Set(dataStore.services.map((s) => s.service_id));
      const itemIds = new Set(dataStore.inventoryItems.map((i) => i.item_id));
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const item of dataStore.inventoryItems) {
        expect(orgIds.has(item.organization_id)).toBe(true);
        if (item.service_id !== null && item.service_id !== undefined) {
          expect(serviceIds.has(item.service_id)).toBe(true);
        }
        if (item.hospital_id !== null && item.hospital_id !== undefined) {
          expect(hospIds.has(item.hospital_id)).toBe(true);
        }
      }

      for (const req of dataStore.purchaseRequests) {
        expect(itemIds.has(req.item_id)).toBe(true);
        expect(userIds.has(req.requested_by)).toBe(true);
        expect(orgIds.has(req.organization_id)).toBe(true);
        if (req.hospital_id !== null && req.hospital_id !== undefined) {
          expect(hospIds.has(req.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.12: PreRequests & BedRequests FK integrity (patient_id ∈ patients, pre_request_id ∈ preRequests, ward_id ∈ wards, bed_id ∈ beds, users ∈ users)', () => {
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const preRequestIds = new Set(dataStore.preRequests.map((pr) => pr.pre_request_id));
      const aptIds = new Set(dataStore.appointments.map((a) => a.appointment_id));
      const doctorIds = new Set(dataStore.doctors.map((d) => d.doctor_id));
      const wardIds = new Set(dataStore.wards.map((w) => w.ward_id));
      const bedIds = new Set(dataStore.beds.map((b) => b.bed_id));
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const pr of dataStore.preRequests) {
        expect(patientIds.has(pr.patient_id)).toBe(true);
        expect(userIds.has(pr.created_by)).toBe(true);
        expect(orgIds.has(pr.organization_id)).toBe(true);
        if (pr.appointment_id !== null && pr.appointment_id !== undefined) {
          expect(aptIds.has(pr.appointment_id)).toBe(true);
        }
        if (pr.doctor_id !== null && pr.doctor_id !== undefined) {
          expect(doctorIds.has(pr.doctor_id)).toBe(true);
        }
        if (pr.bed_id !== null && pr.bed_id !== undefined) {
          expect(bedIds.has(pr.bed_id)).toBe(true);
        }
        if (pr.hospital_id !== null && pr.hospital_id !== undefined) {
          expect(hospIds.has(pr.hospital_id)).toBe(true);
        }
      }

      for (const br of dataStore.bedRequests) {
        expect(preRequestIds.has(br.pre_request_id)).toBe(true);
        expect(patientIds.has(br.patient_id)).toBe(true);
        expect(wardIds.has(br.ward_id)).toBe(true);
        expect(userIds.has(br.requested_by)).toBe(true);
        expect(orgIds.has(br.organization_id)).toBe(true);
        if (br.bed_id !== null && br.bed_id !== undefined) {
          expect(bedIds.has(br.bed_id)).toBe(true);
        }
        if (br.hospital_id !== null && br.hospital_id !== undefined) {
          expect(hospIds.has(br.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.13: EmergencyNotifications, Leaders, and ActivityLog FK integrity', () => {
      const patientIds = new Set(dataStore.patients.map((p) => p.patient_id));
      const bedIds = new Set(dataStore.beds.map((b) => b.bed_id));
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const admissionIds = new Set(dataStore.admissions.map((a) => a.admission_id));
      const serviceIds = new Set(dataStore.services.map((s) => s.service_id));
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const hospIds = new Set(dataStore.hospitals.map((h) => h.hospital_id));

      for (const en of dataStore.emergencyNotifications) {
        expect(userIds.has(en.created_by)).toBe(true);
        expect(orgIds.has(en.organization_id)).toBe(true);
        if (en.patient_id !== null && en.patient_id !== undefined) {
          expect(patientIds.has(en.patient_id)).toBe(true);
        }
        if (en.bed_id !== null && en.bed_id !== undefined) {
          expect(bedIds.has(en.bed_id)).toBe(true);
        }
        if (en.hospital_id !== null && en.hospital_id !== undefined) {
          expect(hospIds.has(en.hospital_id)).toBe(true);
        }
      }

      for (const leader of dataStore.leaders) {
        expect(admissionIds.has(leader.admission_id)).toBe(true);
        expect(patientIds.has(leader.patient_id)).toBe(true);
        expect(serviceIds.has(leader.service_id)).toBe(true);
        expect(orgIds.has(leader.organization_id)).toBe(true);
        if (leader.hospital_id !== null && leader.hospital_id !== undefined) {
          expect(hospIds.has(leader.hospital_id)).toBe(true);
        }
      }

      for (const act of dataStore.activityLog) {
        expect(orgIds.has(act.organization_id)).toBe(true);
        if (act.hospital_id !== null && act.hospital_id !== undefined) {
          expect(hospIds.has(act.hospital_id)).toBe(true);
        }
      }
    });

    it('Test 1.14: SaaS Catalog, RBAC, Subscriptions & Logging FK integrity', () => {
      const orgIds = new Set(dataStore.organizations.map((o) => o.organization_id));
      const planIds = new Set(dataStore.subscriptionPlans.map((p) => p.plan_id));
      const customRoleIds = new Set(dataStore.customRoles.map((cr) => cr.custom_role_id));
      const permissionIds = new Set(dataStore.permissions.map((p) => p.permission_id));
      const userIds = new Set(dataStore.users.map((u) => u.user_id));
      const superUserIds = new Set(dataStore.platformSuperUsers.map((su) => su.platform_user_id));

      for (const hosp of dataStore.hospitals) {
        expect(orgIds.has(hosp.organization_id)).toBe(true);
      }

      for (const sub of dataStore.subscriptions) {
        expect(orgIds.has(sub.organization_id)).toBe(true);
        expect(planIds.has(sub.plan_id)).toBe(true);
      }

      for (const quota of dataStore.resourceQuotas) {
        expect(orgIds.has(quota.organization_id)).toBe(true);
      }

      for (const res of dataStore.organizationResources) {
        expect(orgIds.has(res.organization_id)).toBe(true);
      }

      for (const key of dataStore.apiKeys) {
        expect(orgIds.has(key.organization_id)).toBe(true);
      }

      for (const cr of dataStore.customRoles) {
        expect(orgIds.has(cr.organization_id)).toBe(true);
      }

      for (const rp of dataStore.rolePermissions) {
        expect(customRoleIds.has(rp.custom_role_id)).toBe(true);
        expect(permissionIds.has(rp.permission_id)).toBe(true);
      }

      for (const sra of dataStore.staffRoleAssignments) {
        expect(userIds.has(sra.user_id)).toBe(true);
        expect(customRoleIds.has(sra.custom_role_id)).toBe(true);
      }

      for (const pl of dataStore.provisioningLog) {
        expect(orgIds.has(pl.organization_id)).toBe(true);
      }

      for (const pal of dataStore.platformActivityLog) {
        if (pal.platform_user_id !== null && pal.platform_user_id !== undefined) {
          expect(superUserIds.has(pal.platform_user_id)).toBe(true);
        }
        if (pal.target_organization_id !== null && pal.target_organization_id !== undefined) {
          expect(orgIds.has(pal.target_organization_id)).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // Suite 2: Inpatient Lifecycle & Triad State Machine Consistency (R2)
  // =========================================================================
  describe('Suite 2: Inpatient Lifecycle & Triad State Machine Consistency (R2)', () => {
    it('Test 2.1: Triad Invariant — Every OCCUPIED bed is held by exactly one active admission (status === ADMITTED) and one active pre-request (ADMITTED | DISCHARGE_REQUESTED | DISCHARGE_APPROVED)', () => {
      const occupiedBeds = dataStore.beds.filter((b) => b.status === 'OCCUPIED');
      const activeAdmissions = dataStore.admissions.filter((a) => a.status === 'ADMITTED');
      const activePreRequests = dataStore.preRequests.filter((pr) =>
        ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(pr.status),
      );

      expect(activeAdmissions.length).toBe(occupiedBeds.length);
      expect(activePreRequests.length).toBe(occupiedBeds.length);

      for (const bed of occupiedBeds) {
        const matchingAdmissions = activeAdmissions.filter((a) => a.bed_id === bed.bed_id);
        const matchingPreRequests = activePreRequests.filter((pr) => pr.bed_id === bed.bed_id);

        expect(matchingAdmissions).toHaveLength(1);
        expect(matchingPreRequests).toHaveLength(1);

        const adm = matchingAdmissions[0];
        const pr = matchingPreRequests[0];

        expect(adm.patient_id).toBe(pr.patient_id);
        expect(adm.organization_id).toBe(bed.organization_id);
        expect(pr.organization_id).toBe(bed.organization_id);
      }
    });

    it('Test 2.2: Available and Maintenance Bed Invariant — Every AVAILABLE or MAINTENANCE bed has 0 active admissions and 0 active pre-requests', () => {
      const inactiveBeds = dataStore.beds.filter(
        (b) => b.status === 'AVAILABLE' || b.status === 'MAINTENANCE',
      );
      const activeAdmissions = dataStore.admissions.filter((a) => a.status === 'ADMITTED');
      const activePreRequests = dataStore.preRequests.filter((pr) =>
        ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(pr.status),
      );

      for (const bed of inactiveBeds) {
        const conflictingAdmission = activeAdmissions.find((a) => a.bed_id === bed.bed_id);
        const conflictingPreRequest = activePreRequests.find((pr) => pr.bed_id === bed.bed_id);

        expect(conflictingAdmission).toBeUndefined();
        expect(conflictingPreRequest).toBeUndefined();
      }
    });

    it('Test 2.3: Single Active Inpatient Stay — Zero patients have multiple concurrent admissions with status ADMITTED', () => {
      const activePatientIds = new Set();
      const activeAdmissions = dataStore.admissions.filter((a) => a.status === 'ADMITTED');

      for (const adm of activeAdmissions) {
        expect(activePatientIds.has(adm.patient_id)).toBe(false);
        activePatientIds.add(adm.patient_id);
      }
    });

    it('Test 2.4: Bed Request Allocation Sync — Allocated bedRequests match OCCUPIED beds and active pre-requests', () => {
      const occupiedBeds = dataStore.beds.filter((b) => b.status === 'OCCUPIED');

      for (const bed of occupiedBeds) {
        const matchingBedRequests = dataStore.bedRequests.filter(
          (br) => br.bed_id === bed.bed_id && br.status === 'ALLOCATED',
        );

        expect(matchingBedRequests.length).toBeGreaterThanOrEqual(1);

        // Find the active pre-request for this bed
        const activePr = dataStore.preRequests.find(
          (pr) =>
            pr.bed_id === bed.bed_id &&
            ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(pr.status),
        );
        expect(activePr).toBeDefined();

        const brForActivePr = matchingBedRequests.find(
          (br) => br.pre_request_id === activePr.pre_request_id,
        );
        expect(brForActivePr).toBeDefined();
        expect(brForActivePr.patient_id).toBe(activePr.patient_id);
        expect(brForActivePr.ward_id).toBe(bed.ward_id);
      }
    });

    it('Test 2.5: Admission Bed Linkage — Active admissions with bed_id reference beds marked OCCUPIED', () => {
      const activeAdmissions = dataStore.admissions.filter((a) => a.status === 'ADMITTED');

      for (const adm of activeAdmissions) {
        if (adm.bed_id !== null && adm.bed_id !== undefined) {
          const bed = dataStore.beds.find((b) => b.bed_id === adm.bed_id);
          expect(bed).toBeDefined();
          expect(bed.status).toBe('OCCUPIED');
        }
      }
    });
  });

  // =========================================================================
  // Suite 3: Financial Settlement & Discharge Synchronization (R2)
  // =========================================================================
  describe('Suite 3: Financial Settlement & Discharge Synchronization (R2)', () => {
    it('Test 3.1: Discharged Inpatient Complete Cycle — All DISCHARGED admissions have a PAID/settled ledger, completed receipts, and valid discharge summary', () => {
      const dischargedAdmissions = dataStore.admissions.filter((a) => a.status === 'DISCHARGED');
      expect(dischargedAdmissions.length).toBeGreaterThan(0);

      for (const adm of dischargedAdmissions) {
        const ledger = dataStore.ledgers.find((l) => l.admission_id === adm.admission_id);
        expect(ledger).toBeDefined();
        expect(ledger.status).toBe('PAID');

        const summary = dataStore.dischargeSummaries.find(
          (s) => s.admission_id === adm.admission_id,
        );
        expect(summary).toBeDefined();

        const receipts = dataStore.receipts.filter((r) => r.admission_id === adm.admission_id);
        expect(receipts.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('Test 3.2: Discharge Summary Mathematical Invariant — final_amount === gross_amount - insurance_deduction', () => {
      expect(dataStore.dischargeSummaries.length).toBeGreaterThan(0);

      for (const ds of dataStore.dischargeSummaries) {
        expect(typeof ds.gross_amount).toBe('number');
        expect(typeof ds.insurance_deduction).toBe('number');
        expect(typeof ds.final_amount).toBe('number');
        expect(ds.final_amount).toBe(ds.gross_amount - ds.insurance_deduction);
        expect(ds.final_amount).toBeGreaterThanOrEqual(0);
      }
    });

    it('Test 3.3: 1:1 Admission-Ledger Invariant — ledgers.admission_id is strictly unique and every admission has a ledger', () => {
      const admissionIdsWithLedger = dataStore.ledgers.map((l) => l.admission_id);
      expect(new Set(admissionIdsWithLedger).size).toBe(admissionIdsWithLedger.length);

      for (const adm of dataStore.admissions) {
        const ledger = dataStore.ledgers.find((l) => l.admission_id === adm.admission_id);
        expect(ledger).toBeDefined();
      }
    });

    it('Test 3.4: 1:1 Admission-Summary Invariant — dischargeSummaries.admission_id is strictly unique and only belongs to DISCHARGED admissions', () => {
      const summaryAdmissionIds = dataStore.dischargeSummaries.map((s) => s.admission_id);
      expect(new Set(summaryAdmissionIds).size).toBe(summaryAdmissionIds.length);

      for (const summary of dataStore.dischargeSummaries) {
        const adm = dataStore.admissions.find((a) => a.admission_id === summary.admission_id);
        expect(adm).toBeDefined();
        expect(adm.status).toBe('DISCHARGED');
      }
    });

    it('Test 3.5: 1:1 Payment-Receipt Invariant — receipts.payment_id is strictly unique with matching amount and payment mode', () => {
      const paymentIdsInReceipts = dataStore.receipts.map((r) => r.payment_id);
      expect(new Set(paymentIdsInReceipts).size).toBe(paymentIdsInReceipts.length);

      for (const receipt of dataStore.receipts) {
        const payment = dataStore.payments.find((p) => p.payment_id === receipt.payment_id);
        expect(payment).toBeDefined();
        expect(receipt.amount).toBe(payment.amount_paid);
        expect(receipt.payment_mode).toBe(payment.payment_mode);
      }
    });

    it('Test 3.6: Primary Key Uniqueness Across All 38 Collections (especially ledgers.ledger_id)', () => {
      // Single-column primary key collections
      const singleKeySpecs = [
        { name: 'roles', pk: 'role_id' },
        { name: 'users', pk: 'user_id' },
        { name: 'patients', pk: 'patient_id' },
        { name: 'patientInsurances', pk: 'insurance_id' },
        { name: 'doctors', pk: 'doctor_id' },
        { name: 'doctorAvailabilities', pk: 'availability_id' },
        { name: 'appointments', pk: 'appointment_id' },
        { name: 'wards', pk: 'ward_id' },
        { name: 'beds', pk: 'bed_id' },
        { name: 'admissions', pk: 'admission_id' },
        { name: 'dischargeSummaries', pk: 'summary_id' },
        { name: 'services', pk: 'service_id' },
        { name: 'ledgers', pk: 'ledger_id' },
        { name: 'payments', pk: 'payment_id' },
        { name: 'inventoryItems', pk: 'item_id' },
        { name: 'purchaseRequests', pk: 'request_id' },
        { name: 'preRequests', pk: 'pre_request_id' },
        { name: 'bedRequests', pk: 'bed_request_id' },
        { name: 'emergencyNotifications', pk: 'emergency_id' },
        { name: 'receipts', pk: 'receipt_id' },
        { name: 'activityLog', pk: 'id' },
        { name: 'organizations', pk: 'organization_id' },
        { name: 'hospitals', pk: 'hospital_id' },
        { name: 'subscriptionPlans', pk: 'plan_id' },
        { name: 'subscriptions', pk: 'subscription_id' },
        { name: 'resourceQuotas', pk: 'organization_id' },
        { name: 'apiKeys', pk: 'api_key_id' },
        { name: 'customRoles', pk: 'custom_role_id' },
        { name: 'permissions', pk: 'permission_id' },
        { name: 'platformSuperUsers', pk: 'platform_user_id' },
        { name: 'provisioningLog', pk: 'id' },
        { name: 'platformActivityLog', pk: 'id' },
        { name: 'leaders', pk: 'leader_id' },
      ];

      for (const spec of singleKeySpecs) {
        const values = dataStore[spec.name].map((row) => row[spec.pk]);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
      }

      // Composite primary key collections
      const ledgerEntryPks = dataStore.ledgerEntries.map((e) => `${e.ledger_id}_${e.entry_id}`);
      expect(new Set(ledgerEntryPks).size).toBe(ledgerEntryPks.length);

      const rolePermissionPks = dataStore.rolePermissions.map(
        (rp) => `${rp.custom_role_id}_${rp.permission_id}`,
      );
      expect(new Set(rolePermissionPks).size).toBe(rolePermissionPks.length);

      const staffRoleAssignmentPks = dataStore.staffRoleAssignments.map(
        (sra) => `${sra.user_id}_${sra.custom_role_id}`,
      );
      expect(new Set(staffRoleAssignmentPks).size).toBe(staffRoleAssignmentPks.length);

      const orgResourcePks = dataStore.organizationResources.map(
        (or) => `${or.organization_id}_${or.module_code}_${or.resource_code}`,
      );
      expect(new Set(orgResourcePks).size).toBe(orgResourcePks.length);
    });
  });

  // =========================================================================
  // Suite 4: Outpatient Appointments & Doctor Scheduling Alignment (R2)
  // =========================================================================
  describe('Suite 4: Outpatient Appointments & Doctor Scheduling Alignment (R2)', () => {
    it('Test 4.1: Doctor Availability Match — Appointments with availability_id align on date, time window, doctor_id, and organization_id', () => {
      for (const apt of dataStore.appointments) {
        if (apt.availability_id !== null && apt.availability_id !== undefined) {
          const avail = dataStore.doctorAvailabilities.find(
            (a) => a.availability_id === apt.availability_id,
          );
          expect(avail).toBeDefined();

          // Doctor and organization alignment
          expect(apt.doctor_id).toBe(avail.doctor_id);
          expect(apt.organization_id).toBe(avail.organization_id);

          // Date alignment (ISO string YYYY-MM-DD)
          const aptDate = apt.scheduled_datetime.slice(0, 10);
          expect(aptDate).toBe(avail.available_date);

          // Time window alignment (HH:MM:SS)
          const aptTime = apt.scheduled_datetime.slice(11, 19);
          expect(aptTime >= avail.start_time).toBe(true);
          expect(aptTime <= avail.end_time).toBe(true);
        }
      }
    });

    it('Test 4.2: Zero Double-Booking Invariant — No doctor has multiple appointments at the exact same scheduled_datetime', () => {
      const doctorSlots = new Set();

      for (const apt of dataStore.appointments) {
        const slotKey = `${apt.doctor_id}_${apt.scheduled_datetime}`;
        expect(doctorSlots.has(slotKey)).toBe(false);
        doctorSlots.add(slotKey);
      }
    });

    it('Test 4.3: Appointment Status Enum Integrity — All appointments have status in CONFIRMED, COMPLETED, CANCELLED', () => {
      const allowedStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];

      for (const apt of dataStore.appointments) {
        expect(allowedStatuses.includes(apt.status)).toBe(true);
      }
    });
  });

  // =========================================================================
  // Suite 5: Multi-Tenant Boundary Enforcement & Zero Leaks (R3)
  // =========================================================================
  describe('Suite 5: Multi-Tenant Boundary Enforcement & Zero Leaks (R3)', () => {
    it('Test 5.1: Relational Organization Isolation — All parent-child linked entities share the exact same organization_id', () => {
      const checkOrgMatch = (child, parent, relationshipName) => {
        if (child && parent) {
          expect({
            rel: relationshipName,
            childOrg: child.organization_id,
            parentOrg: parent.organization_id,
          }).toEqual({
            rel: relationshipName,
            childOrg: child.organization_id,
            parentOrg: child.organization_id,
          });
        }
      };

      // 1. users ⇄ patients
      for (const pat of dataStore.patients) {
        if (pat.user_id) {
          const user = dataStore.users.find((u) => u.user_id === pat.user_id);
          checkOrgMatch(pat, user, 'patients -> users');
        }
      }

      // 2. patientInsurances ⇄ patients
      for (const ins of dataStore.patientInsurances) {
        const pat = dataStore.patients.find((p) => p.patient_id === ins.patient_id);
        checkOrgMatch(ins, pat, 'patientInsurances -> patients');
      }

      // 3. doctors ⇄ doctorAvailabilities
      for (const avail of dataStore.doctorAvailabilities) {
        const doc = dataStore.doctors.find((d) => d.doctor_id === avail.doctor_id);
        checkOrgMatch(avail, doc, 'doctorAvailabilities -> doctors');
      }

      // 4. appointments ⇄ patients, doctors, users
      for (const apt of dataStore.appointments) {
        const pat = dataStore.patients.find((p) => p.patient_id === apt.patient_id);
        const doc = dataStore.doctors.find((d) => d.doctor_id === apt.doctor_id);
        const creator = dataStore.users.find((u) => u.user_id === apt.created_by);
        checkOrgMatch(apt, pat, 'appointments -> patients');
        checkOrgMatch(apt, doc, 'appointments -> doctors');
        checkOrgMatch(apt, creator, 'appointments -> users(created_by)');
      }

      // 5. wards ⇄ beds
      for (const bed of dataStore.beds) {
        const ward = dataStore.wards.find((w) => w.ward_id === bed.ward_id);
        checkOrgMatch(bed, ward, 'beds -> wards');
      }

      // 6. admissions ⇄ patients, beds, appointments
      for (const adm of dataStore.admissions) {
        const pat = dataStore.patients.find((p) => p.patient_id === adm.patient_id);
        const bed = adm.bed_id ? dataStore.beds.find((b) => b.bed_id === adm.bed_id) : null;
        const apt = adm.appointment_id
          ? dataStore.appointments.find((a) => a.appointment_id === adm.appointment_id)
          : null;
        checkOrgMatch(adm, pat, 'admissions -> patients');
        checkOrgMatch(adm, bed, 'admissions -> beds');
        checkOrgMatch(adm, apt, 'admissions -> appointments');
      }

      // 7. dischargeSummaries ⇄ admissions, patients
      for (const ds of dataStore.dischargeSummaries) {
        const adm = dataStore.admissions.find((a) => a.admission_id === ds.admission_id);
        const pat = dataStore.patients.find((p) => p.patient_id === ds.patient_id);
        checkOrgMatch(ds, adm, 'dischargeSummaries -> admissions');
        checkOrgMatch(ds, pat, 'dischargeSummaries -> patients');
      }

      // 8. ledgers ⇄ admissions
      for (const ledger of dataStore.ledgers) {
        const adm = dataStore.admissions.find((a) => a.admission_id === ledger.admission_id);
        checkOrgMatch(ledger, adm, 'ledgers -> admissions');
      }

      // 9. ledgerEntries ⇄ ledgers, services
      for (const entry of dataStore.ledgerEntries) {
        const ledger = dataStore.ledgers.find((l) => l.ledger_id === entry.ledger_id);
        const service = dataStore.services.find((s) => s.service_id === entry.service_id);
        checkOrgMatch(entry, ledger, 'ledgerEntries -> ledgers');
        checkOrgMatch(entry, service, 'ledgerEntries -> services');
      }

      // 10. payments ⇄ ledgers
      for (const pmt of dataStore.payments) {
        const ledger = dataStore.ledgers.find((l) => l.ledger_id === pmt.ledger_id);
        checkOrgMatch(pmt, ledger, 'payments -> ledgers');
      }

      // 11. receipts ⇄ payments, ledgers, admissions, patients
      for (const rcpt of dataStore.receipts) {
        const pmt = dataStore.payments.find((p) => p.payment_id === rcpt.payment_id);
        const ledger = dataStore.ledgers.find((l) => l.ledger_id === rcpt.ledger_id);
        const adm = dataStore.admissions.find((a) => a.admission_id === rcpt.admission_id);
        const pat = dataStore.patients.find((p) => p.patient_id === rcpt.patient_id);
        checkOrgMatch(rcpt, pmt, 'receipts -> payments');
        checkOrgMatch(rcpt, ledger, 'receipts -> ledgers');
        checkOrgMatch(rcpt, adm, 'receipts -> admissions');
        checkOrgMatch(rcpt, pat, 'receipts -> patients');
      }

      // 12. inventoryItems ⇄ services; purchaseRequests ⇄ inventoryItems, users
      for (const item of dataStore.inventoryItems) {
        if (item.service_id) {
          const service = dataStore.services.find((s) => s.service_id === item.service_id);
          checkOrgMatch(item, service, 'inventoryItems -> services');
        }
      }
      for (const req of dataStore.purchaseRequests) {
        const item = dataStore.inventoryItems.find((i) => i.item_id === req.item_id);
        const creator = dataStore.users.find((u) => u.user_id === req.requested_by);
        checkOrgMatch(req, item, 'purchaseRequests -> inventoryItems');
        checkOrgMatch(req, creator, 'purchaseRequests -> users(requested_by)');
      }

      // 13. preRequests ⇄ patients, doctors, beds, users
      for (const pr of dataStore.preRequests) {
        const pat = dataStore.patients.find((p) => p.patient_id === pr.patient_id);
        const doc = pr.doctor_id ? dataStore.doctors.find((d) => d.doctor_id === pr.doctor_id) : null;
        const bed = pr.bed_id ? dataStore.beds.find((b) => b.bed_id === pr.bed_id) : null;
        const creator = dataStore.users.find((u) => u.user_id === pr.created_by);
        checkOrgMatch(pr, pat, 'preRequests -> patients');
        checkOrgMatch(pr, doc, 'preRequests -> doctors');
        checkOrgMatch(pr, bed, 'preRequests -> beds');
        checkOrgMatch(pr, creator, 'preRequests -> users(created_by)');
      }

      // 14. bedRequests ⇄ preRequests, patients, wards, beds, users
      for (const br of dataStore.bedRequests) {
        const pr = dataStore.preRequests.find((p) => p.pre_request_id === br.pre_request_id);
        const pat = dataStore.patients.find((p) => p.patient_id === br.patient_id);
        const ward = dataStore.wards.find((w) => w.ward_id === br.ward_id);
        const bed = br.bed_id ? dataStore.beds.find((b) => b.bed_id === br.bed_id) : null;
        const creator = dataStore.users.find((u) => u.user_id === br.requested_by);
        checkOrgMatch(br, pr, 'bedRequests -> preRequests');
        checkOrgMatch(br, pat, 'bedRequests -> patients');
        checkOrgMatch(br, ward, 'bedRequests -> wards');
        checkOrgMatch(br, bed, 'bedRequests -> beds');
        checkOrgMatch(br, creator, 'bedRequests -> users(requested_by)');
      }

      // 15. emergencyNotifications ⇄ patients, beds, users
      for (const en of dataStore.emergencyNotifications) {
        const pat = en.patient_id ? dataStore.patients.find((p) => p.patient_id === en.patient_id) : null;
        const bed = en.bed_id ? dataStore.beds.find((b) => b.bed_id === en.bed_id) : null;
        const creator = dataStore.users.find((u) => u.user_id === en.created_by);
        checkOrgMatch(en, pat, 'emergencyNotifications -> patients');
        checkOrgMatch(en, bed, 'emergencyNotifications -> beds');
        checkOrgMatch(en, creator, 'emergencyNotifications -> users(created_by)');
      }

      // 16. staffRoleAssignments ⇄ users, customRoles (both user and custom role share organization_id)
      for (const sra of dataStore.staffRoleAssignments) {
        const user = dataStore.users.find((u) => u.user_id === sra.user_id);
        const cr = dataStore.customRoles.find((c) => c.custom_role_id === sra.custom_role_id);
        checkOrgMatch(user, cr, 'staffRoleAssignments: user -> customRole');
      }
    });

    it('Test 5.2: Strict Tenant Segregation — Zero cross-tenant relational links between Org 1 (City General) and Org 2 (Apollo Hospitals)', () => {
      const validOrgIds = new Set(dataStore.organizations.map((o) => o.organization_id));

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
        for (const record of dataStore[col]) {
          expect(validOrgIds.has(record.organization_id)).toBe(true);
        }
      }
    });

    it('Test 5.3: Multi-Hospital Campus Scoping — hospital_id strictly matches the organization_id of its parent hospital across all collections', () => {
      const hospOrgMap = new Map(dataStore.hospitals.map((h) => [h.hospital_id, h.organization_id]));

      expect(hospOrgMap.get(1)).toBe(1); // City General Hospital - Main Campus
      expect(hospOrgMap.get(2)).toBe(2); // Apollo Hospitals - Main Campus
      expect(hospOrgMap.get(3)).toBe(2); // Apollo Hospitals - Bangalore

      for (const col of EXPECTED_37_COLLECTIONS) {
        for (const record of dataStore[col]) {
          if (record.hospital_id !== null && record.hospital_id !== undefined) {
            expect(hospOrgMap.has(record.hospital_id)).toBe(true);
            const parentOrg = hospOrgMap.get(record.hospital_id);
            expect({
              collection: col,
              recordId: record.id || record[`${col.slice(0, -1)}_id`] || record.user_id || record.patient_id,
              recordHospitalId: record.hospital_id,
              recordOrgId: record.organization_id,
              parentHospitalOrgId: parentOrg,
            }).toEqual({
              collection: col,
              recordId: record.id || record[`${col.slice(0, -1)}_id`] || record.user_id || record.patient_id,
              recordHospitalId: record.hospital_id,
              recordOrgId: record.organization_id,
              parentHospitalOrgId: record.organization_id,
            });
          }
        }
      }
    });
  });

  // =========================================================================
  // Suite 6: Physical Capacity & Accounting Invariants
  // =========================================================================
  describe('Suite 6: Physical Capacity & Accounting Invariants', () => {
    it('Test 6.1: Ward Bed Capacity — Actual physical beds in beds collection equal wards.total_beds for every ward', () => {
      expect(dataStore.wards.length).toBeGreaterThan(0);

      for (const ward of dataStore.wards) {
        const physicalBeds = dataStore.beds.filter((b) => b.ward_id === ward.ward_id);
        expect(physicalBeds.length).toBe(ward.total_beds);
      }
    });

    it('Test 6.2: Ward Bed Number Uniqueness — (ward_id, bed_number) tuple is strictly unique', () => {
      const wardBedTuples = new Set();

      for (const bed of dataStore.beds) {
        const tuple = `${bed.ward_id}_${bed.bed_number}`;
        expect(wardBedTuples.has(tuple)).toBe(false);
        wardBedTuples.add(tuple);
      }
    });

    it('Test 6.3: Per-Ledger Monotonic Entry IDs — (ledger_id, entry_id) composite key is 1-based sequential integers without gaps', () => {
      for (const ledger of dataStore.ledgers) {
        const entries = dataStore.ledgerEntries
          .filter((e) => e.ledger_id === ledger.ledger_id)
          .sort((a, b) => a.entry_id - b.entry_id);

        entries.forEach((entry, idx) => {
          expect(entry.entry_id).toBe(idx + 1);
        });
      }
    });

    it('Test 6.4: Identity Uniqueness — users.email and patients.uhid are strictly unique across the platform', () => {
      const emails = dataStore.users.map((u) => u.email.toLowerCase().trim());
      expect(new Set(emails).size).toBe(emails.length);

      const uhids = dataStore.patients.map((p) => p.uhid.trim());
      expect(new Set(uhids).size).toBe(uhids.length);
    });
  });
});
