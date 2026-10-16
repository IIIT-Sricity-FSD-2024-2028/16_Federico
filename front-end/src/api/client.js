'use strict';

import { ApiError, extractMessage } from './errors.js';
import { getSession, clearSession } from './session.js';


export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location && window.location.port === '3000'
    ? window.location.origin
    : 'http://localhost:3000');

const REQUEST_TIMEOUT_MS = 15000;

function timeoutError(what) {
  return new ApiError(
    what + ' timed out after ' + REQUEST_TIMEOUT_MS / 1000 + 's. Please try again.',
    408,
  );
}

function offlineError() {
  return new ApiError('Cannot reach the server. Is the backend running on ' + API_BASE_URL + '?', 0);
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrap(data) {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data;
  }
  return data;
}

export async function request(method, path, body, opts = {}) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session && session.token && opts.auth !== false) {
    headers.Authorization = 'Bearer ' + session.token;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      credentials: 'include',
      body:
        method !== 'GET' && method !== 'HEAD' && body !== undefined && body !== null
          ? JSON.stringify(body)
          : undefined,
      signal: controller ? controller.signal : undefined,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') throw timeoutError('Request');
    throw offlineError();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const data = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) clearSession();
    throw new ApiError(extractMessage(res.status, res.statusText, data), res.status, data);
  }

  return unwrap(data);
}

/**
 * Multipart upload for /uploads/*. Separate from request() because it must NOT
 * set Content-Type - the browser has to generate the multipart boundary itself.
 */
export async function requestUpload(path, fieldName, file) {
  if (!file) throw new Error('No file selected.');
  const session = getSession();
  const headers = {};
  if (session && session.token) headers.Authorization = 'Bearer ' + session.token;

  const formData = new FormData();
  formData.append(fieldName, file);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      signal: controller ? controller.signal : undefined,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') throw timeoutError('Upload');
    throw offlineError();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const data = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new ApiError(extractMessage(res.status, res.statusText, data), res.status, data);
  }

  return unwrap(data);
}

/**
 * Upload responses nest the file details under `file`. Flatten them up so
 * callers can read `.url` / `.originalName` / `.sizeBytes` directly, which is
 * the contract several portals already rely on, without losing `.file`.
 */
export function flattenUpload(res) {
  if (res && typeof res === 'object' && res.file && typeof res.file === 'object') {
    return { ...res, ...res.file };
  }
  return res;
}

/**
 * Fetches a session-gated upload with the bearer token attached and opens it in
 * a new tab. Needed because a plain <a href> or <img src> cannot carry an
 * Authorization header.
 */
export async function openUploadedFile(category, filename) {
  const session = getSession();
  const headers = {};
  if (session && session.token) headers.Authorization = 'Bearer ' + session.token;

  const res = await fetch(
    API_BASE_URL + '/uploads/' + encodeURIComponent(category) + '/' + encodeURIComponent(filename),
    { headers, credentials: 'include' },
  );

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* not json; fall through to the status-based message */
    }
    throw new Error(extractMessage(res.status, res.statusText, data));
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

