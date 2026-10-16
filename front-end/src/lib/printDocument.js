'use strict';

/**
 * One wrapper for the six window.open() + document.write() printable documents
 * the legacy app produced (Patient dashboard digital copy, Patient invoice and
 * receipt copies, FA discharge summary, FA discharge+billing summary, FA
 * receipt).
 *
 * The HTML strings stay byte-identical to the originals and live at their call
 * sites, including the two that embed a <script> auto-calling window.print().
 * This is the one place in src/ where document.write and raw HTML are expected:
 * the target is a separate about:blank document that Vite never processes.
 *
 * Returns the window, or null if the popup was blocked - callers surface their
 * own "please allow popups" message, exactly as before.
 */
export function openPrintWindow(html) {
  const win = window.open('', '_blank');
  if (!win) return null;
  win.document.write(html);
  win.document.close();
  return win;
}

