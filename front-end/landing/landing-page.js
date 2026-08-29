'use strict';

/**
 * landing-page.js
 * Landing page interactions — redirects to login, signup, and marketplace portals.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const orgSignupBtn = document.getElementById('org-signup-btn');
  const marketplaceBtn = document.getElementById('marketplace-btn');
  const platformBtn = document.getElementById('platform-btn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = '../login/login-page.html';
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      window.location.href = '../signup/signup-page.html';
    });
  }

  if (orgSignupBtn) {
    orgSignupBtn.addEventListener('click', () => {
      window.location.href = '../signup/org-signup.html';
    });
  }

  if (marketplaceBtn) {
    marketplaceBtn.addEventListener('click', () => {
      window.location.href = '../marketplace/marketplace-page.html';
    });
  }

  if (platformBtn) {
    platformBtn.addEventListener('click', () => {
      window.location.href = '../platform/platform-login.html';
    });
  }
});
