# Federico — Hospital Administrative Operations Platform

Federico is a multi-tenant web application designed to streamline non-clinical hospital administrative operations, including patient registration, bed and ward management, inventory tracking, role-based access control, and transparent billing.

> **Scope Note:** Federico is strictly a non-clinical system. It does not handle clinical diagnosis, medical prescriptions, or clinical decision support.

---

## Key Features

- **Multi-Tenancy & RBAC:** Organization-level data isolation with custom role and permission management.
- **Patient Intake & Scheduling:** Online appointment booking, pre-registration review, and emergency admissions.
- **Bed & Ward Management:** Real-time bed occupancy tracking with automated admission cascades.
- **Clinical Service Charge Logs:** Ward service logging with dual-step finance approval before ledger entry.
- **Billing & Receipts:** Insurance copay calculations, itemized digital bill dispatch, and payment receipt generation.

---

## Architecture Overview

Federico follows a layered clean architecture pattern:

```
Frontend (HTML / CSS / JS)
    │
    ▼ (REST API / Bearer Token)
Express.js Routing & Middleware (Auth, Multi-Tenancy, Dynamic RBAC)
    │
    ▼
Domain Services (Business Logic & State Transitions)
    │
    ▼
Data Access Layer (12 Typed Repositories)
    │
    ▼
In-Memory Store with Atomic Disk Persistence (db.json)
```

---

## User Roles & Portals

| Role | Portal Path | Key Responsibilities |
| :--- | :--- | :--- |
| **Platform Super User** | `front-end/platform/` | Tenant provisioning, subscription plans, module flags, and audit logs. |
| **Hospital Admin** | `front-end/Admin/` | Branch setup, custom RBAC roles, staff assignment, and inventory catalogs. |
| **Hospital Operations (HOM)** | `front-end/HOM/` | Real-time bed allocation, service charge logs, and discharge approvals. |
| **Patient Registration (PRE)** | `front-end/PRE/` | Pre-registration review, OPD appointments, and final administrative discharge. |
| **Finance Associate (FA)** | `front-end/FA/` | Service charge approvals, bill dispatch, payment processing, and receipts. |
| **Patient** | `front-end/Patient/` | Appointment booking, insurance details, bill review, and digital payments. |

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
npx serve front-end -p 5500
```
Open `http://localhost:5500/landing/landing-page.html` or `http://localhost:5500/login/login-page.html`.

---

## Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Platform Super User** | `platform@federico.com` | `Platform@123` |
| **Hospital Admin** | `owner@hosp.com` | `Owner@123` |
| **Hospital Operations (HOM)** | `admin@hosp.com` | `Hom@123` |
| **Patient Registration (PRE)** | `rekha.pre@hosp.com` | `Pre@123` |
| **Finance Associate (FA)** | `farah.fa@hosp.com` | `Fa@123` |
| **Patient** | `hamiz@hosp.com` | `Hamiz@123` |

---

## Automated Testing

Run the test suite from the `back-end` directory:

```bash
cd back-end
npm test
```

All 17 test suites (90 tests) cover unit tests, security middleware, data integrity, and the full multi-role patient lifecycle.

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
│   ├── login/ & signup/         # Authentication & registration
│   ├── marketplace/             # Hospital onboarding directory
│   └── shared/                  # API client, design tokens, and navbar
└── back-end/                    # Express REST API backend
    ├── src/
    │   ├── config/              # Environment & Swagger configuration
    │   ├── controllers/         # HTTP request handlers
    │   ├── errors/              # Domain exception classes
    │   ├── middleware/          # Auth, tenancy, and RBAC guards
    │   ├── repositories/        # Data Access Layer (DAL)
    │   ├── routes/              # Express route definitions
    │   ├── services/            # Domain business logic
    │   ├── store/               # In-memory store and atomic persistence
    │   ├── utils/               # Response envelopes and helpers
    │   └── test/                # Automated test suites
    └── data/                    # Local JSON persistence snapshot (db.json)
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
