'use strict';

import { useEffect, useRef, useState } from 'react';

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
const DURATION_MS = 4000;
const EXIT_FALLBACK_MS = 400;

/**
 * One snackbar, ported from shared/ui-feedback.js#toast.
 *
 * Lifecycle mirrors the original exactly:
 *  - entering: rendered without .is-visible, then a double requestAnimationFrame
 *    adds it so the CSS transition actually runs (a single frame would batch
 *    with the insertion and animate nothing);
 *  - visible:  auto-dismiss after 4s, or the user clicks the dismiss button;
 *  - exiting:  .is-visible removed, then unmount on transitionend with a 400ms
 *    fallback for when the transition never fires (reduced motion).
 *
 * The phase is explicit because removal must only ever be scheduled from the
 * exiting phase. Deriving it from a single `visible` boolean looks equivalent
 * but is not: the toast starts with visible === false, so the exit effect fires
 * on mount and unmounts the toast before it is ever shown. That is a live bug
 * whenever requestAnimationFrame is throttled - a background tab, for one.
 */
export default function Toast({ toast, onRemove }) {
  const [phase, setPhase] = useState('entering');
  const nodeRef = useRef(null);
  const removedRef = useRef(false);

  // entering -> visible, then arm the auto-dismiss.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase((p) => (p === 'entering' ? 'visible' : p)));
    });

    // Runs regardless of rAF, so a toast raised while the tab is hidden still
    // tears itself down rather than piling up - same as the original.
    const dismissTimer = setTimeout(() => setPhase('exiting'), DURATION_MS);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(dismissTimer);
    };
  }, []);

  // exiting -> unmounted.
  useEffect(() => {
    if (phase !== 'exiting') return undefined;
    const node = nodeRef.current;

    const finish = () => {
      if (removedRef.current) return;
      removedRef.current = true;
      onRemove();
    };

    if (node) node.addEventListener('transitionend', finish, { once: true });
    const fallback = setTimeout(finish, EXIT_FALLBACK_MS);

    return () => {
      if (node) node.removeEventListener('transitionend', finish);
      clearTimeout(fallback);
    };
  }, [phase, onRemove]);

  return (
    <div
      ref={nodeRef}
      className={'md-snackbar md-snackbar-' + toast.type + (phase === 'visible' ? ' is-visible' : '')}
    >
      <span className="md-snackbar-icon" aria-hidden="true">
        {ICONS[toast.type]}
      </span>
      <span className="md-snackbar-message">{toast.message}</span>
      <button
        type="button"
        className="md-snackbar-dismiss"
        aria-label="Dismiss"
        onClick={() => setPhase('exiting')}
      >
        {'✕'}
      </button>
    </div>
  );
}
