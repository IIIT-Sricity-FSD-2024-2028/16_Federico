# Federico — Backend API

Express.js REST API for the Federico Hospital Administrative Operations Platform.

---

## Setup & Running

### Installation
```bash
npm install
```

### Start Server
```bash
# Production start
npm start

# Development mode (auto-restart)
npm run start:dev
```

- Server Address: `http://localhost:3000`
- Health Check: `GET /health`
- Swagger Documentation: `GET /api`

---

## Testing

```bash
# Unit and domain integration tests (17 suites, 90 tests)
npm test

# Full End-to-End lifecycle test suite (31 tests)
npm run test:e2e
```

Executes **121 automated tests** verifying repository DAL, security middleware, multi-tenant boundaries, and the full inpatient admission lifecycle.

---

## Authentication

API endpoints are secured using standard Bearer tokens:

```
Authorization: Bearer <token>
```

Tokens are obtained via `POST /auth/login` or `POST /platform/auth/login`.

---

## Architecture

```
src/
├── config/            # Environment validation, clinical catalogs & Swagger setup
├── controllers/       # HTTP controllers with standardized response envelopes
├── errors/            # Typed domain error classes (AppError)
├── middleware/        # Bearer authentication, tenant scoping, and RBAC guards
├── repositories/      # Data Access Layer with O(1) indexed lookups
├── routes/            # REST route definitions
├── services/          # Pure business logic and state machine orchestration
├── store/             # In-memory store and crash-safe atomic disk persistence
├── utils/             # Response envelopes, password utilities, formatters
├── validators/        # Declarative request body validation rules
└── test/              # Integration and end-to-end test suites
```
