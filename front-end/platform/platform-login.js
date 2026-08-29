'use strict';

/**
 * platform-login.js — Platform Super User sign-in.
 */
(function () {
  var form = document.getElementById('platform-login-form');
  var submitBtn = document.getElementById('submit-btn');

  var api = window.API || window.ApiClient;

  // Already signed in as platform? Skip straight to the dashboard.
  var existing = api.getSession();
  if (existing && existing.isPlatformUser) {
    window.location.href = 'platform-dashboard.html';
    return;
  }

  // Click the demo-credentials hint to autofill the form.
  document.getElementById('platform-demo-cred')?.addEventListener('click', function () {
    var e = document.getElementById('email');
    var p = document.getElementById('password');
    if (e) e.value = 'platform@federico.com';
    if (p) p.value = 'Federico@Platform123';
  });

  form?.addEventListener('submit', async function (event) {
    event.preventDefault();
    var email = document.getElementById('email')?.value?.trim();
    var password = document.getElementById('password')?.value;

    if (!email || !password) {
      window.UIFeedback?.toast('Please enter both email and password.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
    }

    try {
      var result = await api.platform.auth.login(email, password);
      api.setSession({
        token: result.token,
        actor: 'PLATFORM',
        role: 'PLATFORM',
        isPlatformUser: true,
        displayName: result.user.name,
        email: result.user.email,
        platformUserId: result.user.platform_user_id,
      });
      window.location.href = 'platform-dashboard.html';
    } catch (err) {
      window.UIFeedback?.toast(err.status === 401 ? 'Invalid email or password.' : (err.message || 'Login failed.'), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  });
})();
