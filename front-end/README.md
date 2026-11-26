# Federico Hospital Platform — Frontend

A React + Vite single-page application for the Federico role portals.

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

Any production host needs an SPA history fallback rewrite to `/index.html` so
deep links and page refreshes resolve to the React app. For example, with nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Routes

Every portal uses clean, extensionless SPA routes (FA keeps its `#/ledger`,
`#/charges`, and `#/eod` hash views under `/fa`).

### Public

| URL | Page |
|---|---|
| `/` | redirects to `/landing` |
| `/landing` | Marketing landing page |
| `/login` | Staff and patient sign-in (`?org=<id>` preselects a hospital) |
| `/signup` | Patient self-registration (`?org=<id>`) |
| `/org-signup` | Four-step hospital-chain onboarding |
| `/marketplace` | Public hospital directory |

### Platform Super User

| URL | Page |
|---|---|
| `/platform` | Tenants, provisioning, plan rates |

### HOM — Hospital Operations Manager

| URL | Page |
|---|---|
| `/hom` | redirects to `/hom/dashboard` |
| `/hom/dashboard` | KPIs, bed requests, discharge queue |
| `/hom/bed-management` | Ward and bed matrix |
| `/hom/patient-flow` | Inpatient flow and discharge clearance (`?uhid=`) |
| `/hom/inventory` | Stock, usage logging, restock orders |

### PRE — Patient Relational Executive

| URL | Page |
|---|---|
| `/pre` | redirects to `/pre/dashboard` |
| `/pre/dashboard` | Dashboard counters and approved patients |
| `/pre/requests` | Pending pre-requests: approve / reject |
| `/pre/rejected` | Rejected requests |
| `/pre/admitted` | Admitted inpatients |
| `/pre/discharge` | Discharge requests and HOM approvals |
| `/pre/patient-records` | Patient directory and Patient 360 |
| `/pre/doctors` | Doctor roster |
| `/pre/bed-coordination` | Bed allocation and operations coordination |

### Patient

| URL | Page |
|---|---|
| `/patient` | redirects to `/patient/dashboard` |
| `/patient/dashboard` | Appointments, visits, PRE updates, bills, documents |
| `/patient/book-appointment` | OPD booking with slot capacity |
| `/patient/billing` | Invoices, receipts, discharge summaries, EOD bills |
| `/patient/documents` | Uploaded documents and medical records |
| `/patient/profile` | Personal, contact, password and insurance sections |

### FA — Finance Associate

One page with hash views:

| URL | View |
|---|---|
| `/fa#/ledger` | Patient ledger and manual charges |
| `/fa#/charges` | HOM-submitted charges awaiting approval |
| `/fa#/eod` | End-of-day bill dispatch and settlement |

`#/ledger/42` and `#/eod/42` open that admission directly.

### Admin

| URL | Page |
|---|---|
| `/admin` | redirects to `/admin/dashboard` |
| `/admin/dashboard` | Organization analytics |
| `/admin/departments` | Wards and beds |
| `/admin/inventory` | Inventory catalog |
| `/admin/people` | Staff logins, roles, and doctors |

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
