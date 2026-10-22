# Federico

**Hospital Administrative Operations Platform**

A multi-tenant web application for coordinating non-clinical hospital operations, patient administration, resource workflows, and billing.

## Overview

Federico brings hospital teams into one role-aware workspace. It supports organization and hospital-level data separation, configurable staff permissions, patient intake, appointments, admissions, beds and wards, non-clinical inventory, billing, receipts, and operational reporting.

## User roles

| Role | Main responsibilities |
| --- | --- |
| Platform Super User | Organization provisioning, plans, modules, platform reporting, and audit activity |
| Hospital Admin | Staff, roles, departments, hospital configuration, and inventory catalog |
| Hospital Operations (HOM) | Beds, wards, operational coordination, inventory, and discharge readiness |
| Patient Registration (PRE) | Intake, appointments, emergency registration, admission coordination, and discharge sign-off |
| Finance Associate (FA) | Charge review, billing, payment processing, and receipts |
| Patient | Appointments, profile and insurance, bills, payments, and documents |

## Getting started

### Requirements

- Node.js **20.19+** or **22.12+**
- npm 9 or later

Run the API and web application in separate terminals.

### 1. Start the backend

```sh
cd back-end
npm install
npm run start:dev
```

The API runs at `http://localhost:3000` by default.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `/api` | Interactive Swagger documentation |
| [`back-end/docs/swagger.json`](back-end/docs/swagger.json) | OpenAPI specification |

To restore the JSON snapshot from the canonical seed, run `npm run db:reset` from `back-end`. This replaces local runtime data with the default mock dataset.

### 2. Start the frontend

```sh
cd front-end
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend uses `http://localhost:3000` as its default API URL. To use another API host, copy `front-end/.env.example` to `front-end/.env` and set `VITE_API_URL`.

### Backend configuration

Copy `back-end/.env.example` to `back-end/.env` to configure the port, host, persistence path, session secret, and persistence debounce. Set a unique secret outside local development; do not commit environment files or secrets.

### Production frontend

```sh
cd front-end
npm run build
npm run preview
```

The build is written to `front-end/dist`.

## Demo accounts

These seeded accounts are for local demonstration only. Never use the listed passwords in a deployed environment.

| Role | Email | Password |
| --- | --- | --- |
| Platform Super User | `super.platform@federico.com` | `Federico@Platform123` |
| Hospital Admin | `owner.admin@citygen.com` | `Owner@123` |
| Hospital Operations (HOM) | `admin.hom@citygen.com` | `Hom@123` |
| Patient Registration (PRE) | `rekha.pre@citygen.com` | `Pre@123` |
| Finance Associate (FA) | `farah.fa@citygen.com` | `Fa@123` |
| Patient | `arjun.k@hosp.com` | `Hamiz@123` |

## Quality checks

Run backend commands from `back-end`:

```sh
npm test -- --runInBand
npm run lint
node scripts/verify_relational_integrity.js
node scripts/verify_lifecycle_constraints.js
node scripts/verify_challenger_gate_r2.js
```

Run frontend checks from `front-end`:

```sh
npm run lint
npm run build
```

## Project layout

```text
16_Federico/
├── Database/                 SQL schema, schema documentation, and ER diagram
├── back-end/
│   ├── src/config/            Runtime configuration and API documentation
│   ├── src/controllers/       HTTP handlers
│   ├── src/middleware/        Authentication, tenant scope, and access control
│   ├── src/routes/            REST endpoint definitions
│   ├── src/services/          Business rules and workflow transitions
│   ├── src/store/             Seed data and persistence implementation
│   ├── src/validators/        Request validation
│   ├── src/test/              Unit, integration, and lifecycle tests
│   ├── scripts/               Data integrity and lifecycle verification tools
│   ├── docs/                  Backend reference and OpenAPI specification
│   ├── data/                  Local JSON runtime snapshots
│   └── uploads/               Local document, branding, and inventory uploads
├── front-end/
│   ├── src/api/               API client and endpoint modules
│   ├── src/auth/              Session context and route guards
│   ├── src/components/        Shared UI and layout components
│   ├── src/pages/             Role-specific application pages
│   └── README.md              Full portal route table and deployment notes
├── videos/                    Demo walkthrough link
├── Figma/                     Prototype reference
├── definitions.yml            Project and workflow definitions
├── DomainExpertInteraction.md Domain expert notes
├── SRS.pdf                    Software requirements specification
└── README.md                  Project guide
```

## Project references

- [Frontend route guide](front-end/README.md)
- [Backend API guide](back-end/README.md)
- [Database schema and ER diagram](Database/Federico_Schemas.md)
- [Demo walkthrough](videos/video.md)
- [License](LICENSE)
