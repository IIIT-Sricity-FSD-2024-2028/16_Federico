'use strict';

import { useEffect, useRef } from 'react';

/**
 * The HOM portal's refresh behaviour, ported exactly: every `intervalMs` run
 * the callback unless the tab is hidden, and run it again whenever the window
 * regains focus.
 *
 * Five HOM pages do this at 15s with 6-8 parallel requests each. That is
 * observable behaviour, so it is preserved verbatim rather than optimised
 * (DEC-10).
 */
export function usePolling(callback, intervalMs = 15000) {
  const savedRef = useRef(callback);
  const inFlightRef = useRef(false);

  // Keep the latest callback without restarting the timer. Updated in an
  // effect, not during render, so render stays pure.
  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const trigger = () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      Promise.resolve(savedRef.current()).finally(() => {
        inFlightRef.current = false;
      });
    };

    const id = setInterval(() => {
      if (!document.hidden) trigger();
    }, intervalMs);

    window.addEventListener('focus', trigger);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', trigger);
    };
  }, [intervalMs]);
}

