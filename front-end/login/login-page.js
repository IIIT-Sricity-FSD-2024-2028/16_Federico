'use strict';

/**
 * login-page.js
 * Multi-role authentication interface with dynamic tenant selection and demo helper.
 */
document.addEventListener('DOMContentLoaded', () => {
  const roleTabs = document.querySelectorAll('.role-tab');
  const loginForm = document.getElementById('login-form');
  const helperBox = document.getElementById('login-credential-helper');
  const errorBox = document.getElementById('login-error');
  const orgSelect = document.getElementById('organization');
  const rememberCheckbox = document.getElementById('remember-me');
  const emailInput = document.getElementById('email');
  const submitButton = loginForm?.querySelector("button[type='submit'], .login-submit");

  function escape(str) {
    if (window.Formatters && typeof window.Formatters.escapeHtml === 'function') {
      return window.Formatters.escapeHtml(str);
    }
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Restore Remembered Credentials on Load
  (function restoreRememberMe() {
    try {
      const saved = localStorage.getItem('FedericoRememberMe');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.email && emailInput) {
        emailInput.value = data.email;
      }
      if (rememberCheckbox) {
        rememberCheckbox.checked = true;
      }
      if (data.role) {
        roleTabs.forEach((tab) => {
          if (tab.textContent.trim().toLowerCase() === data.role.toLowerCase()) {
            roleTabs.forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
          }
        });
      }
    } catch (_) {}
  })();

  // Organization Marketplace Resolver. Public endpoint. Preselects from ?org=<id> or RememberMe
  (async function loadOrganizations() {
    if (!orgSelect) return;
    const preselect = new URLSearchParams(window.location.search).get('org');
    let rememberedOrgId = null;
    try {
      const saved = localStorage.getItem('FedericoRememberMe');
      if (saved) rememberedOrgId = JSON.parse(saved).orgId;
    } catch (_) {}

    try {
      const api = window.API || window.ApiClient;
      const organizations = await api.marketplace.organizations();
      orgSelect.innerHTML = (organizations || [])
        .map((org) => `<option value="${escape(org.organization_id)}">${escape(org.name)}</option>`)
        .join('');

      if (preselect && organizations.some((o) => String(o.organization_id) === preselect)) {
        orgSelect.value = preselect;
      } else if (rememberedOrgId && organizations.some((o) => String(o.organization_id) === String(rememberedOrgId))) {
        orgSelect.value = String(rememberedOrgId);
      }

      renderCredentialHelper(document.querySelector('.role-tab.active')?.textContent.trim() || 'Patient');
    } catch (_) {
      orgSelect.innerHTML = '<option value="">Could not load hospitals — refresh to retry</option>';
      window.UIFeedback?.toast('Could not load the list of hospitals. Please refresh.', 'error');
    }
  })();

  orgSelect?.addEventListener('change', () => {
    renderCredentialHelper(document.querySelector('.role-tab.active')?.textContent.trim() || 'Patient');
  });

  function renderCredentialHelper(role) {
    const organizationId = orgSelect?.value ? Number(orgSelect.value) : 1;
    const orgAccounts = window.RoleAccess?.mockAccountsFor?.(organizationId);
    const accounts = orgAccounts?.[role] || [];
    if (!helperBox) return;

    if (accounts.length === 0) {
      helperBox.innerHTML = `
        <div style="padding: 10px 12px; font-size: 12px; color: var(--md-on-surface-variant); text-align: center; background: var(--md-surface); border-radius: var(--radius-sm); border-left: 3px solid var(--md-outline-variant);">
          No pre-configured demo users for this hospital. Please sign in with your registered account.
        </div>
      `;
      return;
    }

    helperBox.innerHTML = accounts
      .map(
        (account) => `
            <div class="demo-credential-row" style="cursor: pointer;" title="Click to fill credentials">
                <strong>${escape(account.displayName)}</strong>
                <span>${escape(account.email)}</span>
                <code>${escape(account.password)}</code>
            </div>
        `,
      )
      .join('');

    helperBox.classList.remove('md-fade-switch');
    void helperBox.offsetWidth;
    helperBox.classList.add('md-fade-switch');
  }

  // Click-to-autofill: clicking any demo credential row automatically populates the form
  helperBox?.addEventListener('click', (event) => {
    const row = event.target.closest('.demo-credential-row');
    if (!row) return;
    const emailSpan = row.querySelector('span');
    const pwdCode = row.querySelector('code');
    const emailInput = document.getElementById('email');
    const pwdInput = document.getElementById('password');
    if (emailSpan && emailInput) emailInput.value = emailSpan.textContent.trim();
    if (pwdCode && pwdInput) pwdInput.value = pwdCode.textContent.trim();
    clearError();
    window.UIFeedback?.toast('Demo credentials copied to form', 'info');
  });

  function clearError() {
    if (errorBox) errorBox.textContent = '';
  }

  function showError(message) {
    if (errorBox) errorBox.textContent = message;
  }

  // 1. Handle Tab Switching
  roleTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      roleTabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      clearError();
      renderCredentialHelper(tab.textContent.trim());
    });
  });

  async function handleLogin() {
    const emailInput = document.getElementById('email')?.value?.trim();
    const passwordInput = document.getElementById('password')?.value;

    if (!emailInput || !passwordInput) {
      showError('Enter both email and password.');
      return;
    }

    const activeRole = document
      .querySelector('.role-tab.active')
      ?.textContent?.trim() || 'Patient';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
      submitButton.textContent = 'Signing in…';
    }

    const organizationId = orgSelect?.value ? Number(orgSelect.value) : null;

    try {
      const authResult = await window.RoleAccess?.authenticate(
        activeRole,
        emailInput,
        passwordInput,
        organizationId,
      );
      if (!authResult) {
        showError(window.RoleAccess?.lastAuthError || `Invalid ${activeRole} credentials.`);
        return;
      }
      clearError();

      // Save or clear Remember Me preferences
      try {
        if (rememberCheckbox?.checked) {
          localStorage.setItem(
            'FedericoRememberMe',
            JSON.stringify({
              email: emailInput,
              orgId: organizationId,
              role: activeRole,
            }),
          );
        } else {
          localStorage.removeItem('FedericoRememberMe');
        }
      } catch (_) {}

      // Route to role portal
      if (activeRole === 'Patient') {
        window.location.href = '../Patient/patient-dashboard.html';
      } else if (activeRole === 'PRE') {
        window.location.href = '../PRE/pages/PRE.html';
      } else if (activeRole === 'HOM') {
        window.location.href = '../HOM/screen-01-dashboard.html';
      } else if (activeRole === 'FA') {
        window.location.href = '../FA/fa-dashboard.html';
      } else if (activeRole === 'Admin') {
        window.location.href = '../Admin/screen-01-dashboard.html';
      }
    } catch (err) {
      showError(err?.status === 0 ? err.message : 'Something went wrong. Please try again.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText;
      }
    }
  }

  // 2. Form submission
  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin();
  });

  renderCredentialHelper('Patient');
});
