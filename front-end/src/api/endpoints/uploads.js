'use strict';

import { API_BASE_URL, requestUpload, flattenUpload, openUploadedFile } from '../client.js';
import { request } from '../client.js';

export const uploads = {
  /**
   * The upload endpoints wrap file details under `file`. flattenUpload lifts
   * them so callers can read `.url` / `.originalName` / `.sizeBytes` directly,
   * which is the contract Admin branding, PRE insurance cards, HOM invoices and
   * Patient document attachments all already depend on.
   */
  document(file) {
    return requestUpload('/uploads/document', 'document', file).then(flattenUpload);
  },
  branding(file) {
    return requestUpload('/uploads/branding', 'logo', file).then(flattenUpload);
  },
  inventory(file) {
    return requestUpload('/uploads/inventory', 'invoice', file).then(flattenUpload);
  },
  /** Public, unauthenticated static URL - safe for direct <img src>. */
  staticUrl(category, filename) {
    return API_BASE_URL + '/uploads-static/' + category + '/' + filename;
  },
  /** Opens a session-gated upload (documents, invoices) in a new tab. */
  open(category, filename) {
    return openUploadedFile(category, filename);
  },
  logsStatus() {
    return request('GET', '/uploads/system/logs-status');
  },
};

