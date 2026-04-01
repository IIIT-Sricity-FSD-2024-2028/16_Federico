// front-end/patient-dashboard.js

document.addEventListener("DOMContentLoaded", () => {

    /* ── Navigation (keep working even before store loads) ── */
    document.getElementById("nav-dashboard")?.addEventListener("click", () => {
        window.location.href = "patient-dashboard.html";
    });
    document.getElementById("nav-book")?.addEventListener("click", () => {
        window.location.href = "patient-book-appointment.html";
    });
    document.getElementById("nav-bill")?.addEventListener("click", () => {
        window.location.href = "patient-billing.html";
    });
    document.getElementById("nav-profile-link")?.addEventListener("click", () => {
        window.location.href = "patient-profile.html";
    });
    document.getElementById("profile-chip")?.addEventListener("click", () => {
        window.location.href = "patient-profile.html";
    });
    document.querySelector(".logout-btn")?.addEventListener("click", () => {
        if (window.RoleAccess) window.RoleAccess.logout();
        else sessionStorage.removeItem("userRole");
        window.location.href = "landing-page.html";
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });

    /* ── Modal helpers ── */
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add("hidden");
            document.body.style.overflow = "";
        }
    }

    document.getElementById("view-all-appt")?.addEventListener("click", e => {
        e.preventDefault();
        openModal("modal-appointments");
    });
    document.getElementById("toggle-visits")?.addEventListener("click", e => {
        e.preventDefault();
        openModal("modal-visits");
    });
    document.getElementById("view-all-bills")?.addEventListener("click", e => {
        e.preventDefault();
        openModal("modal-bills");
    });

    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => closeModal(btn.dataset.modal));
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(m => closeModal(m.id));
        }
    });

    document.getElementById("modal-book-new")?.addEventListener("click", () => {
        closeModal("modal-appointments");
        window.location.href = "patient-book-appointment.html";
    });
    document.getElementById("modal-go-bills")?.addEventListener("click", () => {
        closeModal("modal-bills");
        window.location.href = "patient-billing.html";
    });

    /* ── Wait for store then render everything ── */
    function renderAll() {
        renderProfile();
        renderWelcome();
        renderSummaryCards();
        renderAppointmentsTable();
        renderVisitsList();
        renderNotificationsPanel();
        renderBillSidebar();
        renderDocumentsPanel();
        renderAppointmentsModal();
        renderVisitsModal();
        renderBillsModal();
    }

    onStoreReady(renderAll);
    window.addEventListener("patientStoreUpdated", renderAll);

    /* ── Helpers ── */
    function getEffectiveStatus(bill) {
        if (bill.status === "paid") return "paid";
        const today = new Date().toISOString().split("T")[0];
        return bill.dueDateISO < today ? "overdue" : "pending";
    }

    function statusBadge(status) {
        const map = { confirmed: "confirmed", scheduled: "scheduled", pending: "pending", cancelled: "pending" };
        return `<span class="status ${map[status.toLowerCase()] || "pending"}">${status}</span>`;
    }

    function billStatusBadge(status) {
        if (status === "paid") return `<span class="status confirmed">Paid</span>`;
        if (status === "overdue") return `<span class="status pending" style="background:#fde8e8;color:#c0392b">Overdue</span>`;
        return `<span class="status pending">Pending</span>`;
    }

    /* ── Profile sidebar ── */
    function renderProfile() {
        const p = getProfile();
        if (!p) return;

        // Avatar initials
        document.querySelectorAll(".profile-avatar").forEach(el => el.textContent = p.initials);
        document.querySelectorAll(".user-avatar").forEach(el => el.textContent = p.initials);

        // Profile meta
        const metaStrong = document.querySelector(".profile-meta strong");
        const metaSpan = document.querySelector(".profile-meta span");
        if (metaStrong) metaStrong.textContent = p.name;
        if (metaSpan) metaSpan.textContent = "UHID: " + p.uhid;

        // Profile grid values — target by position
        const values = document.querySelectorAll(".profile-grid .value");
        if (values[0]) values[0].textContent = p.age + " yrs / " + p.gender;
        if (values[1]) values[1].textContent = p.bloodGroup;
        if (values[2]) values[2].textContent = p.phone;

        // Insurance grid values (second .profile-grid)
        const insValues = document.querySelectorAll(".insurance-grid .value");
        if (insValues[0]) insValues[0].innerHTML = `<span class="verify-badge">${p.insurance.verified ? "Verified" : "Unverified"}</span>`;
        if (insValues[1]) insValues[1].textContent = p.insurance.provider;
        if (insValues[2]) insValues[2].textContent = "₹" + p.insurance.coverage.toLocaleString("en-IN");
    }

    /* ── Welcome text ── */
    function renderWelcome() {
        const p = getProfile();
        const span = document.querySelector(".welcome-text span");
        if (span && p) span.textContent = p.firstName;

        // Topbar name
        const topbarName = document.querySelector(".user-meta strong");
        if (topbarName && p) topbarName.textContent = p.firstName;
    }

    /* ── Summary cards ── */
    function renderSummaryCards() {
        const upcoming = getUpcomingAppointments();
        const visits = getVisits();
        const bills = getBills();
        const unpaid = bills.filter(b => getEffectiveStatus(b) !== "paid");
        const totalOwed = unpaid.reduce((sum, b) => sum + b.youPay, 0);

        const cards = document.querySelectorAll(".summary-card");

        // Card 1 — Upcoming Appointments
        if (cards[0]) {
            cards[0].querySelector("h2").textContent = upcoming.length;
            const sm = cards[0].querySelector("small");
            if (sm) {
                if (upcoming.length > 0) {
                    sm.textContent = "Next: " + upcoming[0].displayDate + ", " + upcoming[0].time;
                    sm.className = "info-teal";
                } else {
                    sm.textContent = "No upcoming appointments";
                    sm.className = "";
                }
            }
        }

        // Card 2 — Pending Bills
        if (cards[1]) {
            cards[1].querySelector("h2").textContent = "₹" + totalOwed.toLocaleString("en-IN");
            const sm = cards[1].querySelector("small");
            if (sm) {
                sm.textContent = unpaid.length + " bill" + (unpaid.length !== 1 ? "s" : "") + " due";
                sm.className = unpaid.length > 0 ? "info-warning" : "info-teal";
            }
        }

        // Card 3 — Last Visit
        if (cards[2]) {
            cards[2].querySelector("h2").textContent = visits.length > 0
                ? visits[0].date.split(",")[0]  // "Mar 2"
                : "—";
            const sm = cards[2].querySelector("small");
            if (sm) {
                sm.textContent = visits.length > 0 ? visits[0].description : "No visits yet";
                sm.className = "";
            }
        }
    }

    /* ── Appointments table (main panel) ── */
    function renderAppointmentsTable() {
        const tbody = document.querySelector(".table-panel tbody");
        if (!tbody) return;

        const upcoming = getUpcomingAppointments();
        if (upcoming.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No upcoming appointments.</td></tr>`;
            return;
        }

        tbody.innerHTML = upcoming.map(a => `
      <tr>
        <td>${a.displayDate}</td>
        <td>${a.time}</td>
        <td>${a.department}</td>
        <td>${a.type}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>`
        ).join("");
    }

    /* ── Recent Visits list (main panel) ── */
    function renderVisitsList() {
        const container = document.querySelector(".visits-panel .visit-list");
        if (!container) return;

        const recent = getVisits().slice(0, 3);
        if (recent.length === 0) {
            container.innerHTML = `<div class="visit-item"><span style="color:var(--muted)">No visit history.</span></div>`;
            return;
        }

        container.innerHTML = recent.map(v => `
      <div class="visit-item">
        <div class="visit-title">
          <span class="visit-dot"></span>
          <strong>${v.description}</strong>
        </div>
        <span class="visit-date">${v.date}</span>
      </div>`
        ).join("");
    }

    function renderNotificationsPanel() {
        const container = document.getElementById("patient-notifications-list");
        if (!container) return;

        const notifications = getNotifications();
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="visit-item">
                    <div class="visit-title">
                        <span class="visit-dot"></span>
                        <strong>No updates yet</strong>
                    </div>
                    <span class="visit-date">PRE decisions will appear here.</span>
                </div>`;
            return;
        }

        const colorMap = {
            success: "#10b981",
            warning: "#f59e0b",
            danger: "#ef4444",
            info: "#3b82f6"
        };

        container.innerHTML = notifications.slice(0, 4).map(note => `
            <div class="visit-item">
                <div class="visit-title">
                    <span class="visit-dot" style="background:${colorMap[note.variant] || colorMap.info};"></span>
                    <strong>${note.title}</strong>
                </div>
                <span class="visit-date">${new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <div style="font-size:13px; color:#64748b; margin-top:6px; line-height:1.5;">${note.message}</div>
            </div>
        `).join("");
    }

    /* ── Bill sidebar ── */
    function renderBillSidebar() {
        const listEl = document.querySelector(".bill-list");
        const totalEl = document.querySelector(".bill-total strong");
        if (!listEl) return;

        const bills = getBills();
        const unpaid = bills.filter(b => getEffectiveStatus(b) !== "paid");
        const totalOwed = unpaid.reduce((sum, b) => sum + b.youPay, 0);

        if (unpaid.length === 0) {
            listEl.innerHTML = `
        <div class="bill-item">
          <div><span style="color:var(--muted)">All bills paid — you're clear!</span></div>
        </div>`;
        } else {
            listEl.innerHTML = unpaid.slice(0, 2).map(bill => {
                const status = getEffectiveStatus(bill);
                return `
          <div class="bill-item">
            <div>
              <strong>${bill.billNo}</strong>
              <span>${bill.department} – ${bill.date}</span>
            </div>
            <div class="bill-meta">
              ${billStatusBadge(status)}
              <strong>₹${bill.youPay.toLocaleString("en-IN")}</strong>
            </div>
          </div>`;
            }).join("");
        }

        if (totalEl) {
            totalEl.textContent = "₹" + totalOwed.toLocaleString("en-IN");
        }
    }

    function renderDocumentsPanel() {
        const container = document.getElementById("patient-documents-list");
        if (!container) return;

        const documents = getDocuments();
        if (documents.length === 0) {
            container.innerHTML = `
                <div class="bill-item">
                    <div>
                        <strong>No documents yet</strong>
                        <span>Documents sent by HOM will appear here.</span>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = documents.slice(0, 4).map(doc => `
            <div class="bill-item">
                <div>
                    <strong>${doc.title}</strong>
                    <span>${new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div class="bill-meta">
                    <button type="button" class="status pending" style="border:none; cursor:pointer;" onclick="window.open('${doc.reference}', '_blank')">Open</button>
                </div>
            </div>
        `).join("");
    }

    /* ── Appointments modal tbody ── */
    function renderAppointmentsModal() {
        const tbody = document.querySelector("#modal-appointments tbody");
        if (!tbody) return;

        const upcoming = getUpcomingAppointments();
        if (upcoming.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No upcoming appointments.</td></tr>`;
            return;
        }

        tbody.innerHTML = upcoming.map(a => `
      <tr>
        <td>${a.displayDate}</td>
        <td>${a.time}</td>
        <td>${a.department}</td>
        <td>${a.type}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>`
        ).join("");
    }

    /* ── Visits modal list ── */
    function renderVisitsModal() {
        const container = document.querySelector("#modal-visits .modal-visit-list");
        if (!container) return;

        const visits = getVisits();
        container.innerHTML = visits.map(v => `
      <div class="visit-item">
        <div class="visit-title">
          <span class="visit-dot"></span>
          <strong>${v.description}</strong>
        </div>
        <span class="visit-date">${v.date}</span>
      </div>`
        ).join("");
    }

    /* ── Bills modal table ── */
    function renderBillsModal() {
        const tbody = document.querySelector("#modal-bills tbody");
        const totalEl = document.querySelector(".modal-bill-total strong");
        if (!tbody) return;

        const bills = getBills();
        const unpaid = bills.filter(b => getEffectiveStatus(b) !== "paid");
        const totalOwed = unpaid.reduce((sum, b) => sum + b.youPay, 0);

        tbody.innerHTML = bills.map(bill => {
            const status = getEffectiveStatus(bill);
            return `
        <tr>
          <td class="bill-id-cell">${bill.billNo}</td>
          <td>${bill.description}</td>
          <td><strong>₹${bill.youPay.toLocaleString("en-IN")}</strong></td>
          <td>${bill.dueDate}</td>
          <td>${billStatusBadge(status)}</td>
        </tr>`;
        }).join("");

        if (totalEl) {
            totalEl.textContent = "₹" + totalOwed.toLocaleString("en-IN");
        }
    }

});
