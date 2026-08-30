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
```

* **API Server:** `http://localhost:3000`
* **Health Check:** `http://localhost:3000/health`
* **Interactive Swagger UI:** `http://localhost:3000/api`
* **Public File Uploads:** `http://localhost:3000/uploads/:category/:filename`

---

## System Architecture

The backend follows a layered clean architecture with strict separation of concerns:

```
src/
├── config/            # Environment validation, Swagger definitions, default clinical catalog
├── controllers/       # HTTP controllers with standardized response envelopes
├── errors/            # Domain error classes (AppError hierarchy)
├── middleware/        # Security (CSP, sanitization), request logging, session auth, tenant scoping, RBAC
├── routes/            # REST route definitions and validation wiring
├── services/          # Pure domain business logic and state machine orchestration
├── store/             # In-memory data store (dataStore) and session store (sessionStore)
├── utils/             # Log manager, password hashing (bcrypt), token generators, response formatters
├── validators/        # Declarative schema validators with NestJS-style error shapes
└── test/              # Unit, service, middleware, and lifecycle test suites
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
| **Platform Ops** | `/platform` | Organization provisioning, subscription plans, module flags, metrics |
| **Patients** | `/patient` | Patient registry, UHID lookup, profile updates, intake history |
| **Pre-Requests** | `/pre-request` | Admission pre-registration, status transitions, approvals, rejections |
| **Wards & Beds** | `/ward` | Ward CRUD, bed occupancy grid, bed allocation, emergency admissions |
| **Admissions** | `/admission` | Inpatient admission records, patient stay tracking, discharge flow |
| **Billing & Finance** | `/billing` | Ledgers, itemized charges, HOM leader charges, payments, receipts |
| **Doctors** | `/doctor` | Doctor catalog, specialties, consultation schedules |
| **Appointments** | `/appointment` | OPD doctor appointments, booking, status transitions |
| **Inventory** | `/inventory` | Non-clinical supply catalog, stock updates, purchase requests |
| **Dynamic RBAC** | `/rbac` | Custom roles, granular permission assignment, staff role allocation |
| **Marketplace** | `/marketplace` | Public hospital directory, onboarding, organization profiles |
| **File Uploads** | `/uploads` | Document, branding, and inventory image uploads (`/document`, `/branding`, `/inventory`) |
| **System Logs** | `/uploads/system/logs-status` | Server log status, rotation, and error inspection |

---

## Demo Accounts

| Role | Email | Password | Primary Portal |
| :--- | :--- | :--- | :--- |
| **Platform Super User** | `platform@federico.com` | `Platform@123` | `front-end/platform/` |
| **Hospital Admin** | `owner@hosp.com` | `Owner@123` | `front-end/Admin/` |
| **Hospital Operations (HOM)** | `admin@hosp.com` | `Hom@123` | `front-end/HOM/` |
| **Patient Registration (PRE)** | `rekha.pre@hosp.com` | `Pre@123` | `front-end/PRE/` |
| **Finance Associate (FA)** | `farah.fa@hosp.com` | `Fa@123` | `front-end/FA/` |
| **Patient** | `arjun.k@hosp.com` | `Arjun@123` | `front-end/Patient/` |

---

## Testing & Quality Assurance

```bash
# Run unit, service, middleware, and integration test suites
npm test

# Run ESLint validation across backend codebase
npm run lint
```

All test suites verify:
- Data Access Layer & In-Memory Store integrity
- Security middleware (CSP, sanitization, rate-limiting, session auth)
- Multi-tenant boundary isolation
- Dynamic RBAC permissions
- End-to-end multi-role inpatient admission and billing lifecycles

---

## In-Memory Architecture

Runtime state is maintained purely in-memory for microsecond-latency reads and writes. On each server restart, the database resets cleanly to the baseline seed dataset in `src/store/dataStore.js`, providing an isolated, fresh state every time.

