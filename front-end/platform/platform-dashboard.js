/**
 * platform-dashboard.js — Platform Super User portal.
 * Single page, tab-switched sections (Overview / Organizations / Rates),
 * native <dialog> elements for provisioning/detail. Talks
 * exclusively to Api.platform.* (back-end/src/routes/platform.routes.js).
 */
(function () {
  var MODULE_CATALOG = [
    { code: "APPOINTMENTS", name: "Appointments" },
    { code: "ADMISSIONS", name: "Admissions & Bed Management" },
    { code: "INVENTORY", name: "Inventory & Procurement" },
    { code: "BILLING", name: "Billing" },
    { code: "INSURANCE", name: "Insurance" },
    { code: "ANALYTICS", name: "Administrative Analytics" },
    { code: "DOCTOR", name: "Doctor Management" },
    { code: "PATIENT", name: "Patient Management" },
    { code: "LEADERSHIP", name: "Service Charge Approvals" },
  ];

  // Auth guard
  var session = window.ApiClient.getSession();
  if (!session || !session.isPlatformUser) {
    window.location.href = "platform-login.html";
    return;
  }
  document.getElementById("current-user-label").textContent = session.displayName + " · " + session.email;
  document.getElementById("logout-btn").addEventListener("click", async function () {
    await window.ApiClient.platform.auth.logout();
    window.location.href = "platform-login.html";
  });

  var orgsCache = [];

  function fadeIn(el) {
    el.classList.remove("md-fade-switch");
    void el.offsetWidth;
    el.classList.add("md-fade-switch");
  }

  // Tabs
  document.querySelectorAll(".md-tabs [data-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".md-tabs [data-tab]").forEach(function (t) { t.classList.remove("is-active"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.add("is-hidden"); });
      tab.classList.add("is-active");
      var panel = document.getElementById("panel-" + tab.dataset.tab);
      if (panel) {
        panel.classList.remove("is-hidden");
        fadeIn(panel);
      }
      if (tab.dataset.tab === "rates") {
        loadRates();
      }
    });
  });

  // Overview
  async function loadOverview() {
    try {
      var usage = await window.ApiClient.platform.usage();
      orgsCache = usage.organizations || [];

      var mrrFormatted = "₹" + Number(usage.total_mrr || 0).toLocaleString("en-IN");
      var arrFormatted = "₹" + Number(usage.total_arr || 0).toLocaleString("en-IN");

      document.getElementById("platform-stats").innerHTML =
        stat(mrrFormatted, "Total MRR (Monthly Income)", "revenue-card") +
        stat(arrFormatted, "Annual Run Rate (ARR)", "revenue-card") +
        stat("₹" + Number(usage.total_payments_collected || 0).toLocaleString("en-IN"), "Payments Collected (All Tenants)", "revenue-card") +
        stat(usage.total_organizations || 0, "Total Organizations") +
        stat(usage.active_organizations || 0, "Active Tenants") +
        stat(usage.total_hospitals || 0, "Hospital Branches") +
        stat(usage.total_patients || 0, "Registered Patients") +
        stat(usage.total_active_admissions || 0, "Active Inpatients (Platform-wide)") +
        stat(usage.total_users || 0, "Staff & User Accounts");

      // Render Revenue Breakdown by Service
      var planRevEl = document.getElementById("plan-revenue-grid");
      if (planRevEl && usage.revenue_by_service) {
        var planCardsHtml = Object.keys(usage.revenue_by_service).map(function (sCode) {
          var sData = usage.revenue_by_service[sCode];
          return (
            '<div class="plan-rev-card">' +
            '<div class="plan-rev-title"><span>' + (sData.name || sCode) + '</span><span class="md-chip md-chip-tonal">₹' + Number(sData.price_monthly || 0).toLocaleString("en-IN") + '/mo</span></div>' +
            '<div class="plan-rev-amount">₹' + Number(sData.total_income || 0).toLocaleString("en-IN") + '<span style="font-size:0.8rem;font-weight:400;color:var(--md-on-surface-variant);"> /mo</span></div>' +
            '<div class="plan-rev-sub">' + (sData.active_instances || 0) + ' branch instance(s) running</div>' +
            '</div>'
          );
        }).join("");
        planRevEl.innerHTML = planCardsHtml || '<div class="md-empty-state"><span>No active service revenue lines yet.</span></div>';
      } else if (planRevEl && usage.revenue_by_plan) {
        var planCardsHtml = Object.keys(usage.revenue_by_plan).map(function (pName) {
          var pData = usage.revenue_by_plan[pName];
          return (
            '<div class="plan-rev-card">' +
            '<div class="plan-rev-title"><span>' + pName + '</span><span class="md-chip md-chip-tonal">₹' + Number(pData.price_monthly || 0).toLocaleString("en-IN") + '/mo</span></div>' +
            '<div class="plan-rev-amount">₹' + Number(pData.total_income || 0).toLocaleString("en-IN") + '<span style="font-size:0.8rem;font-weight:400;color:var(--md-on-surface-variant);"> /mo</span></div>' +
            '<div class="plan-rev-sub">' + (pData.active_subscriptions || 0) + ' active tenant(s)</div>' +
            '</div>'
          );
        }).join("");
        planRevEl.innerHTML = planCardsHtml || '<div class="md-empty-state"><span>No active plan revenue lines yet.</span></div>';
      }

      document.getElementById("overview-org-list").innerHTML = orgsCache
        .map(function (org) {
          var planName = org.subscription ? org.subscription.plan_name : "Pay-As-You-Scale";
          var monthlyFee = org.subscription ? "₹" + Number(org.subscription.price_monthly || 0).toLocaleString("en-IN") + "/mo" : "—";
          var modulesHtml = (org.enabled_modules || []).map(function (m) {
            return '<span class="module-pill active">' + m + '</span>';
          }).join("");
          var pf = org.patient_flow || {};
          var rev = org.revenue || {};

          return (
            '<div class="org-mini-card" data-org-id="' + org.organization_id + '">' +
            '<div class="org-mini-head"><span class="org-mini-mark">' + org.name.charAt(0).toUpperCase() + '</span>' +
            '<div><div class="org-mini-name">' + org.name + '</div><span class="md-chip ' + statusChipClass(org.status) + '">' + org.status + '</span></div></div>' +
            '<div class="org-mini-meta">Plan: <strong>' + planName + '</strong> (' + monthlyFee + ')</div>' +
            '<div class="org-mini-meta" style="margin-top:4px;">' + org.hospitals + ' branch(es) · ' + org.users + ' users · ' + org.patients + ' patients · ' + org.beds_occupied + '/' + org.beds + ' beds</div>' +
            '<div class="org-mini-meta" style="margin-top:4px;">Clinical Flow: ' + (pf.admitted || 0) + ' admitted · ' + (pf.discharge_in_progress || 0) + ' in discharge · ' + (pf.pre_requests_pending || 0) + ' pending</div>' +
            '<div class="org-mini-meta" style="margin-top:4px;">Collections: <strong>₹' + Number(rev.payments_collected || 0).toLocaleString("en-IN") + '</strong> · ' + (rev.open_ledgers || 0) + ' open / ' + (rev.paid_ledgers || 0) + ' settled ledgers</div>' +
            '<div class="module-pill-list" style="margin-top:8px;">' + (modulesHtml || '<span class="module-pill">All Core Modules</span>') + '</div>' +
            '</div>'
          );
        })
        .join("") || '<div class="md-empty-state"><span>No organizations yet.</span></div>';

      document.querySelectorAll("#overview-org-list .org-mini-card").forEach(function (card) {
        card.addEventListener("click", function () { openOrgDetail(+card.dataset.orgId); });
      });

      loadActivityFeed(orgsCache);
    } catch (err) {
      document.getElementById("platform-stats").innerHTML = '<div class="md-empty-state"><span>Could not load platform usage.</span></div>';
      window.UIFeedback?.toast(err.message || "Could not load platform usage.", "error");
    }
  }

  function stat(value, label, extraClass) {
    var cls = "stat-card" + (extraClass ? " " + extraClass : "");
    return '<div class="' + cls + '"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
  }

  function statusChipClass(status) {
    if (status === "ACTIVE") return "md-chip-success";
    if (status === "SUSPENDED") return "md-chip-warning";
    return "md-chip-error";
  }

  async function loadActivityFeed(orgs) {
    try {
      var logs = await window.ApiClient.platform.activityLog();
      var orgMap = {};
      (orgs || []).forEach(function (o) { orgMap[o.organization_id] = o.name; });

      var feed = document.getElementById("platform-activity-feed");
      if (!logs.length) {
        feed.innerHTML = '<div class="md-empty-state"><span>No platform activity recorded yet.</span></div>';
        return;
      }
      feed.innerHTML = logs
        .slice(0, 10)
        .map(function (item) {
          var orgName = item.target_organization_id ? orgMap[item.target_organization_id] || "Org #" + item.target_organization_id : "Platform";
          return (
            '<div class="activity-item">' +
            '<div class="activity-dot"></div>' +
            '<div class="activity-content">' +
            '<div class="activity-action"><strong>' + item.action + '</strong> · ' + orgName + '</div>' +
            '<div class="activity-meta">' + (item.details || "") + '</div>' +
            '</div>' +
            '<div class="activity-time">' + new Date(item.created_at).toLocaleTimeString() + '</div>' +
            '</div>'
          );
        })
        .join("");
    } catch (err) {
      document.getElementById("platform-activity-feed").innerHTML = '<div class="md-empty-state"><span>Could not load activity feed.</span></div>';
    }
  }

  // Organizations Table
  async function loadOrganizationsTable() {
    try {
      var usage = await window.ApiClient.platform.usage();
      orgsCache = usage.organizations || [];

      var tbody = document.getElementById("org-table-body");
      if (!orgsCache.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">No organizations found.</td></tr>';
        return;
      }

      tbody.innerHTML = orgsCache
        .map(function (org) {
          var planName = org.subscription ? org.subscription.plan_name : "Pay-As-You-Scale";
          var monthlyFee = org.subscription ? "₹" + Number(org.subscription.price_monthly || 0).toLocaleString("en-IN") : "—";
          var pf = org.patient_flow || {};
          var isSuspended = org.status === "SUSPENDED";
          var toggleBtnLabel = isSuspended ? "Activate" : "Suspend";
          var toggleAction = isSuspended ? "activate" : "suspend";

          return (
            '<tr>' +
            '<td><strong>' + org.name + '</strong></td>' +
            '<td><code>tenant_' + org.organization_id + '</code></td>' +
            '<td><span class="md-chip ' + statusChipClass(org.status) + '">' + org.status + '</span></td>' +
            '<td>' + planName + '</td>' +
            '<td><strong>' + monthlyFee + '</strong></td>' +
            '<td>' + (org.enabled_modules || []).length + ' modules</td>' +
            '<td>' + org.hospitals + '</td>' +
            '<td>' + org.users + '</td>' +
            '<td>' + org.beds_occupied + ' / ' + org.beds + '</td>' +
            '<td>' + (pf.admitted || 0) + ' inpatients · ' + (pf.appointments || 0) + ' appts</td>' +
            '<td class="table-actions">' +
            '<button class="md-btn md-btn-text md-btn-sm" data-action="view" data-id="' + org.organization_id + '">View</button>' +
            '<button class="md-btn md-btn-text md-btn-sm" data-action="' + toggleAction + '" data-id="' + org.organization_id + '">' + toggleBtnLabel + '</button>' +
            '</td>' +
            '</tr>'
          );
        })
        .join("");

      tbody.querySelectorAll("button[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = +btn.dataset.id;
          var action = btn.dataset.action;
          if (action === "view") openOrgDetail(id);
          else if (action === "suspend") toggleOrgStatus(id, "suspend");
          else if (action === "activate") toggleOrgStatus(id, "activate");
        });
      });
    } catch (err) {
      window.UIFeedback?.toast(err.message || "Could not load organizations.", "error");
    }
  }

  async function toggleOrgStatus(id, action) {
    try {
      if (action === "suspend") await window.ApiClient.platform.organizations.suspend(id);
      else await window.ApiClient.platform.organizations.activate(id);
      window.UIFeedback?.toast("Organization status updated.", "success");
      loadOrganizationsTable();
      loadOverview();
    } catch (err) {
      window.UIFeedback?.toast(err.message || "Failed to update status.", "error");
    }
  }

  // Organization Detail Dialog
  var detailDialog = document.getElementById("org-detail-dialog");
  document.getElementById("detail-close")?.addEventListener("click", function () { detailDialog.close(); });

  async function openOrgDetail(orgId) {
    var org = orgsCache.find(function (o) { return o.organization_id === orgId; });
    if (!org) return;

    document.getElementById("detail-org-name").textContent = org.name;

    document.getElementById("detail-summary").innerHTML =
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.9rem;">' +
      '<div><strong>Tenant ID:</strong> <code>tenant_' + org.organization_id + '</code></div>' +
      '<div><strong>Status:</strong> <span class="md-chip ' + statusChipClass(org.status) + '">' + org.status + '</span></div>' +
      '<div><strong>Hospital Branches:</strong> ' + org.hospitals + '</div>' +
      '<div><strong>Total Registered Patients:</strong> ' + org.patients + '</div>' +
      '<div><strong>Staff Accounts:</strong> ' + org.users + '</div>' +
      '<div><strong>Bed Occupancy:</strong> ' + org.beds_occupied + ' / ' + org.beds + ' beds</div>' +
      '<div><strong>Monthly Subscription Fee:</strong> ₹' + Number(org.subscription ? org.subscription.price_monthly : 0).toLocaleString("en-IN") + '/mo</div>' +
      '<div><strong>Payments Collected:</strong> ₹' + Number(org.revenue ? org.revenue.payments_collected : 0).toLocaleString("en-IN") + '</div>' +
      '</div>';

    document.querySelectorAll("[data-detail-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll("[data-detail-tab]").forEach(function (dt) { dt.classList.remove("is-active"); });
        document.querySelectorAll(".detail-panel").forEach(function (dp) { dp.classList.add("is-hidden"); });
        t.classList.add("is-active");
        var panel = document.getElementById("detail-" + t.dataset.detailTab);
        if (panel) panel.classList.remove("is-hidden");
      });
    });

    detailDialog.showModal();
  }

  // Global Rate Manager Tab
  async function loadRates() {
    try {
      var ratesData = await window.ApiClient.platform.rates.get();
      if (!ratesData) return;

      var baseFeeEl = document.getElementById("rate-base-fee");
      if (baseFeeEl) baseFeeEl.value = ratesData.base_platform_fee || 3000;

      var r = ratesData.rates || {};
      var setVal = function (id, val, fallback) {
        var el = document.getElementById(id);
        if (el) el.value = val !== undefined ? val : fallback;
      };

      setVal("rate-gen-beds", r.GENERAL_BEDS, 150);
      setVal("rate-icu-beds", r.ICU_BEDS, 600);
      setVal("rate-priv-beds", r.PRIVATE_BEDS, 350);
      setVal("rate-doc-seats", r.DOCTOR_SEATS, 150);
      setVal("rate-staff-seats", r.STAFF_SEATS, 200);
      setVal("rate-terminals", r.BILLING_TERMINALS, 500);
      setVal("rate-warehouses", r.WAREHOUSES, 1000);
      setVal("rate-admissions", r.PATIENT_ADMISSIONS, 10);
    } catch (err) {
      window.UIFeedback?.toast(err.message || "Could not load global rate card.", "error");
    }
  }

  document.getElementById("btn-save-rates")?.addEventListener("click", async function () {
    var baseFee = Number(document.getElementById("rate-base-fee")?.value) || 3000;
    var rates = {
      GENERAL_BEDS: Number(document.getElementById("rate-gen-beds")?.value) || 150,
      ICU_BEDS: Number(document.getElementById("rate-icu-beds")?.value) || 600,
      PRIVATE_BEDS: Number(document.getElementById("rate-priv-beds")?.value) || 350,
      SEMI_PRIVATE_BEDS: Number(document.getElementById("rate-priv-beds")?.value) || 350,
      DOCTOR_SEATS: Number(document.getElementById("rate-doc-seats")?.value) || 150,
      STAFF_SEATS: Number(document.getElementById("rate-staff-seats")?.value) || 200,
      BILLING_TERMINALS: Number(document.getElementById("rate-terminals")?.value) || 500,
      WAREHOUSES: Number(document.getElementById("rate-warehouses")?.value) || 1000,
      PATIENT_ADMISSIONS: Number(document.getElementById("rate-admissions")?.value) || 10,
    };

    try {
      await window.ApiClient.platform.rates.update({
        base_platform_fee: baseFee,
        rates: rates,
      });
      window.UIFeedback?.toast("Global SaaS rate card updated successfully.", "success");
      loadOverview();
      loadOrganizationsTable();
    } catch (err) {
      window.UIFeedback?.toast(err.message || "Failed to update rates.", "error");
    }
  });

  // Provision Organization Dialog
  var provisionDialog = document.getElementById("provision-dialog");
  document.getElementById("new-org-btn")?.addEventListener("click", function () {
    document.getElementById("provision-form")?.reset();
    provisionDialog.showModal();
  });
  document.getElementById("provision-cancel")?.addEventListener("click", function () {
    provisionDialog.close();
  });
  document.getElementById("provision-form")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = document.getElementById("p-name").value.trim();
    var city = document.getElementById("p-city").value.trim();
    var adminName = document.getElementById("p-admin-name").value.trim();
    var adminEmail = document.getElementById("p-admin-email").value.trim();
    var adminPassword = document.getElementById("p-admin-password").value;

    try {
      await window.ApiClient.platform.organizations.provision({
        name: name,
        city: city,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        plan_id: 1,
        modules: MODULE_CATALOG.map(function (m) { return m.code; }),
      });
      provisionDialog.close();
      window.UIFeedback?.toast("Organization provisioned successfully.", "success");
      loadOverview();
      loadOrganizationsTable();
    } catch (err) {
      window.UIFeedback?.toast(err.message || "Failed to provision organization.", "error");
    }
  });

  // Boot
  async function refreshAll() {
    await loadOverview();
    await loadOrganizationsTable();
    await loadRates();
  }
  refreshAll();
})();
