'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { uploads } from '../../api/endpoints/uploads.js';
import { addWriteCases, apiThunk } from '../thunkHelpers.js';

/**
 * File objects are never stored: the DOM input hands the File to a thunk, the
 * existing uploads API sends it, and only the serializable response (url,
 * originalName, sizeBytes, ...) is kept.
 */
export const uploadDocument = apiThunk('uploads/document', (file) => uploads.document(file), 'Upload failed');
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
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addWriteCases(builder, uploadDocument, (state, action) => {
      state.lastDocument = action.payload || null;
    });
    addWriteCases(builder, openUploadedFile);
  },
});

export default uploadsSlice.reducer;
