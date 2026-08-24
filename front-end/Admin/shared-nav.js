'use strict';

/**
 * Admin/shared-nav.js
 * Injects the Admin top navigation using the centralized SharedNav component.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (window.SharedNav && typeof window.SharedNav.renderNavbar === 'function') {
    const session = window.RoleAccess?.getSessionInfo?.();
    const brandName = session?.tenant?.organization_name || 'Federico';

    window.SharedNav.renderNavbar({
      containerId: 'main-nav',
      roleName: 'Admin',
      brandName: brandName,
      links: [
        { href: 'screen-01-dashboard.html', label: 'Dashboard' },
        { href: 'screen-02-departments.html', label: 'Departments' },
        { href: 'screen-03-inventory.html', label: 'Inventory Catalog' },
        { href: 'screen-04-admin.html', label: 'Roles & Staff' },
      ],
    });
  }
});
