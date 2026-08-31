'use strict';

/**
 * Patient Portal — My Bills & Invoices Module
 * Handles invoice visualization, itemized line-item breakdown dialog,
 * insurance coverage breakdown, online bill payment, and digital receipt printing.
 */

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupTabs();
  setupModal();

  onStoreReady(renderAll);
  window.addEventListener("patientStoreUpdated", renderAll);

  function setupNavigation() {
    const routes = {
      "nav-dashboard": "patient-dashboard.html",
      "nav-book": "patient-book-appointment.html",
      "nav-bill": "patient-billing.html",
      "nav-profile": "patient-profile.html",
      "profile-chip": "patient-profile.html",
    };
    Object.entries(routes).forEach(([id, url]) => {
      document.getElementById(id)?.addEventListener("click", () => {
        window.location.href = url;
      });
    });
  }

  function setupTabs() {
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const section = tab.dataset.section;
        document.getElementById("section-invoices")?.classList.add("hidden");
        document.getElementById("section-receipts")?.classList.add("hidden");
        document.getElementById("section-discharge")?.classList.add("hidden");
        document.getElementById("section-eod")?.classList.add("hidden");
        document.getElementById(`section-${section}`)?.classList.remove("hidden");
      });
    });
  }

  function setupModal() {
    const modal = document.getElementById("modal-bill-details");
    const closeBtn = document.getElementById("modal-bill-close");
    if (!modal) return;

    closeBtn?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });
  }

  function openModal() {
    const modal = document.getElementById("modal-bill-details");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  function closeModal() {
    const modal = document.getElementById("modal-bill-details");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  async function payDispatchedBill(ledgerId, paymentMethod) {
    const VALID_METHODS = ["UPI", "CARD", "CASH", "NETBANKING"];
    if (!VALID_METHODS.includes(paymentMethod)) return false;

    const bill = getBills().find((b) => String(b.ledgerId) === String(ledgerId));
    if (!bill || bill.status === "paid") return false;

    await payBill(bill, paymentMethod);
    return true;
  }

  function renderAll() {
    renderPatientHeader();
    renderInsuranceBanner();
    renderKpis();
    renderSections();
  }

  function renderPatientHeader() {
    const profile = getProfile();
    const safeName = String(profile?.name || "Patient").trim();
    const initials = profile?.initials || safeName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P";

    const nameEl = document.getElementById("bill-topbar-name");
    const avatarEl = document.getElementById("bill-avatar");
    if (nameEl) nameEl.textContent = safeName;
    if (avatarEl) avatarEl.textContent = initials;
  }

  function renderInsuranceBanner() {
    const profile = getProfile();
    const banner = document.getElementById("insurance-banner");
    if (!banner) return;

    const ins = profile?.insurance;
    if (ins && ins.hasInsurance) {
      banner.classList.remove("hidden");
      setText("ins-provider-name", ins.provider || "Health Insurance");
      setText("ins-policy-meta", `Policy No: ${ins.policyNumber || "N/A"} · Member ID: ${ins.memberId || "N/A"}`);
      setText("ins-coverage-type", ins.coverageType || "Individual");
      setText("ins-coverage-limit", `₹${Number(ins.coverageLimit || ins.coverage || 0).toLocaleString("en-IN")}`);
      setText("ins-valid-till", ins.validTo || "Active");

      const badge = document.getElementById("ins-status-badge");
      if (badge) {
        badge.textContent = ins.verified ? "Verified" : "Unverified";
        badge.style.background = ins.verified ? "var(--success-soft)" : "var(--warn-soft)";
        badge.style.color = ins.verified ? "var(--success)" : "var(--warn)";
      }
    } else {
      setText("ins-provider-name", "Self Pay (No Active Insurance)");
      setText("ins-policy-meta", "Add your health insurance policy in My Profile for instant cashless claims.");
      setText("ins-coverage-type", "Self Sponsored");
      setText("ins-coverage-limit", "₹0");
      setText("ins-valid-till", "N/A");

      const badge = document.getElementById("ins-status-badge");
      if (badge) {
        badge.textContent = "Self Pay";
        badge.style.background = "var(--md-surface-container-low)";
        badge.style.color = "var(--muted)";
      }
    }
  }

  function renderKpis() {
    const bills = getBills();
    const sections = getBillingSections();
    const visits = getVisits();

    const totalBilled = bills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const paidTotal = bills.filter((b) => b.status === "paid").reduce((sum, b) => sum + Number(b.youPay || 0), 0) +
      (sections.receipts || []).filter((r) => r.type === "RECEIPT").reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const pendingTotal = bills.filter((b) => b.status !== "paid").reduce((sum, b) => sum + Number(b.youPay || 0), 0);

    setText("kpi-total-billed", `₹${totalBilled.toLocaleString("en-IN")}`);
    setText("kpi-paid", `₹${paidTotal.toLocaleString("en-IN")}`);
    setText("kpi-pending", `₹${pendingTotal.toLocaleString("en-IN")}`);
    setText("kpi-visits", String((visits || []).length || bills.length || 0));

    setText("kpi-total-billed-sub", `${bills.length} itemized invoices`);
    setText("kpi-paid-sub", `${(sections.receipts || []).filter((row) => row.type === "RECEIPT").length} receipts`);
    setText("kpi-pending-sub", `${bills.filter((b) => b.status !== "paid").length} pending payments`);
  }

  function renderSections() {
    const bills = getBills();
    const sections = getBillingSections();

    renderInvoicesSection(bills);
    renderReceiptsSection(sections.receipts || []);
    renderDischargeSection(sections.discharge || []);
    renderEodSection(sections.eod || []);
  }

  function renderInvoicesSection(bills) {
    const el = document.getElementById("section-invoices");
    if (!el) return;

    if (!bills.length) {
      el.classList.remove("billing-list");
      el.innerHTML = `<div class="table-empty"><p>No hospital invoices generated yet.</p></div>`;
      return;
    }

    el.innerHTML = bills.map((bill) => {
      const isPaid = bill.status === "paid";
      let statusBadge = '';
      let payAction = '';

      if (isPaid) {
        statusBadge = `<span class="status paid">Paid</span>`;
        payAction = `<button class="btn-download" type="button" data-print-ledger="${escapeAttr(String(bill.ledgerId))}">Digital Copy</button>`;
      } else if (bill.hasDischargeSummary) {
        statusBadge = `<span class="status pending">Payable</span>`;
        payAction = `<button class="btn-view" type="button" data-pay-ledger="${escapeAttr(String(bill.ledgerId))}">Pay Now</button>`;
      } else {
        statusBadge = `<span class="status info">Interim EOD</span>`;
        payAction = `<button class="btn-view" type="button" disabled style="opacity:0.6; cursor:not-allowed; background:var(--muted);" title="Daily interim statement. Online payment unlocks when the hospital sends the final Discharge Summary.">Interim Bill</button>`;
      }

      const interimNotice = !isPaid && !bill.hasDischargeSummary
        ? `<div style="color:var(--primary); font-size:11px; margin-top:2px;">Daily interim statement · Payment opens upon final discharge summary</div>`
        : '';

      return `
        <div class="billing-row">
          <div class="billing-row-main">
            <div class="billing-row-title">
              <strong>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)}</strong>
              ${statusBadge}
            </div>
            <span class="billing-row-date">${escapeHtml(bill.date || "N/A")} · ${escapeHtml(bill.description || "Hospital Care")}</span>
            <small style="color:var(--muted); font-size:11px;">${bill.items ? `${bill.items.length} itemized services` : ""} (Gross: ₹${Number(bill.total || 0).toLocaleString("en-IN")}${bill.insuranceCovered ? ` · Ins. Covered: ₹${Number(bill.insuranceCovered).toLocaleString("en-IN")}` : ""})</small>
            ${interimNotice}
          </div>
          <div class="billing-row-meta">
            <div style="text-align:right;">
              <small style="display:block; font-size:10px; color:var(--muted); text-transform:uppercase;">Net Payable</small>
              <strong class="billing-row-amount">₹${Number(bill.youPay || 0).toLocaleString("en-IN")}</strong>
            </div>
            <div class="billing-row-actions">
              <button class="btn-view" type="button" data-view-bill="${escapeAttr(String(bill.ledgerId))}">View Details</button>
              ${payAction}
            </div>
          </div>
        </div>
      `;
    }).join("");
    el.classList.add("billing-list");

    // Attach View Details Click Handlers
    el.querySelectorAll("[data-view-bill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ledgerId = btn.getAttribute("data-view-bill");
        const bill = bills.find((b) => String(b.ledgerId) === String(ledgerId));
        if (bill) openBillModal(bill);
      });
    });

    // Attach Pay Now Click Handlers
    el.querySelectorAll("[data-pay-ledger]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ledgerId = btn.getAttribute("data-pay-ledger");
        const bill = bills.find((b) => String(b.ledgerId) === String(ledgerId));
        if (!bill) return;

        const method = await selectPaymentMethodModal(bill.youPay);
        if (!method) return;

        btn.disabled = true;
        try {
          await payBill(bill, method);
          UIFeedback.toast("Payment successful! Receipt has been generated.", "success");
          renderAll();
        } catch (err) {
          UIFeedback.toast(err?.message || "Payment processing failed.", "warning");
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Attach Digital Copy Print Click Handlers
    el.querySelectorAll("[data-print-ledger]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ledgerId = btn.getAttribute("data-print-ledger");
        const bill = bills.find((b) => String(b.ledgerId) === String(ledgerId));
        if (bill) openInvoiceDigitalCopy(bill);
      });
    });
  }

  function renderReceiptsSection(rows) {
    const el = document.getElementById("section-receipts");
    if (!el) return;

    if (!rows.length) {
      el.classList.remove("billing-list");
      el.innerHTML = `<div class="table-empty"><p>No payment receipts available.</p></div>`;
      return;
    }

    el.innerHTML = rows.map((row) => {
      const safeRow = window.Sanitizer ? window.Sanitizer.forRole(row, 'PATIENT') : row;
      const isPaymentLink = row.type === "PAYMENT_LINK";

      const action = isPaymentLink
        ? `<button class="btn-view" type="button" data-dispatch-id="${escapeAttr(String(row.dispatchId || ""))}">Pay Now</button>`
        : `<button class="btn-download" type="button" data-source-type="${escapeAttr(row.sourceType || "")}" data-source-id="${escapeAttr(String(row.sourceId || ""))}" data-row-type="${escapeAttr(row.type || "")}" data-row-title="${escapeAttr(row.title || "")}">View Digital Copy</button>`;

      const statusLabel = isPaymentLink
        ? `<span class="status pending">Pending</span>`
        : `<span class="status confirmed">Receipt</span>`;

      return `
        <div class="billing-row">
          <div class="billing-row-main">
            <div class="billing-row-title">
              <strong>${escapeHtml(safeRow.title || (isPaymentLink ? "Payment Link" : "Receipt"))}</strong>
              ${statusLabel}
            </div>
            <span class="billing-row-date">${new Date(safeRow.createdAt || Date.now()).toLocaleString("en-IN")}</span>
          </div>
          <div class="billing-row-meta">
            <strong class="billing-row-amount">₹${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
            <div class="billing-row-actions">${action}</div>
          </div>
        </div>
      `;
    }).join("");
    el.classList.add("billing-list");

    el.querySelectorAll("[data-dispatch-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const dispatchId = btn.getAttribute("data-dispatch-id") || "";
        const bill = getBills().find((b) => String(b.ledgerId) === String(dispatchId));
        const amount = bill ? bill.youPay : 0;

        const method = await selectPaymentMethodModal(amount);
        if (!method) return;

        btn.disabled = true;
        try {
          const paid = await payDispatchedBill(dispatchId, method);
          if (paid) {
            UIFeedback.toast("Payment successful! Receipt generated.", "success");
            renderAll();
          }
        } catch (err) {
          UIFeedback.toast(err?.message || "Payment failed.", "warning");
        } finally {
          btn.disabled = false;
        }
      });
    });

    attachDigitalCopyHandlers(el);
  }

  function renderDischargeSection(rows) {
    const el = document.getElementById("section-discharge");
    if (!el) return;

    if (!rows.length) {
      el.classList.remove("billing-list");
      el.innerHTML = `<div class="table-empty"><p>No discharge summaries available.</p></div>`;
      return;
    }

    el.innerHTML = rows.map((row) => {
      const safeRow = window.Sanitizer ? window.Sanitizer.forRole(row, 'PATIENT') : row;
      return `
        <div class="billing-row">
          <div class="billing-row-main">
            <div class="billing-row-title">
              <strong>${escapeHtml(safeRow.title || "Discharge Summary")}</strong>
              <span class="status confirmed">Completed</span>
            </div>
            <span class="billing-row-date">${new Date(safeRow.createdAt || Date.now()).toLocaleString("en-IN")}</span>
          </div>
          <div class="billing-row-meta">
            <strong class="billing-row-amount">₹${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
            <div class="billing-row-actions">
              <button class="btn-download" type="button" data-source-type="${escapeAttr(row.sourceType || "")}" data-source-id="${escapeAttr(String(row.sourceId || ""))}" data-row-type="${escapeAttr(row.type || "")}" data-row-title="${escapeAttr(row.title || "")}">View Digital Copy</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
    el.classList.add("billing-list");

    attachDigitalCopyHandlers(el);
  }

  function renderEodSection(rows) {
    const el = document.getElementById("section-eod");
    if (!el) return;

    if (!rows.length) {
      el.classList.remove("billing-list");
      el.innerHTML = `<div class="table-empty"><p>No EOD bills available.</p></div>`;
      return;
    }

    el.innerHTML = rows.map((row) => {
      const safeRow = window.Sanitizer ? window.Sanitizer.forRole(row, 'PATIENT') : row;
      return `
        <div class="billing-row">
          <div class="billing-row-main">
            <div class="billing-row-title">
              <strong>${escapeHtml(safeRow.title || "EOD Bill")}</strong>
              <span class="status confirmed">Statement</span>
            </div>
            <span class="billing-row-date">${new Date(safeRow.createdAt || Date.now()).toLocaleString("en-IN")}</span>
          </div>
          <div class="billing-row-meta">
            <strong class="billing-row-amount">₹${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
            <div class="billing-row-actions">
              <button class="btn-download" type="button" data-source-type="${escapeAttr(row.sourceType || "")}" data-source-id="${escapeAttr(String(row.sourceId || ""))}" data-row-type="${escapeAttr(row.type || "")}" data-row-title="${escapeAttr(row.title || "")}">View Digital Copy</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
    el.classList.add("billing-list");

    attachDigitalCopyHandlers(el);
  }

  function openBillModal(bill) {
    setText("modal-invoice-no", bill.billNo || `#${bill.ledgerId}`);
    setText("modal-admission-id", bill.admissionId ? `#${bill.admissionId}` : "N/A");
    setText("modal-bill-date", bill.date || "N/A");

    const statusEl = document.getElementById("modal-bill-status");
    if (statusEl) {
      if (bill.status === "paid") {
        statusEl.textContent = "PAID";
        statusEl.style.color = "var(--success)";
      } else if (bill.hasDischargeSummary) {
        statusEl.textContent = "PENDING PAYMENT (DISCHARGED)";
        statusEl.style.color = "var(--warn)";
      } else {
        statusEl.textContent = "INTERIM EOD STATEMENT";
        statusEl.style.color = "var(--muted)";
      }
    }

    const tbody = document.getElementById("modal-items-tbody");
    if (tbody) {
      if (bill.items && bill.items.length) {
        tbody.innerHTML = bill.items.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.name || "Hospital Service")}</strong></td>
            <td style="text-align:center;">${item.qty || 1}</td>
            <td style="text-align:right;">₹${Number(item.unitPrice || 0).toLocaleString("en-IN")}</td>
            <td style="text-align:right;">₹${Number(item.total || 0).toLocaleString("en-IN")}</td>
          </tr>
        `).join("");
      } else {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted);">No line items recorded.</td></tr>`;
      }
    }

    setText("modal-gross-total", `₹${Number(bill.total || 0).toLocaleString("en-IN")}`);
    setText("modal-ins-deduction", `-₹${Number(bill.insuranceCovered || 0).toLocaleString("en-IN")}`);
    setText("modal-net-payable", `₹${Number(bill.youPay || 0).toLocaleString("en-IN")}`);

    const payBtn = document.getElementById("modal-btn-pay");
    const printBtn = document.getElementById("modal-btn-print");

    if (payBtn) {
      if (bill.status === "paid") {
        payBtn.style.display = "none";
      } else if (!bill.hasDischargeSummary) {
        payBtn.style.display = "inline-flex";
        payBtn.disabled = true;
        payBtn.style.opacity = "0.6";
        payBtn.style.cursor = "not-allowed";
        payBtn.textContent = "Payment Opens on Discharge";
        payBtn.onclick = null;
      } else {
        payBtn.style.display = "inline-flex";
        payBtn.disabled = false;
        payBtn.style.opacity = "1";
        payBtn.style.cursor = "pointer";
        payBtn.textContent = "Pay Now";
        payBtn.onclick = async () => {
          closeModal();
          const method = await selectPaymentMethodModal(bill.youPay);
          if (!method) return;
          try {
            await payBill(bill, method);
            UIFeedback.toast("Payment successful! Receipt has been generated.", "success");
            renderAll();
          } catch (err) {
            UIFeedback.toast(err?.message || "Payment processing failed.", "warning");
          }
        };
      }
    }

    if (printBtn) {
      printBtn.onclick = () => openInvoiceDigitalCopy(bill);
    }

    openModal();
  }

  async function selectPaymentMethodModal(amount) {
    return await UIFeedback.selectOne({
      title: `Pay ₹${Number(amount || 0).toLocaleString("en-IN")}`,
      options: ["UPI", "CARD", "NETBANKING", "CASH"],
    });
  }

  function attachDigitalCopyHandlers(container) {
    container.querySelectorAll("[data-source-type][data-source-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sourceType = btn.getAttribute("data-source-type") || "";
        const sourceId = btn.getAttribute("data-source-id") || "";
        const rowType = btn.getAttribute("data-row-type") || "";
        const rowTitle = btn.getAttribute("data-row-title") || "Digital Copy";
        if (!sourceType || !sourceId) return UIFeedback.toast("Document source not available.", "warning");

        const record = typeof getBillingDocumentByRef === "function"
          ? getBillingDocumentByRef(sourceType, sourceId)
          : null;
        if (!record) return UIFeedback.toast("Unable to open digital copy.", "warning");

        openDigitalCopy(record, { rowType, rowTitle, sourceType, sourceId });
      });
    });
  }

  function openInvoiceDigitalCopy(bill) {
    const profile = getProfile();
    const patientName = profile?.name || "Patient";
    const uhid = profile?.uhid || `FED-${profile?.patientId || "201"}`;
    const dateStr = bill.date || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const win = window.open("", "_blank");
    if (!win) {
      UIFeedback.toast("Please allow popups to view digital copy.", "warning");
      return;
    }

    const itemsHtml = (bill.items || []).map((item) => `
      <tr style="border-bottom:1px solid #E5E5E5;">
        <td style="padding:10px 12px;"><strong>${escapeHtml(item.name || "Hospital Care")}</strong></td>
        <td style="padding:10px 12px; text-align:center;">${item.qty || 1}</td>
        <td style="padding:10px 12px; text-align:right;">₹${Number(item.unitPrice || 0).toLocaleString("en-IN")}</td>
        <td style="padding:10px 12px; text-align:right;">₹${Number(item.total || 0).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)} – Hospital Bill</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; max-width: 780px; margin: 0 auto; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F766E; padding-bottom: 20px; margin-bottom: 24px; }
          .brand h1 { margin: 0; font-size: 24px; color: #0F766E; }
          .brand span { font-size: 12px; color: #64748B; display: block; margin-top: 2px; }
          .badge { background: ${bill.status === "paid" ? "#DCFCE7; color:#15803D;" : "#FEF3C7; color:#B45309;"} padding: 6px 14px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F8FAFC; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
          .meta-grid div strong { display: block; color: #0F172A; font-size: 14px; }
          .meta-grid div span { color: #64748B; font-size: 11px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #F1F5F9; color: #475569; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .totals { margin-left: auto; width: 320px; font-size: 14px; }
          .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #CBD5E1; }
          .totals .net { font-size: 18px; font-weight: 700; color: #0F766E; border-top: 2px solid #0F766E; border-bottom: 2px solid #0F766E; padding: 12px 0; margin-top: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #94A3B8; font-size: 11px; border-top: 1px solid #E2E8F0; padding-top: 16px; }
          .print-btn { background: #0F766E; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 32px; display: block; width: 100%; font-size: 14px; }
          @media print { .print-btn { display:none; } body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>FEDERICO HOSPITALS</h1>
            <span>Healthcare Excellence · Certified Hospital Inpatient &amp; Outpatient Billing</span>
          </div>
          <span class="badge">${bill.status === "paid" ? "PAID IN FULL" : "PENDING PAYMENT"}</span>
        </div>
        <div class="meta-grid">
          <div>
            <span>Patient Details</span>
            <strong>${escapeHtml(patientName)}</strong>
            <small>UHID: ${escapeHtml(uhid)} · Age/Gender: ${escapeHtml(profile?.age ? `${profile.age} yrs / ${profile.gender}` : "N/A")}</small>
          </div>
          <div style="text-align:right;">
            <span>Invoice Details</span>
            <strong>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)}</strong>
            <small>Billing Date: ${escapeHtml(dateStr)} · Admission #${bill.admissionId || "N/A"}</small>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Service / Description</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4" style="text-align:center; padding:16px;">Itemized services consolidated.</td></tr>'}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Gross Amount:</span><span>₹${Number(bill.total || 0).toLocaleString("en-IN")}</span></div>
          <div class="row" style="color:#15803D;"><span>Insurance Deduction:</span><span>-₹${Number(bill.insuranceCovered || 0).toLocaleString("en-IN")}</span></div>
          <div class="row net"><span>Net Payable:</span><span>₹${Number(bill.youPay || 0).toLocaleString("en-IN")}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated tax invoice and receipt. No physical signature is required.</p>
          <p>Federico Hospital Network · ISO 9001:2015 Certified · 24x7 Support: +91 1800-456-7890</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print / Download PDF</button>
      </body>
      </html>
    `);
    win.document.close();
  }

  function openDigitalCopy(record, context = {}) {
    const win = window.open("", "_blank");
    if (!win) {
      UIFeedback.toast("Please allow popups to view digital copy.", "warning");
      return;
    }

    const rowType = context.rowType || record.type || "DOCUMENT";
    const title = context.rowTitle || "Official Document";
    const createdAt = new Date(
      record.receipt_sent_at || record.confirmed_at || record.payment_confirmed_at ||
      record.sent_at || record.created_at || record.ts || Date.now()
    ).toLocaleString("en-IN");
    const patientName = record.patient || record.patient_name || getProfile()?.name || "Patient";
    const patientId = record.patient_id || record.admission_id || record.uhid || "N/A";
    const paymentMode = record.mode || record.payment_mode || "UPI";
    const gross = Number(record.gross || record.amount || 0);
    const coverage = Number(record.coverage || record.insurance_deduction || 0);
    const amount = Number(record.amount || 0);
    const reference = record.receipt_link || record.discharge_summary_link || record.billing_link || record.payment_link || record.link || record.reference || `REC-${record.sourceId || Date.now()}`;
    const docStatus = record.status || "CONFIRMED";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; max-width: 700px; margin: 0 auto; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F766E; padding-bottom: 20px; margin-bottom: 24px; }
          h2 { color: #0F766E; margin: 0; font-size: 22px; }
          .badge { background: #DCFCE7; color: #15803D; padding: 6px 14px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px dashed #E2E8F0; font-size: 14px; }
          .row span:first-child { color: #64748B; font-weight: 500; }
          .row span:last-child { font-weight: 600; color: #0F172A; }
          .net { font-size: 18px; font-weight: 700; color: #0F766E; border-bottom: 2px solid #0F766E; border-top: 2px solid #0F766E; padding: 16px 0; margin-top: 10px; }
          .net span { color: #0F766E !important; }
          .footer { margin-top: 36px; text-align: center; color: #94A3B8; font-size: 11px; }
          .print-btn { background: #0F766E; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 32px; display: block; width: 100%; }
          @media print { .print-btn { display:none; } body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2>FEDERICO HOSPITALS</h2>
            <small style="color:#64748B;">Official Payment Receipt &amp; Voucher</small>
          </div>
          <span class="badge">${escapeHtml(String(docStatus).replace(/_/g, " "))}</span>
        </div>
        <div class="row"><span>Document Title</span><span>${escapeHtml(title)}</span></div>
        <div class="row"><span>Document Type</span><span>${escapeHtml(rowType)}</span></div>
        <div class="row"><span>Patient Name</span><span>${escapeHtml(patientName)}</span></div>
        <div class="row"><span>Patient ID / Admission</span><span>${escapeHtml(String(patientId))}</span></div>
        <div class="row"><span>Generated Date &amp; Time</span><span>${escapeHtml(createdAt)}</span></div>
        <div class="row"><span>Payment Mode</span><span>${escapeHtml(String(paymentMode).toUpperCase())}</span></div>
        <div class="row"><span>Gross Bill Amount</span><span>₹${gross.toLocaleString("en-IN")}</span></div>
        <div class="row" style="color:#15803D;"><span>Insurance Covered</span><span>-₹${coverage.toLocaleString("en-IN")}</span></div>
        <div class="row net"><span>Net Paid</span><span>₹${amount.toLocaleString("en-IN")}</span></div>
        <div class="row"><span>Transaction Reference</span><span>${escapeHtml(reference)}</span></div>
        <div class="footer">
          <p>Federico Hospitals · Thank you for choosing our care network.</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
      </body>
      </html>
    `);
    win.document.close();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
});

