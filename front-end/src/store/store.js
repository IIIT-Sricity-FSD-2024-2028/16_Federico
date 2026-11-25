'use strict';

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { subscribe, getSnapshot } from '../api/session.js';

import activityReducer from './slices/activitySlice.js';
import admissionsReducer from './slices/admissionsSlice.js';
import appointmentsReducer from './slices/appointmentsSlice.js';
import authReducer, { sessionSynced } from './slices/authSlice.js';
import billingReducer from './slices/billingSlice.js';
import doctorsReducer from './slices/doctorsSlice.js';
import inventoryReducer from './slices/inventorySlice.js';
import marketplaceReducer from './slices/marketplaceSlice.js';
import patientsReducer from './slices/patientsSlice.js';
import platformReducer from './slices/platformSlice.js';
import preRequestsReducer from './slices/preRequestsSlice.js';
import rbacReducer from './slices/rbacSlice.js';
import uploadsReducer, {
  uploadBranding,
  uploadDocument,
  uploadInventoryInvoice,
} from './slices/uploadsSlice.js';
import wardsReducer from './slices/wardsSlice.js';
import uiReducer from './slices/uiSlice.js';

const appReducer = combineReducers({
  activity: activityReducer,
  admissions: admissionsReducer,
  appointments: appointmentsReducer,
  auth: authReducer,
  billing: billingReducer,
  doctors: doctorsReducer,
  inventory: inventoryReducer,
  marketplace: marketplaceReducer,
  patients: patientsReducer,
  platform: platformReducer,
  preRequests: preRequestsReducer,
  rbac: rbacReducer,
  uploads: uploadsReducer,
  wards: wardsReducer,
  ui: uiReducer,
});

/**
 * Server data belongs to whoever is signed in. Component-local state used to
 * vanish with its component, so nothing leaked between logins; the store
 * outlives components, so whenever the session's token changes (login, logout,
 * 401, broadcast logout) every domain slice is reset to its initial state.
 * auth (the new session) and ui (toasts, open dialogs, mounted forms) stay.
 */
function rootReducer(state, action) {
  if (state && action.type === sessionSynced.type) {
    const previousToken = state.auth.session ? state.auth.session.token : null;
    const nextToken = action.payload ? action.payload.token : null;
    if (previousToken !== nextToken) {
      state = { auth: state.auth, ui: state.ui };
    }
  }
  return appReducer(state, action);
}

// A File handed to an upload thunk travels in that thunk's action (meta.arg) so
// the existing uploads API can send it; it is never written to state. Those
// action types are exempted from the serializable-value dev check.
const UPLOAD_ACTION_TYPES = [uploadDocument, uploadBranding, uploadInventoryInvoice].flatMap((thunk) => [
  thunk.pending.type,
  thunk.fulfilled.type,
  thunk.rejected.type,
]);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: UPLOAD_ACTION_TYPES } }),
});

/**
 * api/session.js stays the persistence boundary (sessionStorage, per-tab
 * isolation, the logout BroadcastChannel, 401 handling) and has no knowledge of
 * Redux, so the API client can read the bearer token without importing the
 * store. This one-way subscription mirrors every change it announces into
 * state.auth.session.
 */
subscribe(() => {
  store.dispatch(sessionSynced(getSnapshot()));
});
