# Federico Healthcare Platform — Backend Architecture & Reference Manual

This document is the consolidated source of truth for the Federico HMS Backend, including architecture, authentication, role-based access control (RBAC), multi-tenancy, and core workflow lifecycles.

---

## 1. System Architecture

The backend is built as a high-performance Express.js REST API with repository-pattern data management and crash-safe file-backed state durability.

```
                  ┌──────────────────────────────────────────────┐
                  │              Incoming Requests               │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │ Middlewares: CORS, RequestLogger,       │
                    │ AttachSession, AttachTenant, RateLimit  │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │   Controllers & Request Validation      │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │             Service Layer               │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │           Repository Layer              │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │ In-Memory Data Store + Atomic Snapshots │
                    │            (data/db.json)               │
                    └─────────────────────────────────────────┘
```

### Core Architectural Principles
* **Single Source of Truth:** All patient intake, bed allocations, financial transactions, and multi-tenant configurations are authoritatively managed and validated on the backend.
* **In-Memory Speed with Disk Durability:** Fast in-memory queries backed by debounced atomic writes to `data/db.json` (`.tmp` write followed by atomic rename).
* **Multi-Tenancy & Data Isolation:** Built-in multi-tenant isolation by `organization_id` and `hospital_id`.
* **Standardized API Responses:** Uniform JSON response envelope across all endpoints:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": { ... },
    "meta": { "timestamp": "2026-08-24T12:00:00.000Z" }
  }
  ```

---

## 2. Demo Accounts & Credentials

The system comes pre-seeded with accounts for all platform and hospital roles:

| Role / Portal | Name / Description | Email | Password |
|:---|:---|:---|:---|
| **Platform Super Admin** | Platform Owner | `owner@hosp.com` | `Owner@123` |
| **HOM (Hospital Ops Manager)** | Operations Lead | `admin@hosp.com` | `Hom@123` |
| **PRE (Patient Relations Exec)** | Intake & Front Desk | `rekha.pre@hosp.com` | `Pre@123` |
| **FA (Finance Administrator)** | Billing & Cashier | `farah.fa@hosp.com` | `Fa@123` |
| **Patient** | Hamiz Shams | `hamiz@hosp.com` | `Hamiz@123` |
| **Patient** | Salma Begum | `salma@hosp.com` | `Salma@123` |
| **Patient** | John Doe | `john@hosp.com` | `John@123` |

---

## 3. Authentication & RBAC Matrix

The system provides dual-path authentication and authorization:

1. **Session-Based Bearer Tokens (Recommended):** Passed in the `Authorization: Bearer <token>` header, obtained via `POST /auth/login` or `POST /platform/auth/login`.
2. **Legacy Role Header (Backward Compatibility):** Passed in the `x-role: ADMIN|SUPER_USER` header.

### Actor Access & Permissions Matrix

| Resource | Read Access | Write / Mutation Access |
|:---|:---|:---|
| **Doctor Catalog** | `HOM`, `PRE`, `FA`, `Patient`, `Admin` | `HOM`, `Admin` |
| **Patient Profiles** | `HOM`, `PRE`, `FA`, `Patient` (self only) | `HOM`, `PRE`, `Patient` (self signup) |
| **Ward & Beds** | `HOM`, `PRE`, `FA` | `HOM`, `Admin` (`wardAdmin` permissions) |
| **Bed Allocation** | `HOM`, `PRE`, `FA` | `PRE` requests, `HOM` allocates/denies |
| **Pre-Registration** | `HOM`, `PRE`, `Patient` (self only) | `Patient` / `PRE` creates, `HOM`/`PRE` transitions |
| **Admissions** | `HOM`, `PRE`, `FA` | `HOM`, `PRE` |
| **Billing & Ledgers** | `HOM`, `FA`, `Patient` (self published) | `FA` |
| **Leader Charges** | `HOM`, `FA` | `HOM` creates, `FA` approves |
| **Inventory Catalog** | `HOM`, `FA`, `Admin` | `HOM`, `Admin` |
| **Purchase Requests** | `HOM`, `FA` | `HOM` requests, `FA` reviews |
| **Multi-Tenancy/Platform**| Platform Super User | Platform Super User |

---

## 4. Key Workflows & State Lifecycles

### A. Pre-Registration & Intake Lifecycle
```
PENDING (Submitted by Patient/PRE)
  ├──> REJECTED (by PRE or Patient)
  └──> APPROVED (by PRE)
         ├──> CONSULTATION_DONE (OPD)
         ├──> EMERGENCY (by PRE) ──> ADMITTED (by HOM)
         └──> ADMITTED (by HOM upon Bed Allocation)
                └──> DISCHARGE_REQUESTED (by PRE)
                       └──> DISCHARGE_APPROVED (by HOM)
                              └──> DISCHARGED (by PRE)
```

### B. Billing & Revenue Lifecycle
1. **Ledger Initialization:** Created upon admission (`POST /billing/ledger`).
2. **Itemized Charges:** Clinical/service charges added (`POST /billing/ledger/entry`).
3. **Leader Charges:** Operational/clinical leaders submitted by HOM and approved into the ledger by FA (`POST /billing/leaders` → `PUT /billing/leaders/:id/approve`).
4. **Dispatch:** FA dispatches the ledger bill to the patient portal (`PUT /billing/ledger/:id/dispatch`).
5. **Payment Collection:** Payments recorded (`POST /billing/payments`).
6. **Receipt Generation:** Verified receipts generated for patient records (`GET /billing/receipts`).
7. **Discharge Summary:** Created upon discharge (`POST /billing/discharge-summary`).

### C. Bed Allocation & Emergency Intake
* PRE creates a bed request specifying ward type and patient (`POST /ward/bed-requests`).
* HOM reviews and assigns an available bed or denies (`PUT /ward/bed-requests/:id`).
* Emergency admissions allow immediate intake (`POST /ward/emergency`), reserving a bed before formal registration is complete.

---

## 5. API Documentation & Swagger UI

* **Interactive Swagger UI:** Available when running the backend at `http://localhost:3000/api`.
* **OpenAPI 3.0 Specification:** Stored at [`docs/swagger.json`](file:///d:/16_FDFED/16_Federico/back-end/docs/swagger.json) and automatically refreshed on server bootstrap via [`src/config/swagger.js`](file:///d:/16_FDFED/16_Federico/back-end/src/config/swagger.js).

---

## 6. Preserved API Behaviors & Legacy Quirks

For full backward compatibility with original clients and test harnesses:
* **HTTP 201 on POST:** All resource creations return status `201`.
* **Null ID Lookups:** Non-matching ID lookups return an empty 200 body instead of 404.
* **Validation Order:** Field validation messages preserve exact class-validator DTO ordering.
* **Per-Ledger Sequence Numbers:** Ledger entry IDs increment sequentially per ledger.
* **Patient Scoping:** Patient accounts are strictly isolated and cannot view or query other patients' records.
