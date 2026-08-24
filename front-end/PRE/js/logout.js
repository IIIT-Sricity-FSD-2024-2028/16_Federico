'use strict';

/**
 * PRE/js/logout.js — Operator sign-out handler.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.logout')?.addEventListener('click', async () => {
    try {
      const api = window.API || window.ApiClient;
      if (api && api.auth && typeof api.auth.logout === 'function') {
        await api.auth.logout();
      }
    } catch (_) {}
    window.location.href = '../../login/login-page.html';
  });
});
