# PR #26 review follow-ups

Branch: `feat/patient-portal-audit-and-data-pipeline`  
Reviewed head: `fc67ca6`  
PR: https://github.com/IIIT-Sricity-FSD-2024-2028/16_Federico/pull/26

Implementation and cross-layer recheck status. The JSON seed remains canonical. Purchase-request requester validation is now implemented and tested. A clean SQL import remains unverified; GitHub reports no status checks for the current remote PR head.

## Second file-by-file audit (2026-10-22)

Audited all 360 tracked project files under `Database` (3), `back-end` (154), and `front-end` (203), including source, tests, route wiring, configuration, docs, manifests, and lockfiles. Dependencies and generated build output were inventoried separately; runtime logs/uploads and the ignored JSON/session snapshots were not treated as source. The ER diagram was visually checked. The current seed data has matching hospital/organization ownership, all SQL insert row counts match the JSON collections, and the JSON relational/lifecycle gates pass. The database script still lacks a live clean-import check.

### New confirmed findings

- [x] **P2 — Purchase-request creation accepted a requester from another tenant.** `createRequest` now looks up the submitted user ID and checks it with the same organization/hospital ownership helper used for other references before calling the service. Foreign requesters return 404 without a write. Added a no-mutation rejection test and a valid payload compatibility test matching the RestockModal fields.

- [x] **P1 — Inventory updates could rewrite tenant ownership and references.** Item and purchase-request routes now reject fields outside route-specific allowlists, and the service enforces the same restrictions for direct callers. Item service references are checked against the caller's organization and hospital before mutation; purchase-request item/requester/tenant identity is immutable. Positive quantity updates synchronize `quantity_requested` and `quantity`. Added valid-flow and rejection/no-partial-mutation coverage. Existing frontend stock, status, and create-request payloads remain compatible.
- [x] **P2 — SQL schema did not enforce that a row's hospital belongs to the same organization.** `hospitals` now has a unique `(hospital_id, organization_id)` parent key, and all 22 tenant-scoped tables use composite foreign keys with `ON DELETE RESTRICT`. Added `Database/test_tenant_integrity.sql` for a live negative constraint check and static schema/seed tests. Current JSON ownership remains valid.
- [x] **P3 — Orphaned stylesheet remained after its component removal.** Removed `front-end/src/components/layout/SharedNav.css`; repository search found no importer or runtime reference.
- [x] **P3 — ER diagram was stale compared with the implemented schema.** Regenerated `Database/ER_diagrams.png` from the SQL schema to include all 37 tables and 99 foreign-key relationships, including tenant composite keys; checked it against `Federico_Schemas.md`.
- [x] **P3 — Backend lint did not cover all maintained JavaScript.** `npm run lint` now covers `server.js`, `src`, `test`, and maintained `scripts`; removed the five unused declarations without changing script behavior. Lint remains read-only.

### Cross-reference and clean-code notes

- No organization/hospital mismatches were found in the current JSON snapshot. Static parsing found SQL row counts equal to JSON row counts for each non-empty collection, including the repeated multi-statement inserts; this does not replace executing the SQL against MySQL.
- Frontend source lint and production build include the maintained JS/JSX module graph. The seven removed JSX modules from the earlier pass have no remaining source references; the remaining SharedNav stylesheet is the confirmed orphan above. `sanitizer.js` is still imported by tests, so it is not dead code.
- `npm ls --depth=0` in the frontend resolves all declared top-level dependencies against the lockfile.
- The broad experimental Oxlint `suspicious`/`perf` run was not used as a finding source: enabling the React plugin's legacy `react-in-jsx-scope` rule flags the project-wide automatic JSX runtime and produces false positives. The repo-configured Oxlint and production build passed.

### Latest verification

- Backend tests: 39/39 suites, 372/372 tests passed, including purchase-request requester tenant validation and current frontend payload compatibility.
- Backend lint and frontend repo-configured lint passed; frontend production build transformed 2,112 modules.
- Relational checks passed 10,988/10,988; lifecycle checks passed 1,794/1,794; challenger gate passed 918/918.
- SQL insert row-count parity against the JSON seed passed by static inspection; a clean SQL import remains unavailable as described below. GitHub reports no status checks for the current remote PR head.
- `git diff --check` passed. The canonical JSON seed and runtime snapshot were not changed; frontend build output is generated and ignored.

## Resolved defects

- [x] **P1 — SQL discharge-summary seed column.** `Database/generate_database.sql` now inserts into the declared `discharge_notes` column. Added a SQL seed integrity test that checks the column and row parity.
- [x] **P1 — Duplicate SQL ledger ID and missing billing history.** Reconciled SQL discharge summaries, ledgers, ledger entries, payments, and receipts against `back-end/src/store/dataStore.js`; duplicate ledger 812 is gone and all default billing rows/references match the JSON seed.
- [x] **P1 — Cross-tenant references and facility scope on writes.** Create flows now check referenced patient, doctor, appointment, bed, ward, ledger, admission, service, and inventory records against the authenticated organization and hospital. Request payloads can no longer override the session hospital. List/detail scoping uses consistent numeric organization comparisons and respects hospital scope. Appointment updates protect tenant-owned fields and references. Added negative tests proving rejected foreign references do not write.
- [x] **P1 — Payment amount, balance, and retry integrity.** The API rejects non-positive and over-balance amounts before mutating records. Payment requests require a stable `Idempotency-Key`; identical retries return the original payment without creating another receipt, and key reuse for a different payment conflicts. Frontend patient and finance clients reuse keys across retries. SQL schema and OpenAPI documentation include the key.
- [x] **P1 — Persisted sessions without expiry.** Sessions now expire 24 hours after creation; expired sessions are rejected and removed both during lookup and when persisted sessions are restored after restart. Logout and user revocation remain covered.
- [x] **P2 — Tenant ID normalization.** Numeric and string organization IDs now behave consistently for list and detail checks; hospital-scoped visibility is also checked.
- [x] **P2 — Insurance changes and historical bills.** Finalized discharge amounts are read from the backend summary. Paid bills without summaries also retain their settled gross amount instead of being recalculated from current insurance.
- [x] **P1 — Discharge summary patient and uniqueness invariants.** Summary creation now requires the patient to match the admission and refuses a second summary for the same admission, matching the SQL uniqueness rule.
- [x] **P2 — Partial-payment portal flow (additional issue found during implementation).** Patient shaping now includes `PARTIALLY_PAID` ledgers, shows payments received and the remaining balance, and submits only that balance. This prevents a partial staff payment from hiding the bill or causing the patient portal to attempt the original full amount.
- [x] **P3 — Unused leader-entry lookup.** Removed the unused variable and misleading duplicate-prevention comment. Approval lifecycle state already prevents approving the same leader twice.
- [x] **P3 — Unreferenced frontend modules.** Removed seven modules after confirming no static or dynamic consumers in the frontend source. Kept `sanitizer.js` because shared tests still exercise it.
- [x] **P3 — Schema documentation numbering.** Renumbered the platform schema sections to 30–37, matching the 37 documented tables.
- [x] **P3 — Safe backend lint command.** Removed `--fix` from the lint script. Lint now runs read-only and focuses on ESLint diagnostics; Prettier enforcement is disabled because the existing tree contains extensive unrelated formatting differences. Fixed the actionable unused declarations and empty-block diagnostics found by that check.

## Remaining verification

- [ ] **Run a clean SQL import.** The workspace has no MySQL/MariaDB client or Docker executable, so the generated script could not be imported into a live database here. The static SQL seed test verifies declared columns, uniqueness, all billing row values, and references against the JSON seed. Run the script against a clean MySQL-compatible database before merging.
- [x] **Check GitHub CI status.** `gh pr view 26` and `gh pr checks 26` confirmed that the open PR head (`fc67ca66a7afdb0aa267e59ff922f98afc1ffe57`) currently has no status checks reported. The local uncommitted changes are not part of that remote head, so CI must be checked again after those changes are pushed.

## Recheck results

- `npm test -- --runInBand --silent` in `back-end`: passed, 39/39 suites and 372/372 tests. The legacy string-ID coercion test uses supported inventory update fields and restores its fixture values.
- `npm run lint` in `back-end`: passed; command does not rewrite files.
- `npm run lint` in `front-end`: passed.
- `npm run build` in `front-end`: passed (2,112 modules).
- `node scripts/verify_relational_integrity.js`: passed, 10,988/10,988 checks, including current runtime/seed parity (74/74).
- `node scripts/verify_lifecycle_constraints.js`: passed, 1,794/1,794 checks.
- `node scripts/verify_challenger_gate_r2.js`: passed, 918/918 checks.
- SQL tenant and billing seed integrity checks passed in the backend suite; these statically compare SQL definitions and seed rows with the canonical JSON seed. The live negative SQL script has not been executed.
- `git diff --check`: passed.
- The JSON relational/lifecycle gates confirm the runtime snapshot still matches the canonical seed (74/74 parity checks); no reset command was run.
