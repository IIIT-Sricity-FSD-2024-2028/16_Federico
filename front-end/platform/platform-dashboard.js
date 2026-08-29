/**
 * platform-dashboard.js — Platform Super User portal.
 * Single page, tab-switched sections (Overview / Organizations / Plans),
 * native <dialog> elements for provisioning/detail/plan-creation. Talks
 * exclusively to Api.platform.* (back-end/src/routes/platform.routes.js).
 */
(function () {
  // Fixed module catalog — mirrors back-end/src/utils/tenant.js#MODULES.
  // There's no public "list modules" endpoint (it's a fixed, rarely-changing
  // catalog, same reasoning as constants.js hardcoding DEPARTMENTS) so it's
  // duplicated here deliberately, matching the backend list exactly.
  var MODULE_CATALOG = [
    { code: "APPOINTMENTS", name: "Appointments" },
    { code: "ADMISSIONS", name: "Admissions & Bed Management" },
    { code: "INVENTORY", name: "Inventory & Procurement" },
    { code: "BILLING", name: "Billing" },
    { code: "INSURANCE", name: "Insurance" },
    { code: "ANALYTICS", name: "Administrative Analytics" },
  ];

  // ---- Auth guard (platform sessions are a separate domain — see platform-login.js) ----
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

  var plansCache = [];
  var orgsCache = [];

  // Cross-fades a panel in instead of an instant display swap — restarts
  // the CSS animation by forcing a reflow between remove/add (a class that
  // was never removed won't replay its animation on its own).
  function fadeIn(el) {
    el.classList.remove("md-fade-switch");
    void el.offsetWidth;
    el.classList.add("md-fade-switch");
  }

  // ---- Tabs ----
  document.querySelectorAll(".md-tabs [data-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".md-tabs [data-tab]").forEach(function (t) { t.classList.remove("is-active"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.add("is-hidden"); });
      tab.classList.add("is-active");
      var panel = document.getElementById("panel-" + tab.dataset.tab);
      panel.classList.remove("is-hidden");
      fadeIn(panel);
    });
  });

  function moduleChecklistHtml(idPrefix, selectedCodes) {
    return MODULE_CATALOG.map(function (m) {
      var checked = selectedCodes.includes(m.code) ? "checked" : "";
      return '<label class="module-check"><input type="checkbox" value="' + m.code + '" id="' + idPrefix + '-' + m.code + '" ' + checked + '/> ' + m.name + '</label>';
    }).join("");
  }

  function checkedModules(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(function (el) { return el.value; });
  }

  // ---- Overview ----
  async function loadOverview() {
    try {
      var usage = await window.ApiClient.platform.usage();
      orgsCache = usage.organizations;
      
      var mrrFormatted = "₹" + (usage.total_mrr || 0).toLocaleString("en-IN");
      var arrFormatted = "₹" + (usage.total_arr || 0).toLocaleString("en-IN");

      document.getElementById("platform-stats").innerHTML =
        stat(mrrFormatted, "Total MRR (Monthly Income)", "revenue-card") +
        stat(arrFormatted, "Annual Run Rate (ARR)", "revenue-card") +
        stat("₹" + (usage.total_payments_collected || 0).toLocaleString("en-IN"), "Payments Collected (All Tenants)", "revenue-card") +
        stat(usage.total_organizations, "Total Organizations") +
        stat(usage.active_organizations, "Active Tenants") +
        stat(usage.total_hospitals, "Hospital Branches") +
        stat(usage.total_patients, "Registered Patients") +
        stat(usage.total_active_admissions, "Active Inpatients (Platform-wide)") +
        stat(usage.total_users, "Staff & Users");

      // Render Revenue Breakdown by Plan
      var planRevEl = document.getElementById("plan-revenue-grid");
      if (planRevEl && usage.revenue_by_plan) {
        var planCardsHtml = Object.keys(usage.revenue_by_plan).map(function (pName) {
          var pData = usage.revenue_by_plan[pName];
          return (
            '<div class="plan-rev-card">' +
            '<div class="plan-rev-title"><span>' + pName + '</span><span class="md-chip md-chip-tonal">₹' + (pData.price_monthly || 0).toLocaleString("en-IN") + '/mo</span></div>' +
            '<div class="plan-rev-amount">₹' + (pData.total_income || 0).toLocaleString("en-IN") + '<span style="font-size:0.8rem;font-weight:400;color:var(--md-on-surface-variant);"> /mo</span></div>' +
            '<div class="plan-rev-sub">' + pData.active_subscriptions + ' organization(s) using this service</div>' +
            '</div>'
          );
        }).join("");
        planRevEl.innerHTML = planCardsHtml || '<div class="md-empty-state"><span>No active plans yet.</span></div>';
      }

      document.getElementById("overview-org-list").innerHTML = usage.organizations
        .map(function (org) {
          var planName = org.subscription ? org.subscription.plan_name : "No Plan";
          var monthlyFee = org.subscription ? "₹" + (org.subscription.price_monthly || 0).toLocaleString("en-IN") + "/mo" : "—";
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
            '<div class="org-mini-meta" style="margin-top:4px;">Flow: ' + (pf.admitted || 0) + ' admitted · ' + (pf.discharge_in_progress || 0) + ' in discharge · ' + (pf.pre_requests_pending || 0) + ' intake pending</div>' +
            '<div class="org-mini-meta" style="margin-top:4px;">Collected: <strong>₹' + Number(rev.payments_collected || 0).toLocaleString("en-IN") + '</strong> · ' + (rev.open_ledgers || 0) + ' open / ' + (rev.paid_ledgers || 0) + ' paid ledgers</div>' +
            '<div class="module-pill-list" style="margin-top:8px;">' + (modulesHtml || '<span class="module-pill">No modules</span>') + '</div>' +
            '</div>'
          );
        })
        .join("") || '<div class="md-empty-state"><span>No organizations yet.</span></div>';

      document.querySelectorAll("#overview-org-list .org-mini-card").forEach(function (card) {
        card.addEventListener("click", function () { openOrgDetail(+card.dataset.orgId); });
      });

      loadActivityFeed(usage.organizations);
    } catch (err) {
      document.getElementById("platform-stats").innerHTML = '<div class="md-empty-state"><span>Could not load platform usage.</span></div>';
      window.UIFeedback.toast(err.message || "Could not load platform usage.", "error");
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

  var ACTION_LABELS = {
    PROVISION_ORGANIZATION: "Provisioned organization",
    SUSPEND_ORGANIZATION: "Suspended organization",
    ACTIVATE_ORGANIZATION: "Activated organization",
    DELETE_ORGANIZATION: "Deleted organization",
    SET_MODULE_FLAG: "Changed a module flag",
    CREATE_PLAN: "Created a subscription plan",
    SET_SUBSCRIPTION: "Changed a subscription",
    RENEW_SUBSCRIPTION: "Renewed a subscription",
  };

  // tasks.md §3's "Monitor Platform Usage" responsibility — every
  // Platform Super User action (provision/suspend/activate/delete an org,
  // module/plan/subscription changes) is logged server-side and shown here.
  async function loadActivityFeed(organizations) {
    var feed = document.getElementById("platform-activity-feed");
    try {
      var entries = await window.ApiClient.platform.activityLog();
      if (entries.length === 0) {
        feed.innerHTML = '<div class="md-empty-state"><span>No platform activity yet.</span></div>';
        return;
      }
      var orgNameById = {};
      (organizations || []).forEach(function (o) { orgNameById[o.organization_id] = o.name; });

      feed.innerHTML = entries
        .slice(0, 12)
        .map(function (entry) {
          var orgName = orgNameById[entry.target_organization_id];
          return (
            '<div class="activity-entry">' +
            '<span class="activity-entry-label">' + (ACTION_LABELS[entry.action] || entry.action) + (orgName ? " — " + orgName : "") + '</span>' +
            '<span class="activity-entry-detail">' + (entry.details || "") + '</span>' +
            '<span class="activity-entry-time">' + new Date(entry.created_at).toLocaleString() + '</span>' +
            '</div>'
          );
        })
        .join("");
    } catch (err) {
      feed.innerHTML = '<div class="md-empty-state"><span>Could not load activity.</span></div>';
    }
  }

  // ---- Organizations table ----
  async function loadOrganizationsTable() {
    try {
      var organizations = await window.ApiClient.platform.organizations.list();
      var rows = await Promise.all(
        organizations.map(async function (org) {
          var usage = await window.ApiClient.platform.organizations.usage(org.organization_id).catch(function () { return {}; });
          var subscription = await window.ApiClient.platform.organizations.getSubscription(org.organization_id).catch(function () { return null; });
          var subPrice = (usage.subscription && usage.subscription.price_monthly)
            || (subscription && subscription.subscription && subscription.subscription.price_monthly)
            || 0;
          var billingLabel = usage.subscription && usage.subscription.billing_model === 'USAGE' ? 'Usage-based' : ((subscription && subscription.plan && subscription.plan.name) || '—');
          var modules = usage.enabled_modules || [];
          var modulesHtml = modules.map(function (m) {
            return '<span class="module-pill active">' + m + '</span>';
          }).join(" ");
          var pf = usage.patient_flow || {};

          return (
            '<tr data-org-id="' + org.organization_id + '">' +
            '<td class="org-name-cell"><span class="org-mini-mark" style="width:28px;height:28px;font-size:0.8rem;">' + org.name.charAt(0).toUpperCase() + '</span>' + org.name + '</td>' +
            '<td><code>tenant_' + org.organization_id + '</code></td>' +
            '<td><span class="md-chip ' + statusChipClass(org.status) + '">' + org.status + '</span></td>' +
            '<td><strong>' + billingLabel + '</strong></td>' +
            '<td><span style="color:var(--md-primary);font-weight:600;">₹' + Number(subPrice).toLocaleString("en-IN") + '/mo</span></td>' +
            '<td><div class="module-pill-list">' + (modulesHtml || '<span class="module-pill">None</span>') + '</div></td>' +
            '<td>' + (usage.hospitals ?? "—") + '</td>' +
            '<td>' + (usage.users ?? "—") + '</td>' +
            '<td>' + (usage.beds_occupied ?? 0) + '/' + (usage.beds ?? 0) + '</td>' +
            '<td style="font-size:0.8rem; white-space:nowrap;">' + (pf.admitted || 0) + ' adm · ' + (pf.discharge_in_progress || 0) + ' disch · ' + (pf.pre_requests_pending || 0) + ' intake</td>' +
            '<td class="row-actions"></td>' +
            '</tr>'
          );
        }),
      );
      document.getElementById("org-table-body").innerHTML = rows.join("");

      document.querySelectorAll("#org-table-body tr").forEach(function (row) {
        var orgId = +row.dataset.orgId;
        var org = organizations.find(function (o) { return o.organization_id === orgId; });
        var cell = row.querySelector(".row-actions");

        var viewBtn = actionButton("View", "md-btn-outlined md-btn-sm", function () { openOrgDetail(orgId); });
        cell.appendChild(viewBtn);

        if (org.status === "ACTIVE") {
          cell.appendChild(actionButton("Suspend", "md-btn-tonal md-btn-sm", async function () {
            await window.ApiClient.platform.organizations.suspend(orgId);
            window.UIFeedback.toast(org.name + " suspended.", "warning");
            refreshAll();
          }));
        } else if (org.status === "SUSPENDED") {
          cell.appendChild(actionButton("Activate", "md-btn-tonal md-btn-sm", async function () {
            await window.ApiClient.platform.organizations.activate(orgId);
            window.UIFeedback.toast(org.name + " activated.", "success");
            refreshAll();
          }));
        }

        if (org.status !== "DELETED") {
          cell.appendChild(actionButton("Delete", "md-btn-danger md-btn-sm", async function () {
            var confirmed = await window.UIFeedback.confirm({
              title: "Delete " + org.name + "?",
              body: "This deactivates the organization. Its historical records are preserved, not erased.",
              confirmLabel: "Delete",
              danger: true,
            });
            if (!confirmed) return;
            await window.ApiClient.platform.organizations.remove(orgId);
            window.UIFeedback.toast(org.name + " deleted.", "success");
            refreshAll();
          }));
        }
      });
    } catch (err) {
      window.UIFeedback.toast(err.message || "Could not load organizations.", "error");
    }
  }

  function actionButton(label, cls, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "md-btn " + cls;
    btn.textContent = label;
    btn.style.marginLeft = "6px";
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ---- Provision new organization ----
  var provisionDialog = document.getElementById("provision-dialog");
  document.getElementById("new-org-btn").addEventListener("click", async function () {
    var planSelect = document.getElementById("p-plan");
    planSelect.innerHTML = plansCache.map(function (p) { return '<option value="' + p.plan_id + '">' + p.name + ' — ₹' + p.price_monthly + '/mo</option>'; }).join("");
    document.getElementById("p-modules").innerHTML = moduleChecklistHtml("p", []);
    document.getElementById("provision-form").reset();
    provisionDialog.showModal();
  });
  document.getElementById("provision-cancel").addEventListener("click", function () { provisionDialog.close(); });
  document.getElementById("provision-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var submitBtn = document.getElementById("provision-submit");
    submitBtn.disabled = true;
    try {
      var payload = {
        name: document.getElementById("p-name").value.trim(),
        city: document.getElementById("p-city").value.trim() || undefined,
        plan_id: Number(document.getElementById("p-plan").value),
        modules: checkedModules(document.getElementById("p-modules")),
        admin_name: document.getElementById("p-admin-name").value.trim(),
        admin_email: document.getElementById("p-admin-email").value.trim(),
        admin_password: document.getElementById("p-admin-password").value,
      };
      var result = await window.ApiClient.platform.organizations.provision(payload);
      provisionDialog.close();
      window.UIFeedback.toast(result.organization.name + " provisioned. Admin login: " + payload.admin_email, "success");
      refreshAll();
    } catch (err) {
      window.UIFeedback.toast(err.message || "Provisioning failed.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---- Organization detail dialog ----
  var detailDialog = document.getElementById("org-detail-dialog");
  document.getElementById("detail-close").addEventListener("click", function () { detailDialog.close(); });
  document.querySelectorAll("#org-detail-dialog [data-detail-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#org-detail-dialog [data-detail-tab]").forEach(function (t) { t.classList.remove("is-active"); });
      document.querySelectorAll("#org-detail-dialog .detail-panel").forEach(function (p) { p.classList.add("is-hidden"); });
      tab.classList.add("is-active");
      var detailPanel = document.getElementById("detail-" + tab.dataset.detailTab);
      detailPanel.classList.remove("is-hidden");
      fadeIn(detailPanel);
    });
  });

  async function openOrgDetail(orgId) {
    try {
      var org = await window.ApiClient.platform.organizations.get(orgId);
      document.getElementById("detail-org-name").textContent = org.name;

      var usage = await window.ApiClient.platform.organizations.usage(orgId);
      var subscription = await window.ApiClient.platform.organizations.getSubscription(orgId).catch(function () { return null; });
      document.getElementById("detail-summary").innerHTML =
        kv("Status", org.status) +
        kv("Slug", org.slug) +
        kv("Hospitals", usage.hospitals) +
        kv("Users", usage.users) +
        kv("Patients", usage.patients) +
        kv("Beds occupied", usage.beds_occupied + " / " + usage.beds) +
        kv("Patient flow", (usage.patient_flow ? (usage.patient_flow.admitted + " admitted · " + usage.patient_flow.discharge_in_progress + " in discharge · " + usage.patient_flow.pre_requests_pending + " intake pending · " + usage.patient_flow.discharged + " discharged") : "—")) +
        kv("Appointments booked", usage.patient_flow ? usage.patient_flow.appointments : "—") +
        kv("Payments collected", "₹" + Number(usage.revenue ? usage.revenue.payments_collected : 0).toLocaleString("en-IN") + " (" + (usage.revenue ? usage.revenue.paid_ledgers : 0) + " paid / " + (usage.revenue ? usage.revenue.open_ledgers : 0) + " open ledgers)") +
        kv("Monthly service charge", "₹" + Number(subscription && subscription.subscription ? subscription.subscription.price_monthly || 0 : (usage.subscription ? usage.subscription.price_monthly : 0)).toLocaleString("en-IN")) +
        kv("Emergency 24×7", org.emergency_available ? "Yes" : "No") +
        kv("Specialties", (org.specialties || []).join(", ") || "—") +
        kv("Enabled services", (usage.enabled_modules || []).join(", ") || "—") +
        kv("Current plan", subscription && subscription.plan ? subscription.plan.name + " (renews " + new Date(subscription.subscription.renews_at).toLocaleDateString() + ")" : "No active subscription") +
        (usage.quotas ? kv("Quota — max beds", usage.quotas.max_beds) + kv("Quota — max users", usage.quotas.max_users) + kv("Quota — storage", usage.quotas.storage_gb + " GB") + kv("Quota — API rate limit", usage.quotas.api_rate_limit + " req/min") : "") +
        '<div style="display:flex; gap:8px; margin-top:16px; align-items:center;">' +
        '<select id="change-plan-select" class="md-field" style="flex:1;">' + plansCache.map(function (p) { return '<option value="' + p.plan_id + '"' + (subscription && subscription.plan && subscription.plan.plan_id === p.plan_id ? " selected" : "") + '>' + p.name + '</option>'; }).join("") + '</select>' +
        '<button type="button" class="md-btn md-btn-tonal md-btn-sm" id="change-plan-btn">Change Plan</button>' +
        '<button type="button" class="md-btn md-btn-outlined md-btn-sm" id="renew-plan-btn">Renew</button>' +
        '</div>';

      document.getElementById("change-plan-btn").addEventListener("click", async function () {
        var planId = Number(document.getElementById("change-plan-select").value);
        await window.ApiClient.platform.organizations.setSubscription(orgId, planId);
        window.UIFeedback.toast("Plan updated.", "success");
        openOrgDetail(orgId);
        refreshAll();
      });
      document.getElementById("renew-plan-btn").addEventListener("click", async function () {
        await window.ApiClient.platform.organizations.renewSubscription(orgId);
        window.UIFeedback.toast("Subscription renewed.", "success");
        openOrgDetail(orgId);
      });

      await renderModulesTab(orgId);
      await renderKeysTab(orgId);
      await renderLogTab(orgId);

      detailDialog.showModal();
    } catch (err) {
      window.UIFeedback.toast(err.message || "Could not load organization.", "error");
    }
  }

  function kv(label, value) {
    return '<div class="kv-row"><span class="kv-label">' + label + '</span><span>' + value + '</span></div>';
  }

  async function renderModulesTab(orgId) {
    var flags = await window.ApiClient.platform.organizations.modules(orgId);
    var container = document.getElementById("detail-modules");
    container.innerHTML = flags
      .map(function (f) {
        var moduleName = (MODULE_CATALOG.find(function (m) { return m.code === f.module_code; }) || {}).name || f.module_code;
        return (
          '<label class="module-check" style="display:flex; justify-content:space-between; width:100%; margin-bottom:8px;">' +
          '<span>' + moduleName + '</span>' +
          '<input type="checkbox" data-module="' + f.module_code + '" ' + (f.enabled ? "checked" : "") + ' />' +
          '</label>'
        );
      })
      .join("");
    container.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      checkbox.addEventListener("change", async function () {
        try {
          await window.ApiClient.platform.organizations.setModule(orgId, checkbox.dataset.module, checkbox.checked);
          window.UIFeedback.toast(checkbox.dataset.module + " " + (checkbox.checked ? "enabled" : "disabled") + ".", "success");
          refreshAll();
        } catch (err) {
          checkbox.checked = !checkbox.checked;
          window.UIFeedback.toast(err.message || "Could not update module.", "error");
        }
      });
    });
  }

  async function renderKeysTab(orgId) {
    var container = document.getElementById("detail-keys");
    async function refreshKeys() {
      var keys = await window.ApiClient.platform.organizations.apiKeys(orgId);
      container.innerHTML =
        '<button type="button" class="md-btn md-btn-tonal md-btn-sm" id="gen-key-btn" style="margin-bottom:12px;">+ Generate API Key</button>' +
        (keys.length
          ? keys
              .map(function (k) {
                return (
                  '<div class="api-key-row"><div><div>' + (k.label || "Key") + (k.revoked_at ? ' <span class="md-chip md-chip-error">Revoked</span>' : "") + '</div>' +
                  '<code class="api-key-value">' + k.key + '</code></div>' +
                  (k.revoked_at ? "" : '<button type="button" class="md-btn md-btn-danger md-btn-sm" data-key-id="' + k.api_key_id + '">Revoke</button>') +
                  '</div>'
                );
              })
              .join("")
          : '<div class="md-empty-state"><span>No API keys yet.</span></div>');

      document.getElementById("gen-key-btn").addEventListener("click", async function () {
        await window.ApiClient.platform.organizations.createApiKey(orgId, "Manual key");
        window.UIFeedback.toast("API key generated.", "success");
        refreshKeys();
      });
      container.querySelectorAll("[data-key-id]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          await window.ApiClient.platform.apiKeys.revoke(+btn.dataset.keyId);
          window.UIFeedback.toast("API key revoked.", "warning");
          refreshKeys();
        });
      });
    }
    await refreshKeys();
  }

  async function renderLogTab(orgId) {
    var log = await window.ApiClient.platform.organizations.provisioningLog(orgId);
    var container = document.getElementById("detail-log");
    container.innerHTML = log.length
      ? log
          .map(function (entry) {
            return (
              '<div class="log-entry"><span class="log-step">' + entry.step + '</span> — ' + entry.message +
              '<div class="log-time">' + new Date(entry.created_at).toLocaleString() + ' · ' + entry.status + '</div></div>'
            );
          })
          .join("")
      : '<div class="md-empty-state"><span>No provisioning history.</span></div>';
  }

  // ---- Plans tab ----
  async function loadPlans() {
    try {
      plansCache = await window.ApiClient.platform.plans.list();
      document.getElementById("plan-grid").innerHTML = plansCache
        .map(function (plan) {
          return (
            '<div class="md-card plan-card"><h3 style="margin:0;">' + plan.name + '</h3>' +
            '<div class="plan-price">₹' + plan.price_monthly + '<small> / month</small></div>' +
            '<ul><li>' + plan.max_beds + ' beds</li><li>' + plan.max_users + ' users</li><li>' + plan.max_hospitals + ' hospital(s)</li>' +
            '<li>' + plan.storage_gb + ' GB storage</li><li>' + plan.api_rate_limit + ' req/min</li>' +
            '<li>Modules: ' + (plan.included_modules.join(", ") || "none") + '</li></ul></div>'
          );
        })
        .join("");
    } catch (err) {
      window.UIFeedback.toast(err.message || "Could not load plans.", "error");
    }
  }

  var planDialog = document.getElementById("plan-dialog");
  document.getElementById("new-plan-btn").addEventListener("click", function () {
    document.getElementById("plan-form").reset();
    document.getElementById("pl-modules").innerHTML = moduleChecklistHtml("pl", []);
    planDialog.showModal();
  });
  document.getElementById("plan-cancel").addEventListener("click", function () { planDialog.close(); });
  document.getElementById("plan-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await window.ApiClient.platform.plans.create({
        name: document.getElementById("pl-name").value.trim(),
        max_beds: Number(document.getElementById("pl-beds").value),
        max_users: Number(document.getElementById("pl-users").value),
        max_hospitals: Number(document.getElementById("pl-hospitals").value),
        storage_gb: Number(document.getElementById("pl-storage").value),
        api_rate_limit: Number(document.getElementById("pl-rate").value),
        price_monthly: Number(document.getElementById("pl-price").value),
        included_modules: checkedModules(document.getElementById("pl-modules")),
      });
      planDialog.close();
      window.UIFeedback.toast("Plan created.", "success");
      loadPlans();
    } catch (err) {
      window.UIFeedback.toast(err.message || "Could not create plan.", "error");
    }
  });

  // ---- Boot ----
  async function refreshAll() {
    await loadPlans();
    await loadOverview();
    await loadOrganizationsTable();
  }
  refreshAll();
})();
