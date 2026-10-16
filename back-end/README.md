# Federico — Backend API

Express.js REST API for the **Federico Hospital Administrative Operations Platform** — a multi-tenant, non-clinical hospital operations management system.

---

## Quickstart & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
cd back-end
npm install
```

### 3. Running the Server

```bash
# Production start
npm start

# Development mode (auto-reload via nodemon)
npm run start:dev

# Reset database to canonical default mock data anytime
npm run db:reset
```

* **API Server:** `http://localhost:3000`
* **Health Check:** `http://localhost:3000/health`
* **Interactive Swagger UI:** `http://localhost:3000/api`
* **Public File Uploads:** `http://localhost:3000/uploads/:category/:filename`
* **Database Reset:** `npm run db:reset` (restores `data/db.json` from `src/store/dataStore.js`, prunes temporary uploads, and reloads server)

---

## System Architecture

The backend follows a layered clean architecture with strict separation of concerns:

```
src/
├── config/            # Environment validation, Swagger definitions, default clinical & resource catalogs
├── controllers/       # HTTP controllers with standardized response envelopes
├── middleware/        # Security (CSP, sanitization), request logging, session auth, tenant scoping, RBAC, error handler
├── routes/            # REST route definitions and validation wiring
├── services/          # Pure domain business logic and state machine orchestration
├── store/             # In-memory store (dataStore) and crash-safe atomic disk persistence (persist)
├── utils/             # Log manager, password hashing (bcrypt), token generators, response formatters, tenant helpers
├── validators/        # Declarative schema validators with NestJS-style error shapes & engine
└── test/              # E2E lifecycle, data integrity, discharge gating, and OPD test suites
```

---

## Authentication & Security

1. **Cryptographic Token Sessions:** Bearer tokens passed via `Authorization: Bearer <token>` or HTTP cookie.
2. **Per-Tab Session Isolation:** Supports isolated tokens per browser tab to prevent session collisions across concurrent logins.
3. **Multi-Tenancy Scoping:** `attachTenant` middleware strictly partitions all data queries and mutations by `organization_id`.
4. **Dynamic RBAC & Feature Flags:** Dynamic role permission checking (`requireRole`) and organizational module enforcement (`requireModule`).
5. **Security Hardening:** Strict Content Security Policy (CSP), request body XSS sanitization, rate limiting on auth and upload endpoints.

---

## Key API Modules & Endpoints

| Module | Route Prefix | Key Functionality |
| :--- | :--- | :--- |
| **Auth** | `/auth` | Staff and patient login, registration, current session (`/me`), logout |
| **Platform Auth** | `/platform/auth` | Platform super user login, session inspection, logout |
| **Platform Ops** | `/platform` | Organization provisioning, subscription plans, module flags, resource revenue metrics |
| **Patients** | `/patient` | Patient registry, UHID lookup, profile updates, intake history |
| **Pre-Requests** | `/pre-requests` | Admission pre-registration, status transitions, approvals, rejections |
| **Wards & Beds** | `/ward` | Ward CRUD, bed occupancy grid, bed allocation, emergency admissions |
| **Admissions** | `/admission` | Inpatient admission records, patient stay tracking, discharge flow |
| **Billing & Finance** | `/billing` | Ledgers, itemized charges, HOM leader charges, resource charges, payments, receipts |
| **Doctors** | `/doctor` | Doctor catalog, specialties, department filtering, consultation schedules |
| **Appointments** | `/appointment` | OPD doctor appointments, booking, consultation status transitions |
| **Inventory** | `/inventory` | Non-clinical supply catalog, stock updates, purchase requests |
| **Dynamic RBAC** | `/rbac` | Custom roles, granular permission assignment, staff role allocation |
| **Marketplace** | `/marketplace` | Public hospital directory, onboarding, organization profiles |
| **File Uploads** | `/uploads` | Document, branding, and inventory image uploads (`/document`, `/branding`, `/inventory`) |
| **System Logs** | `/uploads/system/logs-status` | Server log status, rotation, and error inspection |

---

## Demo Accounts

| Role | Email | Password | Primary Portal |
| :--- | :--- | :--- | :--- |
| **Platform Super User** | `super.platform@federico.com` | `Federico@Platform123` | `/platform/platform-dashboard.html` |
| **Hospital Admin** | `owner.admin@citygen.com` | `Owner@123` | `/Admin/screen-01-dashboard.html` |
| **Hospital Operations (HOM)** | `admin.hom@citygen.com` | `Hom@123` | `/HOM/screen-01-dashboard.html` |
| **Patient Registration (PRE)** | `rekha.pre@citygen.com` | `Pre@123` | `/PRE/pages/PRE.html` |
| **Finance Associate (FA)** | `farah.fa@citygen.com` | `Fa@123` | `/FA/fa-dashboard.html` |
| **Patient** | `arjun.k@hosp.com` | `Hamiz@123` | `/Patient/patient-dashboard.html` |

---

## Testing & Quality Assurance

```bash
# Run unit, service, middleware, and integration test suites (20 suites, 101 tests)
npm test

# Run ESLint validation across backend codebase
npm run lint
```

All 20 test suites verify:
- Data Store integrity and crash-safe atomic disk persistence
- Security middleware (CSP, sanitization, rate-limiting, session auth)
- Multi-tenant boundary isolation and custom dynamic RBAC permissions
- OPD check-in, doctor consultation completion, and separated outpatient billing
- Resource-based charging and platform marketplace revenue models
- End-to-end multi-role inpatient admission, discharge gating, and billing lifecycles

---

## Data Durability & Persistence

Runtime state is maintained in-memory for microsecond-latency reads and safely snapshotted to `data/db.json`. Disk writes use an atomic temporary-file-and-rename strategy (`db.json.tmp` → `db.json`) with automated retry logic to prevent file corruption.
