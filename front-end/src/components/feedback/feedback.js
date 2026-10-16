'use strict';

/**
 * The public feedback API, matching window.UIFeedback's surface exactly:
 *   toast(message, type)                      type: success|error|warning|info
 *   alert({ title, body, confirmLabel })      -> Promise<void>
 *   confirm({ title, body, confirmLabel, cancelLabel, danger }) -> Promise<boolean>
 *   selectOne({ title, body, options, cancelLabel })            -> Promise<value|null>
 */
export { toast, alert, confirm, selectOne } from './store.js';

