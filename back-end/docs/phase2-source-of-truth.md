# Phase 2 — backend as the real source of truth

Phase 1 was a literal, behavior-preserving NestJS→Express port (see
`express-migration-notes.md`). Phase 2 is new work on top of that
checkpoint: extending the Express backend so it actually holds every
piece of workflow state the frontend needs, instead of the frontend
simulating that state in `localStorage` and only partially, lossily
syncing it. This is **not** bound by `tasks.txt`'s "no new features"
rule — that rule scoped the migration deliverable specifically.

## Why

The frontend audit found the #1 cause of "workflows are broken most of
the time": `shared/api-client.js`'s sync only reconstructed 9 of ~20
state slices from the backend and used that incomplete snapshot as its
merge base, silently dropping the rest on many page loads. Patching that
merge function would only paper over the deeper problem — the backend
never actually modeled most of what the frontend needed (pre-registration
requests, bed allocation, billing dispatch, receipts), so there was
nothing authoritative to sync *to*. Phase 2 fixes this at the root: the
backend now models these things for real.

## Design choice: extend the existing relational model, don't shadow it

The original frontend's `localStorage` schema (`shared/canonical-seed.js`)
used entirely different identifiers than the backend (string UHIDs,
ward *names* as keys, bed *numbers* as identifiers) and duplicated the
same facts across multiple parallel structures (3 different "billing"
shapes, 3 different "patient" shapes — see `back-end/docs/phase0-audit.md`).
Rather than replicating that duplication server-side, Phase 2 extends the
backend's existing numeric relational model (already using `ward_id`,
`bed_id`, `patient_id`, `admission_id`, `ledger_id` — and already
carrying the human-readable fields the UI needs: `ward_name`,
`bed_number`, `uhid`) with new resources only where a real new concept
was missing, and layers new *behavior* onto existing tables everywhere
else:

| Concept | Where it lives |
|---|---|
| Pre-registration / intake lifecycle | **New**: `preRequests` (links to existing `patients`/`appointments`) |
| Bed request → allocation | **New**: `bedRequests`, but allocation mutates the *existing* `beds[].status` — no shadow bed table |
| Emergency admission | **New**: `emergencyNotifications` (patient_id intentionally nullable — SRS: patients are moved to a ward before formal registration) |
| Billing: itemized entry → dispatch → payment → receipt | Existing `ledgers`/`ledgerEntries`/`payments`, extended with a `status: 'DISPATCHED'` transition; **new** `receipts` (a genuinely distinct artifact, not a duplicate of the ledger) |
| Published discharge bill | The existing `dischargeSummaries` table already *is* this — just exposed via a new GET endpoint |
| Procurement | Already fully modeled (`purchaseRequests`) since Phase 1 — no changes needed |
| Audit trail | **New**: `activityLog`, written automatically by services on key transitions |

## Real authentication

`password_hash` existed on seed users but was never checked anywhere in
the original app (no route verified it), and login/RBAC was entirely
client-side (`front-end/shared/rbac.js` checked credentials against a
hardcoded JS array with no server call at all). Phase 2 adds:

- `POST /auth/login` — verifies `password_hash` with bcrypt, issues an
  opaque session token (`src/store/sessionStore.js`, an in-memory
  `Map<token, session>` — consistent with the rest of this app's
  in-memory architecture).
- `POST /auth/signup` — real patient self-registration (creates a `users`
  + `patients` record, hashed password, generates a UHID).
- `GET /auth/me`, `POST /auth/logout`.

Demo credentials (documented here and in `dataStore.js`):

| Actor | Email | Password |
|---|---|---|
| HOM | admin@hosp.com | Hom@123 |
| PRE | rekha.pre@hosp.com | Pre@123 |
| FA | farah.fa@hosp.com | Fa@123 |
| Patient | hamiz@hosp.com | Hamiz@123 |
| Patient | salma@hosp.com | Salma@123 |
| Patient | john@hosp.com | John@123 |

## Permission model: additive, not a replacement

The Phase-1-migrated routes keep working exactly as before under the
legacy `x-role: ADMIN|SUPER_USER` header — that contract is a completed,
documented checkpoint and nothing here breaks it (verified by re-running
`test-all-endpoints.ps1` after this phase's changes, still green).

On top of that, `src/middleware/actorAccess.js` adds a second, additive
path: `authorize(legacyRoles, resource, mode)` allows a request through
if EITHER the legacy header matches OR the caller has a valid session
whose actor role is permitted for that resource/mode in `ACTOR_ACCESS`.
A request only needs one path to succeed.

`ACTOR_ACCESS` encodes the SRS's actual responsibilities (SRS.pdf §3):

```
doctor:      read [HOM,PRE,FA]        write [HOM]
patient:     read [HOM,PRE,FA]        write [HOM,PRE]
ward:        read [HOM,PRE,FA]        write [HOM]
inventory:   read [HOM,FA]            write [HOM]
billing:     read [HOM,FA,Patient]    write [FA]
appointment: read [HOM,PRE,FA]        write [PRE,Patient]
admission:   read [HOM,PRE,FA]        write [HOM,PRE]
```

Patient-facing endpoints (`GET /billing/patient/:patientId/*`) additionally
check the session's `patientId` matches the requested one — a Patient
session can never read another patient's bills/receipts, verified in
`test/app.e2e-spec.js`.

## Durability

`src/store/persist.js` debounced-writes the whole in-memory store to
`back-end/data/db.json` (gitignored) on every successful non-GET request,
and reloads it on boot (`server.js`, not `createApp()` — so tests always
run against fresh seed data). Still zero external database dependency;
this only means a local `npm run start` restart doesn't wipe demo data
you just entered.

## New endpoints added in this phase

```
POST /auth/login | /auth/signup | /auth/logout      GET /auth/me
GET  /pre-requests            POST /pre-requests            PUT /pre-requests/:id
GET  /ward/bed-requests       POST /ward/bed-requests        PUT /ward/bed-requests/:id
GET  /ward/emergency          POST /ward/emergency           PUT /ward/emergency/:id
PUT  /billing/ledger/:id/dispatch
GET  /billing/patient/:patientId/bills
GET  /billing/receipts        GET /billing/patient/:patientId/receipts
GET  /billing/discharge-summary/:admissionId
GET  /activity-log
```

## Verification performed

- All `test-all-endpoints.ps1` (legacy contract) checks still pass.
- New e2e coverage in `test/app.e2e-spec.js`: login for all 4 actors,
  cross-actor write denial (FA blocked from creating a pre-request),
  cross-patient read denial.
- Manually walked PRE → HOM → FA → Patient across the pre-request → bed
  allocation → ledger → dispatch → payment → receipt chain using only
  session tokens (no `x-role` header at all), confirming the new actor
  model is sufficient on its own.
- Restarted the server after writing data and confirmed `data/db.json`
  restored it (persistence).
