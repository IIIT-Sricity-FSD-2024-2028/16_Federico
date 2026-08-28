# Federico Healthcare Platform — Backend Architecture & Reference Manual

This document is the consolidated source of truth for the Federico HMS Backend, including architecture, authentication, role-based access control (RBAC), multi-tenancy, logging, file uploads, and core workflow lifecycles.

---

## 1. System Architecture

The backend is built as a high-performance Express.js REST API with layered service orchestration, repository-pattern data management, and crash-safe file-backed state durability.

```
                  ┌──────────────────────────────────────────────┐
                  │              Incoming Requests               │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │ Middlewares: RequestLogger, Security/CSP│
                    │ RateLimiter, AttachSession, TenantScope │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │   Controllers & Schema Validation       │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │             Service Layer               │
                    │   (Business Logic & State Transitions)  │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │ In-Memory Data Store + Atomic Snapshots │
                    │            (data/db.json)               │
                    └─────────────────────────────────────────┘
```

### Core Architectural Principles
* **Single Source of Truth:** All patient intake, bed allocations, financial transactions, and multi-tenant configurations are authoritatively managed and validated on the backend.
* **In-Memory Speed with Disk Durability:** Sub-millisecond in-memory lookups backed by debounced atomic writes to `data/db.json` (`.tmp` write followed by atomic rename).
* **Multi-Tenancy & Data Isolation:** Built-in multi-tenant data isolation strictly enforced by `organization_id` and `hospital_id`.
* **Standardized API Responses:** Uniform JSON response envelope across all endpoints:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": { ... },
    "meta": { "timestamp": "2026-08-28T12:00:00.000Z" }
  }
  ```

---

## 2. Demo Accounts & Credentials

The system comes pre-seeded with accounts for all platform and hospital roles:

| Role / Portal | Name / Description | Email | Password | Primary Portal |
|:---|:---|:---|:---|:---|
| **Platform Super User** | Platform Owner | `platform@federico.com` | `Platform@123` | `front-end/platform/` |
| **Hospital Admin** | Hospital Owner / Admin | `owner@hosp.com` | `Owner@123` | `front-end/Admin/` |
| **HOM (Hospital Ops Manager)** | Operations Lead | `admin@hosp.com` | `Hom@123` | `front-end/HOM/` |
| **PRE (Patient Relations Exec)** | Intake & Front Desk | `rekha.pre@hosp.com` | `Pre@123` | `front-end/PRE/` |
| **FA (Finance Administrator)** | Billing & Cashier | `farah.fa@hosp.com` | `Fa@123` | `front-end/FA/` |
| **Patient** | Arjun Kapoor | `arjun.k@hosp.com` | `Arjun@123` | `front-end/Patient/` |
| **Patient** | Hamiz Shams | `hamiz@hosp.com` | `Hamiz@123` | `front-end/Patient/` |

---

## 3. Authentication & RBAC Matrix

The system supports cryptographic session tokens with per-tab session isolation:

1. **Bearer Token Header:** Passed via `Authorization: Bearer <token>`, obtained from `POST /auth/login` or `POST /platform/auth/login`.
2. **Per-Tab Session Isolation:** Prevents multi-tab session overwrites by keeping session keys isolated per tab while syncing auth lifecycles.
3. **Legacy Role Header (Backward Compatibility):** Supports `x-role: ADMIN|SUPER_USER` for legacy automated test suites.

### Actor Access & Permissions Matrix

| Resource / Action | Route | Read Access | Write / Mutation Access |
|:---|:---|:---|:---|
| **Doctor Catalog** | `/doctor` | `HOM`, `PRE`, `FA`, `Patient`, `Admin` | `Admin`, `HOM` |
| **Patient Profiles** | `/patient` | `HOM`, `PRE`, `FA`, `Patient` (self only) | `HOM`, `PRE`, `Patient` (self signup) |
| **Ward & Beds** | `/ward` | `HOM`, `PRE`, `FA`, `Admin` | `Admin` (create/resize), `HOM` (manage) |
| **Bed Allocation** | `/ward/bed-requests` | `HOM`, `PRE`, `FA` | `PRE` requests, `HOM` allocates/denies |
| **Pre-Registration** | `/pre-request` | `HOM`, `PRE`, `Patient` (self only) | `Patient` / `PRE` creates, `HOM`/`PRE` transitions |
| **Admissions** | `/admission` | `HOM`, `PRE`, `FA`, `Admin` | `HOM`, `PRE` |
| **Billing & Ledgers** | `/billing` | `HOM`, `FA`, `Patient` (self published) | `FA` |
| **Leader Charges** | `/billing/leaders` | `HOM`, `FA` | `HOM` logs charges, `FA` approves |
| **Inventory Catalog** | `/inventory` | `HOM`, `FA`, `Admin` | `Admin` (create/delete), `HOM` (stock) |
| **Purchase Requests** | `/inventory/requests` | `HOM`, `FA`, `Admin` | `HOM` requests, `FA` reviews |
| **Dynamic RBAC** | `/rbac` | `Admin` | `Admin` |
| **Platform Provisioning** | `/platform` | `Platform Super User` | `Platform Super User` |
| **File Uploads** | `/uploads` | Public file retrieval (`/:category/:filename`) | Authenticated Staff / Patients |
| **System Logs Status** | `/uploads/system/logs-status` | Authenticated Staff | Admin / Ops |

---

## 4. Key Workflows & State Lifecycles

### A. Pre-Registration & Inpatient Intake Lifecycle
```
PENDING (Submitted by Patient / PRE)
  ├──> REJECTED (by PRE or Patient)
  └──> APPROVED (by PRE)
         ├──> CONSULTATION_DONE (OPD Doctor Appointment)
         ├──> EMERGENCY (by PRE) ──> ADMITTED (by HOM)
         └──> ADMITTED (by HOM upon Bed Allocation)
                └──> DISCHARGE_REQUESTED (by PRE)
                       └──> DISCHARGE_APPROVED (by HOM)
                              └──> DISCHARGED (by PRE)
```

### B. Billing & Revenue Approval Lifecycle
1. **Ledger Initialization:** Auto-created upon admission (`POST /billing/ledger`).
2. **Itemized Clinical Charges:** Ward services & pharmacy items logged (`POST /billing/ledger/entry`).
3. **Leader Charges:** Operational/clinical leaders logged by HOM and verified into the ledger by FA (`POST /billing/leaders` → `PUT /billing/leaders/:id/approve`).
4. **Bill Dispatch:** FA finalizes and dispatches the bill to the patient portal (`PUT /billing/ledger/:id/dispatch`).
5. **Payment Collection:** Payments recorded via online or cash counter (`POST /billing/payments`).
6. **Receipt Generation:** Tamper-evident receipts generated (`GET /billing/receipts`).

---

## 5. File Upload Subsystem

File uploads are handled by multer storage under `back-end/uploads/`:

* **`uploads/documents/`**: Patient insurance policies, identity proofs, medical reports (PDF, PNG, JPEG, max 5MB).
* **`uploads/branding/`**: Hospital tenant logos, landing assets (PNG, JPEG, SVG, max 2MB).
* **`uploads/inventory/`**: Non-clinical supply product photos (PNG, JPEG, WEBP, max 2MB).

All files are renamed with a collision-resistant timestamp + random hex pattern: `<category>-<timestamp>-<hex>.<ext>`.

---

## 6. Logging & Error Management

Centralized logging is implemented in `src/utils/logManager.js`:
* **`logs/access.log`**: Every incoming HTTP request with method, path, status, latency.
* **`logs/error.log`**: Stack traces, unhandled rejections, and domain validation failures.
* **`logs/combined.log`**: Unified chronological server activity.
* **Status Monitoring:** `GET /uploads/system/logs-status` returns live file presence, byte sizes, and rotation status.

---

## 7. Swagger Documentation

* **Interactive Swagger UI:** Available at `http://localhost:3000/api`.
* **OpenAPI 3.0 Specification:** Stored at [`docs/swagger.json`](file:///d:/16_FDFED/16_Federico/back-end/docs/swagger.json) and automatically refreshed on server bootstrap via [`src/config/swagger.js`](file:///d:/16_FDFED/16_Federico/back-end/src/config/swagger.js).

