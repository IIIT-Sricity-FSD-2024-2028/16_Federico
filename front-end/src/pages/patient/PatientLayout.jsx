'use strict';

import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { usePatientStore } from './usePatientStore.js';
import { useSession } from '../../auth/useSession.js';
import { useAppDispatch } from '../../store/hooks.js';
import { refreshPatientPortal } from '../../store/slices/patientsSlice.js';
import { toast } from '../../components/feedback/feedback.js';
import AppNavbar from '../../components/layout/AppNavbar.jsx';

const DASHBOARD = '/Patient/patient-dashboard.html';
const BOOK = '/Patient/patient-book-appointment.html';
const BILLING = '/Patient/patient-billing.html';
const DOCUMENTS = '/Patient/documents';
const PROFILE = '/Patient/patient-profile.html';

const LINKS = [
  { href: DASHBOARD, label: 'Dashboard' },
  { href: BOOK, label: 'Book Appointment' },
  { href: BILLING, label: 'My Bill' },
  { href: DOCUMENTS, label: 'My Documents' },
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
  const hospitalName = tenant?.organization_name || tenant?.name || profile?.hospitalName || 'Federico Hospital';

  return (
    <AppNavbar
      brandName="Federico"
      roleName="Patient"
      hospitalName={hospitalName}
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
  const dispatch = useAppDispatch();
  const { session } = useSession();
  const patientId = session?.patientId;

  // Loads the portal into state.patients.portal for the signed-in patient, and
  // again whenever the session changes (the old provider's refresh effect).
  useEffect(() => {
    dispatch(refreshPatientPortal());
  }, [dispatch, patientId, session]);

  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}
