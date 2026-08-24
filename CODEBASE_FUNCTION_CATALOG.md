# Federico Platform – Codebase Functions & Architecture Catalog

> **Scope**: Complete, exhaustive catalog of all functions, classes, API routes, data structures, and UI handlers across the backend and frontend. Derived strictly from direct code analysis (no stale documentation used).

---

## 1. Backend Architecture (`back-end/src`)

```mermaid
graph TD
    Client[Frontend Client / API Consumer] --> App[Express App (app.js)]
    App --> MW[Middleware: Cors, Logger, Session, Tenant, PersistOnMutation]
    MW --> Routes[Routes Index (routes/index.js)]
    Routes --> Controllers[Controllers: Auth, Patient, Doctor, Ward, Admission, Billing, Inventory, PreRequest, RBAC, Platform, Marketplace]
    Controllers --> Validators[Validation Engine (validators/engine.js)]
    Controllers --> Services[Services Layer (services/*.service.js)]
    Services --> Store[In-Memory Data Store (store/dataStore.js)]
    Store --> Persist[File Persistence (store/persist.js -> data/db.json)]
```

---

### 1.1 Core Server & Bootstrap

#### `server.js`
- **`persist.load()`**: Restores `dataStore` from `data/db.json` on startup.
- **`app.listen(PORT=3000, HOST='0.0.0.0')`**: Starts the HTTP server.

#### `src/app.js`
- **`createApp()`**: Instantiates Express app, configures CORS (`credentials: true`), JSON & URL-encoded body parsers, middleware stack (`requestLogger`, `attachSession`, `attachTenant`, `persistOnMutation`), mounts routes (`routes/index.js`), Swagger UI (`setupSwagger`), and error handlers (`notFoundHandler`, `errorHandler`).

---

### 1.2 Middleware Layer (`src/middleware`)

| File | Function / Export | Purpose & Behavior | Input / Output |
| :--- | :--- | :--- | :--- |
| `session.js` | `extractToken(req)` | Extracts auth token from `Authorization: Bearer <token>` header or `sessionId`/`sid`/`token` cookies. | `(req)` $\rightarrow$ `string \| null` |
| `session.js` | `attachSession(req, res, next)` | Looks up session in `sessionStore` by token; sets `req.session`. | `(req, res, next)` |
| `session.js` | `requireSession(req, res, next)` | Rejects with 401 if `req.session` is missing. | `(req, res, next)` |
| `session.js` | `requireActor(...actors)` | Checks if `req.session.role` is in allowed actors list; 403 otherwise. | `(...actors) => (req, res, next)` |
| `tenant.js` | `attachTenant(req, res, next)` | Sets `req.tenant = { organizationId, hospitalId, isPlatformUser }` from `req.session` or defaults to org `1`. | `(req, res, next)` |
| `tenant.js` | `requireTenant(req, res, next)` | Ensures `req.tenant.organizationId` exists; 403 if missing. | `(req, res, next)` |
| `tenant.js` | `requireModule(moduleCode)` | Checks if `organizationModules` has `enabled: false` for the caller's organization; 403 if disabled. | `(moduleCode) => (req, res, next)` |
| `actorAccess.js` | `dynamicRoleGrants(req, resource, mode)` | Evaluates custom RBAC permissions (`staffRoleAssignments` $\rightarrow$ `rolePermissions` $\rightarrow$ `permissions`). | `(req, resource, mode)` $\rightarrow$ `boolean` |
| `actorAccess.js` | `authorize(legacyRoles, resource, mode)` | Checks legacy `x-role` header OR session actor in `ACTOR_ACCESS[resource][mode]` OR `dynamicRoleGrants`. Returns 403 if none match. | `(legacyRoles, resource, mode) => (req, res, next)` |
| `platformAccess.js` | `requirePlatformUser(req, res, next)` | Verifies `req.session.isPlatformUser === true`; 403 otherwise. | `(req, res, next)` |
| `persistOnMutation.js` | `persistOnMutation(req, res, next)` | Hooks `res.on('finish')`: if method != GET and statusCode < 400, triggers debounced `persist.save()`. | `(req, res, next)` |
| `requestLogger.js` | `requestLogger(req, res, next)` | Logs HTTP method, URL, and status code to console on response finish. | `(req, res, next)` |
| `errorHandler.js` | `errorHandler(err, req, res, next)` | Global 500 error handler; outputs JSON error response. | `(err, req, res, next)` |
| `notFoundHandler.js` | `notFoundHandler(req, res, next)` | Global 404 handler for unmatched routes. | `(req, res, next)` |

---

### 1.3 Store & Persistence Layer (`src/store`)

| File | Function / Export | Purpose & Behavior | Input / Output |
| :--- | :--- | :--- | :--- |
| `sessionStore.js` | `createSession(data)` | Generates 24-byte hex token; stores session in `Map<token, session>`. | `(sessionData)` $\rightarrow$ `token (string)` |
| `sessionStore.js` | `getSession(token)` | Retrieves session object from `Map`. | `(token)` $\rightarrow$ `session \| null` |
| `sessionStore.js` | `destroySession(token)` | Removes session from `Map`. | `(token)` $\rightarrow$ `boolean` |
| `persist.js` | `load()` | Reads `data/db.json` synchronously and copies keys into `dataStore`. | `()` $\rightarrow$ `void` |
| `persist.js` | `save()` | Debounces (250ms) writing entire `dataStore` object to `data/db.json` as JSON. | `()` $\rightarrow$ `void` |
| `dataStore.js` | `dataStore` (Object) | Monolithic in-memory repository with 39 collections (users, patients, beds, wards, ledgers, admissions, etc.). | Object |

---

### 1.4 Utility Layer (`src/utils`)

| File | Function / Export | Purpose & Behavior |
| :--- | :--- | :--- |
| `logger.js` | `createLogger(prefix)` | Returns structured console logger `{ log(msg) }`. |
| `password.js` | `hashPassword(plain)` | Computes `bcrypt.hashSync(plain, 10)`. |
| `password.js` | `verifyPassword(plain, hash)` | Executes `bcrypt.compareSync(plain, hash)`. |
| `patientOwnership.js` | `forbidsOtherPatient(req, patientId)` | Returns `true` if caller is a Patient role and `req.session.patientId !== patientId`. |
| `patientOwnership.js` | `isPatientSession(req)` | Returns `true` if `req.session?.role === 'Patient'`. |
| `roles.js` | `ROLE_ID_TO_NAME`, `ROLE_NAME_TO_ID` | Map: `1: 'HOM', 2: 'Patient', 3: 'FA', 4: 'PRE', 5: 'Admin'`. |
| `sendResult.js` | `sendResult(res, result, status=200)` | Sends JSON result or `.end()` if `null`/`undefined`. |
| `tenant.js` | `withTenant(req, payload)` | Injects `organization_id` and `hospital_id` from `req.tenant` into payload. |
| `tenant.js` | `scopeToOrg(list, req)` | Filters array to items matching `item.organization_id === req.tenant.organizationId`. |
| `tenant.js` | `belongsToOrg(record, req)` | Returns `true` if `record.organization_id === req.tenant.organizationId`. |
| `tenant.js` | `MODULES`, `MODULE_CODES` | List of 6 feature module codes: `APPOINTMENTS`, `ADMISSIONS`, `INVENTORY`, `BILLING`, `INSURANCE`, `ANALYTICS`. |

---

### 1.5 Validation Engine & DTOs (`src/validators`)

| File | Function / Rules | Purpose |
| :--- | :--- | :--- |
| `engine.js` | `validateBody(rules)` | Middleware verifying `req.body` against rule definitions `{ field, checks, optional }`. Returns 400 with message array on failure. |
| `engine.js` | `partial(rules)` | Returns copy of rules where all fields have `optional: true`. |
| `auth.validators.js` | `loginRules`, `signupRules` | Validates email, password, phone, dob, gender, organization_id. |
| `patient.validators.js` | `createPatientRules`, `updatePatientRules`, `createPatientInsuranceRules` | Validates patient demographic fields and insurance policy rules. |
| `doctor.validators.js` | `createDoctorRules`, `updateDoctorRules`, `createDoctorAvailabilityRules` | Validates doctor details, availability dates/times/status. |
| `request.validators.js` | `createAppointmentRules`, `updateAppointmentRules` | Validates appointment bookings. |
| `ward.validators.js` | `createWardRules`, `updateWardRules`, `createBedRules`, `updateBedStatusRules`, `createBedRequestRules`, `updateBedRequestRules`, `createEmergencyRules`, `updateEmergencyRules` | Validates ward names, bed capacity, allocations, emergency notices. |
| `admission.validators.js` | `createAdmissionRules`, `updateAdmissionRules` | Validates admission records. |
| `billing.validators.js` | `createServiceRules`, `createLedgerRules`, `createLedgerEntryRules`, `createPaymentRules`, `createDischargeSummaryRules` | Validates billing catalog, ledgers, line items, payments, discharge documents. |
| `inventory.validators.js` | `createInventoryItemRules`, `updateInventoryItemRules`, `createPurchaseRequestRules`, `updatePurchaseRequestRules` | Validates stock items and reorder requests. |
| `preRequest.validators.js` | `createPreRequestRules`, `updatePreRequestRules` | Validates intake pre-requests and status transitions. |
| `rbac.validators.js` | `createRoleRules`, `assignPermissionRules`, `assignStaffRoleRules` | Validates custom role creation and assignment. |
| `platform.validators.js` | `platformLoginRules`, `provisionOrganizationRules`, `createHospitalRules`, `setModuleFlagRules`, `createApiKeyRules`, `createPlanRules`, `setSubscriptionRules` | Validates platform super user actions and tenant provisioning. |

---

### 1.6 Backend Services & Controllers (`src/services` & `src/controllers`)

#### Auth (`auth.service.js` / `auth.controller.js`)
- `login(email, password, requestedOrgId)`: Validates credentials, checks account organization match and active status, creates session token, logs activity. Returns `{ token, role, user, patient, tenant }`.
- `signup(payload)`: Checks email uniqueness, verifies org status, creates user record (`role_id: 2`), creates patient profile with generated UHID (`UHID-XXXXXX`), generates session, logs activity.
- `me(session)`: Resolves session userId to user, patient profile, and tenant branding context.
- `logout(token)`: Destroys session in `sessionStore`.

#### Patient (`patient.service.js` / `patient.controller.js`)
- `findAll()` / `findOne(idOrUhid)`: Lists all patients or finds by integer ID or string UHID. Controller scopes to tenant and checks patient ownership.
- `generateUhid()`: Generates unique string `UHID-XXXXXX`.
- `create(patient)`: Inserts patient record with auto-incremented ID, created_at timestamp, and generated UHID if omitted.
- `update(id, patch)`: Updates patient profile by ID/UHID.
- `remove(id)`: Deletes patient record.
- `findAllInsurances()` / `findInsuranceByPatient(patientId)`: Lists insurance policies.
- `createInsurance(insurance)`: Inserts insurance policy record linked to `patient_id`.

#### Doctor (`doctor.service.js` / `doctor.controller.js`)
- `findAllDoctors()` / `findDoctorById(id)`: Queries doctor directory.
- `createDoctor(doctor)` / `updateDoctor(id, patch)` / `deleteDoctor(id)`: CRUD operations on doctor records.
- `findAllAvailabilities()` / `findAvailabilityByDoctor(doctorId)`: Queries availability slots.
- `createAvailability(payload)` / `deleteAvailability(id)`: Creates/removes availability time slots.

#### Appointments / Requests (`request.service.js` / `request.controller.js`)
- `findAll()` / `findOne(id)`: Retrieves appointments.
- `create(appointment)`: Creates appointment record.
- `update(id, patch)`: Updates appointment fields/status.

#### Wards & Beds (`ward.service.js` / `ward.controller.js`)
- `findAllWards()` / `findBedsByWard(wardId)`: Queries wards and beds.
- `createWard(ward)`: Creates ward and auto-generates `total_beds` available bed records with prefix (e.g. `ICU-01`, `GENE-01`).
- `updateWard(wardId, patch)`: Modifies ward metadata and dynamically creates/removes bed records to match target total beds (refuses to shrink below occupied bed count).
- `deleteWard(wardId)`: Removes ward and child beds (refuses if any bed is occupied).
- `findAllBeds()` / `createBed(bed)` / `updateBedStatus(bedId, status)`: Bed lifecycle operations (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`).
- `findAllBedRequests()` / `createBedRequest(payload, requestedBy)`: PRE creates bed request for patient.
- `updateBedRequest(id, patch)`: HOM allocates bed (`status: 'ALLOCATED'`, marks bed `OCCUPIED`, transitions preRequest to `ADMITTED`, and auto-creates `admission` record) or denies request (`status: 'DENIED'`).
- `findAllEmergencies()` / `createEmergency(payload, createdBy)` / `updateEmergency(id, patch)`: Emergency patient direct ward placement.

#### Admissions (`admission.service.js` / `admission.controller.js`)
- `findAll()` / `findOne(id)` / `create(admission)` / `update(id, patch)`: Core inpatient admission tracking.

#### Pre-Requests & Intake State Machine (`preRequest.service.js` / `preRequest.controller.js`)
- `STATUSES`: `PENDING`, `APPROVED`, `REJECTED`, `CONSULTATION_DONE`, `EMERGENCY`, `ADMITTED`, `DISCHARGE_REQUESTED`, `DISCHARGE_APPROVED`, `DISCHARGED`.
- `TRANSITIONS`: Defines strict state transition matrix per actor role:
  - `PENDING` $\rightarrow$ `APPROVED` (PRE), `REJECTED` (PRE, Patient)
  - `APPROVED` $\rightarrow$ `EMERGENCY` (PRE), `CONSULTATION_DONE` (PRE), `ADMITTED` (HOM via bed allocation)
  - `EMERGENCY` $\rightarrow$ `ADMITTED` (HOM via bed allocation)
  - `ADMITTED` $\rightarrow$ `DISCHARGE_REQUESTED` (PRE)
  - `DISCHARGE_REQUESTED` $\rightarrow$ `DISCHARGE_APPROVED` (HOM)
  - `DISCHARGE_APPROVED` $\rightarrow$ `DISCHARGED` (PRE - releases bed back to `AVAILABLE` and marks admission `DISCHARGED`).
- `canTransition(from, to, role)`: Validates transition legality against matrix.
- `create(payload, createdBy)`: Submits new patient intake pre-request (`status: 'PENDING'`).
- `updateFields(id, patch)`: Updates doctor, department, time without changing status (rescheduling).
- `transition(id, toStatus, actorRole, extra)`: Executes state move, updates timestamps, handles reject reasons, bed allocation, and bed release on discharge.

#### Billing (`billing.service.js` / `billing.controller.js`)
- `findAllServices()` / `createService(service)`: Non-clinical and hospital service catalog.
- `findAllLedgers()` / `findLedgerByAdmission(admissionId)` / `findLedgerById(ledgerId)`: Inpatient ledgers.
- `createLedger(ledger)`: Creates billing ledger for admission (`status: 'OPEN'`).
- `findLedgerEntries(ledgerId)` / `addLedgerEntry(entry)`: Adds billable line item (service, quantity, unit_price, amount).
- `dispatchLedger(ledgerId)`: FA marks ledger `DISPATCHED` for patient review/payment.
- `createPayment(payment)`: Records payment against ledger; automatically sets ledger `PAID`, admission `PAYMENT_CONFIRMED`, `receipt_sent_to_hom = true`, and auto-generates a `receipt` record.
- `findPatientBills(patientId)`: Aggregates admissions, ledgers, and entries for patient view.
- `findAllReceipts()` / `findReceiptsByPatient(patientId)`: Receipt history.
- `findDischargeSummaryByAdmission(admissionId)` / `createDischargeSummary(summary)`: Discharge report generation.
- `findAllLeaders()` / `createLeader(payload)` / `approveLeader(leaderId)`: HOM posts service usage item as a "leader" request; FA approves it to auto-insert a verified `ledgerEntry` into the patient ledger.

#### Inventory (`inventory.service.js` / `inventory.controller.js`)
- `findAllItems()` / `createItem(item)` / `updateItem(id, patch)` / `deleteItem(id)`: Non-clinical supplies tracking (stock quantity vs reorder level).
- `findAllRequests()` / `createRequest(request)` / `updateRequest(id, patch)`: Procurement restock requests.

#### RBAC (`rbac.service.js` / `rbac.controller.js`)
- `ensurePermissionCatalog()`: Initializes standard permission catalog (`doctor:read`, `wardAdmin:delete`, `billing:write`, etc.).
- `listRoles(orgId)` / `createRole(orgId, payload)` / `findRole(orgId, roleId)`: Custom roles management.
- `permissionsForRole(roleId)` / `assignPermission(roleId, permId)` / `unassignPermission(roleId, permId)`: Permission mapping.
- `assignStaffRole(userId, roleId)` / `unassignStaffRole(userId, roleId)`: Grants custom role to staff.
- `staffFor(orgId)`: Lists all staff in organization with assigned custom roles.

#### Platform & Multi-Tenant Provisioning (`organization.service.js`, `subscription.service.js`, `subscriptionPlan.service.js`, `provisioning.service.js`, `platformAuth.service.js`, `platformActivity.service.js`)
- `provision(payload)`: Complete automated tenant provisioning pipeline: creates organization, primary hospital branch, activates subscription plan, sets module feature flags, creates default Admin user, seeds baseline wards and inventory items, generates API key, and records full audit log.
- `platformAuth.service.js`: Standalone login/me/logout for platform super users.
- `platformUsage(req, res)`: Aggregates MRR, ARR, tenant counts, branch counts, and user metrics.
- `marketplaceListing()`: Returns public list of active organizations, branches, and specialties.

---

## 2. Frontend Architecture (`front-end`)

```mermaid
graph TD
    UI[Browser DOM Views] --> Guard[Auth Guard (auth-guard.js)]
    Guard --> RBAC[Role Access (rbac.js)]
    UI --> ApiClient[API Client (api-client.js)]
    ApiClient --> Fetch[HTTP fetch() to localhost:3000]
    UI --> UIFeedback[UI Feedback & Dialogs (ui-feedback.js)]
    UI --> Formatters[Formatters (formatters.js)]
    UI --> Helpers[Role Helpers: hom-helpers, fa-helpers, shared-state]
    UI --> Store[Patient Store (patient-store.js)]
```

---

### 2.1 Shared Modules (`front-end/shared`)

| File | Global Object | Core Functions & Responsibilities |
| :--- | :--- | :--- |
| `api-client.js` | `window.ApiClient` | Central REST client. Handles session storage (`getSession`, `setSession`, `clearSession`), phone normalization (`normalizePhone`), error parsing, and structured domain APIs (`auth`, `marketplace`, `platform`, `rbac`, `doctors`, `patients`, `wards`, `inventory`, `billing`, `appointments`, `admissions`, `preRequests`, `activityLog`). |
| `rbac.js` | `window.RoleAccess` | Authentication & permission engine. Maps 5 actor profiles (`Admin`, `Patient`, `PRE`, `HOM`, `FA`), handles async `authenticate()`, `signupPatient()`, `enforceModuleAccess()`, route detection (`detectCurrentModule`, `getActorHome`), feature flags (`hasModule`), and tenant header branding (`applyTenantBranding`). |
| `auth-guard.js` | *(Self-executing)* | Checks `window.APP_MODULE` against `RoleAccess.enforceModuleAccess()`, applies branding, sets `window.PatientSession`. |
| `ui-feedback.js` | `window.UIFeedback` | Universal non-blocking notification & modal engine. `toast(message, type)`, `alert(opts) => Promise`, `confirm(opts) => Promise<boolean>`, `selectOne(opts) => Promise<val>`. |
| `constants.js` | `window.HospitalConstants` | System-wide enums: `DEFAULT_DEPARTMENTS`, `BED_STATUS`, `PRE_STATUS`, `ADMISSION_STATUS`, `PAYMENT_STATUS`, `SERVICE_STATUS`. |
| `formatters.js` | `window.Formatters` | Pure helpers: `escapeHtml(str)`, `formatCurrency(amt)` (Rs format), `formatDate(val)`, `formatAge(dob)`. |
| `insurance.js` | `window.InsuranceCalc` | `computePatientShare(grossTotal, policy, serviceNames)`: calculates covered amount and patient out-of-pocket share based on coverage limit and copay percentage. |
| `sanitizer.js` | `window.Sanitizer` | `forRole(data, role)`: strips sensitive financial/internal fields for `PATIENT` or `HOM` roles before display. |
| `department-options.js` | `window.DepartmentOptions` | `populateDepartmentSelect(selectEl, doctors, opts)`: populates `<select>` dropdown dynamically from active doctor specializations. |
| `dom-table.js` | `window.DomTable` | `renderRows(tbody, items, opts)`: renders table rows with empty-state handling. |

---

### 2.2 Actor Module Screens & JavaScript Handlers

#### Admin Module (`front-end/Admin`)
- `shared-nav.js`: Dynamically renders Admin sidebar navigation and handles active tab switching.
- `dashboard.js`: Analytics screen. Checks `ANALYTICS` module flag, queries wards, beds, patients, ledgers, inventory, and staff to render occupancy rates, live billed revenue, low stock alerts, and staff role distribution.
- `departments.js`: Ward and department management. Lists wards, shows occupancy rates, allows creating new wards (with auto-generated beds), editing total beds (with shrinkage guard against occupied beds), and deleting wards.
- `inventory-catalog.js`: Admin catalog management. Lists inventory catalog items, allows creating new tracked items with reorder levels, and deleting items.
- `admin.js`: Dynamic RBAC console. Fetches custom roles and system permissions catalog, allows creating new custom roles, toggling permission checkboxes in real-time, and assigning/unassigning custom roles to organization staff members.

#### Hospital Operations Manager Module (`front-end/HOM`)
- `shared-nav.js` / `ui-template.js` / `hom-helpers.js`: Shared nav layout, UI component generators (cards, tables, badges), patient-preRequest join helpers, and date math.
- `dashboard.js`: Operational command center. Renders bed registry cards (with ward/status filters), active inpatients, pending bed requests, ward occupancy bars, live activity logs, billing queue, and pre-discharge monitoring.
- `beds.js`: Interactive bed grid. Displays beds grouped by ward, color-coded by status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`), with search and filter tabs; clicking an available bed opens a modal to allocate a pending bed request.
- `patient-flow.js`: Inpatient stay & discharge monitoring. Lists patients in `ADMITTED`, `DISCHARGE_REQUESTED`, `DISCHARGE_APPROVED`, `DISCHARGED` states. Provides the HOM "Approve Discharge" action.
- `inventory.js`: Non-clinical supplies tracker. Shows items with low-stock warnings, logs supply usage against patient UHIDs, and creates purchase restock requests.
- `billing.js`: Read-only billing monitor & service charge poster. Shows open/dispatched/paid ledgers with itemized breakdowns; includes the "Post Service Used" modal to submit charge requests ("leaders") to FA for approval.

#### Finance Associate Module (`front-end/FA`)
- `router.js` / `permissions.js`: Client-side hash routing (`#/dashboard`, `#/charges`, `#/ledger`, `#/eod`, `#/discharge`, `#/receipts`) and view access checks.
- `fa-helpers.js`: Data joining adapter for admissions, ledgers, entries, payments, and discharge summaries.
- `app.js`: Master FA view renderer for all hash routes, metrics summary cards, active admission billing queues, and receipt print dialogs.
- `modules/billing.js`: Billing execution engine:
  - `createLedgerAndOpen(admissionId)`: Creates new open ledger for an admission.
  - `addCharge(ledgerId, serviceId, qty)` / `addChargeFromForm()`: Adds line item charge to ledger.
  - `dispatchCurrent(ledgerId)`: Dispatches bill to patient for review/payment.
  - `recordCashPayment(ledgerId)`: Records cash payment, auto-settles ledger, confirms payment, and generates receipt.
  - `ensureDischargeSummary(admissionId)`: Creates finalized discharge summary with notes and final amount.

#### Patient-Relation Executive Module (`front-end/PRE`)
- `shared-state.js`: Normalized data jointer connecting preRequests to patient profiles and doctors, status label mappers, doctor availability time checks, and ward type inference.
- `Appointment.js`: Appointment booking & walk-in registration. Live patient UHID autocomplete picker, doctor specialization dropdown, availability validation, and appointment submission.
- `requests.js`: Appointment triage dashboard. Displays pending online booking requests with `Approve` (assign doctor and slot), `Suggest` (reschedule slot), and `Reject` (with reason) actions.
- `admitted.js`: Active admitted inpatient list with ward/bed details.
- `discharge.js`: Discharge coordination screen. PRE initiates discharge request (`ADMITTED` $\rightarrow$ `DISCHARGE_REQUESTED`) and executes final sign-off (`DISCHARGE_APPROVED` $\rightarrow$ `DISCHARGED`), releasing the physical bed back to available.
- `emergency.js`: Emergency intake form placing urgent patients directly into wards.
- `doctor.js`: Doctor availability slot viewer.
- `patient-records.js`: Patient directory lookup and profile view.
- `hom.js`: HOM coordination overview from PRE perspective.
- `rejected.js`: Log of rejected requests with reasons.

#### Patient Portal (`front-end/Patient`)
- `js/patient-store.js`: Data adapter layer for patient portal. Fetches patient profile, appointments, visits, active bills, receipts, and notifications from `ApiClient`.
- `patient-dashboard.js`: Patient home dashboard showing upcoming appointments, current inpatient status, active bills, notification feed, and medical documents.
- `patient-book-appointment.js`: Patient self-service appointment scheduling with live doctor and date/time selection.
- `patient-billing.js`: Transparent patient billing view. Displays dispatched bills with itemized service charges, insurance deduction breakdown (`InsuranceCalc`), and simulated "Pay Now" checkout link.
- `patient-profile.js`: Patient demographic and insurance policy management (view/edit personal details and insurance cards).

#### Auth, Marketplace & Platform (`front-end/login`, `signup`, `marketplace`, `platform`)
- `landing/landing-page.js`: Navigation router to login, signup, marketplace, or org onboarding.
- `login/login-page.js`: Multi-role login interface (`Patient`, `PRE`, `HOM`, `FA`, `Admin`) with hospital tenant selector, demo credential helper cards, and error handling.
- `signup/signup-page.js`: Patient registration wizard with automatic UHID assignment.
- `signup/org-signup.js`: Hospital chain 5-step self-service onboarding wizard (organization details, plan selection, module feature flags, admin credentials, simulated payment checkout, and instant tenant provisioning).
- `marketplace/marketplace-page.js`: Public hospital directory with search by name/city/specialty and direct login/registration deep-links.
- `platform/platform-login.js` & `platform-dashboard.js`: Platform Super User management console for managing organizations, subscription plans, quotas, API keys, and revenue analytics (MRR/ARR).

---

## 3. Discovered Codebase Inconsistencies & Logical Bugs

1. **Storage Mechanism Mismatch**:
   - `api-client.js` comments state session is saved in `localStorage`, but code calls `sessionStorage.getItem(SESSION_KEY)`. This prevents multi-tab session persistence for staff and patients.
2. **Missing `node_modules` in Backend**:
   - `back-end` does not have dependencies installed, causing `npm test` and server start commands to fail until `npm install` is executed.
3. **Unprotected Bulk Data Sync Route**:
   - `back-end/src/routes/data.routes.js` exposes `GET /data/full-state` and `POST /data/full-state` without authentication or role guards, allowing total overwrite of all database collections.
4. **Synchronous Cryptographic Operations on Event Loop**:
   - `auth.service.js` and `platformAuth.service.js` use `bcrypt.hashSync` and `bcrypt.compareSync`, blocking the Node.js event loop during user logins.
5. **Ad-Hoc ID Generation Race Condition**:
   - Across services, IDs are generated via `Math.max(...dataStore.x.map(...)) + 1`. This is non-atomic and prone to ID collisions under concurrent mutations.
6. **Fragile State Persistence**:
   - `persist.js` writes the entire memory object to disk on every mutating HTTP response. Large datasets risk blocking I/O and partial file writes if the server terminates mid-write.
7. **Scattered Global Script Dependencies**:
   - The frontend relies on over 12 global objects attached to `window`. Missing script tags or incorrect ordering in any HTML file causes fatal `ReferenceError` crashes.
8. **Inconsistent Error Response Shapes**:
   - Some backend endpoints return `{ message, error, statusCode }` while others return `{ error: 'CODE', message }` or `{ success: true, ... }`, creating brittle response parsing on the frontend.
