'use strict';

/**
 * org-signup.js — Hospital Chain Self-Service Onboarding & Checkout.
 * Handles interactive 5-step registration wizard, plan selection,
 * dynamic pricing/tax calculations, payment processing, and instant tenant provisioning.
 */
document.addEventListener('DOMContentLoaded', function () {
  var currentStep = 1;
  var totalSteps = 5;

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

  var selectedPlan = {
    plan_id: 2,
    name: 'Professional',
    price: 14999,
  };

  var stepsNodes = document.querySelectorAll('.step-node');
  var progressFill = document.getElementById('progress-fill');

  // Load public plans from backend if available
  (async function loadAvailablePlans() {
    try {
      var api = window.API || window.ApiClient;
      var plans = await api.marketplace.plans();
      if (Array.isArray(plans) && plans.length > 0) {
        var container = document.getElementById('plan-selection-container');
        if (container) {
          container.innerHTML = plans.map(function (p) {
            var isSelected = p.plan_id === selectedPlan.plan_id ? 'selected' : '';
            var isPopular = p.name.toLowerCase().includes('pro') ? '<div class="plan-badge-popular">Most Popular</div>' : '';
            var modulesList = (p.included_modules || []).map(function (m) {
              return '<li>' + escape(m.toLowerCase().replace(/_/g, ' ')) + '</li>';
            }).join('');

            return (
              '<div class="plan-select-card ' + isSelected + '" data-plan-id="' + escape(p.plan_id) + '" data-price="' + escape(p.price_monthly) + '" data-name="' + escape(p.name) + '">' +
              isPopular +
              '<div class="plan-card-name">' + escape(p.name) + '</div>' +
              '<div class="plan-card-price">₹' + Number(p.price_monthly).toLocaleString('en-IN') + ' <small>/ month</small></div>' +
              '<ul class="plan-card-features">' +
              '<li>Up to ' + escape(p.max_beds) + ' Beds Quota</li>' +
              '<li>' + escape(p.max_users) + ' Staff Users</li>' +
              '<li>' + escape(p.max_hospitals) + ' Hospital Campus(es)</li>' +
              (modulesList || '<li>Standard administrative modules</li>') +
              '</ul>' +
              '</div>'
            );
          }).join('');

          attachPlanCardListeners();
        }
      }
    } catch (_) {
      attachPlanCardListeners();
    }
  })();

  function attachPlanCardListeners() {
    document.querySelectorAll('.plan-select-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('.plan-select-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        selectedPlan = {
          plan_id: Number(card.dataset.planId),
          name: card.dataset.name,
          price: Number(card.dataset.price),
        };
        updateCheckoutSummary();
      });
    });
  }
  attachPlanCardListeners();

  function updateStepUI(step) {
    currentStep = step;
    var percent = ((step - 1) / (totalSteps - 1)) * 100;
    if (progressFill) progressFill.style.width = percent + '%';

    stepsNodes.forEach(function (node) {
      var nodeStep = Number(node.dataset.step);
      node.classList.remove('active', 'completed');
      if (nodeStep === step) {
        node.classList.add('active');
      } else if (nodeStep < step) {
        node.classList.add('completed');
      }
    });

    document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.remove('active'); });
    var targetPanel = document.getElementById('panel-step-' + step);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  }

  function updateCheckoutSummary() {
    var orgName = document.getElementById('org-name')?.value.trim() || 'Your Hospital Chain';
    var summaryOrg = document.getElementById('summary-org-name');
    var summaryPlan = document.getElementById('summary-plan-name');
    var summaryPrice = document.getElementById('summary-plan-price');
    var summaryTax = document.getElementById('summary-tax');
    var summaryTotal = document.getElementById('summary-total');

    var price = selectedPlan.price || 14999;
    var tax = price * 0.18;
    var total = price + tax;

    if (summaryOrg) summaryOrg.textContent = orgName;
    if (summaryPlan) summaryPlan.textContent = selectedPlan.name + ' Tier';
    if (summaryPrice) summaryPrice.textContent = '₹' + price.toLocaleString('en-IN');
    if (summaryTax) summaryTax.textContent = '₹' + tax.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    if (summaryTotal) summaryTotal.textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  }

  // ---- Navigation Handlers ----
  document.getElementById('btn-next-1')?.addEventListener('click', function () {
    var name = document.getElementById('org-name')?.value.trim();
    var city = document.getElementById('org-city')?.value.trim();
    var phone = document.getElementById('org-phone')?.value.trim();

    if (!name || !city || !phone) {
      window.UIFeedback?.toast('Please fill in hospital name, city, and contact phone.', 'warn');
      return;
    }
    updateStepUI(2);
  });

  document.getElementById('btn-back-2')?.addEventListener('click', function () { updateStepUI(1); });
  document.getElementById('btn-next-2')?.addEventListener('click', function () { updateStepUI(3); });

  document.getElementById('btn-back-3')?.addEventListener('click', function () { updateStepUI(2); });
  document.getElementById('btn-next-3')?.addEventListener('click', function () {
    var checked = Array.from(document.querySelectorAll('input[name="module-code"]:checked'));
    if (checked.length === 0) {
      window.UIFeedback?.toast('Please select at least one module to enable.', 'warn');
      return;
    }
    updateStepUI(4);
  });

  document.getElementById('btn-back-4')?.addEventListener('click', function () { updateStepUI(3); });
  document.getElementById('btn-next-4')?.addEventListener('click', function () {
    var adminName = document.getElementById('admin-name')?.value.trim();
    var adminEmail = document.getElementById('admin-email')?.value.trim();
    var adminPassword = document.getElementById('admin-password')?.value || '';

    if (!adminName || !adminEmail || !adminPassword) {
      window.UIFeedback?.toast('Please complete all administrator account fields.', 'warn');
      return;
    }
    if (adminPassword.length < 6) {
      window.UIFeedback?.toast('Password must be at least 6 characters.', 'warn');
      return;
    }
    updateCheckoutSummary();
    updateStepUI(5);
  });

  document.getElementById('btn-back-5')?.addEventListener('click', function () { updateStepUI(4); });

  // Payment Method Tabs
  document.querySelectorAll('.payment-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.payment-tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var method = btn.dataset.method;
      document.getElementById('payment-fields-card').style.display = method === 'card' ? 'block' : 'none';
      document.getElementById('payment-fields-upi').style.display = method === 'upi' ? 'block' : 'none';
      document.getElementById('payment-fields-netbanking').style.display = method === 'netbanking' ? 'block' : 'none';
    });
  });

  // Form Submission
  var onboardingForm = document.getElementById('onboarding-form');
  onboardingForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    var submitBtn = document.getElementById('btn-pay-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Payment & Provisioning Tenant…';
    }

    var name = document.getElementById('org-name').value.trim();
    var city = document.getElementById('org-city').value.trim();
    var phone = document.getElementById('org-phone').value.trim();
    var address = document.getElementById('org-address').value.trim();
    var specialtiesStr = document.getElementById('org-specialties').value.trim();
    var specialties = specialtiesStr ? specialtiesStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : ['General Medicine'];
    var emergency_available = document.getElementById('org-emergency').checked;

    var modules = Array.from(document.querySelectorAll('input[name="module-code"]:checked')).map(function (el) { return el.value; });

    var adminName = document.getElementById('admin-name').value.trim();
    var adminEmail = document.getElementById('admin-email').value.trim();
    var adminPassword = document.getElementById('admin-password').value;

    var payload = {
      name: name,
      city: city,
      phone: phone,
      address: address,
      specialties: specialties,
      emergency_available: emergency_available,
      plan_id: selectedPlan.plan_id,
      modules: modules,
      admin_name: adminName,
      admin_email: adminEmail,
      admin_password: adminPassword,
      payment_reference: 'PAY_FED_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    };

    try {
      var api = window.API || window.ApiClient;
      var response = await api.marketplace.registerOrganization(payload);
      var provisioned = response.provisioned;

      // Show Success View
      document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.remove('active'); });
      var successPanel = document.getElementById('panel-step-success');
      successPanel.classList.add('active');

      var metaBox = document.getElementById('provisioned-meta-box');
      metaBox.innerHTML =
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem;">' +
        '<div><strong>Organization Name:</strong> ' + escape(provisioned.organization.name) + '</div>' +
        '<div><strong>Tenant Identifier:</strong> <code style="background:var(--md-surface-container);padding:2px 6px;border-radius:4px;">tenant_' + escape(provisioned.organization.organization_id) + '</code></div>' +
        '<div><strong>Primary Campus Branch:</strong> ' + escape(provisioned.hospital.name) + '</div>' +
        '<div><strong>Active Plan:</strong> ' + escape(selectedPlan.name) + ' Tier (₹' + Number(selectedPlan.price).toLocaleString('en-IN') + '/mo)</div>' +
        '<div><strong>Admin Account:</strong> ' + escape(provisioned.admin.email) + '</div>' +
        '<div><strong>Live API Gateway Key:</strong> <code style="background:var(--md-surface-container);padding:2px 6px;border-radius:4px;">' + escape(provisioned.apiKey ? provisioned.apiKey.key : 'fed_live_...') + '</code></div>' +
        '</div>' +
        '<div style="margin-top:14px; padding-top:10px; border-top:1px solid var(--md-outline-variant); font-size:0.85rem; color:var(--md-on-surface-variant);">' +
        'Enabled Services: ' + modules.map(function(m){ return '<strong>' + escape(m) + '</strong>'; }).join(', ') +
        '</div>';

      window.UIFeedback?.toast('Organization successfully created and provisioned!', 'success');

      document.getElementById('btn-launch-admin')?.addEventListener('click', function () {
        window.location.href = '../Admin/screen-01-dashboard.html';
      });

    } catch (err) {
      window.UIFeedback?.toast(err.message || 'Failed to register organization. Please check details and retry.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pay & Stand Up Workspace 🚀';
      }
    }
  });
});
