'use strict';

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import RequireModule, { RequirePlatformUser } from './auth/RequireModule.jsx';



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

const PatientLayout = lazy(() => import('./pages/patient/PatientLayout.jsx'));
const PatientDashboardPage = lazy(() => import('./pages/patient/DashboardPage.jsx'));
const PatientBookAppointmentPage = lazy(() => import('./pages/patient/BookAppointmentPage.jsx'));
const PatientBillingPage = lazy(() => import('./pages/patient/BillingPage.jsx'));
const PatientDocumentsPage = lazy(() => import('./pages/patient/DocumentsPage.jsx'));
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
      { path: '/', element: <Navigate to="/landing" replace /> },

      // ---- Public ----
      { path: '/landing', element: L(<LandingPage />) },
      { path: '/login', element: L(<LoginPage />) },
      { path: '/signup', element: L(<SignupPage />) },
      { path: '/org-signup', element: L(<OrgSignupPage />) },
      { path: '/marketplace', element: L(<MarketplacePage />) },

      // ---- Platform Super User (its own auth realm) ----
      {
        path: '/platform',
        element: (
          <RequirePlatformUser>
            <Suspense fallback={<Loading />}>
              <PlatformDashboardPage />
            </Suspense>
          </RequirePlatformUser>
        ),
      },

      // ---- HOM ----
      { path: '/hom', element: <Navigate to="/hom/dashboard" replace /> },
      {
        element: guarded('HOM', <HomLayout />),
        children: [
          { path: '/hom/dashboard', element: L(<HomDashboardPage />) },
          { path: '/hom/bed-management', element: L(<HomBedManagementPage />) },
          { path: '/hom/patient-flow', element: L(<HomPatientFlowPage />) },
          { path: '/hom/inventory', element: L(<HomInventoryPage />) },
        ],
      },

      // ---- PRE ----
      { path: '/pre', element: <Navigate to="/pre/dashboard" replace /> },
      {
        element: guarded('PRE', <PreLayout />),
        children: [
          { path: '/pre/dashboard', element: L(<PreDashboardPage />) },
          { path: '/pre/requests', element: L(<PreRequestsPage />) },
          { path: '/pre/admitted', element: L(<PreAdmittedPage />) },
          { path: '/pre/bed-coordination', element: L(<PreHomCoordinationPage />) },
          { path: '/pre/discharge', element: L(<PreDischargePage />) },
          { path: '/pre/rejected', element: L(<PreRejectedPage />) },
          { path: '/pre/patient-records', element: L(<PrePatientRecordsPage />) },
          { path: '/pre/doctors', element: L(<PreDoctorRosterPage />) },
        ],
      },

      // ---- Patient ----
      { path: '/patient', element: <Navigate to="/patient/dashboard" replace /> },
      {
        element: guarded('PATIENT', <PatientLayout />),
        children: [
          { path: '/patient/dashboard', element: L(<PatientDashboardPage />) },
          {
            path: '/patient/book-appointment',
            element: L(<PatientBookAppointmentPage />),
          },
          { path: '/patient/billing', element: L(<PatientBillingPage />) },
          { path: '/patient/documents', element: L(<PatientDocumentsPage />) },
          { path: '/patient/profile', element: L(<PatientProfilePage />) },
        ],
      },

      // ---- FA (one page, hash views via useHashRoute) ----
      { path: '/fa', element: guarded('FA', <FaLayout />) },

      // ---- Admin ----
      { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
      {
        element: guarded('ADMIN', <AdminLayout />),
        children: [
          { path: '/admin/dashboard', element: L(<AdminDashboardPage />) },
          { path: '/admin/departments', element: L(<AdminDepartmentsPage />) },
          { path: '/admin/inventory', element: L(<AdminInventoryCatalogPage />) },
          { path: '/admin/people', element: L(<AdminPeoplePage />) },
        ],
      },

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
