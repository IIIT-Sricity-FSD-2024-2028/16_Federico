'use strict';

/**
 * Error shape ported from shared/api-client.js. Call sites across the app read
 * `err.status` (0 = unreachable, 408 = timeout) and `err.message`, and a few
 * read `err.data`, so all three are preserved.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Verbatim port of shared/api-client.js#extractMessage. The unwrap order
 * matters: the backend sends validation failures as `{ message: string[] }`
 * and everything else as `{ message: string }`.
 */
export function extractMessage(status, statusText, data) {
  if (data) {
    if (data.error && data.error.message) return data.error.message;
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (data.message) return data.message;
  }
  return status + ' ' + statusText;
}
