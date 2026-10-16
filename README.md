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
Frontend (React 19 + Vite 8 SPA — components, hooks, ES modules, react-router-dom)
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

| Role | Entry Route | Key Responsibilities |
| :--- | :--- | :--- |
| **Platform Super User** | `/platform/platform-dashboard.html` | Tenant provisioning, subscription plans, module flags, revenue tracking, and audit logs. |
| **Hospital Admin** | `/Admin/screen-01-dashboard.html` | Branch setup, custom dynamic RBAC roles, staff assignment, doctor catalog, and inventory catalogs. |
| **Hospital Operations (HOM)** | `/HOM/screen-01-dashboard.html` | Real-time bed allocation, ward occupancy matrix, service charge logging, and medical discharge readiness. |
| **Patient Registration (PRE)** | `/PRE/pages/PRE.html` | Pre-registration review, OPD appointments, emergency triage, and final administrative discharge. |
| **Finance Associate (FA)** | `/FA/fa-dashboard.html` | Service charge approvals, manual charge entries, bill dispatch, payment processing, and receipts. |
| **Patient** | `/Patient/patient-dashboard.html` | OPD specialist booking, insurance management, itemized bill review, and digital payments. |

### One sign-in page for everyone

Every actor signs in at `/login/login-page.html`. The page reads the portal from the email,
so there are no role tabs and no separate platform login:

| Email shape | Signs in to | Endpoint |
| :--- | :--- | :--- |
| `name.hom@<hospital domain>` | HOM portal of that hospital | `POST /auth/login/hom` |
| `name.pre@<hospital domain>` | PRE portal | `POST /auth/login/pre` |
| `name.fa@<hospital domain>` | FA portal | `POST /auth/login/fa` |
| `name.admin@<hospital domain>` | Hospital Admin portal | `POST /auth/login/admin` |
| `name.platform@federico.com` | Platform Super User console | `POST /platform/auth/login` |
| anything else (personal email) | Patient portal (pick your hospital) | `POST /auth/login/patient` |

Each hospital has a staff **email domain** (`citygen.com`, `apollo.com`, …). It is suggested from the
hospital name at onboarding ("City General Hospital" → `citygen.com`), can be edited there, must be
unique, and cannot be a public mail domain. Only a Platform Super User can change it later
(Platform dashboard → Manage → Staff Email Domain), which renames every staff login on the old domain
and signs those users out. A staff role change in Admin → People renames the email's tag to match.

Signing in routes each role to its own portal automatically. The full route table is
in [`front-end/README.md`](front-end/README.md).

---

## Getting Started

### Prerequisites
- Node.js v20.19+ or v22.12+ (required by Vite 8)
- npm (v9 or higher)

Run the backend and the frontend in two separate terminals.

### 1. Backend — `http://localhost:3000`
```bash
cd back-end
npm install

# Development mode with nodemon
npm run start:dev

# or production start
npm start

# Reset database to default mock data (38 collections, 13 users, 29 patients)
npm run db:reset
```
- Health Check: `http://localhost:3000/health`
- API Documentation (Swagger): `http://localhost:3000/api`
- Reset Database: `npm run db:reset` (runs `scripts/reset-database.js` to restore `data/db.json` from `dataStore.js` and reload nodemon)

### 2. Frontend — `http://localhost:5173`
```bash
cd front-end
npm install
npm run dev
```
Open `http://localhost:5173/`, which redirects to the landing page.

The frontend defaults to an API on `http://localhost:3000`. To point it elsewhere,
copy `.env.example` to `.env` and set `VITE_API_URL`.

### Production build
```bash
cd front-end
npm run build      # bundles into dist/
npm run preview    # serves dist/ with the same URL rewriting as dev
```
Routes keep their legacy `.html` suffixes, so **any production host needs a SPA
fallback rewrite** to `index.html` or every deep link 404s. See
[`front-end/README.md`](front-end/README.md) for the nginx example and the full route
table.

---

## Demo Credentials

All of these sign in at `/login/login-page.html` (City General Hospital = `citygen.com`, Apollo = `apollo.com`).

| Role | Email | Password |
| :--- | :--- | :--- |
| **Platform Super User** | `super.platform@federico.com` | `Federico@Platform123` |
| **Hospital Admin** | `owner.admin@citygen.com` | `Owner@123` |
| **Hospital Operations (HOM)** | `admin.hom@citygen.com` | `Hom@123` |
| **Patient Registration (PRE)** | `rekha.pre@citygen.com` | `Pre@123` |
| **Finance Associate (FA)** | `farah.fa@citygen.com` | `Fa@123` |
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
├── react-migration-plan.md      # Record of the vanilla-JS -> React migration
├── front-end/                   # React + Vite SPA serving all eight role portals
│   ├── index.html               # Single entry point — one script tag, /src/main.jsx
│   ├── vite.config.js           # SPA fallback for the legacy .html route suffixes
│   └── src/
│       ├── main.jsx             # createRoot + SessionProvider + RouterProvider
│       ├── routes.jsx           # Full route table; portal layouts are lazy-loaded
│       ├── api/                 # One module per backend namespace, composed into `api`
│       ├── auth/                # Session context, route guard, actor home paths
│       ├── lib/                 # Pure helpers: formatters, insurance, sanitizer, CSV, print
│       ├── hooks/               # useApi, usePolling, usePageStyles, useDocumentTitle
│       ├── components/          # Feedback (toast/dialog), UI primitives, layout, forms
│       ├── pages/               # One folder per portal: admin, fa, hom, patient,
│       │                        #   platform, pre, public
│       └── styles/              # Stylesheets, mounted per route by usePageStyles
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
