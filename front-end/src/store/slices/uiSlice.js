'use strict';

import { createSlice } from '@reduxjs/toolkit';

/**
 * Application/UI state with no single domain owner:
 *
 *  - fields : component-scoped UI and form state (see useUiState in hooks.js),
 *             keyed "<name>#<instance>" and removed when the component unmounts;
 *  - loads  : status of the page-level loader thunks (store/loaders.js) so a
 *             page can show its loading / error state.
 */
function isLoaderAction(action, status) {
  return typeof action.type === 'string' && action.type.startsWith('loader/') && action.type.endsWith('/' + status);
}

function loaderName(action) {
  // "loader/<name>/<status>"; <name> may itself contain slashes only if a key was appended.
  return action.type.slice('loader/'.length, action.type.lastIndexOf('/'));
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    fields: {},
    loads: {},
  },
  reducers: {
    setUiField(state, action) {
      state.fields[action.payload.key] = action.payload.value;
    },
    clearUiField(state, action) {
      delete state.fields[action.payload];
    },

    clearLoad(state, action) {
      delete state.loads[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Page loaders are createAsyncThunk thunks whose type starts "loader/"
    // (store/loaders.js); their lifecycle drives state.ui.loads[name].
    builder
      .addMatcher(
        (action) => isLoaderAction(action, 'pending'),
        (state, action) => {
          const name = loaderName(action);
          const entry = state.loads[name] || { active: [], error: null, loaded: false };
          entry.active.push(action.meta.requestId);
          state.loads[name] = entry;
        },
      )
      .addMatcher(
        (action) => isLoaderAction(action, 'fulfilled'),
        (state, action) => {
          // A request settling after its page unmounted (clearLoad) is ignored.
          const entry = state.loads[loaderName(action)];
          if (!entry) return;
          entry.active = entry.active.filter((id) => id !== action.meta.requestId);
          entry.error = null;
          entry.loaded = true;
        },
      )
      .addMatcher(
        (action) => isLoaderAction(action, 'rejected'),
        (state, action) => {
          const entry = state.loads[loaderName(action)];
          if (!entry) return;
          entry.active = entry.active.filter((id) => id !== action.meta.requestId);
          entry.error = action.payload || { message: (action.error && action.error.message) || 'Failed to load' };
        },
      );
  },
});

export const { setUiField, clearUiField, clearLoad } = uiSlice.actions;

export const selectLoad = (name) => (state) => state.ui.loads[name];

export default uiSlice.reducer;
