'use strict';

import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Replaces FA/js/router.js. The FA portal is the one page in the app that was
 * already a SPA; its views live at `fa-dashboard.html#/ledger`, `#/charges`
 * and `#/eod`, with an optional admission id as a third segment
 * (`#/ledger/42`). This hook bridges React Router's location with the hash
 * sub-views so navbar and internal links trigger instant, reactive view updates.
 */
export const DEFAULT_ROUTE = '#/ledger';
const CANONICAL_ROUTES = new Set(['#/ledger', '#/charges', '#/eod']);

export function parseHashRoute(rawHashInput) {
  const rawHash = rawHashInput || DEFAULT_ROUTE;
  const parts = rawHash.split('/');
  const route = parts.slice(0, 2).join('/');
  const mainRoute = CANONICAL_ROUTES.has(route) ? route : DEFAULT_ROUTE;
  const param = parts[2] ? Number(parts[2].split('?')[0]) : null;
  return { rawHash, mainRoute, param };
}

export function useHashRoute() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  // Use React Router's location.hash, falling back to window.location.hash or DEFAULT_ROUTE
  const activeHash = location.hash || (typeof window !== 'undefined' ? window.location.hash : '') || DEFAULT_ROUTE;
  const parsed = useMemo(() => parseHashRoute(activeHash), [activeHash]);

  // Keep window.location.hash in sync if external scripts assign it directly
  useEffect(() => {
    function onHashChange() {
      const current = window.location.hash || DEFAULT_ROUTE;
      if (current !== location.hash) {
        routerNavigate({ pathname: location.pathname, hash: current }, { replace: true });
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [location.hash, location.pathname, routerNavigate]);

  // Ensure default hash appears in URL if user navigates to /FA/fa-dashboard.html bare
  useEffect(() => {
    if (!location.hash) {
      routerNavigate({ pathname: location.pathname, hash: DEFAULT_ROUTE }, { replace: true });
    }
  }, [location.hash, location.pathname, routerNavigate]);

  /**
   * navigate(hash, admissionId): appends the id to the hash unless it is
   * already there, and triggers a clean router navigation.
   */
  const navigate = useCallback(
    (target, admissionId = null) => {
      let targetHash = target.startsWith('#') ? target : '#' + target;
      if (admissionId && !targetHash.includes('/' + admissionId)) {
        targetHash = targetHash + '/' + admissionId;
      }
      routerNavigate({
        pathname: location.pathname,
        hash: targetHash,
      });
    },
    [location.pathname, routerNavigate],
  );

  return { ...parsed, navigate, setHash: navigate };
}

