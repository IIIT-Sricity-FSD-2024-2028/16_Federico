# Federico — Backend (Express)

Express backend for the Federico hospital administrative operations
platform, and the real source of truth for all workflow state (no more
frontend `localStorage` simulation). Built in two documented phases:

1. A literal, behavior-preserving NestJS→Express port —
   [`docs/express-migration-notes.md`](docs/express-migration-notes.md).
2. New functionality making this the real backend the frontend talks to:
   real login, pre-registration, bed requests, billing dispatch/receipts,
   an activity log, and lightweight durability —
   [`docs/phase2-source-of-truth.md`](docs/phase2-source-of-truth.md).

## Project setup

```bash
npm install
```

## Run

```bash
# start
npm run start

# watch mode (auto-restart on file changes)
npm run start:dev
```

The server listens on `http://localhost:3000`. Data lives in memory and
is debounce-written to `data/db.json` (gitignored) on every change, then
restored from there on the next boot — so a restart no longer wipes
whatever you entered. Delete `data/db.json` to reset to the seed data.

## API docs

Swagger UI: `http://localhost:3000/api`. The same document is written to
`docs/swagger.json` on every boot.

## Auth

Two ways to authenticate, checked additively (either is sufficient):

1. **Real login** (Phase 2) — `POST /auth/login` with `{ email, password }`
   returns a session token; send it as `Authorization: Bearer <token>` on
   subsequent requests. Demo accounts:

   | Actor | Email | Password |
   |---|---|---|
   | Admin | owner@hosp.com | Owner@123 |
   | HOM | admin@hosp.com | Hom@123 |
   | PRE | rekha.pre@hosp.com | Pre@123 |
   | FA | farah.fa@hosp.com | Fa@123 |
   | Patient | hamiz@hosp.com | Hamiz@123 |
   | Patient | salma@hosp.com | Salma@123 |
   | Patient | john@hosp.com | John@123 |

   New patients can also self-register via `POST /auth/signup`.

2. **Legacy header** (Phase 1, preserved exactly) — `x-role: ADMIN` or
   `x-role: SUPER_USER` (`SUPER_USER` required for writes). Still works
   on every route it always did, unchanged — this is what
   `test-all-endpoints.ps1` and Swagger's "try it out" use.

See `docs/phase2-source-of-truth.md` for the full per-resource
read/write permission matrix for the four real actors (HOM/PRE/FA/Patient).

## Tests

```bash
npm run test       # unit
npm run test:e2e   # supertest against the Express app (incl. auth/permission checks)
```

`test-all-endpoints.ps1` is a PowerShell smoke script exercising the full
legacy-contract doctor → ward/bed → patient → appointment → admission →
billing → inventory chain end-to-end; run it against a running
`npm run start` server.

## Structure

```
src/
  controllers/   thin HTTP handlers
  routes/        express.Router() per resource
  services/      business logic over the shared in-memory store
  middleware/    role/session guards, request logger, persistence hook,
                 validation error/404/500 shaping
  validators/    declarative per-field validation rules
  store/         the in-memory "database", sessions, and disk persistence
  config/        Swagger setup
  app.js         createApp()
server.js        persist.load() + app.listen()
```
