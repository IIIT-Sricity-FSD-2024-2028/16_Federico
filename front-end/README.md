# Federico — Frontend Architecture & Portal Reference

This directory contains the entire frontend client application for the **Federico Hospital Administrative Operations Platform**.

---

## 1. Architecture & Design Principles

* **Pure Vanilla JavaScript (ES6+ Modules):** Zero build steps, zero transpilation, and zero node runtime requirements for client assets.
* **Semantic HTML5 & Standard Web Components:** Clean DOM architecture with ARIA accessibility labels and mobile-friendly responsive viewports.
* **Design Token Engine:** Standardized styling via `shared/design-tokens.css` and `shared/material-components.css` following Material Design 3 / Material You guidelines.
* **Per-Tab Session Isolation:** Authentication state is stored per browser tab (`sessionStorage` with graceful `localStorage` sync) to allow multi-role testing simultaneously across browser tabs without session collision.
* **Resilient API Communication:** Centralized `shared/api-client.js` with automated Bearer token attachment, 15-second AbortSignal timeouts, CSRF protection, and concurrency lock guards (`withAsyncLock`) to prevent double form submissions.

---

## 2. Directory Structure & Role Portals

```
front-end/
├── Admin/                 # Hospital Owner / Admin Portal
│   ├── screen-01-dashboard.html    # Org statistics & branch summary
│   ├── screen-02-departments.html  # Department & doctor catalog management
│   ├── screen-03-inventory.html    # Non-clinical inventory catalog administration
│   └── screen-04-admin.html        # Dynamic RBAC roles & staff user assignment
│
├── FA/                    # Financial Administrator (FA) Portal
│   ├── fa-dashboard.html           # Unified finance ledger, review & dispatch
│   ├── js/modules/                 # Ledger, charge approval, and payment logic
│   └── css/                        # Finance dashboard theme
│
├── HOM/                   # Hospital Operations Manager (HOM) Portal
│   ├── screen-01-dashboard.html    # Real-time occupancy KPIs & alerts
│   ├── screen-02-bed-management.html# Interactive ward bed matrix & assignment
│   ├── screen-03-patient-flow.html # Inpatient admissions & discharge readiness
│   ├── screen-04-inventory.html    # Operational stock replenishment & requests
│   └── screen-05-billing.html      # Clinical/ward service charge entry (Leaders)
│
├── PRE/                   # Patient Registration & Eligibility (PRE) Portal
│   ├── index.html                  # Navigation hub
│   └── pages/                      # Pre-requests, OPD appointments, admissions & discharges
│
├── Patient/               # Patient Self-Service Portal
│   ├── patient-dashboard.html      # Upcoming visits, active admissions, bill notices
│   ├── patient-book-appointment.html# OPD specialist scheduling
│   ├── patient-billing.html        # Itemized bills, online payment & receipt download
│   └── patient-profile.html        # UHID demographics & insurance document upload
│
├── platform/              # SaaS Platform Super User Portal
│   ├── platform-login.html         # Isolated platform authentication
│   └── platform-dashboard.html     # Tenant provisioning, subscriptions & feature flags
│
├── landing/               # Public product showcase & features overview
├── login/                 # Unified actor login portal with role-based routing
├── signup/                # Hospital organization onboarding & patient registration
├── marketplace/           # Multi-tenant directory of accredited hospitals
└── shared/                # Core client utilities (API client, RBAC, tokens, toasts)
```

---

## 3. Shared Utilities (`shared/`)

| File | Purpose |
| :--- | :--- |
| **`api-client.js`** | Unified REST client wrapping `fetch` with Bearer auth, session recovery, and tenant headers |
| **`rbac.js`** | Client-side role and capability verification (`hasRole`, `canAccess`) |
| **`auth-guard.js`** | Page-level authentication guard redirecting unauthenticated users to `/login` |
| **`design-tokens.css`** | CSS custom properties for color palettes, spacing, elevation, and typography |
| **`material-components.css`** | Reusable UI components (buttons, input fields, cards, tables, badges, modals) |
| **`ui-feedback.js` & `ui-feedback.css`** | Accessible toast alerts, confirm dialogs, and loading spinners |
| **`sanitizer.js`** | DOMPurify-style HTML sanitization preventing XSS during dynamic DOM rendering |
| **`formatters.js`** | Currency (INR/USD), date/time, and UHID formatting utilities |

---

## 4. Authentication Flow & Role Routing

When logging in via `login/login-page.html`:
1. `POST /auth/login` validates credentials against the backend.
2. The returned token and user profile are saved into the active tab's session store.
3. The user is redirected automatically to their designated role portal:
   * **Role 0 (Platform Super User):** `/platform/platform-dashboard.html`
   * **Role 5 (Hospital Admin):** `/Admin/screen-01-dashboard.html`
   * **Role 1 (HOM):** `/HOM/screen-01-dashboard.html`
   * **Role 4 (PRE):** `/PRE/pages/PRE.html`
   * **Role 3 (FA):** `/FA/fa-dashboard.html`
   * **Role 2 (Patient):** `/Patient/patient-dashboard.html`

---

## 5. Local Development & Serving

Serve the `front-end` directory with any static HTTP server (e.g. `npx serve`, Python `http.server`, or VS Code Live Server):

```bash
# Serve frontend on port 5500
npx serve front-end -p 5500
```

* **Landing Page:** `http://localhost:5500/landing/landing-page.html`
* **Login Portal:** `http://localhost:5500/login/login-page.html`
* **Platform Super User:** `http://localhost:5500/platform/platform-login.html`
* **Marketplace:** `http://localhost:5500/marketplace/marketplace-page.html`
