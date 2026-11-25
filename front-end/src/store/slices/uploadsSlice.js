'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { uploads } from '../../api/endpoints/uploads.js';
import { addReadCases, addWriteCases, apiThunk } from '../thunkHelpers.js';

/**
 * File objects are never stored: the DOM input hands the File to a thunk, the
 * existing uploads API sends it, and only the serializable response (url,
 * originalName, sizeBytes, ...) is kept.
 */
export const uploadDocument = apiThunk('uploads/document', (file) => uploads.document(file), 'Upload failed');
export const uploadBranding = apiThunk('uploads/branding', (file) => uploads.branding(file), 'Upload failed');
export const uploadInventoryInvoice = apiThunk(
  'uploads/inventory',
  (file) => uploads.inventory(file),
  'Upload failed',
);
export const fetchLogsStatus = apiThunk(
  'uploads/logsStatus',
  () => uploads.logsStatus(),
  'Failed to load log status',
);
export const openUploadedFile = apiThunk(
  'uploads/open',
  async ({ category, filename }) => {
    await uploads.open(category, filename);
    return null;
  },
  'Unable to open file',
);

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState: {
    lastDocument: null,
    lastBranding: null,
    lastInventoryInvoice: null,
    logsStatus: null,
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addWriteCases(builder, uploadDocument, (state, action) => {
      state.lastDocument = action.payload || null;
    });
    addWriteCases(builder, uploadBranding, (state, action) => {
      state.lastBranding = action.payload || null;
    });
    addWriteCases(builder, uploadInventoryInvoice, (state, action) => {
      state.lastInventoryInvoice = action.payload || null;
    });
    addReadCases(builder, fetchLogsStatus, (state, action) => {
      state.logsStatus = action.payload || null;
    });
    addWriteCases(builder, openUploadedFile);
  },
});

export const staticUploadUrl = (category, filename) => uploads.staticUrl(category, filename);

export default uploadsSlice.reducer;
