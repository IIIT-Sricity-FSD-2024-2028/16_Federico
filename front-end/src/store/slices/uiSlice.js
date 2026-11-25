'use strict';

import { createSlice } from '@reduxjs/toolkit';

/**
 * Application/UI state with no single domain owner:
 *
 *  - fields : component-scoped UI and form state (see useUiState in hooks.js),
 *             keyed "<name>#<instance>" and removed when the component unmounts.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    fields: {},
  },
  reducers: {
    setUiField(state, action) {
      state.fields[action.payload.key] = action.payload.value;
    },
    clearUiField(state, action) {
      delete state.fields[action.payload];
    },
  },
});

export const { setUiField, clearUiField } = uiSlice.actions;

export default uiSlice.reducer;
