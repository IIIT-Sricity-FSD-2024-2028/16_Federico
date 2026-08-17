document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupTabs();

  onStoreReady(renderAll);
  window.addEventListener("patientStoreUpdated", renderAll);

  function setupNavigation() {
    document.getElementById("nav-dashboard")?.addEventListener("click", () => {
      window.location.href = "patient-dashboard.html";
    });
    document.getElementById("nav-book")?.addEventListener("click", () => {
      window.location.href = "patient-book-appointment.html";
    });
    document.getElementById("nav-bill")?.addEventListener("click", () => {
      window.location.href = "patient-billing.html";
    });
    document.getElementById("nav-profile")?.addEventListener("click", () => {
      window.location.href = "patient-profile.html";
    });
    document.getElementById("profile-chip")?.addEventListener("click", () => {
      window.location.href = "patient-profile.html";
    });
  }

  function setupTabs() {
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const section = tab.dataset.section;
        document.getElementById("section-receipts")?.classList.add("hidden");
        document.getElementById("section-discharge")?.classList.add("hidden");
        document.getElementById("section-eod")?.classList.add("hidden");
        document.getElementById(`section-${section}`)?.classList.remove("hidden");
      });
    });
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
    renderKpis();
    renderSections();
  }

  function renderPatientHeader() {
    const profile = getProfile();
    const safeName = String(profile?.name || "Patient").trim();
    const initials = safeName
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

  function renderKpis() {
    const sections = getBillingSections();
    const visits = getVisits();

    const paidTotal = (sections.receipts || [])
      .filter((row) => row.type === "RECEIPT" || row.type === "PAYMENT_CONFIRMED")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pendingLinksTotal = (sections.receipts || [])
      .filter((row) => row.type === "PAYMENT_LINK")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const dischargeTotal = (sections.discharge || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const eodTotal = (sections.eod || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const totalBilled = paidTotal + pendingLinksTotal + dischargeTotal + eodTotal;
    const totalPaid = paidTotal;
    const pending = pendingLinksTotal;

    setText("kpi-total-billed", `Rs ${totalBilled.toLocaleString("en-IN")}`);
    setText("kpi-paid", `Rs ${totalPaid.toLocaleString("en-IN")}`);
    setText("kpi-pending", `Rs ${pending.toLocaleString("en-IN")}`);
    setText("kpi-visits", String((visits || []).length));

    setText("kpi-total-billed-sub", `${(sections.receipts || []).length + (sections.discharge || []).length + (sections.eod || []).length} documents`);
    setText("kpi-paid-sub", `${(sections.receipts || []).filter((row) => row.type === "RECEIPT").length} receipts`);
    setText("kpi-pending-sub", `${(sections.receipts || []).filter((row) => row.type === "PAYMENT_LINK").length} payment links`);
  }

  function renderSections() {
    const sections = getBillingSections();

    renderReceiptsSection(sections.receipts || []);
    renderDischargeSection(sections.discharge || []);
    renderEodSection(sections.eod || []);
  }

  function renderReceiptsSection(rows) {
    const el = document.getElementById("section-receipts");
    if (!el) return;

    if (!rows.length) {
      el.classList.remove("billing-list");
      el.innerHTML = `<div class="table-empty"><p>No receipts or payment links available.</p></div>`;
      return;
    }

    el.innerHTML = rows.map((row) => {
      const safeRow = window.Sanitizer ? window.Sanitizer.forRole(row, 'PATIENT') : row;
      const isPaymentLink = row.type === "PAYMENT_LINK";

      const action = isPaymentLink
        ? `<button class="btn-view" type="button"
               data-dispatch-id="${escapeAttr(String(row.dispatchId || ""))}">
               Pay Now
             </button>`
        : `<button class="btn-download" type="button"
               data-source-type="${escapeAttr(row.sourceType || "")}"
               data-source-id="${escapeAttr(String(row.sourceId || ""))}"
               data-row-type="${escapeAttr(row.type || "")}"
               data-row-title="${escapeAttr(row.title || "")}">
               View Digital Copy
             </button>`;
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
            <strong class="billing-row-amount">Rs ${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
            <div class="billing-row-actions">${action}</div>
          </div>
        </div>
      `;
    }).join("");
    el.classList.add("billing-list");

    el.querySelectorAll("[data-dispatch-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const dispatchId = btn.getAttribute("data-dispatch-id") || "";
        if (!dispatchId) return showToast("Unable to process payment for this bill.", "warn");

        // Patient selects payment method
        const method = window.prompt(
          "Select payment method:\nType exactly one of: UPI, CARD, CASH, NETBANKING",
          "UPI"
        );
        if (!method) return; // user cancelled

        const normalised = method.trim().toUpperCase();
        const validMethods = ["UPI", "CARD", "CASH", "NETBANKING"];
        if (!validMethods.includes(normalised)) {
          showToast("Invalid payment method. Type exactly: UPI, CARD, CASH, or NETBANKING.", "warn");
          return;
        }

        btn.disabled = true;
        try {
          const paid = await payDispatchedBill(dispatchId, normalised);
          if (!paid) {
            showToast("Unable to process payment. Please refresh and try again.", "warn");
            return;
          }
          showToast("Payment received — receipt generated.", "success");
          renderAll();
        } catch (err) {
          showToast(err?.message || "Payment failed. Please try again.", "warn");
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
      el.innerHTML = `<div class="table-empty"><p>No discharge summary available.</p></div>`;
      return;
    }

    el.innerHTML = rows.map((row) => {
      const safeRow = window.Sanitizer ? window.Sanitizer.forRole(row, 'PATIENT') : row;
      return `
      <div class="billing-row">
        <div class="billing-row-main">
          <div class="billing-row-title">
            <strong>${escapeHtml(safeRow.title || "Discharge Summary")}</strong>
          </div>
          <span class="billing-row-date">${new Date(safeRow.createdAt || Date.now()).toLocaleString("en-IN")}</span>
        </div>
        <div class="billing-row-meta">
          <strong class="billing-row-amount">Rs ${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
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
          </div>
          <span class="billing-row-date">${new Date(safeRow.createdAt || Date.now()).toLocaleString("en-IN")}</span>
        </div>
        <div class="billing-row-meta">
          <strong class="billing-row-amount">Rs ${Number(safeRow.amount || 0).toLocaleString("en-IN")}</strong>
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

  function attachDigitalCopyHandlers(container) {
    container.querySelectorAll("[data-source-type][data-source-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sourceType = btn.getAttribute("data-source-type") || "";
        const sourceId = btn.getAttribute("data-source-id") || "";
        const rowType = btn.getAttribute("data-row-type") || "";
        const rowTitle = btn.getAttribute("data-row-title") || "Digital Copy";
        if (!sourceType || !sourceId) return showToast("Document source not available.", "warn");

        const record = typeof getBillingDocumentByRef === "function"
          ? getBillingDocumentByRef(sourceType, sourceId)
          : null;
        if (!record) return showToast("Unable to open digital copy.", "warn");

        openDigitalCopy(record, { rowType, rowTitle, sourceType, sourceId });
      });
    });
  }

  function openDigitalCopy(record, context = {}) {
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Please allow popups to view digital copy.", "warn");
      return;
    }

    const rowType = context.rowType || record.type || "DOCUMENT";
    const title = context.rowTitle || "Digital Copy";
    const createdAt = new Date(
      record.receipt_sent_at || record.confirmed_at || record.payment_confirmed_at ||
      record.sent_at || record.created_at || record.ts || Date.now()
    ).toLocaleString("en-IN");
    const patientName = record.patient || record.patient_name || getProfile()?.name || "Patient";
    const patientId = record.patient_id || record.admission_id || record.uhid || "N/A";
    const paymentMode = record.mode || record.payment_mode || "N/A";
    const gross = Number(record.gross || record.amount || 0);
    const coverage = Number(record.coverage || record.insurance_deduction || 0);
    const amount = Number(record.amount || 0);
    const reference = record.receipt_link || record.discharge_summary_link || record.billing_link || record.payment_link || record.link || record.reference || "N/A";
    const docStatus = record.status || "AVAILABLE";

    win.document.write(`
      <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 50px; color: #1A1A1A; max-width: 700px; margin: 0 auto; background: #F9F8F6; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1A1A1A; padding-bottom: 20px; margin-bottom: 30px; }
          h2 { font-family: 'Playfair Display', serif; font-weight: 500; color: #1A1A1A; margin: 0; font-size: 26px; }
          .badge { background: #E7F0EA; color: #2C5B41; padding: 6px 14px; border-radius: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px dashed #D8D2C8; font-size: 15px; }
          .row span:first-child { color: #6C6863; font-weight: 500; }
          .row span:last-child { font-weight: 600; color: #1A1A1A; }
          .net { font-size: 20px; font-weight: 600; color: #9C7A1E; border-bottom: 1px solid #1A1A1A; border-top: 1px solid #1A1A1A; padding: 20px 0; margin-top: 10px; }
          .net span { color: #9C7A1E !important; }
          .print-btn { background: #1A1A1A; color: #F9F8F6; border: none; padding: 14px 28px; border-radius: 0; cursor: pointer; font-size: 12px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 40px; display: block; width: 100%; }
          @media print { .print-btn { display:none; } body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Payment Receipt</h2>
          <span class="badge">${escapeHtml(String(docStatus).replace(/_/g, " "))}</span>
        </div>
        <div class="row"><span>Document</span><span>${escapeHtml(title)}</span></div>
        <div class="row"><span>Type</span><span>${escapeHtml(rowType)}</span></div>
        <div class="row"><span>Patient Name</span><span>${escapeHtml(patientName)}</span></div>
        <div class="row"><span>Patient ID</span><span>${escapeHtml(String(patientId))}</span></div>
        <div class="row"><span>Generated</span><span>${escapeHtml(createdAt)}</span></div>
        <div class="row"><span>Payment Mode</span><span>${escapeHtml(String(paymentMode).toUpperCase())}</span></div>
        <div class="row"><span>Gross Total</span><span>Rs ${gross.toLocaleString("en-IN")}</span></div>
        <div class="row"><span>Insurance Coverage</span><span>-Rs ${coverage.toLocaleString("en-IN")}</span></div>
        <div class="row net"><span>Net Paid</span><span>Rs ${amount.toLocaleString("en-IN")}</span></div>
        <div class="row"><span>Reference</span><span>${escapeHtml(reference)}</span></div>
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
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function showToast(message, type = "info") {
    document.querySelector(".toast-notify")?.remove();
    const colors = { warn: "#7a4b00", info: "#1c2f42", success: "#1a5c3a" };
    const t = document.createElement("div");
    t.className = "toast-notify";
    t.textContent = message;
    Object.assign(t.style, {
      position: "fixed", bottom: "28px", right: "28px", zIndex: "9999",
      background: colors[type] || colors.info, color: "#fff",
      padding: "13px 20px", borderRadius: "12px", fontSize: "13px",
      fontWeight: "600", fontFamily: "Inter, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxWidth: "380px",
      lineHeight: "1.5", transform: "translateY(80px)", opacity: "0",
      transition: "transform 280ms ease, opacity 280ms ease"
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      t.style.transform = "translateY(0)";
      t.style.opacity = "1";
    }));
    setTimeout(() => {
      t.style.transform = "translateY(80px)";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }
});
