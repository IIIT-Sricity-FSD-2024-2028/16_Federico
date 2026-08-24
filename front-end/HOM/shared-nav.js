'use strict';

/**
 * HOM/shared-nav.js
 * Injects the Head of Medical (HOM) top navigation using the centralized SharedNav component.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (window.SharedNav && typeof window.SharedNav.renderNavbar === 'function') {
    const session = window.RoleAccess?.getSessionInfo?.();
    const hospitalName =
      session?.tenant?.hospital_name ||
      session?.tenant?.organization_name ||
      'City General Hospital';

    window.SharedNav.renderNavbar({
      containerId: 'main-nav',
      roleName: 'HOM',
      brandName: 'Federico',
      hospitalName: hospitalName,
      links: [
        { href: 'screen-01-dashboard.html', label: 'Dashboard' },
        { href: 'screen-02-bed-management.html', label: 'Bed Management' },
        { href: 'screen-03-patient-flow.html', label: 'Patient Flow' },
        { href: 'screen-04-inventory.html', label: 'Inventory' },
        { href: 'screen-05-billing.html', label: 'Billing' },
      ],
    });
  }
});
