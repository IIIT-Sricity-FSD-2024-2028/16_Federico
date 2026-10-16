'use strict';

import { Outlet } from 'react-router-dom';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import { useSession } from '../../auth/useSession.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import globalCss from '../../styles/hom/global.css?inline';

/**
 * Ported from HOM/shared-nav.js. HOM's own Billing screen
 * (screen-05) is gone: it duplicated the FA ledger with 15-second polling, and
 * financial accounting belongs to Finance. HOM keeps a read-only Billing
 * Ledger tab in the Patient Flow detail modal.
 */
const LINKS = [
  { href: '/HOM/screen-01-dashboard.html', label: 'Dashboard' },
  { href: '/HOM/screen-02-bed-management.html', label: 'Bed Management' },
  { href: '/HOM/screen-03-patient-flow.html', label: 'Patient Flow' },
  { href: '/HOM/screen-04-inventory.html', label: 'Inventory' },
];

export default function HomLayout() {
  usePageStyles(globalCss);
  const { session } = useSession();
  const hospitalName =
    session?.tenant?.hospital_name ||
    session?.tenant?.organization_name ||
    session?.orgName ||
    'City General Hospital';

  return (
    <>
      <AppNavbar roleName="HOM" brandName="Federico" hospitalName={hospitalName} links={LINKS} />
      <Outlet />
    </>
  );
}

