'use strict';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { api } from '../api/index.js';
import { subscribe, getSnapshot, setSession, clearSession } from '../api/session.js';
import { getProfile, hasModuleAccess } from '../lib/roleProfiles.js';
import { hasModule, resourceQty, getEntitlements } from '../lib/entitlements.js';
import { SessionContext } from './contexts.js';

/**
 * Replaces window.RoleAccess's session half. The store itself lives in
 * api/session.js (so api/client.js can clear it on a 401 without importing
 * React); this subscribes to it and exposes the login/logout operations.
 */
export function SessionProvider({ children }) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [lastAuthError, setLastAuthErrorState] = useState(null);
  // authenticate() resolves to null on failure and puts the reason here. State
  // alone is not enough: a caller awaiting authenticate() would read the
  // previous render's value. The ref is readable the instant the await returns.
  const lastAuthErrorRef = useRef(null);
  const setLastAuthError = useCallback((msg) => {
    lastAuthErrorRef.current = msg;
    setLastAuthErrorState(msg);
  }, []);

  const tenant = (session && session.tenant) || null;
  const actor = (session && session.actor) || '';

  /**
   * Unified login. The portal comes from the email's tag (name.hom@ → HOM),
   * resolved against the public org list by the login page's
   * resolveLoginIdentity(); `actor` is that result. Returns { actor, ... } on
   * success or null on failure, with the reason in lastAuthError - the same
   * truthy/falsy contract the login page already branches on.
   */
  const authenticate = useCallback(async (actor, email, password, organizationId) => {
    setLastAuthError(null);
    try {
      if (actor === 'PLATFORM') {
        // Platform Super Users are a separate auth realm: their own endpoint,
        // and a session marked isPlatformUser that RequireModule never reads.
        const result = await api.platform.auth.login(email, password);
        setSession({
          token: result.token,
          actor: 'PLATFORM',
          role: 'PLATFORM',
          isPlatformUser: true,
          displayName: result.user.name,
          email: result.user.email,
          platformUserId: result.user.platform_user_id,
        });
        return {
          actor: 'PLATFORM',
          profile: null,
          account: { email: result.user.email, displayName: result.user.name },
        };
      }

      const profile = getProfile(actor);
      if (!profile) {
        setLastAuthError('Unknown portal for that email address.');
        return null;
      }

      const result = await api.auth.login(actor, email, password, organizationId);

      if (result && result.requiresOrganizationSelection) {
        return {
          requiresOrganizationSelection: true,
          organizations: result.organizations || [],
        };
      }

      // The per-actor endpoint already enforces this; kept as a second guard.
      if (result.role !== actor) {
        setLastAuthError('That account is not a ' + actor + ' account.');
        return null;
      }

      setSession({
        token: result.token,
        actor,
        role: profile.accessRole,
        userId: result.user.user_id,
        patientId: result.patient ? result.patient.patient_id : null,
        patientUhid: result.patient ? result.patient.uhid : null,
        displayName: result.user.name,
        email: result.user.email,
        tenant: result.tenant || null,
      });

      return {
        actor,
        profile,
        account: { email: result.user.email, displayName: result.user.name },
      };
    } catch (err) {
      setLastAuthError(
        actor === 'PLATFORM' && err && err.status === 401
          ? 'Invalid email or password'
          : (err && err.message) || 'Login failed. Please try again.',
      );
      return null;
    }
  }, [setLastAuthError]);

  /** Ported from shared/rbac.js#signupPatient. Throws so the caller can show the server message. */
  const signupPatient = useCallback(async (payload) => {
    const result = await api.auth.signup(payload);
    const profile = getProfile('Patient');

    setSession({
      token: result.token,
      actor: 'Patient',
      role: profile.accessRole,
      userId: result.user.user_id,
      patientId: result.patient.patient_id,
      patientUhid: result.patient.uhid,
      displayName: result.user.name,
      email: result.user.email,
      tenant: result.tenant || null,
    });

    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* best effort; the local session clears either way */
    }
    clearSession();
  }, []);

  const value = useMemo(
    () => ({
      session,
      tenant,
      actor,
      accessRole: (session && session.role) || '',
      isAuthenticated: Boolean(session && session.token),
      isPlatformUser: Boolean(session && session.isPlatformUser),
      lastAuthError,
      getLastAuthError: () => lastAuthErrorRef.current,
      authenticate,
      signupPatient,
      logout,
      setSession,
      clearSession,
      hasModuleAccess: (moduleName) => hasModuleAccess(moduleName, actor),
      hasModule: (code) => hasModule(tenant, code),
      resourceQty: (mod, res) => resourceQty(tenant, mod, res),
      entitlements: () => getEntitlements(tenant),
    }),
    [session, tenant, actor, lastAuthError, authenticate, signupPatient, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

