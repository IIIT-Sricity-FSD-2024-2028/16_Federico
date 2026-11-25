'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { marketplace } from '../../api/endpoints/marketplace.js';
import { setSession } from '../../api/session.js';
import { addReadCases, addWriteCases, apiThunk } from '../thunkHelpers.js';

export const fetchMarketplaceOrganizations = apiThunk(
  'marketplace/fetchOrganizations',
  () => marketplace.organizations(),
  'Failed to load organizations',
);
export const fetchMarketplacePlans = apiThunk(
  'marketplace/fetchPlans',
  () => marketplace.plans(),
  'Failed to load plans',
);
/**
 * Registering an organization also signs its new admin in: the response carries
 * a session, written through the existing session boundary (api/session.js).
 */
export const registerOrganization = apiThunk(
  'marketplace/registerOrganization',
  async (payload) => {
    const response = await marketplace.registerOrganization(payload);
    const sess = response.session;
    if (sess && sess.token) {
      setSession({
        token: sess.token,
        actor: 'Admin',
        role: 'ORG_ADMIN',
        userId: sess.user ? sess.user.user_id : null,
        displayName: sess.user ? sess.user.name : payload.admin_name,
        email: sess.user ? sess.user.email : payload.admin_email,
        tenant: sess.tenant || null,
      });
    }
    return response;
  },
  'Failed to register organization',
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState: {
    organizations: [],
    plans: [],
    registration: null,
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchMarketplaceOrganizations, (state, action) => {
      state.organizations = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchMarketplacePlans, (state, action) => {
      state.plans = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, registerOrganization, (state, action) => {
      state.registration = action.payload || null;
    });
  },
});

export const selectMarketplaceOrganizations = (state) => state.marketplace.organizations;
export const selectMarketplacePlans = (state) => state.marketplace.plans;

export default marketplaceSlice.reducer;
