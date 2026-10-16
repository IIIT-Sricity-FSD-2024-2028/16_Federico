# Federico Hospital Platform — Frontend

A React + Vite single-page application covering all eight role portals. It
replaces the previous vanilla-JS multi-page frontend (111 files, no build step);
the migration is recorded in `../react-migration-plan.md`.

The backend it talks to is unchanged: `../back-end`, Express on port 3000.

---

## Running it

```sh
cd back-end && npm install && npm run start:dev   # terminal 1 — API on :3000
cd front-end && npm install && npm run dev        # terminal 2 — app on :5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173` |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serves `dist/` with the same URL rewriting as dev |
| `npm run lint` | oxlint over `src/` |

### Configuration

Copy `.env.example` to `.env` if the API is not on `http://localhost:3000`:

```
VITE_API_URL=http://localhost:3000
```

With no `.env`, `src/api/client.js` falls back to the page's own origin when it
is served on port 3000, and to `http://localhost:3000` otherwise — the same rule
the old `shared/api-client.js` used.

### Deploying

Routes keep their legacy `.html` suffixes, and Vite's built-in SPA fallback
skips any path whose last segment contains a dot. `vite.config.js` adds a
middleware that rewrites navigation requests (`Accept: text/html`) to
`/index.html`, and **any production host needs the equivalent rewrite** or every
deep link 404s. For example, with nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Routes

Every URL is identical to the one the old multi-page app served, including the
`.html` suffix and the FA hash routes, so existing links and bookmarks keep
working.

### Public

| URL | Page |
|---|---|
| `/` | redirects to the landing page |
| `/landing/landing-page.html` | Marketing landing page |
| `/login/login-page.html` | Staff and patient sign-in (`?org=<id>` preselects a hospital) |
| `/signup/signup-page.html` | Patient self-registration (`?org=<id>`) |
| `/signup/org-signup.html` | Four-step hospital-chain onboarding |
| `/marketplace/marketplace-page.html` | Public hospital directory |

### Platform Super User

| URL | Page |
|---|---|
| `/platform/platform-login.html` | Redirects to the unified sign-in page (platform staff sign in as `name.platform@federico.com`) |
| `/platform/platform-dashboard.html` | Tenants, provisioning, plan rates |

### HOM — Hospital Operations Manager

| URL | Page |
|---|---|
| `/HOM/` and `/HOM/index.html` | redirect to the dashboard |
| `/HOM/screen-01-dashboard.html` | KPIs, bed requests, discharge queue |
| `/HOM/screen-02-bed-management.html` | Ward and bed matrix |
| `/HOM/screen-03-patient-flow.html` | Inpatient flow and discharge clearance (`?uhid=`) |
| `/HOM/screen-04-inventory.html` | Stock, usage logging, restock orders |
| `/HOM/screen-05-billing.html` | Ledgers and service posting (`?uhid=`) |

### PRE — Patient Relational Executive

| URL | Page |
|---|---|
| `/PRE/` and `/PRE/index.html` | redirect to the dashboard |
| `/PRE/pages/PRE.html` | Dashboard counters and approved patients |
| `/PRE/pages/request.html` | Pending pre-requests: approve / suggest / reject |
| `/PRE/pages/rejected.html` | Rejected requests |
| `/PRE/pages/admitted.html` | Admitted inpatients |
| `/PRE/pages/discharge.html` | Discharge requests and HOM approvals |
| `/PRE/pages/emergency.html` | Emergency triage and walk-in registration |
| `/PRE/pages/patient-records.html` | Patient directory and Patient 360 |
| `/PRE/pages/doctor.html` | Doctor roster |
| `/PRE/pages/appointment.html` | OPD booking (`?patient_id=`, `?doctor_id=`) |
| `/PRE/pages/APPointment.html` | Alias of the above — the file on disk used this casing while every link used the lowercase form |
| `/PRE/pages/bed-coordination.html` | Bed allocation and operations coordination (legacy `/PRE/pages/hom.html` redirects here) |

### Patient

| URL | Page |
|---|---|
| `/Patient/patient-dashboard.html` | Appointments, visits, PRE updates, bills, documents |
| `/Patient/patient-book-appointment.html` | OPD booking with slot capacity |
| `/Patient/patient-billing.html` | Invoices, receipts, discharge summaries, EOD bills |
| `/Patient/patient-profile.html` | Personal, contact, password and insurance sections |

### FA — Finance Associate

One page with six hash views:

| URL | View |
|---|---|
| `/FA/fa-dashboard.html#/dashboard` | Billing queue and recent receipts |
| `/FA/fa-dashboard.html#/charges` | HOM-submitted charges awaiting approval |
| `/FA/fa-dashboard.html#/ledger` | Patient ledger and manual charges |
| `/FA/fa-dashboard.html#/eod` | End-of-day bill dispatch |
| `/FA/fa-dashboard.html#/discharge` | Final settlement and discharge summary |
| `/FA/fa-dashboard.html#/receipts` | Receipt search and printing |

`#/ledger/42`, `#/eod/42` and `#/discharge/42` open that admission directly.

### Admin

| URL | Page |
|---|---|
| `/Admin/screen-01-dashboard.html` | Organization analytics |
| `/Admin/screen-02-departments.html` | Wards and beds |
| `/Admin/screen-03-inventory.html` | Inventory catalog |
| `/Admin/screen-04-admin.html` | Roles, permissions, branding |
| `/Admin/screen-05-people.html` | Staff logins and doctors |

---

## How the code is arranged

```
src/
  main.jsx            createRoot + SessionProvider + RouterProvider
  routes.jsx          the whole route table; portal layouts are lazy
  api/                one module per backend namespace, composed into `api`
  auth/               SessionContext, the route guard, actor home paths
  lib/                pure helpers: formatters, insurance, sanitizer, CSV, print
  hooks/              useApi, usePolling, usePageStyles, useDocumentTitle, …
  components/         feedback (toast/dialog), ui primitives, layout, forms
  pages/<portal>/     one folder per portal
  styles/             the legacy stylesheets, unchanged
```

Two things are worth knowing before editing:

**Nothing is on `window`.** Everything is an ES module import. `window.location`,
`window.open` and the other browser APIs are used directly, but the app defines
no globals — `grep -rn "window\." src/` should only ever show browser APIs.

**Stylesheets are mounted per route.** The legacy CSS files are byte-identical
copies, and they collide with each other by design: 20 class names, 10 `:root`
blocks, 17 `body` rules and 8 `*` resets are defined in more than one file. That
was safe when each HTML page loaded only its own stylesheet. A lazily imported
CSS chunk, by contrast, is injected once and never removed, so a portal's styles
would leak into every page visited afterwards. Each portal stylesheet is
therefore imported with Vite's `?inline` query and mounted by `usePageStyles`,
which appends it to `<head>` on mount and removes it on unmount. If you add a
portal stylesheet, import it the same way — a plain `import './x.css'` will leak.

The three shared stylesheets (`design-tokens.css`, `material-components.css`,
`ui-feedback.css`) are imported once in `main.jsx`; they loaded on every legacy
page too, so there is nothing to isolate.

---

## Sign-in accounts

Seed accounts, organization 1 ("City General Hospital"):

| Role | Email | Password |
|---|---|---|
| Admin | `owner.admin@citygen.com` | `Owner@123` |
| HOM | `admin.hom@citygen.com` | `Hom@123` |
| PRE | `rekha.pre@citygen.com` | `Pre@123` |
| FA | `farah.fa@citygen.com` | `Fa@123` |
| Patient | `arjun.k@hosp.com` | `Hamiz@123` |
| Platform | `super.platform@federico.com` | `Federico@Platform123` |

There is one sign-in page for every actor. It reads the portal from the
email (`name.hom@`, `.pre@`, `.fa@`, `.admin@` on the hospital's email domain,
`name.platform@federico.com`; anything else is a patient, who then picks a
hospital). The logic lives in `src/lib/emailIdentity.js`. The demo panel lists
each hospital's accounts; clicking a row fills the form.
