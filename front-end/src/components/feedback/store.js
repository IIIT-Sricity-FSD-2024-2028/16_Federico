'use strict';

import { store } from '../../store/store.js';
import { closeDialogState, dismissToast as dismissToastAction, openDialog, pushToast } from '../../store/slices/uiSlice.js';

/**
 * Redux-backed adapter for the imperative feedback API.
 *
 * shared/ui-feedback.js exposed toast/alert/confirm/selectOne as functions that
 * could be called from anywhere, and roughly 200 call sites across the app use
 * them that way. Keeping that signature means those call sites keep working
 * untouched. The functions only dispatch into state.ui (toasts, dialog);
 * <FeedbackHost> renders from there, so Redux is the single source of truth.
 *
 * The one thing that cannot live in the store is the Promise resolver of an
 * open dialog (a function), so it is parked here, keyed by the dialog's id.
 */
const dialogResolvers = new Map();
let nextToastId = 1;
let nextDialogId = 1;

const TOAST_TYPES = ['success', 'error', 'warning', 'info'];

/**
 * `type` falls back to 'info' for anything unrecognised - which is why
 * signup/org-signup.js passing 'warn' renders as info while
 * signup/signup-page.js maps 'warn' to 'warning' first. Defect D9, preserved.
 */
export function toast(message, type) {
  const id = nextToastId++;
  const safeType = TOAST_TYPES.includes(type) ? type : 'info';
  store.dispatch(pushToast({ id, message: String(message), type: safeType }));
  return { dismiss: () => dismissToast(id) };
}

export function dismissToast(id) {
  store.dispatch(dismissToastAction(id));
}

function showDialog(kind, options) {
  return new Promise((resolve) => {
    const id = nextDialogId++;
    dialogResolvers.set(id, resolve);
    store.dispatch(openDialog({ id, kind, options: options || {} }));
  });
}

export function closeDialog(result) {
  const current = store.getState().ui.dialog;
  store.dispatch(closeDialogState());
  if (current) {
    const resolve = dialogResolvers.get(current.id);
    dialogResolvers.delete(current.id);
    if (resolve) resolve(result);
  }
}

export function alert(options) {
  return showDialog('alert', options);
}

export function confirm(options) {
  return showDialog('confirm', options);
}

export function selectOne(options) {
  return showDialog('selectOne', options);
}
