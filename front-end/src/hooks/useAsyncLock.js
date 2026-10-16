'use strict';

import { useCallback, useRef, useState } from 'react';

/**
 * Ported from shared/api-client.js#withAsyncLock, which disabled a button
 * element for the duration of an in-flight submit to prevent double-posting.
 * The DOM poking becomes a boolean the caller spreads onto `disabled`.
 */
export function useAsyncLock() {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  const run = useCallback(async (fn) => {
    if (lockedRef.current) return undefined;
    lockedRef.current = true;
    setLocked(true);
    try {
      return await fn();
    } finally {
      lockedRef.current = false;
      setLocked(false);
    }
  }, []);

  return [locked, run];
}

