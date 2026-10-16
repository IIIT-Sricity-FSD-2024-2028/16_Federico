'use strict';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One fetch with a manual reload, matching how the legacy pages loaded data:
 * an async loader that swallows per-endpoint failures (`.catch(() => [])`) and
 * re-runs on demand. No caching or de-duplication - that would be a behaviour
 * change (DEC-11).
 *
 * FIX: The original implementation had two separate useEffect calls —
 * one to track mount state (mountedRef) and one to trigger the initial load.
 * Under React 19 StrictMode, effects are run, cleaned up, then re-run.
 * Because the two effects had SEPARATE cleanup/re-run cycles, there was a
 * window where mountedRef.current = false (from Effect-1 cleanup) while
 * the in-flight fetch from Effect-2 could complete and silently drop its
 * result (since mountedRef.current was false). This caused pages to load
 * blank data that never appeared — requiring a manual browser refresh.
 *
 * The fix: collapse both effects into ONE effect that owns both the
 * mounted-flag lifecycle AND the initial load trigger. This guarantees that
 * mountedRef.current is always true when the fetch completes for the active
 * mount, and false only after that same effect's cleanup runs (i.e. on
 * actual unmount). There is no longer any window where the flag is false
 * while the component is actually mounted.
 */
export function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loaderRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) setError(err);
      return undefined;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Single effect that owns both the mount flag AND the initial data load.
  // Keeping them together means the flag is always true when a fetch that
  // was started by THIS mount's effect completes, and always false after
  // this mount's cleanup (actual unmount). No gap between the two.
  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
