'use strict';

import { Outlet } from 'react-router-dom';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import { useSession } from '../../auth/useSession.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import adminCss from '../../styles/admin/admin.css?inline';

/**
 * Ported from Admin/shared-nav.js. "Roles & Staff" (screen-04, the custom-RBAC
 * matrix) is gone: staff roles are managed from the People directory, and the
 * old URL redirects there.
 */
const LINKS = [
  { href: '/Admin/screen-01-dashboard.html', label: 'Dashboard' },
  { href: '/Admin/screen-02-departments.html', label: 'Departments & Wards' },
  { href: '/Admin/screen-03-inventory.html', label: 'Inventory Catalog' },
  { href: '/Admin/screen-05-people.html', label: 'Staff & Doctors' },
];

export default function AdminLayout() {
  usePageStyles(adminCss);
  const { tenant } = useSession();
  return (
    <>
      <AppNavbar
        roleName="Admin"
        brandName={tenant?.organization_name || 'Federico'}
        links={LINKS}
      />
      <Outlet />
    </>
  );
}

