# Federico — Hospital Administrative Operations Platform

Federico is a multi-tenant web application designed to streamline non-clinical hospital administrative operations, including patient registration, OPD/IPD separation, bed and ward management, non-clinical inventory tracking, dynamic role-based access control, resource-based revenue modeling, and transparent billing workflows.

> **Scope Note:** Federico is strictly a non-clinical system. It does not handle clinical diagnosis, medical prescriptions, or clinical decision support.

---

## Key Features

- **Multi-Tenancy & RBAC:** Organization-level data isolation with custom dynamic role and permission management.
- **Patient Intake & OPD/IPD Separation:** Online appointment booking, pre-registration review, OPD specialist consultations, and emergency admissions.
- **Bed & Ward Management:** Real-time bed occupancy tracking with automated admission cascades, transfer tracking, and discharge gating.
- **Clinical & Resource Service Logs:** Ward service logging and resource-based charging with dual-step finance approval before ledger entry.
- **Billing, Receipts & Revenue:** Itemized digital bill dispatch, insurance copay calculations, online/cash payment processing, and platform revenue modeling.

---

## Architecture Overview

Federico follows a layered clean architecture pattern:

```
Frontend (Vanilla ES6+ HTML / CSS / JS)
    │
    ▼ (REST API / Bearer Token & Per-Tab Session Isolation)
Express.js Routing & Middleware (Auth, Security/CSP, Multi-Tenancy, Dynamic RBAC)
    │
    ▼
Schema Validators & HTTP Controllers (Standardized API Envelopes)
    │
    ▼
Domain Services (Business Logic & State Transitions)
    │
    ▼
In-Memory Store (dataStore.js) with Crash-Safe Atomic Disk Persistence (db.json)
```

---

## User Roles & Portals

| Role | Portal Path | Key Responsibilities |
| :--- | :--- | :--- |
| **Platform Super User** | `front-end/platform/` | Tenant provisioning, subscription plans, module flags, revenue tracking, and audit logs. |
| **Hospital Admin** | `front-end/Admin/` | Branch setup, custom dynamic RBAC roles, staff assignment, doctor catalog, and inventory catalogs. |
| **Hospital Operations (HOM)** | `front-end/HOM/` | Real-time bed allocation, ward occupancy matrix, service charge logging, and medical discharge readiness. |
| **Patient Registration (PRE)** | `front-end/PRE/` | Pre-registration review, OPD appointments, emergency triage, and final administrative discharge. |
| **Finance Associate (FA)** | `front-end/FA/` | Service charge approvals, manual charge entries, bill dispatch, payment processing, and receipts. |
| **Patient** | `front-end/Patient/` | OPD specialist booking, insurance management, itemized bill review, and digital payments. |

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Install Backend Dependencies
```bash
cd back-end
npm install
```

### 2. Start Backend Server
```bash
# Production start
npm start

# Development mode with nodemon
npm run start:dev
```
The server will run on `http://localhost:3000`.
- Health Check: `http://localhost:3000/health`
- API Documentation (Swagger): `http://localhost:3000/api`

### 3. Open Frontend
Serve the `front-end` directory with any static web server or open directly in a browser:
```bash
cd front-end
npx serve .
```
Open `http://localhost:5500/landing/landing-page.html` or `http://localhost:5500/login/login-page.html`.

---

## Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Platform Super User** | `platform@federico.com` | `Federico@Platform123` |
| **Hospital Admin** | `owner@hosp.com` | `Owner@123` |
| **Hospital Operations (HOM)** | `admin@hosp.com` | `Hom@123` |
| **Patient Registration (PRE)** | `rekha.pre@hosp.com` | `Pre@123` |
| **Finance Associate (FA)** | `farah.fa@hosp.com` | `Fa@123` |
| **Patient** | `arjun.k@hosp.com` | `Hamiz@123` |

---

## Automated Testing

Run the test suite from the `back-end` directory:

```bash
cd back-end
npm test
```

All 20 test suites (101 tests) cover unit tests, security middleware, data integrity, tenant boundary isolation, dynamic RBAC, OPD/IPD separation, platform marketplace revenue, and the full multi-role inpatient admission and discharge lifecycle.

---

## Directory Structure

```
16_Federico/
├── definitions.yml              # System, actor, and endpoint definitions
├── front-end/                   # Role portals and shared UI components
│   ├── Admin/                   # Hospital Admin portal
│   ├── FA/                      # Finance Associate portal
│   ├── HOM/                     # Hospital Operations Manager portal
│   ├── PRE/                     # Patient Registration & Eligibility portal
│   ├── Patient/                 # Patient self-service portal
│   ├── platform/                # Platform Super User portal
│   ├── landing/                 # Public product showcase & overview
│   ├── login/ & signup/         # Authentication & registration
│   ├── marketplace/             # Hospital onboarding directory
│   └── shared/                  # API client, design tokens, RBAC, and UI feedback
└── back-end/                    # Express REST API backend
    ├── src/
    │   ├── config/              # Environment, Swagger, service & resource catalogs
    │   ├── controllers/         # HTTP request handlers & standardized response envelopes
    │   ├── middleware/          # Auth, session, tenant scoping, security CSP & RBAC
    │   ├── routes/              # Express REST route definitions
    │   ├── services/            # Domain business logic & state machine orchestration
    │   ├── store/               # In-memory store (dataStore) & atomic disk persistence (persist)
    │   ├── utils/               # Logger, password hashing, roles & tenant helpers
    │   ├── validators/          # Declarative schema validators & validation engine
    │   └── test/                # E2E lifecycle, data integrity & integration test suites
    ├── data/                    # Local JSON persistence snapshot (db.json)
    ├── docs/                    # Architecture manual & API specifications
    ├── logs/                    # Runtime access, error & combined application logs
    └── uploads/                 # Storage for documents, branding & inventory media
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
