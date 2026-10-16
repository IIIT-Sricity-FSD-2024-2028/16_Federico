'use strict';

/**
 * Per-tab session store, ported from the session half of shared/api-client.js.
 *
 * The token lives in sessionStorage so several roles can be signed in at once
 * in different tabs (the legacy app's "multi-tab isolation"). Sibling tabs that
 * share the exact same token are logged out together over a BroadcastChannel.
 *
 * The legacy file announced changes with `window.dispatchEvent(new
 * Event('federicoSessionChanged'))`, which only Patient/js/patient-store.js
 * listened for. That becomes a plain subscriber list here, so nothing is
 * attached to window and React can subscribe with useSyncExternalStore.
 */
const SESSION_KEY = 'FedericoSession';
const AUTH_CHANNEL_NAME = 'federico_auth_channel';

const listeners = new Set();

/** Cached snapshot so useSyncExternalStore gets a stable reference. */
let snapshot = read();

function read() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[Session] Failed to read session from sessionStorage:', err);
    return null;
  }
}

function emit() {
  snapshot = read();
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Stable cached reference for useSyncExternalStore, which requires that
 * repeated calls return the identical object when nothing has changed.
 */
export function getSnapshot() {
  return snapshot;
}

/**
 * Reads through to sessionStorage on every call, exactly as the legacy
 * shared/api-client.js#getSession did. Returning the cached snapshot here
 * instead would go stale if anything ever wrote the key without going through
 * setSession/clearSession, and api/client.js consults this on every request.
 */
export function getSession() {
  return read();
}

export function setSession(session) {
  if (!session || typeof session !== 'object') {
    console.warn('[Session] Invalid session object passed to setSession');
    return;
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('[Session] Failed to persist session to sessionStorage:', err);
  }
  emit();
}

export function clearSession() {
  const existing = snapshot;
  const sessionToken = existing ? existing.token : null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn('[Session] Failed to remove session from sessionStorage:', err);
  }
  emit();

  if (authChannel && sessionToken) {
    try {
      authChannel.postMessage({ type: 'FEDERICO_LOGOUT', token: sessionToken });
    } catch (err) {
      console.warn('[Session] Failed to post logout to BroadcastChannel:', err);
    }
  }
}

const authChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(AUTH_CHANNEL_NAME) : null;

if (authChannel) {
  authChannel.onmessage = (ev) => {
    if (ev.data && ev.data.type === 'FEDERICO_LOGOUT' && ev.data.token) {
      const current = snapshot;
      if (current && current.token === ev.data.token) {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch (err) {
          console.warn('[Session] Failed to remove session on broadcast logout:', err);
        }
        emit();
        // The legacy code redirected here itself. RequireModule now notices the
        // cleared session on the next render and redirects, which is equivalent
        // and keeps navigation in one place.
      }
    }
  };
}
