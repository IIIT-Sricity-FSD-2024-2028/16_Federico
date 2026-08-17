# Federico — Backend (Express)

In-memory Express backend for the Federico hospital administrative
operations platform. Migrated from NestJS to Express — see
[`docs/express-migration-notes.md`](docs/express-migration-notes.md) for
the full migration map and the behaviors that were empirically verified
against the original implementation before porting.

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

The server listens on `http://localhost:3000`. All data is in-memory and
resets on restart — there is no database in this phase of the project.

## API docs

Swagger UI: `http://localhost:3000/api`. The same document is written to
`docs/swagger.json` on every boot.

## Auth

Every route except `GET /`, `GET /data/full-state`, and
`POST /data/full-state` requires an `x-role` header set to `ADMIN` or
`SUPER_USER` (`SUPER_USER` is required for any write). This is a direct
port of the original demo-only header check — see the migration notes for
why it isn't real authentication yet.

## Tests

```bash
npm run test       # unit
npm run test:e2e   # supertest against the Express app
```

`test-all-endpoints.ps1` is a PowerShell smoke script exercising the full
doctor → ward/bed → patient → appointment → admission → billing →
inventory chain end-to-end; run it against a running `npm run start`
server.

## Structure

```
src/
  controllers/   thin HTTP handlers
  routes/        express.Router() per resource
  services/      business logic over the shared in-memory store
  middleware/    role guard, request logger, validation error/404/500 shaping
  validators/    declarative per-field validation rules
  store/         the in-memory "database"
  config/        Swagger setup
  app.js         createApp()
server.js        app.listen()
```
