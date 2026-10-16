'use strict';

import { useEffect, useId, useRef, useState } from 'react';

const EXIT_MS = 300;

/**
 * One Material dialog, covering all three legacy modes (alert / confirm /
 * selectOne). Escape resolves the same way each mode's cancel path does, and
 * focus lands on the last action on open, both as in shared/ui-feedback.js.
 */
export default function Dialog({ kind, options, onClose }) {
  const [visible, setVisible] = useState(false);
  const actionsRef = useRef(null);
  const choicesRef = useRef(null);
  const closingRef = useRef(false);

  const cancelResult = kind === 'confirm' ? false : kind === 'selectOne' ? null : undefined;

  function close(result) {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(() => onClose(result), EXIT_MS);
  }

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setVisible(true);
        const first = choicesRef.current && choicesRef.current.querySelector('button');
        if (first) first.focus();
        else if (actionsRef.current && actionsRef.current.lastElementChild) {
          actionsRef.current.lastElementChild.focus();
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    function onKeydown(e) {
      if (e.key === 'Escape') close(cancelResult);
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });

  const titleId = 'md-dialog-title-' + useId();

  return (
    <div className={'md-dialog-scrim' + (visible ? ' is-visible' : '')}>
      <div className="md-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="md-dialog-title" id={titleId}>
          {options.title || ''}
        </div>

        {kind === 'selectOne' ? (
          options.body ? <div className="md-dialog-body">{options.body}</div> : null
        ) : (
          <div className="md-dialog-body">{options.body || ''}</div>
        )}

        {kind === 'selectOne' ? (
          <div className="md-dialog-choices" ref={choicesRef}>
            {(options.options || []).map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt : opt.label;
              return (
                <button
                  key={String(value)}
                  type="button"
                  className="md-chip md-dialog-choice"
                  onClick={() => close(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="md-dialog-actions" ref={actionsRef}>
          {kind === 'confirm' ? (
            <>
              <button
                type="button"
                className="md-btn md-btn-text"
                onClick={() => close(false)}
              >
                {options.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={'md-btn ' + (options.danger ? 'md-btn-danger' : 'md-btn-filled')}
                onClick={() => close(true)}
              >
                {options.confirmLabel || 'Confirm'}
              </button>
            </>
          ) : kind === 'selectOne' ? (
            <button type="button" className="md-btn md-btn-text" onClick={() => close(null)}>
              {options.cancelLabel || 'Cancel'}
            </button>
          ) : (
            <button
              type="button"
              className="md-btn md-btn-filled"
              onClick={() => close(undefined)}
            >
              {options.confirmLabel || 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

