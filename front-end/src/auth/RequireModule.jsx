'use strict';

import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from './useSession.js';
import { getActorHome, LOGIN_PATH } from './actorHome.js';
import { toast } from '../components/feedback/feedback.js';

const REDIRECT_DELAY_MS = 1100;


/**
 * Renders a portal only for a signed-in actor with access to its module.
 * Signed out -> login. Signed in without access -> nothing, one "access
 * denied" toast, and a redirect to the actor's own home.
 *
 * Whether to render is derived from the session on every render. (An earlier
 * version also kept a sticky `denied` flag in state, which could leave the
 * page blank after a transient denial until the browser was refreshed.)
 */
export default function RequireModule({ module: moduleName, children }) {
  const { isAuthenticated, actor, hasModuleAccess } = useSession();
  const navigate = useNavigate();
  const firedRef = useRef(false);

  const allowed = isAuthenticated && hasModuleAccess(moduleName);

  useEffect(() => {
    if (!isAuthenticated || allowed) return undefined;

    if (!firedRef.current) {
      firedRef.current = true;
      toast('Access denied — ' + actor + ' cannot open the ' + moduleName + ' module.', 'error');
    }
    const t = setTimeout(() => navigate(getActorHome(actor), { replace: true }), REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [isAuthenticated, allowed, actor, moduleName, navigate]);

  if (!isAuthenticated) return <Navigate to={LOGIN_PATH} replace />;
  if (!allowed) return null;
  return children;
}

/**
 * Platform Super User console has its own auth realm, separate from the actor
 * system. Signing in still goes through the one unified login page.
 */
export function RequirePlatformUser({ children }) {
  const { isPlatformUser } = useSession();
  if (!isPlatformUser) return <Navigate to={LOGIN_PATH} replace />;
  return children;
}
