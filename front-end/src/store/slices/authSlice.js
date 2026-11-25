'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { auth } from '../../api/endpoints/auth.js';
import { platform } from '../../api/endpoints/platform.js';
import { getSnapshot, setSession } from '../../api/session.js';
import { getProfile } from '../../lib/roleProfiles.js';
import { apiThunk, errorMessage } from '../thunkHelpers.js';

/**
 * Session / authentication state (was SessionContext). The token itself stays
 * in api/session.js (sessionStorage, per-tab isolation, BroadcastChannel logout,
 * 401 handling) so api/client.js can read it without importing React or the
 * store; state.auth.session mirrors it through sessionSynced (see store.js).
 */

/**
 * Unified login. Resolves to { actor, profile, account } on success, to
 * { requiresOrganizationSelection, organizations } when the email matches
 * several organizations, and rejects (reason in state.auth.lastAuthError) when
 * sign-in fails.
 */
export const authenticate = apiThunk(
  'auth/authenticate',
  async ({ actor, email, password, organizationId }) => {
    if (actor === 'PLATFORM') {
      // Platform Super Users are a separate auth realm: their own endpoint,
      // and a session marked isPlatformUser that RequireModule never reads.
      let result;
      try {
        result = await platform.auth.login(email, password);
      } catch (err) {
        if (err && err.status === 401) {
          const unauthorised = new Error('Invalid email or password');
          unauthorised.status = err.status;
          throw unauthorised;
        }
        throw err;
      }
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
    if (!profile) throw new Error('Unknown portal for that email address.');

    const result = await auth.login(actor, email, password, organizationId);

    if (result && result.requiresOrganizationSelection) {
      return {
        requiresOrganizationSelection: true,
        organizations: result.organizations || [],
      };
    }

    // The per-actor endpoint already enforces this; kept as a second guard.
    if (result.role !== actor) throw new Error('That account is not a ' + actor + ' account.');

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
  },
  'Login failed. Please try again.',
);

/** Throws (rejects) so the caller can show the server message. */
export const signupPatient = apiThunk(
  'auth/signupPatient',
  async (payload) => {
    const result = await auth.signup(payload);
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
  },
  'Signup failed',
);

/** Best-effort server-side invalidation; the local session clears either way. */
export const logout = apiThunk(
  'auth/logout',
  async () => {
    await auth.logout();
    return null;
  },
  'Logout failed',
);

export const fetchMe = apiThunk('auth/fetchMe', () => auth.me(), 'Failed to load account');
export const fetchEntitlements = apiThunk(
  'auth/fetchEntitlements',
  () => auth.entitlements(),
  'Failed to load entitlements',
);
export const fetchDemoAccounts = apiThunk(
  'auth/fetchDemoAccounts',
  () => auth.demoAccounts(),
  'Failed to load demo accounts',
);
export const changePassword = apiThunk(
  'auth/changePassword',
  ({ newPassword, currentPassword }) => auth.changePassword(newPassword, currentPassword),
  'Failed to change password',
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    session: getSnapshot(),
    me: null,
    entitlements: null,
    demoAccounts: null,
    lastAuthError: null,
    authenticating: false,
    saving: false,
    error: null,
  },
  reducers: {
    /** Mirror of api/session.js after any setSession / clearSession / broadcast logout. */
    sessionSynced(state, action) {
      state.session = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authenticate.pending, (state) => {
        state.authenticating = true;
        state.lastAuthError = null;
      })
      .addCase(authenticate.fulfilled, (state) => {
        state.authenticating = false;
      })
      .addCase(authenticate.rejected, (state, action) => {
        state.authenticating = false;
        state.lastAuthError = errorMessage(action) || 'Login failed. Please try again.';
      })
      .addCase(signupPatient.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(signupPatient.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(signupPatient.rejected, (state, action) => {
        state.saving = false;
        state.error = errorMessage(action);
      })
      .addCase(logout.fulfilled, (state) => {
        state.me = null;
        state.entitlements = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.me = action.payload || null;
      })
      .addCase(fetchEntitlements.fulfilled, (state, action) => {
        state.entitlements = action.payload || null;
      })
      .addCase(fetchDemoAccounts.fulfilled, (state, action) => {
        state.demoAccounts = action.payload || null;
      });
  },
});

export const { sessionSynced } = authSlice.actions;

export const selectSession = (state) => state.auth.session;
export const selectTenant = (state) => (state.auth.session && state.auth.session.tenant) || null;
export const selectActor = (state) => (state.auth.session && state.auth.session.actor) || '';
export const selectIsAuthenticated = (state) => Boolean(state.auth.session && state.auth.session.token);
export const selectIsPlatformUser = (state) => Boolean(state.auth.session && state.auth.session.isPlatformUser);
export const selectLastAuthError = (state) => state.auth.lastAuthError;

export default authSlice.reducer;
