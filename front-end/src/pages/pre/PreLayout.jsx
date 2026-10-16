'use strict';

import { Outlet } from 'react-router-dom';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import { useSession } from '../../auth/useSession.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import baseCss from '../../styles/pre/base.css?inline';
import layoutCss from '../../styles/pre/layout.css?inline';
import componentsCss from '../../styles/pre/components.css?inline';

/**
 * The PRE layout, now powered by the universal shared AppNavbar.
 */
const LINKS = [
  { href: '/PRE/pages/PRE.html', label: 'Dashboard' },
  { href: '/PRE/pages/patient-records.html', label: 'Patient record', module: 'PATIENT' },
  { href: '/PRE/pages/doctor.html', label: 'Doctor availability', module: 'DOCTOR' },
  { href: '/PRE/pages/appointment.html', label: 'Create Appointment', module: 'APPOINTMENTS' },
  { href: '/PRE/pages/bed-coordination.html', label: 'Bed Coordination', module: 'ADMISSIONS' },
];

export default function PreLayout() {
  usePageStyles(baseCss, layoutCss, componentsCss);
  const { tenant } = useSession();

  return (
    <>
      <AppNavbar
        roleName="PRE"
        brandName={tenant?.organization_name || 'Federico'}
        hospitalName={tenant?.hospital_name || tenant?.organization_name || 'City General Hospital'}
        links={LINKS}
      />
      <main className="pre-page-container">
        <Outlet />
      </main>
    </>
  );
}

