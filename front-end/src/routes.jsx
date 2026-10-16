'use strict';

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import App from './App.jsx';
import RequireModule, { RequirePlatformUser } from './auth/RequireModule.jsx';
import { LOGIN_PATH } from './auth/actorHome.js';



const LandingPage = lazy(() => import('./pages/public/LandingPage.jsx'));
const LoginPage = lazy(() => import('./pages/public/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/public/SignupPage.jsx'));
const OrgSignupPage = lazy(() => import('./pages/public/OrgSignupPage.jsx'));
const MarketplacePage = lazy(() => import('./pages/public/MarketplacePage.jsx'));

const PlatformDashboardPage = lazy(() => import('./pages/platform/PlatformDashboardPage.jsx'));

const HomLayout = lazy(() => import('./pages/hom/HomLayout.jsx'));
const HomDashboardPage = lazy(() => import('./pages/hom/DashboardPage.jsx'));
const HomBedManagementPage = lazy(() => import('./pages/hom/BedManagementPage.jsx'));
const HomPatientFlowPage = lazy(() => import('./pages/hom/PatientFlowPage.jsx'));
const HomInventoryPage = lazy(() => import('./pages/hom/InventoryPage.jsx'));

const PreLayout = lazy(() => import('./pages/pre/PreLayout.jsx'));
const PreDashboardPage = lazy(() => import('./pages/pre/PreDashboardPage.jsx'));
const PreRequestsPage = lazy(() => import('./pages/pre/RequestsPage.jsx'));
const PreAdmittedPage = lazy(() => import('./pages/pre/AdmittedPage.jsx'));
const PreHomCoordinationPage = lazy(() => import('./pages/pre/HomCoordinationPage.jsx'));
const PreDischargePage = lazy(() => import('./pages/pre/DischargePage.jsx'));
const PreRejectedPage = lazy(() => import('./pages/pre/RejectedPage.jsx'));
const PrePatientRecordsPage = lazy(() => import('./pages/pre/PatientRecordsPage.jsx'));
const PreDoctorRosterPage = lazy(() => import('./pages/pre/DoctorRosterPage.jsx'));
const PreAppointmentPage = lazy(() => import('./pages/pre/AppointmentPage.jsx'));

const PatientLayout = lazy(() => import('./pages/patient/PatientLayout.jsx'));
const PatientDashboardPage = lazy(() => import('./pages/patient/DashboardPage.jsx'));
const PatientBookAppointmentPage = lazy(() => import('./pages/patient/BookAppointmentPage.jsx'));
const PatientBillingPage = lazy(() => import('./pages/patient/BillingPage.jsx'));
const PatientProfilePage = lazy(() => import('./pages/patient/ProfilePage.jsx'));

const FaLayout = lazy(() => import('./pages/fa/FaLayout.jsx'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage.jsx'));
const AdminDepartmentsPage = lazy(() => import('./pages/admin/DepartmentsPage.jsx'));
const AdminInventoryCatalogPage = lazy(() => import('./pages/admin/InventoryCatalogPage.jsx'));
const AdminPeoplePage = lazy(() => import('./pages/admin/PeoplePage.jsx'));

/** Suspense fallback while a lazy page chunk loads (styles in ui-feedback.css). */
function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-label="Loading" />
    </div>
  );
}

/** Wraps a lazy element in the Suspense boundary every route needs. */
function L(element) {
  return <Suspense fallback={<Loading />}>{element}</Suspense>;
}

function guarded(moduleName, element) {
  return (
    <RequireModule module={moduleName}>
      <Suspense fallback={<Loading />}>{element}</Suspense>
    </RequireModule>
  );
}

/** A <Navigate> that carries the current ?query along (e.g. ?uhid=). */
function RedirectKeepingQuery({ to }) {
  const { search } = useLocation();
  return <Navigate to={to + search} replace />;
}

function NotFound() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Page Not Found</h1>
    </main>
  );
}

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Navigate to="/landing/landing-page.html" replace /> },

      // ---- Public ----
      { path: '/landing/landing-page.html', element: L(<LandingPage />) },
      { path: '/login/login-page.html', element: L(<LoginPage />) },
      { path: '/signup/signup-page.html', element: L(<SignupPage />) },
      { path: '/signup/org-signup.html', element: L(<OrgSignupPage />) },
      { path: '/marketplace/marketplace-page.html', element: L(<MarketplacePage />) },

      // ---- Platform Super User (its own auth realm) ----
      // Platform staff sign in on the unified login page (name.platform@federico.com);
      // the old console login URL still resolves for bookmarks.
      { path: '/platform/platform-login.html', element: <Navigate to={LOGIN_PATH} replace /> },
      {
        path: '/platform/platform-dashboard.html',
        element: (
          <RequirePlatformUser>
            <Suspense fallback={<Loading />}>
              <PlatformDashboardPage />
            </Suspense>
          </RequirePlatformUser>
        ),
      },

      // ---- HOM ----
      { path: '/HOM', element: <Navigate to="/HOM/screen-01-dashboard.html" replace /> },
      { path: '/HOM/index.html', element: <Navigate to="/HOM/screen-01-dashboard.html" replace /> },
      {
        element: guarded('HOM', <HomLayout />),
        children: [
          { path: '/HOM/screen-01-dashboard.html', element: L(<HomDashboardPage />) },
          { path: '/HOM/screen-02-bed-management.html', element: L(<HomBedManagementPage />) },
          { path: '/HOM/screen-03-patient-flow.html', element: L(<HomPatientFlowPage />) },
          { path: '/HOM/screen-04-inventory.html', element: L(<HomInventoryPage />) },
        ],
      },
      // HOM billing moved to FA; old links land on Patient Flow, where each
      // patient's detail modal has the read-only Billing Ledger tab.
      { path: '/HOM/screen-05-billing.html', element: <RedirectKeepingQuery to="/HOM/screen-03-patient-flow.html" /> },

      // ---- PRE ----
      { path: '/PRE', element: <Navigate to="/PRE/pages/PRE.html" replace /> },
      { path: '/PRE/index.html', element: <Navigate to="/PRE/pages/PRE.html" replace /> },
      {
        element: guarded('PRE', <PreLayout />),
        children: [
          { path: '/PRE/pages/PRE.html', element: L(<PreDashboardPage />) },
          { path: '/PRE/pages/request.html', element: L(<PreRequestsPage />) },
          { path: '/PRE/pages/admitted.html', element: L(<PreAdmittedPage />) },
          { path: '/PRE/pages/bed-coordination.html', element: L(<PreHomCoordinationPage />) },
          { path: '/PRE/pages/hom.html', element: <Navigate to="/PRE/pages/bed-coordination.html" replace /> },
          { path: '/PRE/pages/discharge.html', element: L(<PreDischargePage />) },
          { path: '/PRE/pages/rejected.html', element: L(<PreRejectedPage />) },
          { path: '/PRE/pages/patient-records.html', element: L(<PrePatientRecordsPage />) },
          { path: '/PRE/pages/doctor.html', element: L(<PreDoctorRosterPage />) },
          // Both casings resolve (DEC-7). Every link in the app uses the
          // lowercase spelling; the file on disk was APPointment.html, so a
          // bookmark of either must keep working.
          { path: '/PRE/pages/appointment.html', element: L(<PreAppointmentPage />) },
          { path: '/PRE/pages/APPointment.html', element: L(<PreAppointmentPage />) },
        ],
      },

      // ---- Patient ----
      {
        element: guarded('PATIENT', <PatientLayout />),
        children: [
          { path: '/Patient/patient-dashboard.html', element: L(<PatientDashboardPage />) },
          {
            path: '/Patient/patient-book-appointment.html',
            element: L(<PatientBookAppointmentPage />),
          },
          { path: '/Patient/patient-billing.html', element: L(<PatientBillingPage />) },
          { path: '/Patient/patient-profile.html', element: L(<PatientProfilePage />) },
        ],
      },

      // ---- FA (one page, six hash views - DEC-2) ----
      { path: '/FA', element: <Navigate to="/FA/fa-dashboard.html" replace /> },
      { path: '/FA/index.html', element: <Navigate to="/FA/fa-dashboard.html" replace /> },
      { path: '/FA/fa-dashboard.html', element: guarded('FA', <FaLayout />) },

      // ---- Admin ----
      {
        element: guarded('ADMIN', <AdminLayout />),
        children: [
          { path: '/Admin/screen-01-dashboard.html', element: L(<AdminDashboardPage />) },
          { path: '/Admin/screen-02-departments.html', element: L(<AdminDepartmentsPage />) },
          { path: '/Admin/screen-03-inventory.html', element: L(<AdminInventoryCatalogPage />) },
          { path: '/Admin/screen-05-people.html', element: L(<AdminPeoplePage />) },
        ],
      },
      // The custom-RBAC screen was folded into People.
      { path: '/Admin/screen-04-admin.html', element: <Navigate to="/Admin/screen-05-people.html" replace /> },

      { path: '*', element: <NotFound /> },
    ],
  },
]);

/**
 * The app's router, exported as a component so this module only exports
 * components (keeps React Fast Refresh working for the route helpers above).
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
