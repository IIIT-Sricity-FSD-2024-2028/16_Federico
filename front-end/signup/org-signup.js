'use strict';

/**
 * org-signup.js — Hospital Chain Self-Service Onboarding & Pay-As-You-Scale Checkout.
 * Handles interactive 4-step registration wizard, live resource pricing calculation,
 * 18% GST itemization, and instant multi-tenant workspace provisioning.
 */
document.addEventListener('DOMContentLoaded', function () {
  var currentStep = 1;
  var totalSteps = 4;

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

  var inr = function (n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  };

  // Base platform rate & unit price catalog
  var BASE_PLATFORM_FEE = 3000;
  var RATES = {
    GENERAL_BEDS: 150,
    ICU_BEDS: 600,
    PRIVATE_BEDS: 350,
    DOCTOR_SEATS: 150,
    STAFF_SEATS: 200,
    BILLING_TERMINALS: 500,
    WAREHOUSES: 1000,
    PATIENT_ADMISSIONS: 10,
  };

  function getQty(id) {
    var el = document.getElementById(id);
    return Math.max(0, parseInt(el && el.value, 10) || 0);
  }

  function calculateCosts() {
    var genBeds = getQty('res-general-beds');
    var icuBeds = getQty('res-icu-beds');
    var privBeds = getQty('res-private-beds');
    var docSeats = getQty('res-doctor-seats');
    var staffSeats = getQty('res-staff-seats');
    var terminals = getQty('res-terminals');
    var warehouses = getQty('res-warehouses');
    var admissions = getQty('res-patient-admissions');

    var genCost = genBeds * RATES.GENERAL_BEDS;
    var icuCost = icuBeds * RATES.ICU_BEDS;
    var privCost = privBeds * RATES.PRIVATE_BEDS;
    var docCost = docSeats * RATES.DOCTOR_SEATS;
    var staffCost = staffSeats * RATES.STAFF_SEATS;
    var termCost = terminals * RATES.BILLING_TERMINALS;
    var whCost = warehouses * RATES.WAREHOUSES;
    var admCost = admissions * RATES.PATIENT_ADMISSIONS;

    var resourceSubtotal = genCost + icuCost + privCost + docCost + staffCost + termCost + whCost + admCost;
    var subtotal = BASE_PLATFORM_FEE + resourceSubtotal;
    var gst = Math.round(subtotal * 0.18);
    var total = subtotal + gst;

    return {
      genBeds: genBeds, genCost: genCost,
      icuBeds: icuBeds, icuCost: icuCost,
      privBeds: privBeds, privCost: privCost,
      docSeats: docSeats, docCost: docCost,
      staffSeats: staffSeats, staffCost: staffCost,
      terminals: terminals, termCost: termCost,
      warehouses: warehouses, whCost: whCost,
      admissions: admissions, admCost: admCost,
      baseFee: BASE_PLATFORM_FEE,
      resourceSubtotal: resourceSubtotal,
      subtotal: subtotal,
      gst: gst,
      total: total,
    };
  }

  function updateLivePricing() {
    var c = calculateCosts();

    var setTxt = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = inr(val);
    };

    setTxt('cost-general-beds', c.genCost);
    setTxt('cost-icu-beds', c.icuCost);
    setTxt('cost-private-beds', c.privCost);
    setTxt('cost-doctor-seats', c.docCost);
    setTxt('cost-staff-seats', c.staffCost);
    setTxt('cost-terminals', c.termCost);
    setTxt('cost-warehouses', c.whCost);
    setTxt('cost-patient-admissions', c.admCost);

    var liveTotal = document.getElementById('live-total-price');
    if (liveTotal) liveTotal.textContent = inr(c.total) + '/mo';

    var liveTax = document.getElementById('live-subtotal-tax');
    if (liveTax) liveTax.textContent = 'Subtotal: ' + inr(c.subtotal) + ' + GST (18%): ' + inr(c.gst);
  }

  // Attach live pricing listener to all resource inputs
  document.querySelectorAll('.resource-input').forEach(function (input) {
    input.addEventListener('input', updateLivePricing);
    input.addEventListener('change', updateLivePricing);
  });
  updateLivePricing();

  // Dynamically load live platform rates from Super User rate card
  if (window.ApiClient && window.ApiClient.platform && window.ApiClient.platform.rates) {
    window.ApiClient.platform.rates.get().then(function (res) {
      if (res && res.rates) {
        if (typeof res.base_fee === 'number') BASE_PLATFORM_FEE = res.base_fee;
        Object.assign(RATES, res.rates);
        updateLivePricing();
      }
    }).catch(function () {});
  }

  // Stepper UI Navigation
  function updateStepUI(step) {
    currentStep = step;
    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = ((step - 1) / (totalSteps - 1)) * 100 + '%';

    document.querySelectorAll('.step-node').forEach(function (node) {
      var s = parseInt(node.dataset.step, 10);
      node.classList.toggle('active', s === step);
      node.classList.toggle('completed', s < step);
    });

    document.querySelectorAll('.step-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    var target = document.getElementById('panel-step-' + step);
    if (target) target.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateCheckoutSummary() {
    var c = calculateCosts();
    var orgName = document.getElementById('org-name')?.value.trim() || 'Hospital Network';
    var summaryOrg = document.getElementById('summary-org-name');
    if (summaryOrg) summaryOrg.textContent = orgName;

    var breakdown = document.getElementById('summary-resource-breakdown');
    if (breakdown) {
      breakdown.innerHTML =
        '<div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Base Platform License (All 8 Modules)</span><strong>' + inr(c.baseFee) + '</strong></div>' +
        '<div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--md-on-surface-variant);"><span>Inpatient Beds (' + (c.genBeds + c.icuBeds + c.privBeds) + ' total)</span><span>' + inr(c.genCost + c.icuCost + c.privCost) + '</span></div>' +
        '<div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--md-on-surface-variant);"><span>Staff & Doctor Directory (' + (c.docSeats + c.staffSeats) + ' seats)</span><span>' + inr(c.docCost + c.staffCost) + '</span></div>' +
        '<div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--md-on-surface-variant);"><span>Hardware & Warehouses (' + (c.terminals + c.warehouses) + ' units)</span><span>' + inr(c.termCost + c.whCost) + '</span></div>' +
        '<div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--md-on-surface-variant);"><span>Patient Volume Usage (~' + c.admissions + ' admissions)</span><span>' + inr(c.admCost) + '</span></div>';
    }

    var planPrice = document.getElementById('summary-plan-price');
    if (planPrice) planPrice.textContent = inr(c.subtotal);

    var taxEl = document.getElementById('summary-tax');
    if (taxEl) taxEl.textContent = inr(c.gst);

    var totalEl = document.getElementById('summary-total');
    if (totalEl) totalEl.textContent = inr(c.total);
  }

  // Step 1 -> Step 2
  document.getElementById('btn-next-1')?.addEventListener('click', function () {
    var name = document.getElementById('org-name')?.value.trim();
    var city = document.getElementById('org-city')?.value.trim();
    var phone = document.getElementById('org-phone')?.value.trim();
    if (!name || !city || !phone) {
      window.UIFeedback?.toast('Please fill in required hospital details (Name, City, Phone).', 'warn');
      return;
    }
    updateLivePricing();
    updateStepUI(2);
  });

  // Step 2 -> Step 3
  document.getElementById('btn-back-2')?.addEventListener('click', function () {
    updateStepUI(1);
  });
  document.getElementById('btn-next-2')?.addEventListener('click', function () {
    updateStepUI(3);
  });

  // Step 3 -> Step 4
  document.getElementById('btn-back-3')?.addEventListener('click', function () {
    updateStepUI(2);
  });
  document.getElementById('btn-next-3')?.addEventListener('click', function () {
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
    updateStepUI(4);
  });

  // Step 4 Back
  document.getElementById('btn-back-4')?.addEventListener('click', function () {
    updateStepUI(3);
  });

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

  // Form Submission & Provisioning
  var onboardingForm = document.getElementById('onboarding-form');
  onboardingForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    var submitBtn = document.getElementById('btn-pay-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Provisioning Multi-Tenant Cloud Workspace…';
    }

    var name = document.getElementById('org-name').value.trim();
    var city = document.getElementById('org-city').value.trim();
    var phone = document.getElementById('org-phone').value.trim();
    var address = document.getElementById('org-address').value.trim();
    var specialtiesStr = document.getElementById('org-specialties').value.trim();
    var specialties = specialtiesStr
      ? specialtiesStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      : ['General Medicine'];
    var emergency_available = document.getElementById('org-emergency').checked;

    var costs = calculateCosts();

    var adminName = document.getElementById('admin-name').value.trim();
    var adminEmail = document.getElementById('admin-email').value.trim();
    var adminPassword = document.getElementById('admin-password').value;

    var allModules = [
      'APPOINTMENTS',
      'ADMISSIONS',
      'INVENTORY',
      'BILLING',
      'INSURANCE',
      'ANALYTICS',
      'DOCTOR',
      'PATIENT',
      'LEADERSHIP',
    ];

    var payload = {
      name: name,
      city: city,
      phone: phone,
      address: address,
      specialties: specialties,
      emergency_available: emergency_available,
      plan_id: 1, // Usage-based anchor
      modules: allModules,
      module_instances: {
        APPOINTMENTS: 1,
        ADMISSIONS: 1,
        INVENTORY: 1,
        BILLING: 1,
        INSURANCE: 1,
        ANALYTICS: 1,
        DOCTOR: 1,
        PATIENT: 1,
        LEADERSHIP: 1,
      },
      module_resources: {
        ADMISSIONS: {
          GENERAL_BEDS: costs.genBeds,
          ICU_BEDS: costs.icuBeds,
          PRIVATE_BEDS: costs.privBeds,
        },
        DOCTOR: {
          DOCTOR_SEATS: costs.docSeats,
        },
        BILLING: {
          BILLING_TERMINALS: costs.terminals,
          STAFF_SEATS: costs.staffSeats,
        },
        INVENTORY: {
          WAREHOUSES: costs.warehouses,
        },
        PATIENT: {
          PATIENT_ADMISSIONS: costs.admissions,
        },
      },
      admin_name: adminName,
      admin_email: adminEmail,
      admin_password: adminPassword,
      payment_reference: 'PAY_FED_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    };

    try {
      var api = window.API || window.ApiClient;
      var response = await api.marketplace.registerOrganization(payload);
      var provisioned = response.provisioned;

      var sess = response.session;
      if (sess && sess.token && api && typeof api.setSession === 'function') {
        api.setSession({
          token: sess.token,
          actor: 'Admin',
          role: 'ORG_ADMIN',
          userId: sess.user ? sess.user.user_id : null,
          displayName: sess.user ? sess.user.name : adminName,
          email: sess.user ? sess.user.email : adminEmail,
          tenant: sess.tenant || null,
        });
      }

      // Show Success View
      document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.remove('active'); });
      var successPanel = document.getElementById('panel-step-success');
      successPanel.classList.add('active');

      var metaBox = document.getElementById('provisioned-meta-box');
      metaBox.innerHTML =
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem;">' +
        '<div><strong>Organization Name:</strong> ' + escape(provisioned.organization.name) + '</div>' +
        '<div><strong>Tenant Identifier:</strong> <code style="background:var(--md-surface-container);padding:2px 6px;border-radius:4px;">tenant_' + escape(provisioned.organization.organization_id) + '</code></div>' +
        '<div><strong>Primary Campus:</strong> ' + escape(provisioned.hospital.name) + '</div>' +
        '<div><strong>Monthly Rate:</strong> ' + inr(costs.total) + ' (Incl. GST)</div>' +
        '<div><strong>Administrator:</strong> ' + escape(provisioned.admin.email) + '</div>' +
        '<div><strong>API Gateway Key:</strong> <code style="background:var(--md-surface-container);padding:2px 6px;border-radius:4px;">' + escape(provisioned.apiKey ? provisioned.apiKey.key : 'fed_live_...') + '</code></div>' +
        '</div>' +
        '<div style="margin-top:14px; padding-top:10px; border-top:1px solid var(--md-outline-variant); font-size:0.85rem; color:var(--md-on-surface-variant);">' +
        'Provisioned Scale: ' + (costs.genBeds + costs.icuBeds + costs.privBeds) + ' Beds · ' + costs.docSeats + ' Doctor Directory Seats · ' + costs.staffSeats + ' Staff Accounts · ' + costs.terminals + ' Terminals' +
        '</div>';

      window.UIFeedback?.toast('Organization workspace successfully activated!', 'success');

      document.getElementById('btn-launch-admin')?.addEventListener('click', function () {
        window.location.href = '../Admin/screen-01-dashboard.html';
      });

    } catch (err) {
      window.UIFeedback?.toast(err.message || 'Failed to register organization. Please check details and retry.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Onboarding & Launch Workspace';
      }
    }
  });
});
