'use strict';

import { createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Serializable rejection payload. The existing API layer throws ApiError with
 * `.message`, `.status` and `.data`; call sites read those three, so the
 * rejected value keeps all three (and `dispatch(thunk).unwrap()` throws it).
 */
export function toRejection(error, fallback) {
  return {
    message: (error && error.message) || fallback,
    status: error && error.status !== undefined ? error.status : null,
    data: error && error.data !== undefined ? error.data : null,
  };
}

/**
 * Thin wrapper over createAsyncThunk: runs `call(arg, thunkApi)` - which must
 * go through an existing src/api/endpoints module - and turns any thrown error
 * into a serializable rejectWithValue payload. Nothing here touches HTTP.
 */
export function apiThunk(type, call, fallbackMessage) {
  return createAsyncThunk(type, async (arg, thunkApi) => {
    try {
      return await call(arg, thunkApi);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejection(error, fallbackMessage));
    }
  });
}

export function errorMessage(action) {
  return (action.payload && action.payload.message) || (action.error && action.error.message) || null;
}

/** Replace the row whose `key` matches the response; append when it is new. */
export function upsertByKey(list, key, row) {
  if (!row || typeof row !== 'object' || row[key] === undefined) return list;
  const idx = list.findIndex((r) => r[key] === row[key]);
  if (idx === -1) list.push(row);
  else list[idx] = row;
  return list;
}

export function removeByKey(list, key, id) {
  return list.filter((r) => String(r[key]) !== String(id));
}

/**
 * Reads: every fetch thunk of a slice shares one loading counter so a slice that
 * loads several resources in parallel reports "loading" until the last settles.
 */
export function addReadCases(builder, thunk, onFulfilled, onRejected) {
  builder
    .addCase(thunk.pending, (state) => {
      state.pending += 1;
      state.loading = true;
      state.error = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state.pending = Math.max(0, state.pending - 1);
      state.loading = state.pending > 0;
      onFulfilled(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      state.pending = Math.max(0, state.pending - 1);
      state.loading = state.pending > 0;
      state.error = errorMessage(action);
      if (onRejected) onRejected(state, action);
    });
}

/** Writes: DB first - state is only touched in `fulfilled`. */
export function addWriteCases(builder, thunk, onFulfilled) {
  builder
    .addCase(thunk.pending, (state) => {
      state.saving = true;
      state.error = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state.saving = false;
      if (onFulfilled) onFulfilled(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      state.saving = false;
      state.error = errorMessage(action);
    });
}
