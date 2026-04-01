// front-end/patient-billing.js

document.addEventListener("DOMContentLoaded", () => {

    /* ── 1. NAVIGATION (Run immediately, outside of data loading) ── */
    setupNavigation();

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
        document.getElementById("logout-btn")?.addEventListener("click", () => {
            if (window.RoleAccess) window.RoleAccess.logout();
            else sessionStorage.removeItem("userRole");
            window.location.href = "landing-page.html";
        });
    }

    /* ── 2. DATA RENDERING (Waits for AppStore) ── */

    // Computes real-time status — never trusts the hardcoded JSON status
    function getEffectiveStatus(bill) {
        if (bill.status === "paid") return "paid";
        const today = new Date().toISOString().split("T")[0]; // e.g. "2026-03-30"
        if (bill.dueDateISO < today) return "overdue";
        return "pending";
    }

    // Wait for store to finish loading the JSON / LocalStorage
    function renderAll() {
        renderKPIs();
        renderDocuments();
        renderTable(getBills(), "all");
    }

    onStoreReady(() => {
        renderAll();
        setupFilterTabs();
        setupSearch();
        setupModal();
    });
    window.addEventListener("patientStoreUpdated", renderAll);

    /* ── KPI Cards ───────────────────────────────────── */
    function renderKPIs() {
        const today = new Date().toISOString().split("T")[0];
        const bills = getBills();

        // KPI 1 — Total Outstanding
        const unpaidBills = bills.filter(b => getEffectiveStatus(b) !== "paid");
        const outstanding = unpaidBills.reduce((sum, b) => sum + b.youPay, 0);
        document.querySelector(".kpi-value.danger").textContent =
            "₹" + outstanding.toLocaleString("en-IN");
        document.querySelector(".kpi-sub.warning-text").textContent =
            unpaidBills.length + " bill" + (unpaidBills.length !== 1 ? "s" : "") + " due";

        // KPI 2 — Paid This Year
        const year = new Date().getFullYear().toString();
        const paidBills = bills.filter(b => b.status === "paid");
        const paidThisYear = paidBills
            .filter(b => b.dueDateISO.startsWith(year))
            .reduce((sum, b) => sum + b.youPay, 0);
        document.querySelector(".kpi-value.success").textContent =
            "₹" + paidThisYear.toLocaleString("en-IN");

        // Update "6 payments made" → dynamic count
        const kpiSubs = document.querySelectorAll(".kpi-sub");
        kpiSubs[1].textContent = paidBills.length + " payment" + (paidBills.length !== 1 ? "s" : "") + " made";

        // KPI 3 — Insurance Covered
        const totalInsurance = bills.reduce((sum, b) => sum + b.insuranceCovered, 0);
        document.querySelector(".kpi-value.primary").textContent =
            "₹" + totalInsurance.toLocaleString("en-IN");

        // KPI 3 sub — insurance provider from store
        const ins = AppStore.patient.insurance;
        kpiSubs[2].textContent = ins.provider + " – " + (ins.verified ? "Active" : "Unverified");

        // KPI 4 — Next Due Date
        const nextBill = unpaidBills.sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO))[0] || null;
        const dueDateValEl = document.querySelectorAll(".kpi-value")[3];
        const dueDateSubEl = kpiSubs[3];

        if (nextBill) {
            dueDateValEl.textContent = nextBill.dueDate;
            if (nextBill.dueDateISO < today) {
                dueDateSubEl.textContent = "Already overdue";
                dueDateSubEl.style.color = "var(--danger)";
            } else {
                const daysLeft = Math.ceil(
                    (new Date(nextBill.dueDateISO) - new Date(today)) / (1000 * 60 * 60 * 24)
                );
                dueDateSubEl.textContent = "In " + daysLeft + " day" + (daysLeft !== 1 ? "s" : "");
                dueDateSubEl.style.color = daysLeft <= 7 ? "var(--warn)" : "var(--muted)";
            }
        } else {
            dueDateValEl.textContent = "None";
            dueDateSubEl.textContent = "All bills paid";
            dueDateSubEl.style.color = "var(--success)";
        }

        const profile = getProfile();
        const insurance = profile?.insurance || {};
        const totalBilled = bills.reduce((sum, bill) => sum + bill.total, 0);
        const totalInsuranceCovered = bills.reduce((sum, bill) => sum + bill.insuranceCovered, 0);

        const verifiedBadge = document.querySelector(".ins-badge");
        const insuranceTitle = document.querySelector(".ins-left strong");
        const insuranceCopy = document.querySelector(".ins-left p");
        const breakdownValues = document.querySelectorAll(".ins-item strong");

        if (verifiedBadge) verifiedBadge.textContent = insurance.verified ? "Verified" : "Pending";
        if (insuranceTitle) insuranceTitle.textContent = `${insurance.provider || "Self Pay"} Insurance`;
        if (insuranceCopy) {
            insuranceCopy.textContent = `Policy ${insurance.policyNumber || "NA"} · Coverage ₹${Number(insurance.coverage || 0).toLocaleString("en-IN")} · Valid till ${insurance.validTo || "NA"}`;
        }

        if (breakdownValues[0]) breakdownValues[0].textContent = "₹" + totalBilled.toLocaleString("en-IN");
        if (breakdownValues[1]) breakdownValues[1].textContent = "₹" + totalInsuranceCovered.toLocaleString("en-IN");
        if (breakdownValues[2]) breakdownValues[2].textContent = "₹" + outstanding.toLocaleString("en-IN");
    }

    function renderDocuments() {
        const container = document.getElementById("patient-documents-links");
        if (!container) return;

        const documents = getDocuments();
        if (documents.length === 0) {
            container.innerHTML = `
                <div class="ins-item">
                    <span>No documents yet</span>
                    <strong>--</strong>
                </div>
            `;
            return;
        }

        container.innerHTML = documents.slice(0, 3).map(doc => `
            <div class="ins-item">
                <span>${doc.title}</span>
                <strong><a href="${doc.reference}" target="_blank" style="color: inherit; text-decoration: none;">Open</a></strong>
            </div>
        `).join("");
    }

    /* ── Table Rendering ─────────────────────────────── */
    function renderTable(bills, filter) {
        const tbody = document.querySelector("#bills-table tbody");
        const emptyState = document.getElementById("empty-state");
        const tableWrap = document.querySelector(".table-wrap");
        const searchTerm = document.getElementById("bill-search").value.toLowerCase();

        const filtered = bills.filter(bill => {
            const status = getEffectiveStatus(bill);
            const matchFilter = filter === "all" || status === filter;
            const matchSearch =
                bill.billNo.toLowerCase().includes(searchTerm) ||
                bill.department.toLowerCase().includes(searchTerm) ||
                bill.description.toLowerCase().includes(searchTerm);
            return matchFilter && matchSearch;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = "";
            emptyState.classList.remove("hidden");
            tableWrap.classList.add("hidden");
            return;
        }

        emptyState.classList.add("hidden");
        tableWrap.classList.remove("hidden");

        tbody.innerHTML = filtered.map(bill => {
            const status = getEffectiveStatus(bill);
            const dueDateClass = status === "overdue" ? "danger-text"
                : status === "pending" ? "warn-text" : "";
            const statusBadge = `<span class="status ${status}">${capitalize(status)}</span>`;
            const actions = status === "paid"
                ? `<div class="action-btns">
           <button class="btn-download" type="button" data-bill-id="${bill.id}">Receipt</button>
         </div>`
                : `<div class="action-btns">
           <button class="btn-view" type="button" data-bill-id="${bill.id}">View</button>
           <button class="btn-dispute" type="button" data-bill-id="${bill.id}">Dispute</button>
         </div>`;

            return `
      <tr data-status="${status}">
        <td class="bill-id">${bill.billNo}</td>
        <td>${bill.date}</td>
        <td>${bill.department}</td>
        <td>${bill.description}</td>
        <td>₹${bill.total.toLocaleString("en-IN")}</td>
        <td class="success">₹${bill.insuranceCovered.toLocaleString("en-IN")}</td>
        <td><strong>₹${bill.youPay.toLocaleString("en-IN")}</strong></td>
        <td class="${dueDateClass}">${bill.dueDate}</td>
        <td>${statusBadge}</td>
        <td>${actions}</td>
      </tr>`;
        }).join("");

        attachRowListeners();
    }

    /* ── Row Button Listeners ────────────────────────── */
    function attachRowListeners() {
        document.querySelectorAll(".btn-view").forEach(btn => {
            btn.addEventListener("click", () => openModal(btn.dataset.billId));
        });

        document.querySelectorAll(".btn-dispute").forEach(btn => {
            btn.addEventListener("click", () => {
                const bill = getBillById(btn.dataset.billId);
                if (bill && !bill.disputed) {
                    disputeBill(btn.dataset.billId);
                    showToast("Dispute submitted for " + bill.billNo + ". Billing team will contact you within 2 business days.", "warn");
                } else {
                    showToast("This bill has already been disputed.", "info");
                }
            });
        });

        document.querySelectorAll(".btn-download").forEach(btn => {
            btn.addEventListener("click", () => {
                const bill = getBillById(btn.dataset.billId);
                showToast("Receipt for " + bill.billNo + " will download once backend is connected.", "info");
            });
        });
    }

    /* ── Filter Tabs ─────────────────────────────────── */
    function setupFilterTabs() {
        const tabs = document.querySelectorAll(".filter-tab");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                renderTable(getBills(), tab.dataset.filter);
            });
        });
    }

    /* ── Search ──────────────────────────────────────── */
    function setupSearch() {
        document.getElementById("bill-search").addEventListener("input", () => {
            const activeFilter = document.querySelector(".filter-tab.active").dataset.filter;
            renderTable(getBills(), activeFilter);
        });
    }

    /* ── Modal ───────────────────────────────────────── */
    const modalOverlay = document.getElementById("bill-modal");

    function openModal(billId) {
        const bill = getBillById(billId);
        if (!bill) return;

        document.getElementById("m-bill-id").textContent = bill.billNo;

        // Update the 4 meta fields
        const metas = document.querySelectorAll(".modal-meta strong");
        if (metas[0]) metas[0].textContent = bill.billNo;
        const metaSpans = document.querySelectorAll(".modal-meta");
        if (metaSpans[1]) metaSpans[1].querySelector("strong").textContent = bill.date;
        if (metaSpans[2]) metaSpans[2].querySelector("strong").textContent = bill.department;

        // Status badge
        const statusCell = metaSpans[3];
        if (statusCell) {
            statusCell.innerHTML = `<span>Status</span><span class="status ${bill.status}">${capitalize(bill.status)}</span>`;
        }

        // Itemized table
        const itemTbody = document.querySelector(".itemized-table tbody");
        itemTbody.innerHTML = bill.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₹${item.unitPrice.toLocaleString("en-IN")}</td>
        <td>₹${item.total.toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

        // Footer totals
        const tfoot = document.querySelector(".itemized-table tfoot");
        tfoot.innerHTML = `
      <tr>
        <td colspan="3"><strong>Subtotal</strong></td>
        <td><strong>₹${bill.total.toLocaleString("en-IN")}</strong></td>
      </tr>
      <tr class="ins-row">
        <td colspan="3">Insurance Covered (${AppStore.patient.insurance.provider})</td>
        <td class="success">– ₹${bill.insuranceCovered.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3"><strong>Amount Due</strong></td>
        <td><strong class="${bill.status === 'paid' ? 'success' : 'danger'}">
          ₹${bill.youPay.toLocaleString("en-IN")}
        </strong></td>
      </tr>
    `;

        // Raise Dispute button — hide for paid bills
        const disputeBtn = document.querySelector(".modal-btn-dispute");
        if (disputeBtn) {
            disputeBtn.style.display = bill.status === "paid" ? "none" : "";
            disputeBtn.onclick = () => {
                if (!bill.disputed) {
                    disputeBill(bill.id);
                    showToast("Dispute submitted for " + bill.billNo, "warn");
                    closeModal();
                } else {
                    showToast("Already disputed.", "info");
                }
            };
        }

        modalOverlay.classList.remove("hidden");
    }

    function closeModal() {
        modalOverlay.classList.add("hidden");
    }

    function setupModal() {
        document.getElementById("modal-close").addEventListener("click", closeModal);
        document.getElementById("modal-close-btn").addEventListener("click", closeModal);
        modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });
        document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
    }

    /* ── Toast ───────────────────────────────────────── */
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
            t.style.transform = "translateY(0)"; t.style.opacity = "1";
        }));
        setTimeout(() => {
            t.style.transform = "translateY(80px)"; t.style.opacity = "0";
            setTimeout(() => t.remove(), 300);
        }, 3500);
    }

    /* ── Utility ─────────────────────────────────────── */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

});
