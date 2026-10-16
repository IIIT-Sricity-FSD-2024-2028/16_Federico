'use strict';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Replaces HOM/hom-helpers.js#openModal / closeModals and the Patient portal's
 * separate open/close pair.
 *
 * The legacy helper physically moved the modal node to document.body to escape
 * stacking contexts; a portal does the same thing without touching the DOM
 * tree the page owns. Backdrop click and Escape both close, as before, and the
 * wheel-over-backdrop scroll block is preserved.
 */
export default function Modal({ open, onClose, children, className = '', labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeydown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={['modal-overlay', 'active', className].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {children}
    </div>,
    document.body,
  );
}

