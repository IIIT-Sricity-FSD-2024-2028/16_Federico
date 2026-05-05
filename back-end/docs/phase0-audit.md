# Phase 0 Audit and Mapping

## Scope and Verification
- Audited folders: `FA/`, `HOM/`, `PRE/`, `Patient/`, `shared/`, `landing/`, `login/`, `signup/`.
- Total JS files in scope: **42**.
- JS files with at least one required-term hit (`hospitalFinanceAppState`, `patientAuthAccounts`, `CanonicalHospitalSeed`, `localStorage.getItem`, `Date.now()`): **23**.
- JS files with no required-term hit: **19**.

No-code-change constraint honored. This file is the only output artifact.

## Term Occurrence Inventory (line-level)

### [D:/front-end - Copy , fixed all workflows only/FA/js/data/mockData.js]
- Line 6: `CanonicalHospitalSeed`
- Storage keys read/write: none directly.
- State slices expected: `admissions`, `ledgers`, `patients`, `preRequests`, `serviceRequests`, `faLedgerRequests`, `dispatchQueue`, `paymentConfirmations`, `receipts`, `publishedBills`, `billingRecords`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/FA/js/state.js]
- Line 3: `hospitalFinanceAppState`
- Line 53: `localStorage.getItem(STORAGE_KEY)`
- Storage keys read/write: reads+writes `hospitalFinanceAppState`.
- State slices expected: `stats`, `admissions`, `ledgers`, `serviceRequests`, `receipts`, `publishedBills`, `dispatchQueue`, `faLedgerRequests`, `paymentConfirmations`, `billingRecords`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/FA/js/app.js]
- Line 465: `localStorage.removeItem('hospitalFinanceAppState')`
- Line 484: storage event key check for `hospitalFinanceAppState`
- Storage keys read/write: write/delete `hospitalFinanceAppState` (reset path); listens for key changes.
- State slices expected: heavy read/write of `AppState` slices: `stats`, `admissions`, `ledgers`, `serviceRequests`, `faLedgerRequests`, `paymentConfirmations`, `dispatchQueue`, `billingRecords`, `publishedBills`, `receipts`, `preRequests`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/FA/js/modules/billing.js]
- Date/ID occurrences:
  - 50, 52, 372, 388, 415, 441, 451, 456, 478, 485, 495, 567, 607, 637, 641, 644
- Storage keys read/write: none directly (mutates shared in-memory `AppState`, persisted by FA state layer).
- State slices expected: `admissions`, `ledgers`, `serviceRequests`, `faLedgerRequests`, `dispatchQueue`, `paymentConfirmations`, `receipts`, `publishedBills`, `billingRecords`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/HOM/storage.js]
- Line 9: `hospitalFinanceAppState`
- Line 14: `CanonicalHospitalSeed`
- Lines 64, 84: `localStorage.getItem(STORAGE_KEY)`
- Date/ID occurrences: 117, 124, 200, 250, 274, 294, 388, 414, 425, 434, 445, 496, 541, 583, 670, 709, 714, 732, 743, 753, 758, 786, 793, 827, 850
- Storage keys read/write: reads+writes `hospitalFinanceAppState`; reset removes same key.
- State slices expected: `wards`, `pendingAdmissions`, `preRequests`, `patients`, `admissions`, `ledgers`, `billingRecords`, `faLedgerRequests`, `dispatchQueue`, `paymentConfirmations`, `serviceRequests`, `inventoryItems`, `activityLog`, `bedRequests`, `bedAllocations`, `emergencyNotifications`, `patientDirectory`, `patientProfiles`, `receipts`, `publishedBills`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/HOM/dashboard.js]
- Line 356: `Date.now()` fallback in request timestamp rendering
- Storage keys read/write: none directly (reads via `window.Store`).
- State slices expected: reads `pendingAdmissions`, `patients`, `wards`, `activityLog`, `dispatchQueue`, `serviceRequests`, `paymentConfirmations`, `admissions`, `preRequests`, `billingRecords`.

### [D:/front-end - Copy , fixed all workflows only/HOM/patient-flow.js]
- Lines 347, 353, 361: `Date.now()` in payment confirmation path
- Storage keys read/write: none directly (writes through `window.Store.save`).
- State slices expected: `patients`, `billingRecords`, `dispatchQueue`, `paymentConfirmations`, `admissions`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/shared-state.js]
- Line 1: `hospitalFinanceAppState`
- Line 10: `CanonicalHospitalSeed`
- Line 31: `localStorage.getItem(SHARED_STORAGE_KEY)`
- Line 81: `localStorage.getItem("patients")` (legacy key)
- Date/ID occurrences: 324, 375, 378, 390
- Storage keys read/write: reads+writes `hospitalFinanceAppState`; reads legacy `patients`.
- State slices expected: `preRequests`, `doctors`, `pendingAdmissions`, `bedRequests`, `bedAllocations`, `emergencyNotifications`, `patientDirectory`, `patientProfiles`, `admissions`, `patients`, `appointments`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/admitted.js]
- Date/ID occurrences: 94, 95
- Storage keys read/write: none directly (uses PRE shared-state accessors).
- State slices expected: `preRequests` (status transitions/updated timestamps).

### [D:/front-end - Copy , fixed all workflows only/PRE/js/discharge.js]
- Date/ID occurrences: 90, 147
- Storage keys read/write: none directly (uses PRE shared-state accessors).
- State slices expected: `preRequests`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/emergency.js]
- Date/ID occurrences: 63, 64
- Storage keys read/write: none directly.
- State slices expected: `preRequests`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/hom.js]
- Date/ID occurrences: 262, 263, 447, 463, 504
- Storage keys read/write: none directly.
- State slices expected: `preRequests`, `bedRequests`, `bedAllocations`, `emergencyNotifications`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/PRE.js]
- Date/ID occurrences: 139, 149, 156, 162, 184
- Storage keys read/write: none directly.
- State slices expected: `preRequests`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/requests.js]
- Date/ID occurrences: 313, 388, 477
- Storage keys read/write: none directly.
- State slices expected: `preRequests`.

### [D:/front-end - Copy , fixed all workflows only/PRE/js/Appointment.js]
- Date/ID occurrences: 382, 385, 485, 486, 508
- Storage keys read/write: none directly.
- State slices expected: `patientDirectory`, `patientProfiles`, `preRequests`, `pendingAdmissions`, `patients`, `admissions` (via `ensurePreState` catalog paths and request creation).

### [D:/front-end - Copy , fixed all workflows only/Patient/js/patient-store.js]
- Line 1: `hospitalFinanceAppState`
- Line 3: `CanonicalHospitalSeed`
- Line 25: `localStorage.getItem(SHARED_STORAGE_KEY)`
- Line 547: `localStorage.getItem(SHARED_STORAGE_KEY)` existence check
- Line 548: `CanonicalHospitalSeed.buildSharedStateSeed()` write-back bootstrap
- Date/ID occurrences: 241, 258, 284, 318, 324, 325, 355, 367, 379, 399, 412, 427, 440, 449, 453, 505, 635, 636, 680, 747
- Storage keys read/write: reads+writes `hospitalFinanceAppState`.
- State slices expected: `preRequests`, `dispatchQueue`, `receipts`, `paymentConfirmations`, `publishedBills`, `patientProfiles`, `admissions`, `currentPatientId`.

### [D:/front-end - Copy , fixed all workflows only/Patient/patient-book-appointment.js]
- Line 265: `Date.now()` in uploaded file metadata
- Line 274: `patientAuthAccounts` key constant
- Line 275: `localStorage.getItem("patientAuthAccounts")`
- Line 293: warning mentions `patientAuthAccounts`
- Storage keys read/write: reads+writes `patientAuthAccounts`.
- State slices expected: none from shared key directly in these lines; uses Patient store profile (`patientProfiles`-derived) and appointment flows.

### [D:/front-end - Copy , fixed all workflows only/Patient/patient-profile.js]
- Line 310: `patientAuthAccounts` key constant
- Line 311: `localStorage.getItem("patientAuthAccounts")`
- Line 347: warning mentions `patientAuthAccounts`
- Storage keys read/write: reads+writes `patientAuthAccounts`.
- State slices expected: profile sync with `patientProfiles` (indirect through patient-store update functions).

### [D:/front-end - Copy , fixed all workflows only/Patient/patient-billing.js]
- Date fallback occurrences: 129, 179, 210, 255
- Storage keys read/write: none directly.
- State slices expected: billing UI expects Patient-store-derived `bills`, `billingSections`, and document timestamps ultimately sourced from `dispatchQueue`, `publishedBills`, `receipts`, `paymentConfirmations`.

### [D:/front-end - Copy , fixed all workflows only/shared/canonical-seed.js]
- Line 48: `localStorage.getItem(key)`
- Line 59: migrate key `hospitalFinanceAppState`
- Line 60: migrate key `patientAuthAccounts`
- Line 611: exports `window.CanonicalHospitalSeed`
- Storage keys read/write: reads+writes/migrates `hospitalFinanceAppState`, `patientAuthAccounts`.
- State slices expected: full canonical schema (all root slices defined in `buildSharedStateSeed`).

### [D:/front-end - Copy , fixed all workflows only/shared/debug-state-panel.js]
- Line 2: `hospitalFinanceAppState`
- Line 9: `localStorage.getItem(STORAGE_KEY)`
- Line 28: `Date.now()` for transition logs
- Storage keys read/write: reads `hospitalFinanceAppState` only.
- State slices expected: `dispatchQueue`, `paymentConfirmations`, `admissions`, `pendingAdmissions`, `faLedgerRequests`, `receipts`.

### [D:/front-end - Copy , fixed all workflows only/shared/rbac.js]
- Line 7: `patientAuthAccounts`
- Line 84: `CanonicalHospitalSeed`
- Line 111: `localStorage.getItem(PATIENT_ACCOUNT_STORAGE_KEY)`
- Storage keys read/write: reads+writes `patientAuthAccounts`; sessionStorage keys for auth identity.
- State slices expected: reads canonical `admissions`, `patientProfiles` to generate patient login accounts.

### [D:/front-end - Copy , fixed all workflows only/signup/signup-page.js]
- Line 1: `hospitalFinanceAppState`
- Line 114: `Date.now()` for profile `id`
- Line 184: `localStorage.getItem(SHARED_STORAGE_KEY)`
- Line 190: `CanonicalHospitalSeed`
- Storage keys read/write: reads+writes `hospitalFinanceAppState`; delegates account write to RBAC (`patientAuthAccounts`).
- State slices expected: `patientDirectory`, `patientProfiles`.

## Canonical Seed Duplicate/Overlap Mapping
Source: `shared/canonical-seed.js`.

- Patient entities duplicated across parallel structures:
  - `patientDirectory` (array of basic demographics)
  - `patientProfiles` (object keyed by UHID with richer profile)
  - `patients` (array tied to inpatient flow, beds/status/days)
- Admission/finance entities duplicated across parallel structures:
  - `admissions` (object keyed by admission id, includes ledger linkage)
  - `billingRecords` (array-level billing shadow with totals/status)
  - `ledgers` (object keyed by ledger id with entry arrays)
- PRE/HOM request entities duplicated across parallel structures:
  - `preRequests` (PRE request lifecycle)
  - `pendingAdmissions` (HOM queue projection of PRE requests)
  - `faLedgerRequests` (HOM->FA ledger setup queue)
  - `bedRequests` (PRE/HOM bed request queue)
- Additional overlap:
  - `bedAllocations` duplicates parts of `bedRequests` + `preRequests` + bed status in `wards[].beds[]`.

## Cross-check With Problems.md (and inconsistencies)
- `Problems.md` file is **not present** in current workspace paths, so direct file-to-file validation could not be executed locally.
- Cross-check against referenced problems from instructions still shows these inconsistencies in code/state:
  - Duplicate billing representations exist (`admissions` + `ledgers` + `billingRecords`) with mutation points in FA/HOM.
  - Duplicate patient representations exist (`patientDirectory` + `patientProfiles` + `patients`) and are independently updated by PRE/Signup/Patient flows.
  - Bed mapping is not strict 1:1 by patient id in all places; seed and HOM bed logic still carry free-text `beds[].patient` names and status `reserved` values.
  - Legacy and split-key persistence remains active (`hospitalFinanceAppState` plus `patientAuthAccounts`, and legacy read of `patients` key in PRE shared-state).

## JS Files With No Required-Term Hits (coverage proof)
- `D:/front-end - Copy , fixed all workflows only/FA/js/utils/helpers.js`
- `D:/front-end - Copy , fixed all workflows only/FA/js/auth-guard.js`
- `D:/front-end - Copy , fixed all workflows only/FA/js/permissions.js`
- `D:/front-end - Copy , fixed all workflows only/FA/js/router.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/auth-guard.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/beds.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/billing.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/inventory.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/shared-nav.js`
- `D:/front-end - Copy , fixed all workflows only/HOM/ui-template.js`
- `D:/front-end - Copy , fixed all workflows only/PRE/js/auth-guard.js`
- `D:/front-end - Copy , fixed all workflows only/PRE/js/doctor.js`
- `D:/front-end - Copy , fixed all workflows only/PRE/js/logout.js`
- `D:/front-end - Copy , fixed all workflows only/PRE/js/patient-records.js`
- `D:/front-end - Copy , fixed all workflows only/PRE/js/rejected.js`
- `D:/front-end - Copy , fixed all workflows only/Patient/js/auth-guard.js`
- `D:/front-end - Copy , fixed all workflows only/Patient/patient-dashboard.js`
- `D:/front-end - Copy , fixed all workflows only/landing/landing-page.js`
- `D:/front-end - Copy , fixed all workflows only/login/login-page.js`
