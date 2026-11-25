'use strict';

import { createAsyncThunk } from '@reduxjs/toolkit';
import { toRejection } from './thunkHelpers.js';

/**
 * A page loader: one createAsyncThunk (type "loader/<name>") that dispatches
 * the domain slices' fetch thunks a page needs. The data lands in those slices;
 * the loader's own lifecycle drives state.ui.loads[<name>] (loading / error),
 * which useLoader() in hooks.js reads. `run` returns nothing.
 */
export function createLoader(name, run) {
  return createAsyncThunk('loader/' + name, async (arg, thunkApi) => {
    try {
      await run(arg, thunkApi);
      return null;
    } catch (error) {
      return thunkApi.rejectWithValue(toRejection(error, 'Failed to load'));
    }
  });
}

/** A fetch whose failure fails the whole load (the page shows its error state). */
export const must = (dispatched) => dispatched.unwrap();

/** A fetch whose failure is swallowed, like the legacy `.catch(() => [])`. */
export const soft = (dispatched) => dispatched.unwrap().catch(() => undefined);

/** Like soft, but resolves to `fallback` on failure (for callers that need a value). */
export const orElse = (dispatched, fallback) => dispatched.unwrap().catch(() => fallback);
