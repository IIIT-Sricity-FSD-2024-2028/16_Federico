'use strict';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useSession } from '../../auth/useSession.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import { FaContext } from './FaContext.jsx';
import { useHashRoute, DEFAULT_ROUTE } from './useHashRoute.js';
import { toast } from '../../components/feedback/feedback.js';
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

/** The ids a view actually renders an inline error slot for. */
const FORM_ERROR_IDS = ['discharge-payment-error'];

export default function FaLayout() {
  usePageStyles(baseCss, layoutCss, componentsCss);
  useDocumentTitle('Federico | Finance Portal');

  const { actor, tenant, logout, hasModuleAccess } = useSession();
  const { mainRoute, param, navigate } = useHashRoute();

  const [currentAdmissionId, setCurrentAdmissionId] = useState(null);
  const [version, setVersion] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  // The override field is read live at click time, exactly as the action module
  // read #coverage-override off the DOM, so it must outlive re-renders.
  const coverageOverrideRef = useRef(null);

  // parseHashRoute() wrote window.currentAdmissionId whenever the hash carried
  // a third segment; the same rule applies here, without the global.
  const admissionId = param || currentAdmissionId;

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const showFormError = useCallback((id, message) => {
    if (!FORM_ERROR_IDS.includes(id)) {
      toast(message, 'error');
      return;
    }
    setFormErrors((e) => ({ ...e, [id]: message }));
  }, []);

  const canAccess = useCallback(
    (route) => {
      const fallback = DEFAULT_ROUTE.replace('#/', '');
      const raw = String(route || '').replace(/^#\/?/, '') || fallback;
      const page = raw.split('/')[0].split('?')[0] || fallback;
      return ROUTES.includes(page) && (hasModuleAccess('FA') ?? true);
    },
    [hasModuleAccess],
  );

  const ctx = useMemo(
    () => ({
      currentAdmissionId: admissionId,
      setCurrentAdmissionId,
      navigate,
      reload,
      version,
      formErrors,
      showFormError,
      clearFormError: (id) => setFormErrors((e) => ({ ...e, [id]: undefined })),
      coverageOverrideRef,
      hospitalName: tenant?.organization_name || 'Hospital',
    }),
    [admissionId, navigate, reload, version, formErrors, showFormError, tenant],
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
    <FaContext.Provider value={ctx}>
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
  </FaContext.Provider>
);
}

