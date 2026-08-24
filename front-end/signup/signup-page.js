'use strict';

/**
 * signup-page.js
 * Patient self-registration portal with demographic validation and optional insurance policy capture.
 */
document.addEventListener('DOMContentLoaded', () => {
  const createButton = document.querySelector('.create-btn');
  const loginShortcut = document.querySelector('.login-shortcut');
  const orgSelect = document.getElementById('organization');

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

  loginShortcut?.addEventListener('click', () => {
    window.location.href = '../login/login-page.html';
  });

  // Organization Marketplace Resolver. Public endpoint. Preselects from ?org=<id>
  (async function loadOrganizations() {
    if (!orgSelect) return;
    const preselect = new URLSearchParams(window.location.search).get('org');
    try {
      const api = window.API || window.ApiClient;
      const organizations = await api.marketplace.organizations();
      orgSelect.innerHTML = (organizations || [])
        .map((org) => `<option value="${escape(org.organization_id)}">${escape(org.name)}</option>`)
        .join('');
      if (preselect && organizations.some((o) => String(o.organization_id) === preselect)) {
        orgSelect.value = preselect;
      }
    } catch (_) {
      orgSelect.innerHTML = '<option value="">Could not load hospitals — refresh to retry</option>';
      window.UIFeedback?.toast('Could not load the list of hospitals. Please refresh.', 'error');
    }
  })();

  createButton?.addEventListener('click', async () => {
    const firstName = valueOf('first-name');
    const lastName = valueOf('last-name');
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const dob = document.getElementById('dob')?.value || '';
    const gender = selectValue('gender');
    const email = valueOf('email').toLowerCase();
    const phone = valueOf('phone');
    const bloodGroup = selectValue('blood-group');
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirm-password')?.value || '';
    const provider = valueOf('provider');
    const coverageType = selectValue('coverage');
    const policyNumber = valueOf('policy-number');
    const memberId = valueOf('member-id');
    const validFrom = valueOf('valid-from');
    const validTo = valueOf('valid-to');
    const termsChecked = Boolean(
      document.querySelector(".terms-row input[type='checkbox']")?.checked,
    );

    const organizationId = orgSelect?.value ? Number(orgSelect.value) : null;

    if (
      !firstName ||
      !lastName ||
      !dob ||
      !gender ||
      !email ||
      !phone ||
      !password ||
      !organizationId
    ) {
      showToast(!organizationId ? 'Please choose a hospital to register with.' : 'Please fill in all required fields.', 'warn');
      return;
    }

    const dobDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(dobDate.getTime())) {
      showToast('Please enter a valid date of birth.', 'warn');
      return;
    }

    if (dobDate > today) {
      showToast('Date of Birth cannot be in the future.', 'warn');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.', 'warn');
      return;
    }

    if (!/^\+?[0-9\s\-]{8,15}$/.test(phone)) {
      showToast('Please enter a valid phone number.', 'warn');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warn');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please try again.', 'warn');
      return;
    }

    if (!termsChecked) {
      showToast(
        'You must agree to the Terms of Service and Privacy Policy to register.',
        'warn',
      );
      return;
    }

    createButton.disabled = true;
    const originalLabel = createButton.textContent;
    createButton.textContent = 'Creating account…';

    try {
      const result = await window.RoleAccess.signupPatient({
        name: fullName,
        email,
        password,
        phone,
        dob,
        gender,
        blood_group: bloodGroup || undefined,
        organization_id: organizationId,
      });

      // Optional insurance creation
      if (provider && policyNumber && memberId && validFrom && validTo) {
        try {
          const api = window.API || window.ApiClient;
          await api.patients.createInsurance({
            patient_id: result.patient.patient_id,
            provider_name: provider,
            policy_number: policyNumber,
            member_id: memberId,
            coverage_type: coverageType || 'Individual',
            valid_from: validFrom,
            valid_to: validTo,
          });
        } catch (insuranceErr) {
          console.warn('[Signup] Insurance could not be saved, continuing:', insuranceErr);
        }
      }

      createButton.textContent = 'Account Created';
      createButton.style.opacity = '0.8';

      showToast(
        `Account created. Your UHID is ${result.patient.uhid}.`,
        'success',
      );

      setTimeout(() => {
        window.location.href = '../Patient/patient-dashboard.html';
      }, 1400);
    } catch (err) {
      createButton.disabled = false;
      createButton.textContent = originalLabel;
      const message =
        err?.status === 409
          ? 'An account with this email already exists.'
          : err?.message || 'Could not create your account. Please try again.';
      showToast(message, 'warn');
    }
  });

  function valueOf(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  function selectValue(id) {
    const value = document.getElementById(id)?.value || '';
    return value.startsWith('Select ') ? '' : value.trim();
  }

  function showToast(message, type = 'info') {
    const mapped = type === 'warn' ? 'warning' : type;
    window.UIFeedback?.toast(message, mapped);
  }
});
