'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { platform } from '../../api/endpoints/platform.js';
import { addReadCases, addWriteCases, apiThunk, removeByKey, upsertByKey } from '../thunkHelpers.js';

/* --------------------------- platform auth realm --------------------------- */
// Platform sign-in itself is part of authSlice.authenticate (it shares the
// session handling); these are the remaining platform.auth operations.

export const fetchPlatformMe = apiThunk('platform/me', () => platform.auth.me(), 'Failed to load account');
export const platformLogout = apiThunk(
  'platform/logout',
  async () => {
    await platform.auth.logout();
    return null;
  },
  'Logout failed',
);

/* ------------------------------ organizations ------------------------------ */

export const fetchOrganizations = apiThunk(
  'platform/fetchOrganizations',
  () => platform.organizations.list(),
  'Failed to load organizations',
);
export const fetchOrganization = apiThunk(
  'platform/fetchOrganization',
  (id) => platform.organizations.get(id),
  'Failed to load organization',
);
export const provisionOrganization = apiThunk(
  'platform/provisionOrganization',
  (payload) => platform.organizations.provision(payload),
  'Failed to provision organization',
);
export const suspendOrganization = apiThunk(
  'platform/suspendOrganization',
  (id) => platform.organizations.suspend(id),
  'Failed to update status.',
);
export const activateOrganization = apiThunk(
  'platform/activateOrganization',
  (id) => platform.organizations.activate(id),
  'Failed to update status.',
);
export const removeOrganization = apiThunk(
  'platform/removeOrganization',
  async (id) => {
    await platform.organizations.remove(id);
    return id;
  },
  'Failed to remove organization',
);
export const fetchEmailDomainImpact = apiThunk(
  'platform/fetchEmailDomainImpact',
  (id) => platform.organizations.emailDomainImpact(id),
  'Failed to check email domain impact',
);
export const changeEmailDomain = apiThunk(
  'platform/changeEmailDomain',
  ({ id, emailDomain }) => platform.organizations.changeEmailDomain(id, emailDomain),
  'Could not change the email domain.',
);
export const fetchProvisioningLog = apiThunk(
  'platform/fetchProvisioningLog',
  (id) => platform.organizations.provisioningLog(id),
  'Failed to load provisioning log',
);
export const fetchOrganizationUsage = apiThunk(
  'platform/fetchOrganizationUsage',
  (id) => platform.organizations.usage(id),
  'Failed to load usage',
);
export const fetchOrganizationHospitals = apiThunk(
  'platform/fetchOrganizationHospitals',
  (id) => platform.organizations.hospitals(id),
  'Failed to load hospitals',
);
export const addOrganizationHospital = apiThunk(
  'platform/addOrganizationHospital',
  ({ id, payload }) => platform.organizations.addHospital(id, payload),
  'Failed to add hospital',
);
export const fetchOrganizationModules = apiThunk(
  'platform/fetchOrganizationModules',
  (id) => platform.organizations.modules(id),
  'Failed to load modules',
);
export const setOrganizationModule = apiThunk(
  'platform/setOrganizationModule',
  ({ id, moduleCode, enabled, instances }) => platform.organizations.setModule(id, moduleCode, enabled, instances),
  'Failed to update module',
);
export const fetchOrganizationResources = apiThunk(
  'platform/fetchOrganizationResources',
  (id) => platform.organizations.resources(id),
  'Failed to load resources',
);
export const setOrganizationResources = apiThunk(
  'platform/setOrganizationResources',
  ({ id, resources }) => platform.organizations.setResources(id, resources),
  'Failed to update resources',
);
export const fetchApiKeys = apiThunk(
  'platform/fetchApiKeys',
  (id) => platform.organizations.apiKeys(id),
  'Failed to load API keys',
);
export const createApiKey = apiThunk(
  'platform/createApiKey',
  ({ id, label }) => platform.organizations.createApiKey(id, label),
  'Failed to create API key',
);
export const revokeApiKey = apiThunk(
  'platform/revokeApiKey',
  async (id) => {
    await platform.apiKeys.revoke(id);
    return id;
  },
  'Failed to revoke API key',
);
export const fetchOrganizationSubscription = apiThunk(
  'platform/fetchOrganizationSubscription',
  (id) => platform.organizations.getSubscription(id),
  'Failed to load subscription',
);
export const setOrganizationSubscription = apiThunk(
  'platform/setOrganizationSubscription',
  ({ id, planId }) => platform.organizations.setSubscription(id, planId),
  'Failed to update subscription',
);
export const renewOrganizationSubscription = apiThunk(
  'platform/renewOrganizationSubscription',
  (id) => platform.organizations.renewSubscription(id),
  'Failed to renew subscription',
);

/* ------------------------------ plans / rates ------------------------------ */

export const fetchPlans = apiThunk('platform/fetchPlans', () => platform.plans.list(), 'Failed to load plans');
export const createPlan = apiThunk('platform/createPlan', (payload) => platform.plans.create(payload), 'Failed to create plan');
export const updatePlan = apiThunk(
  'platform/updatePlan',
  ({ id, patch }) => platform.plans.update(id, patch),
  'Failed to update plan',
);
export const fetchModuleResourceCatalog = apiThunk(
  'platform/fetchModuleResourceCatalog',
  () => platform.moduleResourceCatalog(),
  'Failed to load catalog',
);
export const fetchRates = apiThunk('platform/fetchRates', () => platform.rates.get(), 'Could not load global rate card.');
export const updateRates = apiThunk(
  'platform/updateRates',
  (payload) => platform.rates.update(payload),
  'Failed to update rates.',
);

/* ------------------------------ usage / activity ------------------------------ */

export const fetchPlatformUsage = apiThunk(
  'platform/fetchUsage',
  () => platform.usage(),
  'Could not load platform usage.',
);
export const fetchPlatformActivityLog = apiThunk(
  'platform/fetchActivityLog',
  () => platform.activityLog(),
  'Could not load activity feed.',
);

/* ---------------------------------- slice ---------------------------------- */

function detail(state, id) {
  if (!state.orgDetails[id]) state.orgDetails[id] = {};
  return state.orgDetails[id];
}

const platformSlice = createSlice({
  name: 'platform',
  initialState: {
    me: null,
    organizations: [],
    current: null,
    // Per-organization detail, keyed by organization id.
    orgDetails: {},
    plans: [],
    catalog: null,
    rates: null,
    usage: null,
    // null = not loaded, false = load failed, array = loaded (the dashboard's tri-state).
    activity: null,
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchPlatformMe, (state, action) => {
      state.me = action.payload || null;
    });
    addReadCases(builder, fetchOrganizations, (state, action) => {
      state.organizations = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchOrganization, (state, action) => {
      state.current = action.payload || null;
    });
    addReadCases(builder, fetchEmailDomainImpact, (state, action) => {
      detail(state, action.meta.arg).emailDomainImpact = action.payload || null;
    });
    addReadCases(builder, fetchProvisioningLog, (state, action) => {
      detail(state, action.meta.arg).provisioningLog = action.payload || [];
    });
    addReadCases(builder, fetchOrganizationUsage, (state, action) => {
      detail(state, action.meta.arg).usage = action.payload || null;
    });
    addReadCases(builder, fetchOrganizationHospitals, (state, action) => {
      detail(state, action.meta.arg).hospitals = action.payload || [];
    });
    addReadCases(builder, fetchOrganizationModules, (state, action) => {
      detail(state, action.meta.arg).modules = action.payload || null;
    });
    addReadCases(builder, fetchOrganizationResources, (state, action) => {
      detail(state, action.meta.arg).resources = action.payload || null;
    });
    addReadCases(builder, fetchApiKeys, (state, action) => {
      detail(state, action.meta.arg).apiKeys = action.payload || [];
    });
    addReadCases(builder, fetchOrganizationSubscription, (state, action) => {
      detail(state, action.meta.arg).subscription = action.payload || null;
    });
    addReadCases(builder, fetchPlans, (state, action) => {
      state.plans = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchModuleResourceCatalog, (state, action) => {
      state.catalog = action.payload || null;
    });
    addReadCases(builder, fetchRates, (state, action) => {
      state.rates = action.payload || null;
    });
    // Usage: the dashboard distinguishes "not loaded" (null) from "failed" (false).
    addReadCases(
      builder,
      fetchPlatformUsage,
      (state, action) => {
        state.usage = action.payload || null;
      },
      (state) => {
        state.usage = false;
      },
    );
    addReadCases(
      builder,
      fetchPlatformActivityLog,
      (state, action) => {
        state.activity = Array.isArray(action.payload) ? action.payload : [];
      },
      (state) => {
        state.activity = false;
      },
    );

    addWriteCases(builder, provisionOrganization, (state, action) => {
      upsertByKey(state.organizations, 'organization_id', action.payload);
    });
    addWriteCases(builder, suspendOrganization, (state, action) => {
      upsertByKey(state.organizations, 'organization_id', action.payload);
    });
    addWriteCases(builder, activateOrganization, (state, action) => {
      upsertByKey(state.organizations, 'organization_id', action.payload);
    });
    addWriteCases(builder, removeOrganization, (state, action) => {
      state.organizations = removeByKey(state.organizations, 'organization_id', action.payload);
    });
    addWriteCases(builder, changeEmailDomain);
    addWriteCases(builder, addOrganizationHospital, (state, action) => {
      const list = detail(state, action.meta.arg.id).hospitals;
      if (Array.isArray(list)) upsertByKey(list, 'hospital_id', action.payload);
    });
    addWriteCases(builder, setOrganizationModule);
    addWriteCases(builder, setOrganizationResources, (state, action) => {
      detail(state, action.meta.arg.id).resources = action.payload || null;
    });
    addWriteCases(builder, createApiKey, (state, action) => {
      const list = detail(state, action.meta.arg.id).apiKeys;
      if (Array.isArray(list)) upsertByKey(list, 'api_key_id', action.payload);
    });
    addWriteCases(builder, revokeApiKey, (state, action) => {
      Object.values(state.orgDetails).forEach((d) => {
        if (Array.isArray(d.apiKeys)) d.apiKeys = removeByKey(d.apiKeys, 'api_key_id', action.payload);
      });
    });
    addWriteCases(builder, setOrganizationSubscription, (state, action) => {
      detail(state, action.meta.arg.id).subscription = action.payload || null;
    });
    addWriteCases(builder, renewOrganizationSubscription, (state, action) => {
      detail(state, action.meta.arg).subscription = action.payload || null;
    });
    addWriteCases(builder, createPlan, (state, action) => {
      upsertByKey(state.plans, 'plan_id', action.payload);
    });
    addWriteCases(builder, updatePlan, (state, action) => {
      upsertByKey(state.plans, 'plan_id', action.payload);
    });
    // The rate card is only (re)loaded by fetchRates; saving leaves it to the
    // page's own draft, exactly as before.
    addWriteCases(builder, updateRates);
    addWriteCases(builder, platformLogout);
  },
});

export const selectPlatformUsage = (state) => state.platform.usage;
export const selectPlatformOrganizations = (state) =>
  (state.platform.usage && state.platform.usage.organizations) || state.platform.organizations;
export const selectPlatformActivity = (state) => state.platform.activity;
export const selectPlatformRates = (state) => state.platform.rates;

export default platformSlice.reducer;
