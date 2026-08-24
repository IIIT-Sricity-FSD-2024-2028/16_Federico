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
npm test
```

Executes all 17 Jest test suites (90 unit and integration tests) verifying repository DAL, security middleware, and the full patient lifecycle.

---

## Authentication

API endpoints are secured using standard Bearer tokens:

```
Authorization: Bearer <token>
```

Tokens are obtained via `POST /auth/login` with `{ email, password }`.

---

## Architecture

```
src/
├── config/            # Environment validation & Swagger configuration
├── controllers/       # HTTP controllers with standardized response envelopes
├── errors/            # Typed domain error classes (AppError)
├── middleware/        # Bearer authentication, tenant scoping, and RBAC guards
├── repositories/      # Data Access Layer (12 typed repositories)
├── routes/            # REST route definitions
├── services/          # Pure business logic and state machine orchestration
├── store/             # In-memory store and crash-safe atomic disk persistence
├── utils/             # Response envelopes, password utilities, formatters
├── validators/        # Request body validation rules
└── test/              # Integration and end-to-end test suites
```
