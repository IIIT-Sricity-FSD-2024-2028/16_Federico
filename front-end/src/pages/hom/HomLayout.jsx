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
  { href: '/hom/dashboard', label: 'Dashboard' },
  { href: '/hom/bed-management', label: 'Bed Management' },
  { href: '/hom/patient-flow', label: 'Patient Flow' },
  { href: '/hom/inventory', label: 'Inventory' },
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

