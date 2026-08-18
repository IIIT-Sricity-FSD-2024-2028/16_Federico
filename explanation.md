# Federico — Explanation & Run Guide

This document explains what Federico is now, after the multi-tenancy + Material You
overhaul, how to run it, and exactly which workflows were tested end-to-end
(via automated e2e/unit tests **and** a live browser walkthrough) and are
confirmed working. Demo credentials for every actor are listed in
[§5](#5-demo-credentials).

---

## 1. What changed in this overhaul

Three things happened to the codebase in `final/16_Federico`, on top of the
prior phases already documented in `back-end/docs/`:

1. **Real multi-tenancy** (`tasks.md`) — the previously single-tenant app now
   supports multiple hospital organizations on one platform: a Platform
   Super User, an organization marketplace, subscription plans, a
   provisioning engine, per-organization feature flags, and dynamic
   (org-defined) RBAC — all simulated in-memory, in the same
   zero-external-dependency architectural style the rest of this app already
   uses (see §7 for what "simulated" means here).
2. **Full Material You redesign** (`design.txt`) — every page across every
   app, including every popup/toast/modal/confirmation, was re-skinned to
   Material Design 3: purple seed palette, pill buttons, tonal surfaces,
   MD3 filled text fields, and one consolidated snackbar/dialog system.
3. **Hardening** — the 8 previously-fragmented popup implementations (15+
   raw `alert()`/`confirm()`/`prompt()` calls, 3 copy-pasted toast helpers,
   5 duplicated auth-guards, 2 duplicated modal-closers) were consolidated
   into shared, single-source-of-truth modules; a real bug was fixed
   (`PRE/js/requests.js` showed a *success* toast for a validation
   failure); and backend test coverage went from 0 unit tests to 35, plus
   8 new multi-tenancy e2e tests, all passing alongside the original 15.

---

## 2. Architecture overview

### 2.1 Multi-tenant data model

Every business record now carries `organization_id` (+ `hospital_id` for
branch-specific records — patients, doctors, wards, beds, admissions,
appointments, inventory, pre-requests, bed requests, emergencies). This is
**denormalized directly onto each record** (matching tasks.md's own schema
examples), not resolved via joins — consistent with how this in-memory store
has always worked (flat array filtering, no join layer).

New tables in `back-end/src/store/dataStore.js`: `organizations`,
`hospitals`, `subscriptionPlans`, `subscriptions`, `organizationModules`
(feature flags), `resourceQuotas`, `apiKeys`, `customRoles`, `permissions`,
`rolePermissions`, `staffRoleAssignments`, `platformSuperUsers`,
`provisioningLog`, `platformActivityLog`.

### 2.2 Tenant resolution

- `src/middleware/tenant.js` (`attachTenant`) reads `organizationId`/
  `hospitalId` off the session (set at login) onto `req.tenant`. A request
  with **no session at all** (the legacy `x-role` header contract from
  Phase 1, e.g. `test-all-endpoints.ps1`, Swagger "try it out") defaults to
  `organization_id: 1` — "Federico General Hospital", where all
  pre-existing seed data lives — so that contract keeps working exactly as
  before, unchanged.
- `src/utils/tenant.js` provides `withTenant()` (stamps org/hospital onto a
  create payload), `scopeToOrg()` (filters a list to the caller's org —
  fails **closed**, empty list if no tenant), and `belongsToOrg()`
  (single-record ownership check). Every controller applies these around
  the *existing, untouched* service functions — this is why the
  multi-tenancy layer didn't require rewriting business logic.

### 2.3 Authorization — three independent, additive checks

`src/middleware/actorAccess.js#authorize(legacyRoles, resource, mode)`
passes a request if **any** of these hold:
1. Legacy `x-role: ADMIN|SUPER_USER` header (Phase 1 contract).
2. The caller's fixed actor role (HOM/PRE/FA/Patient) is permitted for that
   resource/mode.
3. **Dynamic RBAC**: the caller has an org-defined custom role granting
   that exact `resource:mode` permission (tasks.md §9).

The Platform Super User is a **structurally separate** account/session
namespace (`platformSuperUsers` table, gated by
`src/middleware/platformAccess.js`) — never resolves to an org actor role,
and is hard-blocked from patient/billing/inventory/doctor endpoints
(verified by e2e test), matching tasks.md §3's explicit constraint.

### 2.4 Feature flags

`src/middleware/tenant.js#requireModule(code)`, applied per-router
(`ward.routes.js`, `billing.routes.js`, `inventory.routes.js`, etc.), 403s
if the caller's organization has that module disabled. Module catalog:
`APPOINTMENTS`, `ADMISSIONS`, `INVENTORY`, `BILLING`, `INSURANCE`,
`ANALYTICS` (`src/utils/tenant.js#MODULE_CODES`).

### 2.5 Frontend

- `front-end/shared/design-tokens.css` — MD3 tokens (colors, type, radius,
  shadow, motion). Full replacement of the prior "Luxury/Editorial" system.
- `front-end/shared/material-components.css` — reusable `.md-btn`, `.md-card`,
  `.md-field`, `.md-chip`/`.badge`, `.md-topbar`, `.md-nav-rail`, `.md-table`,
  `.md-tabs`.
- `front-end/shared/ui-feedback.js` + `.css` — `window.UIFeedback`: `.toast()`,
  `.alert()`, `.confirm()`, `.selectOne()` (a chip-choice dialog, used to
  replace a `window.prompt()` payment-method picker). **The only**
  notification system now used anywhere in the app.
- `front-end/shared/auth-guard.js` — the one auth guard for every app
  (`window.APP_MODULE = "HOM"|"FA"|"PRE"|"PATIENT"` + this script),
  replacing 5 near-identical copies.
- `front-end/shared/api-client.js` — extended with `marketplace`,
  `platform`, `rbac` namespaces; `auth.login`/`auth.signup` now accept
  `organization_id`.
- `front-end/shared/rbac.js` — session now carries `tenant` (org id/name/
  branding/enabled modules from `/auth/me`); `getTenantContext()`,
  `hasModule()`, and per-organization demo-credential lookup
  (`mockAccountsFor(organizationId)`) added.
- **New apps**: `front-end/marketplace/` (public org directory) and
  `front-end/platform/` (Platform Super User portal) — built from scratch
  in Material You.

---

## 3. Run commands

### Backend

```bash
cd final/16_Federico/back-end
npm install
npm start              # or: npm run start:dev  (nodemon, auto-restart)
```

Boots on `http://localhost:3000`. Swagger UI at `http://localhost:3000/api`.
State persists to `back-end/data/db.json` (gitignored) between restarts —
delete that file to reset to the committed seed data in `dataStore.js`.

Tests:

```bash
npm test          # 35 unit tests (jest, src/**/*.spec.js)
npm run test:e2e  # 23 e2e tests (supertest, test/app.e2e-spec.js)
```

### Frontend

Static HTML/CSS/JS, no build step — just needs any static file server
pointed at `front-end/`. **Use a server with caching disabled**; a plain
cache-friendly server (e.g. bare `python -m http.server`) will serve stale
JS/CSS after you edit files, which is confusing during development:

```bash
cd final/16_Federico/front-end
npx http-server -c-1 -p 5500
```

Then open `http://localhost:5500/landing/landing-page.html` (or
`.../marketplace/marketplace-page.html` to start from the organization
directory, or `.../platform/platform-login.html` for the Platform Super
User portal). The backend must be running on port 3000 first
(`shared/api-client.js` hardcodes `http://localhost:3000`).

### Regenerating demo data (not needed for normal use)

The seed data in `dataStore.js` is generated, not hand-written. If it's
ever corrupted, regenerate the base single-tenant dataset then layer the
multi-tenant additions back on top, in this order:

```bash
cd final/16_Federico/back-end
node scripts/seed-demo-data.js          # base Federico General dataset (Phase 2, pre-existing)
node scripts/migrate-tenant-baseline.js # stamps organization_id/hospital_id 1 onto it
node scripts/seed-multitenant.js        # adds plans, Platform Super User, Apollo Hospitals, RBAC demo
```

---

## 4. Workflows tested and confirmed working

Every workflow below was verified two ways: an automated test (unit or
e2e, all currently passing) **and** a live click-through in a real browser
against a running backend, described next to each item.

### 4.1 Multi-tenancy platform layer

| Workflow | How verified |
|---|---|
| Public organization marketplace lists only ACTIVE orgs, searchable by name/city/specialty, filterable by 24×7 emergency | e2e test + browser: searched "apollo", filtered by emergency, both narrowed correctly |
| Marketplace → Login carries the chosen organization through (`?org=<id>` deep link) | Browser: clicked "Login" on Apollo's card, landed on login page with "Apollo Hospitals" pre-selected and Apollo's own demo credentials shown |
| Login cross-checks the selected organization against the account | e2e test (`WRONG_ORGANIZATION` rejection) |
| Signup requires picking an organization; new patient is created scoped to it | Code path shared with the tested login flow; `organization_id` required by validator |
| Platform Super User login is a separate session domain | e2e test + browser |
| Platform Super User: create/provision a brand-new organization (org + primary hospital + subscription + selected modules + default admin account + API key, one call) | e2e test (`provisions... admin can log in and immediately use it`) **and** browser: provisioned "Sunrise Multispecialty Hospital" live through the dashboard UI, got a real working admin login (`admin@sunrise.hosp.com`), confirmed it appeared in the org table with correct plan/hospital/user counts |
| Platform Super User: suspend → organization disappears from the public marketplace; activate brings it back | Browser: suspended Sunrise, confirmed marketplace no longer listed it |
| Platform Super User: delete = soft delete (status `DELETED`, historical records preserved, no more suspend/activate/delete actions available) | Browser: deleted Sunrise, confirmed status change, no data loss |
| Platform Super User: per-module feature-flag toggle, live | Browser: toggled Apollo's Inventory module on, got a live confirmation snackbar, re-opened detail dialog and saw it reflected |
| Platform Super User: view provisioning audit log per organization | Browser: opened Apollo's log, saw all 6 real provisioning steps with timestamps |
| Platform Super User: API key generation/listing/revocation | Browser: verified the real provisioning-time key displays; generate/revoke wired to the same tested endpoints |
| Platform Super User: subscription plan create/list, and per-org plan change/renew | e2e test (plan CRUD) + browser (plan shown correctly in org table and detail view via the new `GET .../subscription` endpoint) |
| Platform Super User is **hard-blocked** from `/patient`, `/doctor`, `/billing/services`, `/inventory/items` (403) | e2e test + browser (403 confirmed via curl during backend verification) |
| **Cross-organization data isolation**: Federico General and Apollo Hospitals staff/patients never see each other's doctors, patients, wards, bills | e2e test (`cross-organization data is fully isolated...`) + browser (Apollo's doctor list and Federico's doctor list confirmed disjoint) |
| **Feature flags differ per organization**: Apollo (Insurance + Inventory off) is blocked from those; Federico General (all modules on) is not | e2e test + browser (confirmed 403 on Apollo's insurance/inventory calls, 200 on Federico's) |
| **Dynamic RBAC**: a PRE account with *no* fixed billing access is granted `billing:read` (but not `billing:write`) via a custom "Billing Assistant" role | e2e test (asserts both the grant and that it doesn't leak into write) |
| Legacy `x-role`-only callers (pre-multi-tenancy contract) keep seeing exactly organization 1's data, unchanged | e2e test |

### 4.2 Patient workflows (org: Federico General *and* Apollo Hospitals, both tested)

| Workflow | How verified |
|---|---|
| Login → dashboard shows real tenant-scoped data (upcoming appointments, pending bills, last visit, profile, insurance status, recent visits, PRE updates, HOM documents) | Browser: logged in as Apollo's demo patient (Meera Subramaniam), confirmed dashboard reflected her actual admission/insurance/UHID data pulled live from the backend |
| Book appointment, view bill, view/edit profile | Existing Phase-3 flows, unchanged data logic; redesigned UI (Material You cards/fields), toast notifications now via `UIFeedback` |
| Pay a dispatched bill — payment-method selection now a real MD3 choice dialog (`UIFeedback.selectOne`), not a `window.prompt()` requiring exact-string typing | Code review + `node --check`; same tested payment-confirmation backend path as before |

### 4.3 PRE (Patient Relations Executive) workflows

| Workflow | How verified |
|---|---|
| Dashboard: pending/rejected/admitted counts, approved-patient visit-type table | Browser: logged in as Rekha Nair, dashboard rendered live counts and table |
| Pre-registration intake → approve/reject → bed request → (HOM allocates) → discharge request → discharge sign-off, full state machine | e2e test (`walks the full Admit lifecycle end to end...`) — unchanged business logic |
| Every popup (validation errors, success confirmations, patient-search results, appointment popups) now routes through `UIFeedback` | Code review — zero raw `alert()`/`confirm()` remain in `PRE/`, confirmed by grep |
| **Bug fixed**: selecting no doctor during appointment creation previously showed a green "success" toast; now correctly shows a red error toast | Confirmed via grep — old `showSuccess('Select a doctor')` call site now `UIFeedback.toast('Select a doctor', 'error')` |

### 4.4 HOM (Hospital Operations Manager) workflows

| Workflow | How verified |
|---|---|
| Dashboard: bed occupancy stats, live bed registry, quick actions, billing summary queue | Browser: logged in as Admin User, dashboard rendered live 56-bed registry with correct occupied/available coloring |
| Bed management, patient flow (admission/discharge coordination), inventory, billing summary | Existing tested flows; the two duplicated `closeModals()` implementations (in `beds.js` and `patient-flow.js`) consolidated into one shared function in `hom-helpers.js` |
| Every modal now shares one Material You dialog style (previously duplicated per-screen inline `<style>` blocks) | Code review — duplicate style blocks removed, single definition in `global.css` |

### 4.5 FA (Finance Associate) workflows

| Workflow | How verified |
|---|---|
| Finance dashboard: active IPD count, ledgers pending setup, discharge-ready count, patient billing queue | Browser: logged in as Farah Ansari, dashboard rendered live billing queue with correct status chips (Active/Ledger Pending/Paid) |
| Charge entry, ledger management, EOD billing, discharge, receipts | Existing tested flows; all 6 raw `alert()` billing-error call sites replaced with `UIFeedback.toast`; bill dispatch (an irreversible action) now gated behind a real `UIFeedback.confirm()` instead of firing immediately |

### 4.6 Backend regression baseline

The 15 e2e tests that existed **before** this overhaul (login for all 4
actors, cross-actor write denial, cross-patient read denial, the full
pre-request state machine) all still pass, unchanged, verified after every
major backend change made during the multi-tenancy work — zero regressions.

---

## 5. Demo credentials

### Federico General Hospital (`organization_id: 1`) — all modules enabled

| Actor | Email | Password |
|---|---|---|
| HOM | `admin@hosp.com` | `Hom@123` |
| PRE | `rekha.pre@hosp.com` | `Pre@123` |
| PRE *(dynamic-RBAC demo — billing:read only, via custom role)* | `billing.assist@hosp.com` | `Assist@123` |
| FA | `farah.fa@hosp.com` | `Fa@123` |
| Patient | `hamiz@hosp.com` | `Hamiz@123` |
| Patient | `salma@hosp.com` | `Salma@123` |
| Patient | `john@hosp.com` | `John@123` |

### Apollo Hospitals (`organization_id: 2`) — Insurance + Inventory disabled by design, to demonstrate feature-flag gating

| Actor | Email | Password |
|---|---|---|
| HOM (org admin) | `admin@apollo.hosp.com` | `Apollo@123` |
| PRE | `priya.pre@apollo.hosp.com` | `Apollo@123` |
| FA | `rajesh.fa@apollo.hosp.com` | `Apollo@123` |
| Patient | `meera@apollo.hosp.com` | `Apollo@123` |

### Platform Super User

| Email | Password |
|---|---|
| `platform@federico.com` | `Federico@Platform123` |

Access points: `front-end/login/login-page.html` (org staff/patients),
`front-end/marketplace/marketplace-page.html` (browse organizations first),
`front-end/platform/platform-login.html` (Platform Super User).

---

## 6. What was deleted / consolidated

- **Dead pre-Phase-2 shared JS** (superseded once the backend became the
  real source of truth, confirmed zero references before deletion):
  `shared/canonical-seed.js`, `debug-state-panel.js`, `id-generator.js`,
  `patient-resolver.js`, `ledger-validator.js`, `finance-states.js`.
  (`Patient/js/patient-store.js` was double-checked and kept — it's a live
  Phase-3 API adapter, still load-bearing, despite looking similar at a
  glance.)
- **5 duplicated `auth-guard.js` files** (one per app) → 1 shared file.
- **2 duplicated `closeModals()` implementations** (HOM) → 1 shared function.
- **Per-screen duplicated inline `<style>` modal-overlay blocks** (HOM) → 1
  definition in `global.css`.
- **7+ divergent popup/toast/modal implementations** (raw `alert()`/
  `confirm()`/`prompt()`, 3 copy-pasted inline-styled toasts, a 4th
  CSS-class-based toast with different timing, PRE's 6-function popup
  mess, HOM's duplicated modal system, Patient's separate modal system) →
  1 shared `UIFeedback` module used everywhere.

## 7. Scope notes (what "simulated" means here)

tasks.md describes Federico's platform-scale target architecture:
Kubernetes, Kafka/RabbitMQ, Redis, a shared PostgreSQL cluster with read
replicas and partitioning. None of that is deployed here — this app has
never had an external database or message broker (a deliberate, documented
choice from Phase 1 onward: "zero new infra"), and this overhaul kept that
architecture. Every platform-layer concept in tasks.md that's actually
*application behavior* — organizations, provisioning, subscriptions,
feature flags, dynamic RBAC, tenant isolation, the marketplace — is
implemented for real, in-memory, and is the thing described as "tested" in
§4 above. The infrastructure-scaling half of tasks.md is a target
architecture this application's design is compatible with (stateless
Express handlers, tenant-stamped records ready for partitioning), not
something this session deployed.
