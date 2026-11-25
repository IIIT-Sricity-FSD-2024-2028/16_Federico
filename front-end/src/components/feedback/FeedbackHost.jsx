'use strict';

import { createPortal } from 'react-dom';
import { useAppSelector } from '../../store/hooks.js';
import { selectDialog, selectToasts } from '../../store/slices/uiSlice.js';
import { dismissToast, closeDialog } from './store.js';
import Toast from './Toast.jsx';
import Dialog from './Dialog.jsx';

/**
 * Mounted once in App.jsx. Replaces the document-level singletons
 * shared/ui-feedback.js created on demand (.md-snackbar-region and each
 * .md-dialog-scrim), rendered through a portal so they sit on the viewport
 * rather than inside whatever card happened to trigger them.
 */
export default function FeedbackHost() {
  const toasts = useAppSelector(selectToasts);
  const dialog = useAppSelector(selectDialog);

  return createPortal(
    <>
      <div className="md-snackbar-region" aria-live="polite" role="status">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={() => dismissToast(t.id)} />
        ))}
      </div>
      {dialog ? (
        <Dialog key={dialog.id} kind={dialog.kind} options={dialog.options} onClose={closeDialog} />
      ) : null}
    </>,
    document.body,
  );
}
