'use strict';

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks.js';
import {
  authenticate,
  logout as logoutThunk,
  selectLastAuthError,
  selectSession,
  signupPatient as signupPatientThunk,
} from '../store/slices/authSlice.js';
import { hasModuleAccess } from '../lib/roleProfiles.js';
import { hasModule, resourceQty, getEntitlements } from '../lib/entitlements.js';

/**
 * The session as the rest of the app reads it, backed by state.auth (authSlice).
 * This is a thin adapter: reads are selectors, the three operations dispatch
 * the auth thunks, and nothing is held here.
 */
export function useSession() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const session = useAppSelector(selectSession);
  const lastAuthError = useAppSelector(selectLastAuthError);

  const tenant = (session && session.tenant) || null;
  const actor = (session && session.actor) || '';

  /**
   * Unified login. Returns { actor, ... } on success or null on failure, with
   * the reason in lastAuthError - the same truthy/falsy contract the login page
   * already branches on.
   */
  const authenticateUser = useCallback(
    async (loginActor, email, password, organizationId) => {
      const action = await dispatch(authenticate({ actor: loginActor, email, password, organizationId }));
      return authenticate.fulfilled.match(action) ? action.payload : null;
    },
    [dispatch],
  );

  /** Throws (the rejection payload, which carries .message) so the caller can show the server message. */
  const signupPatient = useCallback(
    (payload) => dispatch(signupPatientThunk(payload)).unwrap(),
    [dispatch],
  );

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  return useMemo(
    () => ({
      session,
      tenant,
      actor,
      accessRole: (session && session.role) || '',
      isAuthenticated: Boolean(session && session.token),
      isPlatformUser: Boolean(session && session.isPlatformUser),
      lastAuthError,
      // Read straight from the store so a caller awaiting authenticate() sees
      // the value its own failed attempt just wrote, not the previous render's.
      getLastAuthError: () => store.getState().auth.lastAuthError,
      authenticate: authenticateUser,
      signupPatient,
      logout,
      hasModuleAccess: (moduleName) => hasModuleAccess(moduleName, actor),
      hasModule: (code) => hasModule(tenant, code),
      resourceQty: (mod, res) => resourceQty(tenant, mod, res),
      entitlements: () => getEntitlements(tenant),
    }),
    [session, tenant, actor, lastAuthError, store, authenticateUser, signupPatient, logout],
  );
}
