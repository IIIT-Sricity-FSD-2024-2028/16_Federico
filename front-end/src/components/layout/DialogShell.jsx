'use strict';

import Modal from './Modal.jsx';
import '../css/dialog-shell.css';

/**
 * Standard modal window shell for dialogs and popups.
 */
export default function DialogShell({
  open = true,
  onClose,
  title,
  subtitle,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  footer,
  children,
  className = '',
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <div className={['dialog-shell-container', `size-${size}`, className].filter(Boolean).join(' ')}>
        <div className="dialog-shell-header">
          <div className="dialog-shell-header-text">
            <h2 className="dialog-shell-title">{title}</h2>
            {subtitle ? <p className="dialog-shell-subtitle">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              className="dialog-shell-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              &times;
            </button>
          ) : null}
        </div>

        <div className="dialog-shell-body">
          {children}
        </div>

        {footer ? (
          <div className="dialog-shell-footer">
            {footer}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
