'use strict';

/**
 * Backing store for the imperative feedback API.
 *
 * shared/ui-feedback.js exposed toast/alert/confirm/selectOne as functions that
 * could be called from anywhere, and roughly 200 call sites across the app use
 * them that way. Keeping that signature means those call sites port as a plain
 * import. The functions push into this store; <FeedbackHost> renders it.
 */
let state = { toasts: [], dialog: null };
const listeners = new Set();
let nextId = 1;

function emit(next) {
  state = next;
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot() {
  return state;
}

const TOAST_TYPES = ['success', 'error', 'warning', 'info'];

/**
 * `type` falls back to 'info' for anything unrecognised - which is why
 * signup/org-signup.js passing 'warn' renders as info while
 * signup/signup-page.js maps 'warn' to 'warning' first. Defect D9, preserved.
 */
export function toast(message, type) {
  const id = nextId++;
  const safeType = TOAST_TYPES.includes(type) ? type : 'info';
  emit({ ...state, toasts: [...state.toasts, { id, message: String(message), type: safeType }] });
  return { dismiss: () => dismissToast(id) };
}

export function dismissToast(id) {
  emit({ ...state, toasts: state.toasts.filter((t) => t.id !== id) });
}

function openDialog(kind, options) {
  return new Promise((resolve) => {
    emit({ ...state, dialog: { kind, options: options || {}, resolve } });
  });
}

export function closeDialog(result) {
  const current = state.dialog;
  emit({ ...state, dialog: null });
  if (current) current.resolve(result);
}

export function alert(options) {
  return openDialog('alert', options);
}

export function confirm(options) {
  return openDialog('confirm', options);
}

export function selectOne(options) {
  return openDialog('selectOne', options);
}

