'use strict';

import { Outlet, useNavigate } from 'react-router-dom';
import { PatientStoreProvider } from './PatientStoreContext.jsx';
import { usePatientStore } from './usePatientStore.js';
import { useSession } from '../../auth/useSession.js';
import { toast } from '../../components/feedback/feedback.js';
import AppNavbar from '../../components/layout/AppNavbar.jsx';

const DASHBOARD = '/Patient/patient-dashboard.html';
const BOOK = '/Patient/patient-book-appointment.html';
const BILLING = '/Patient/patient-billing.html';
const PROFILE = '/Patient/patient-profile.html';

const LINKS = [
  { href: DASHBOARD, label: 'Dashboard' },
  { href: BOOK, label: 'Book Appointment' },
  { href: BILLING, label: 'My Bill' },
  { href: PROFILE, label: 'My Profile' },
];

function TopBar() {
  const navigate = useNavigate();
  const { profile } = usePatientStore();
  const { logout, tenant } = useSession();

  function onLogout() {
    toast('Logging out...', 'success');
    setTimeout(() => {
      logout();
      navigate('/landing/landing-page.html');
    }, 500);
  }

  const patientName = profile ? profile.firstName || profile.name || 'Patient' : 'Patient';
  const patientInitials = profile ? profile.initials || 'P' : 'P';

  return (
    <AppNavbar
      brandName="Federico"
      roleName="Patient"
      hospitalName={tenant?.organization_name}
      links={LINKS}
      userProfile={{
        name: patientName,
        initials: patientInitials,
        subtitle: 'Patient Portal',
      }}
      onLogout={onLogout}
    />
  );
}

export default function PatientLayout() {
  return (
    <PatientStoreProvider>
      <TopBar />
      <Outlet />
    </PatientStoreProvider>
  );
}
