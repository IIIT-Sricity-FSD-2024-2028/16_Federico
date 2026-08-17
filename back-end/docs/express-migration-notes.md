# NestJS → Express migration notes

This documents the framework migration performed per `tasks.txt`: a
behavior-preserving port of the original NestJS backend to Express. No
routes, request/response shapes, status codes, validation rules, or
business logic were intentionally changed. Where NestJS behavior wasn't
obvious from source alone, it was verified empirically by running the
original NestJS server and probing it directly (see "Verified behaviors"
below) rather than guessed.

## Migration map

| NestJS concept | Express equivalent |
|---|---|
| `@Controller()` classes | `src/controllers/*.controller.js` — plain functions, one per handler |
| `@Module()` route wiring | `src/routes/*.routes.js` (`express.Router()`) + `src/routes/index.js` |
| `@Injectable()` services | `src/services/*.service.js` — plain functions over the shared store |
| `DataService` (in-memory `@Global()` singleton) | `src/store/dataStore.js` — a plain object; Node's `require()` cache makes it a singleton across every module that requires it |
| `RolesGuard` + `@Roles()` decorator | `src/middleware/rolesGuard.js` — `requireRoles(...roles)`, attached per-route (collapses the guard + decorator into one middleware factory) |
| `class-validator` DTOs + global `ValidationPipe` | `src/validators/*.validators.js` (declarative per-field rule lists) run through `src/validators/engine.js` (`validateBody(rules)` middleware), using the `validator` and `libphonenumber-js` packages — the same underlying libraries class-validator itself wraps for `@IsEmail`/`@IsISO8601`/`@IsPhoneNumber` — so validation *behavior* (including edge cases) matches, not just the general shape |
| Global exception behavior (403 on guard rejection, 400 on validation failure, default Nest 404) | `rolesGuard.js`, `validators/engine.js`, `middleware/notFoundHandler.js` each construct the exact same JSON shape Nest produced |
| `SwaggerModule` (decorator-derived docs) | `src/config/swagger.js` — hand-assembled OpenAPI document from the same tags/summaries the original `@ApiTags`/`@ApiOperation` decorators declared, served at `/api` and written to `docs/swagger.json` on boot, same as before |
| `main.ts` bootstrap (CORS, global pipes/guards, listen) | `src/app.js` (`createApp()`) + `server.js` (`app.listen`) |

## Verified behaviors (not just inferred from source)

The original NestJS server was run locally and probed directly before writing
any Express code, to pin down details TypeScript source alone doesn't fully
specify:

- **POST defaults to HTTP 201**, GET/PUT/DELETE default to 200 (Nest's
  per-method default `@HttpCode`). Every Express route handler now sets
  these same defaults explicitly via `sendResult(res, result, status)`.
- **A `null`/`undefined` return value serializes to an *empty* response
  body**, not the text `"null"` (e.g. `GET /doctor/999999` → empty body,
  200). `src/utils/sendResult.js` special-cases this.
- **Validation error message order**: across fields, order follows DTO
  property declaration order top-to-bottom. *Within* a single field's
  stacked decorators, class-validator reports failures in the **reverse**
  of their textual order (confirmed via `CreateDoctorDto.specialization`,
  declared as `@IsString() @IsNotEmpty()` but reporting `"should not be
  empty"` before `"must be a string"`). Every rule list in
  `src/validators/*.validators.js` already encodes this verified order.
- **No whitelist stripping**: extra/unknown body fields are preserved, not
  rejected or dropped — confirmed by POSTing an unrecognized field and
  seeing it echoed back on the created record.
- **No implicit type coercion**: a numeric field sent as a JSON string
  (e.g. `"total_beds": "5"`) still fails `@IsInt`-equivalent validation.
- **`@IsPhoneNumber()` with no region requires international format** (a
  leading `+`). This means `back-end/test-all-endpoints.ps1`'s doctor
  payload (`phone = "8881112222"`, no `+`) **already failed validation
  against the original NestJS backend** — this is a pre-existing issue in
  that script, not something introduced by the migration. Confirmed via
  direct `curl` against the running Nest server.
- **CORS**: preflight responses echo the request `Origin`, `Access-Control-
  Allow-Credentials: true`, and the exact configured method list — matches
  because both apps configure the same underlying `cors` npm package with
  the same options object.

## Dead/unused code, preserved per tasks.txt rule 13 (documented, not deleted)

These existed in the original NestJS source but were never wired to any
route. They are **not** ported into the Express app's active code paths,
consistent with their original unused state, but are recorded here rather
than silently discarded:

- `billing/dto/create-receipt.dto.ts` (`CreateReceiptDto`) — no controller
  ever used it.
- `billing/dto/discharge-summary.dto.ts` (`DischargeSummaryDto`, fields
  `summary`/`followUp`/`advice`) — a *different*, unused shape from the
  `CreateDischargeSummaryDto` in `billing.dto.ts` that the controller
  actually uses (and that Express now uses too).
- `request/dto/create-pre-request.dto.ts` (`CreatePreRequestDto`) — no
  route (`POST /pre-request` or similar) was ever registered for it.
- Two role vocabularies coexist in the seed data and were never
  reconciled by the original app: the `roles` table (`HOM`/`Patient`/`FA`/
  `PRE`) vs. the guard's actual checked values (`ADMIN`/`SUPER_USER`). The
  guard never reads the `roles` table — preserved as-is.

## Known pre-existing quirks preserved as-is (not "fixed")

- Lookups by ID that miss return `null` (→ empty 200 body), never a 404.
- `GET /billing/ledger/:admissionId` looks up by `admission_id`, not by a
  ledger's own ID, despite the route param name — kept exactly.
- Ledger-entry IDs are a **per-ledger** sequence (`entries for this
  ledger + 1`), not a global max like every other entity — kept exactly.
- No environment variables anywhere; port `3000` and CORS config are
  hardcoded, same as the original.
- All data is in-memory and resets on process restart — no database was
  introduced in this migration phase.

## What changed necessarily (framework-driven, not behavioral)

- TypeScript → plain JavaScript (`tasks.txt`'s own suggested Express
  structure uses `.js`/`app.js`/`server.js`, so this migration follows
  that rather than adding a TS build step Express doesn't need).
- `npm run build` (Nest's `tsc` compile step) no longer applies — Express
  runs `server.js` directly, no compilation needed.
- Test harness: `test/app.e2e-spec.ts` (Nest's `TestingModule` + Jest) was
  replaced with `test/app.e2e-spec.js` (`supertest` directly against the
  Express `app` instance) since there's no Nest testing module to compile
  against anymore. Coverage is a smoke-test subset, not exhaustive;
  `test-all-endpoints.ps1` remains the primary end-to-end contract check
  and was re-run against the migrated server (see repo history / PR notes
  for the run log).

## Verification performed

- `back-end/test-all-endpoints.ps1` run against the Express server on
  `localhost:3000` (same script, unmodified) to confirm the full
  doctor → ward/bed → patient → appointment → admission → billing chain →
  inventory → `/data/full-state` flow still works end-to-end.
- Manual `curl` probes repeating every check listed above under "Verified
  behaviors" against the Express server, confirming identical output to
  the original NestJS server.
