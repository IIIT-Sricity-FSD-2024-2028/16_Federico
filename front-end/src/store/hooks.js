'use strict';

import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { clearLoad, clearUiField, setUiField } from './slices/uiSlice.js';

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
export const useAppStore = useStore;

/**
 * Component-scoped UI / form state held in the Redux store (state.ui.fields),
 * read with a selector and written by dispatching setUiField.
 *
 * Each call is namespaced by `name` plus a per-instance id, so two mounted
 * copies of one component never share a value, and the entry is removed when
 * the component unmounts - the lifecycle React local state used to give these
 * values. `initialValue` (or a lazy initialiser) applies until the first write.
 * The setter accepts a value or an updater function.
 */
export function useUiState(name, initialValue) {
  const dispatch = useDispatch();
  const store = useStore();
  const instanceId = useId();
  const key = name + '#' + instanceId;

  // The value in force until the first write: computed once per mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => (typeof initialValue === 'function' ? initialValue() : initialValue), []);

  const present = useSelector((state) => key in state.ui.fields);
  const stored = useSelector((state) => state.ui.fields[key]);
  const value = present ? stored : initial;

  // Like a React setState on an unmounted component, a write that arrives after
  // the component is gone (a late async callback) is dropped rather than
  // resurrecting the cleared entry.
  const mountedRef = useRef(true);

  const set = useCallback(
    (next) => {
      if (!mountedRef.current) return;
      const fields = store.getState().ui.fields;
      const current = key in fields ? fields[key] : initial;
      const resolved = typeof next === 'function' ? next(current) : next;
      dispatch(setUiField({ key, value: resolved }));
    },
    [dispatch, store, key, initial],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dispatch(clearUiField(key));
    };
  }, [dispatch, key]);

  return [value, set];
}

/**
 * Dispatches a page loader (store/loaders.js) on mount and whenever `deps`
 * change, and reports its status from state.ui.loads. `loading` is true until
 * the first load has been started and while any load is in flight, exactly as
 * the old useApi hook behaved; `reload()` dispatches the loader again.
 */
export function useLoader(loader, { arg, deps = [] } = {}) {
  const dispatch = useDispatch();
  const name = loader.typePrefix.slice('loader/'.length);
  const entry = useSelector((state) => state.ui.loads[name]);

  const reload = useCallback(() => dispatch(loader(arg)), [dispatch, loader, arg]);

  useEffect(() => {
    dispatch(loader(arg));
    return () => {
      dispatch(clearLoad(name));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, loader, name, ...deps]);

  return {
    loading: !entry || entry.active.length > 0,
    // true once a load has succeeded - the old useApi `data` was non-null from
    // then on, even while a later reload was running.
    loaded: Boolean(entry && entry.loaded),
    error: entry ? entry.error : null,
    reload,
  };
}
