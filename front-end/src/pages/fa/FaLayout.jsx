'use strict';

import { useCallback, useEffect } from 'react';
import { useSession } from '../../auth/useSession.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import { useAppDispatch } from '../../store/hooks.js';
import { resetFa } from '../../store/slices/billingSlice.js';
import { useHashRoute, DEFAULT_ROUTE } from './useHashRoute.js';
import ChargesView from './ChargesView.jsx';
import LedgerView from './LedgerView.jsx';
import EodBillingView from './EodBillingView.jsx';
import baseCss from '../../styles/fa/base.css?inline';
import layoutCss from '../../styles/fa/layout.css?inline';
import componentsCss from '../../styles/fa/components.css?inline';

const LINKS = [
  { href: '/FA/fa-dashboard.html#/ledger', label: 'Ledger' },
  { href: '/FA/fa-dashboard.html#/charges', label: 'Charges' },
  { href: '/FA/fa-dashboard.html#/eod', label: 'EOD & Settlement' },
];

/**
 * permissions.js#routeAccess listed the same routes for ADMIN, SUPER_USER and
 * ORG_ADMIN, so the per-role part never excluded anything and the only real
 * gate was hasModuleAccess('FA', actor). That is what this reproduces.
 */
const ROUTES = ['ledger', 'charges', 'eod'];

export default function FaLayout() {
  usePageStyles(baseCss, layoutCss, componentsCss);
  useDocumentTitle('Federico | Finance Portal');

  const dispatch = useAppDispatch();
  const { actor, tenant, logout, hasModuleAccess } = useSession();
  const { mainRoute } = useHashRoute();

  // The FA portal's state (current admission, reload counter, form errors) lives
  // in state.billing.fa and was always scoped to this layout; reset it on leaving.
  useEffect(() => {
    return () => {
      dispatch(resetFa());
    };
  }, [dispatch]);

  const canAccess = useCallback(
    (route) => {
      const fallback = DEFAULT_ROUTE.replace('#/', '');
      const raw = String(route || '').replace(/^#\/?/, '') || fallback;
      const page = raw.split('/')[0].split('?')[0] || fallback;
      return ROUTES.includes(page) && (hasModuleAccess('FA') ?? true);
    },
    [hasModuleAccess],
  );

  async function onLogout() {
    await logout();
    window.location.href = '/login/login-page.html';
  }

  let view;
  if (!canAccess(mainRoute)) {
    view = null;
  } else if (mainRoute === '#/ledger') view = <LedgerView />;
  else if (mainRoute === '#/charges') view = <ChargesView />;
  else if (mainRoute === '#/eod') view = <EodBillingView />;
  else {
    view = (
      <div className="card" style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Page Not Found</h2>
      </div>
    );
  }

  return (
    <>
      <AppNavbar
        roleName={actor === 'HOM' ? 'FA (Finance Control)' : 'FA'}
        brandName="Federico"
        hospitalName={tenant?.organization_name}
        links={LINKS}
        onLogout={onLogout}
      />

      <main id="app" className="main-content">
        {view}
      </main>
    </>
  );
}

