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

  // Federico is billed per service used, not on a fixed tier. `selectedPlan`
  // is just the technical anchor plan the backend provisioning still keys
  // off; the real cost is estimated from the services picked in step 3.
  var selectedPlan = {
    plan_id: 1,
    name: 'Usage-based',
    price: 0,
  };

  // Monthly BASE price per service instance — mirrors
  // back-end/src/config/serviceCatalog.js.
  var SERVICE_PRICES = {
    APPOINTMENTS: 1500,
    ADMISSIONS: 2500,
    INVENTORY: 2000,
    BILLING: 2500,
    INSURANCE: 1800,
    ANALYTICS: 3000,
    DOCTOR: 1200,
    PATIENT: 1500,
    LEADERSHIP: 1000,
  };
  var SERVICE_LABELS = {
    APPOINTMENTS: 'Appointments Management',
    ADMISSIONS: 'Admissions & Bed Management',
    INVENTORY: 'Non-Clinical Inventory & Supplies',
    BILLING: 'Dynamic Billing & Invoicing',
    INSURANCE: 'Insurance Verification',
    ANALYTICS: 'Administrative Analytics',
    DOCTOR: 'Doctor Management',
    PATIENT: 'Patient Management',
    LEADERSHIP: 'Service Charge Approvals',
  };

  // Resource types per module — mirrors
  // back-end/src/config/resourceCatalog.js. { MODULE: [{ code, name, unit_price }] }.
  var RESOURCE_CATALOG = {
    ADMISSIONS: [
      { code: 'GENERAL_BEDS', name: 'General Ward Beds', unit_price: 150 },
      { code: 'ICU_BEDS', name: 'ICU Beds', unit_price: 600 },
      { code: 'PRIVATE_BEDS', name: 'Private Beds', unit_price: 400 },
      { code: 'SEMI_PRIVATE_BEDS', name: 'Semi-Private Beds', unit_price: 250 },
    ],
    INVENTORY: [
      { code: 'STORAGE_UNITS', name: 'Storage Units', unit_price: 200 },
      { code: 'WAREHOUSES', name: 'Warehouses', unit_price: 1200 },
      { code: 'INVENTORY_USERS', name: 'Inventory Users', unit_price: 300 },
    ],
    BILLING: [
      { code: 'BILLING_USERS', name: 'Billing Users', unit_price: 350 },
      { code: 'BILLING_TERMINALS', name: 'Billing Terminals', unit_price: 500 },
    ],
    DOCTOR: [
      { code: 'DOCTOR_SEATS', name: 'Doctor Directory Seats', unit_price: 120 },
    ],
    APPOINTMENTS: [
      { code: 'BOOKING_CHANNELS', name: 'Online Booking Channels', unit_price: 400 },
    ],
  };

  function resourceQtyFor(moduleCode, resourceCode) {
    var input = document.querySelector(
      '.module-resource-qty[data-module="' + moduleCode + '"][data-resource="' + resourceCode + '"]',
    );
    return Math.max(0, parseInt(input && input.value, 10) || 0);
  }

  // { MODULE: { RESOURCE: qty } } for the currently checked services.
  function selectedModuleResources() {
    var out = {};
    selectedModuleCodes().forEach(function (code) {
      var defs = RESOURCE_CATALOG[code];
      if (!defs) return;
      defs.forEach(function (def) {
        var qty = resourceQtyFor(code, def.code);
        if (qty > 0) {
          if (!out[code]) out[code] = {};
          out[code][def.code] = qty;
        }
      });
    });
    return out;
  }

  function resourceLinesFor(code) {
    var defs = RESOURCE_CATALOG[code];
    if (!defs) return [];
    return defs
      .map(function (def) {
        var qty = resourceQtyFor(code, def.code);
        return { code: def.code, label: def.name, qty: qty, unit: def.unit_price, amount: qty * def.unit_price };
      })
      .filter(function (l) { return l.qty > 0; });
  }
  var inr = function (n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); };

  function selectedModuleCodes() {
    return Array.from(document.querySelectorAll('input[name="module-code"]:checked')).map(function (el) { return el.value; });
  }

  // How many instances the operator wants of a given service (min 1).
  function instanceCountFor(code) {
    var input = document.querySelector('.module-instances[data-code="' + code + '"]');
    return Math.max(1, parseInt(input && input.value, 10) || 1);
  }

  // { CODE: count } for the currently checked services.
  function selectedModuleInstances() {
    var out = {};
    selectedModuleCodes().forEach(function (code) { out[code] = instanceCountFor(code); });
    return out;
  }

  function serviceLines() {
    return selectedModuleCodes().map(function (code) {
      var qty = instanceCountFor(code);
      var unit = SERVICE_PRICES[code] || 0;
      var base = unit * qty;
      var resLines = resourceLinesFor(code);
      var resTotal = resLines.reduce(function (s, l) { return s + l.amount; }, 0);
      return {
        code: code,
        label: SERVICE_LABELS[code] || code,
        qty: qty,
        unit: unit,
        base: base,
        resourceLines: resLines,
        resourceTotal: resTotal,
        amount: base + resTotal,
      };
    });
  }

  function estimatedMonthly() {
    return serviceLines().reduce(function (sum, l) { return sum + l.amount; }, 0);
  }

  // Inject a price line + an "Instances" number input into each service card
  // in step 3, so the operator sees exactly what each service costs and picks
  // how many instances of it to provision.
  function decorateModuleCards() {
    document.querySelectorAll('input[name="module-code"]').forEach(function (cb) {
      var code = cb.value;
      var card = cb.closest('.module-checkbox-card');
      if (!card || card.querySelector('.module-price-row')) return;
      var price = SERVICE_PRICES[code] || 0;

      var row = document.createElement('div');
      row.className = 'module-price-row';
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; font-size:13px;';
      row.innerHTML =
        '<span style="font-weight:600; color:var(--md-primary);">' + inr(price) + ' / month <span style="font-weight:400; color:var(--md-on-surface-variant);">per instance</span></span>' +
        '<span style="display:flex; align-items:center; gap:6px;">Instances' +
        '<input type="number" class="module-instances" data-code="' + code + '" min="1" value="1" ' +
        (cb.checked ? '' : 'disabled ') +
        'style="width:64px; padding:4px 6px; border:1px solid var(--md-outline-variant); border-radius:6px; font:inherit;" /></span>';
      // Sits next to the description, inside the card's text column.
      (card.querySelector('div') || card).appendChild(row);

      var qtyInput = row.querySelector('.module-instances');

      // Resource-type rows (beds / seats / terminals) for modules that
      // declare them — tasks.md §6/§7. Each is its own qty × unit price line.
      var defs = RESOURCE_CATALOG[code] || [];
      var resWrap = null;
      if (defs.length) {
        resWrap = document.createElement('div');
        resWrap.className = 'module-resource-rows';
        resWrap.style.cssText = 'margin-top:8px; padding-left:10px; border-left:2px solid var(--md-outline-variant); display:flex; flex-direction:column; gap:6px;';
        resWrap.innerHTML = defs.map(function (def) {
          return '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px;">' +
            '<span>' + def.name + ' <span style="color:var(--md-on-surface-variant);">(' + inr(def.unit_price) + '/mo each)</span></span>' +
            '<input type="number" class="module-resource-qty" data-module="' + code + '" data-resource="' + def.code + '" min="0" value="0" ' +
            (cb.checked ? '' : 'disabled ') +
            'style="width:64px; padding:4px 6px; border:1px solid var(--md-outline-variant); border-radius:6px; font:inherit;" /></div>';
        }).join('');
        (card.querySelector('div') || card).appendChild(resWrap);
        resWrap.querySelectorAll('.module-resource-qty').forEach(function (inp) {
          inp.addEventListener('input', updateCheckoutSummary);
          ['click', 'mousedown', 'keydown'].forEach(function (evt) {
            inp.addEventListener(evt, function (e) { e.stopPropagation(); });
          });
        });
      }

      cb.addEventListener('change', function () {
        qtyInput.disabled = !cb.checked;
        if (resWrap) {
          resWrap.querySelectorAll('.module-resource-qty').forEach(function (inp) { inp.disabled = !cb.checked; });
        }
        updateCheckoutSummary();
      });
      qtyInput.addEventListener('input', updateCheckoutSummary);
      // The input lives inside the card's <label>, so a bare click would
      // also toggle the checkbox — keep clicks/keys on the number field local.
      ['click', 'mousedown', 'keydown'].forEach(function (evt) {
        qtyInput.addEventListener(evt, function (e) { e.stopPropagation(); });
      });
    });
  }

  var stepsNodes = document.querySelectorAll('.step-node');
  var progressFill = document.getElementById('progress-fill');

  // Load public plans from backend if available
  (async function loadAvailablePlans() {
    try {
      var api = window.API || window.ApiClient;
      var plans = await api.marketplace.plans();
      if (Array.isArray(plans) && plans.length > 0) {
        // Usage-based billing: there is a single anchor plan. Point the
        // provisioning payload at whatever the backend actually offers.
        selectedPlan.plan_id = Number(plans[0].plan_id);
        selectedPlan.name = plans[0].name;
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

  function renderServiceBreakdown(container) {
    if (!container) return;
    var lines = serviceLines();
    if (!lines.length) {
      container.innerHTML = '<div style="color:var(--md-error, #b3261e); font-size:13px;">No services selected — pick at least one above.</div>';
      return;
    }
    container.innerHTML =
      lines.map(function (l) {
        var head = '<div style="display:flex; justify-content:space-between; gap:12px; padding:4px 0; font-size:13px;">' +
          '<span>' + l.label + ' <span style="color:var(--md-on-surface-variant);">(' + inr(l.unit) + ' × ' + l.qty + ')</span></span>' +
          '<strong>' + inr(l.base) + '/mo</strong></div>';
        var res = (l.resourceLines || []).map(function (r) {
          return '<div style="display:flex; justify-content:space-between; gap:12px; padding:2px 0 2px 14px; font-size:12px; color:var(--md-on-surface-variant);">' +
            '<span>' + r.label + ' (' + inr(r.unit) + ' × ' + r.qty + ')</span>' +
            '<span>' + inr(r.amount) + '/mo</span></div>';
        }).join('');
        return head + res;
      }).join('') +
      '<div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0 0; margin-top:6px; border-top:1px solid var(--md-outline-variant); font-weight:700;">' +
      '<span>Service subtotal</span><span>' + inr(estimatedMonthly()) + '/mo</span></div>';
  }

  function updateCheckoutSummary() {
    var orgName = document.getElementById('org-name')?.value.trim() || 'Your Hospital Chain';
    var summaryOrg = document.getElementById('summary-org-name');
    var summaryPlan = document.getElementById('summary-plan-name');
    var summaryPrice = document.getElementById('summary-plan-price');
    var summaryTax = document.getElementById('summary-tax');
    var summaryTotal = document.getElementById('summary-total');

    // Cost is the sum of (service price × instances) picked in step 3.
    var price = estimatedMonthly();
    var tax = price * 0.18;
    var total = price + tax;
    var lines = serviceLines();
    var totalInstances = lines.reduce(function (s, l) { return s + l.qty; }, 0);

    if (summaryOrg) summaryOrg.textContent = orgName;
    if (summaryPlan) {
      summaryPlan.textContent = 'Usage-based · ' + lines.length + ' service' + (lines.length === 1 ? '' : 's') + ' · ' + totalInstances + ' instance' + (totalInstances === 1 ? '' : 's');
    }
    if (summaryPrice) summaryPrice.textContent = '₹' + price.toLocaleString('en-IN');
    if (summaryTax) summaryTax.textContent = '₹' + tax.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    if (summaryTotal) summaryTotal.textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    renderServiceBreakdown(document.getElementById('step3-estimate'));
    renderServiceBreakdown(document.getElementById('summary-service-lines'));
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

  // Step 3: render per-service price + instance inputs, then keep the
  // running estimate in sync as services / counts change.
  decorateModuleCards();
  updateCheckoutSummary();

  document.getElementById('btn-back-3')?.addEventListener('click', function () { updateStepUI(2); });
  document.getElementById('btn-next-3')?.addEventListener('click', function () {
    var checked = Array.from(document.querySelectorAll('input[name="module-code"]:checked'));
    if (checked.length === 0) {
      window.UIFeedback?.toast('Select at least one service to enable.', 'warn');
      return;
    }
    var badQty = checked.some(function (cb) { return instanceCountFor(cb.value) < 1; });
    if (badQty) {
      window.UIFeedback?.toast('Each selected service needs at least 1 instance.', 'warn');
      return;
    }
    updateCheckoutSummary();
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

    var modules = selectedModuleCodes();
    var moduleInstances = selectedModuleInstances();
    var moduleResources = selectedModuleResources();

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
      module_instances: moduleInstances,
      module_resources: moduleResources,
      admin_name: adminName,
      admin_email: adminEmail,
      admin_password: adminPassword,
      payment_reference: 'PAY_FED_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    };

    try {
      var api = window.API || window.ApiClient;
      var response = await api.marketplace.registerOrganization(payload);
      var provisioned = response.provisioned;

      // The backend already authenticated the new org admin and returned a
      // session — persist it so the new organization is logged straight in
      // (previously it dropped the session and the admin bounced back to
      // the login screen and "couldn't log in themselves").
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
        '<div><strong>Primary Campus Branch:</strong> ' + escape(provisioned.hospital.name) + '</div>' +
        '<div><strong>Billing:</strong> Usage-based · ' + inr(estimatedMonthly()) + '/mo</div>' +
        '<div><strong>Admin Account:</strong> ' + escape(provisioned.admin.email) + '</div>' +
        '<div><strong>Live API Gateway Key:</strong> <code style="background:var(--md-surface-container);padding:2px 6px;border-radius:4px;">' + escape(provisioned.apiKey ? provisioned.apiKey.key : 'fed_live_...') + '</code></div>' +
        '</div>' +
        '<div style="margin-top:14px; padding-top:10px; border-top:1px solid var(--md-outline-variant); font-size:0.85rem; color:var(--md-on-surface-variant);">' +
        'Provisioned services: ' + serviceLines().map(function(l){ return '<strong>' + escape(l.label) + '</strong> ×' + l.qty + ' (' + inr(l.amount) + '/mo)'; }).join(' &nbsp;·&nbsp; ') +
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
