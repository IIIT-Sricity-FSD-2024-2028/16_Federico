# Federico Backend (Express REST API)

Production-grade Express.js backend for the **Federico Multi-Tenant Hospital Management System (HMS)**.

---

## 🏛️ Architecture & Design

The backend implements **Layered Clean Architecture** with the **Repository Pattern (DAL)**:

```
src/
├── config/            # 12-factor environment validation and Swagger OpenAPI 3.0 setup
├── controllers/       # HTTP request handlers with standardized JSON envelopes
├── errors/            # Domain exception hierarchy (NotFoundError, ForbiddenError, etc.)
├── middleware/        # Bearer authentication, fail-closed tenant scoping, and RBAC guards
├── repositories/      # Data Access Layer (12 specialized typed repositories)
├── routes/            # Declarative REST endpoint routers
├── services/          # Pure business logic and state machine orchestration
├── store/             # In-memory database with crash-safe atomic disk persistence
├── utils/             # Standardized response envelopes (sendSuccess/sendError), logger
└── validators/        # Declarative input validation rules
```

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Running the Server
```bash
# Start production server
npm start

# Start development server with auto-reload
npm run start:dev
```
The server will listen on `http://localhost:3000`.

- **Health Check**: `GET http://localhost:3000/health`
- **Interactive Swagger UI**: `http://localhost:3000/api`

---

## 🔒 Authentication & Multi-Tenancy

Authentication uses standard **Bearer JWT Tokens**:
1. Call `POST /auth/login` with `{ email, password }`.
2. Attach the returned token in the HTTP Authorization header:
   ```
   Authorization: Bearer <token>
   ```

### Default Demo Accounts

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Platform Super User** | `platform@federico.com` | `Platform@123` | Global Platform Admin |
| **Hospital Admin** | `owner@hosp.com` | `Owner@123` | City Hospital Admin |
| **HOM** | `admin@hosp.com` | `Hom@123` | Hospital Operations |
| **PRE** | `rekha.pre@hosp.com` | `Pre@123` | Patient Registration |
| **FA** | `farah.fa@hosp.com` | `Fa@123` | Billing & Ledgers |
| **Patient** | `hamiz@hosp.com` | `Hamiz@123` | Patient Portal |

---

## 🧪 Automated Testing

```bash
npm test
```

### Test Verification
```
Test Suites: 17 passed, 17 total
Tests:       90 passed, 90 total
Snapshots:   0 total
Time:        2.424 s
Ran all test suites.
```
