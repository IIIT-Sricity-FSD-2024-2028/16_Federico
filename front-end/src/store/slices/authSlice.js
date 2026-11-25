'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { auth } from '../../api/endpoints/auth.js';
import { getSnapshot } from '../../api/session.js';
import { apiThunk } from '../thunkHelpers.js';

/**
 * Session state. The token itself stays in api/session.js (sessionStorage,
 * per-tab isolation, BroadcastChannel logout, 401 handling) so api/client.js
 * can read it without importing React or the store; state.auth.session mirrors
 * it through sessionSynced (see store.js). Sign-in / sign-out still run through
 * SessionContext at this stage; the thunks that need the signed-in actor
 * (the patient portal's) read state.auth.session.
 */
export const changePassword = apiThunk(
  'auth/changePassword',
  ({ newPassword, currentPassword }) => auth.changePassword(newPassword, currentPassword),
  'Failed to change password',
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    session: getSnapshot(),
  },
  reducers: {
    /** Mirror of api/session.js after any setSession / clearSession / broadcast logout. */
    sessionSynced(state, action) {
      state.session = action.payload || null;
    },
  },
});

export const { sessionSynced } = authSlice.actions;

export const selectSession = (state) => state.auth.session;

export default authSlice.reducer;
