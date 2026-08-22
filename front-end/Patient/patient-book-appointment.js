// front-end/patient-book-appointment.js

document.addEventListener("DOMContentLoaded", () => {

    // ── STATE ──
    let selectedTime = null;
    let selectedDate = null;
    let selectedDept = null;
    let selectedType = "";

    // ── CONFIGURATION ──
    const MAX_PATIENTS_PER_SLOT = 3; // 3 patients can book the same 30-min slot

    function syncView() {
        populatePatientSidebar();
        refreshSlotAvailability();
    }

    onStoreReady(() => {
        populatePatientSidebar();   
        initDatePicker();
        initDepartmentSelect();
        initSlots();
        initFileUpload();
        initConfirmButton();
        initSaveDraft();
        initNavigation();

        refreshSlotAvailability();
    });
    window.addEventListener("patientStoreUpdated", syncView);

    /* ── SIDEBAR ──────────────────────────────────────── */
    function populatePatientSidebar() {
        const p = getProfile();
        if (!p) return;

        const topbarInitials = document.getElementById("topbar-initials");
        const topbarName = document.getElementById("topbar-name");
        if (topbarInitials) topbarInitials.textContent = p.initials;
        if (topbarName) topbarName.textContent = p.firstName;

        setText("sidebar-initials", p.initials);
        setText("sidebar-name", p.name);
        setText("sidebar-uhid", "UHID: " + p.uhid);
        setText("sidebar-age-gender", p.age + " yrs / " + p.gender);
        setText("sidebar-blood", p.bloodGroup);
        setText("sidebar-phone", p.phone);
        setText("sidebar-ins-status", p.insurance.verified ? "Verified" : "Unverified");
        setText("sidebar-ins-provider", p.insurance.provider);
    }

    /* ── DATE & DEPARTMENT PICKERS ────────────────────── */
    function initDatePicker() {
        const input = document.getElementById("appointment-date");
        if (!input) return;

        const today = new Date().toISOString().split("T")[0];
        input.min = today;
        input.value = today;

        selectedDate = today;
        updateSummary();

        input.addEventListener("change", () => {
            selectedDate = input.value || null;
            hideError("error-date");
            updateSlotMeta();
            refreshSlotAvailability(); // Recalculate capacity!
        });
    }

    function initDepartmentSelect() {
        const select = document.getElementById("department");
        if (!select) return;

        // Live doctor specializations (shared/department-options.js) —
        // same source PRE's appointment page uses, instead of each page
        // hardcoding its own (previously mismatched) option list.
        window.DepartmentOptions.populateDepartmentSelect(select, getDoctors(), {
            placeholder: "Select department",
        });

        select.addEventListener("change", () => {
            selectedDept = select.value || null;
            hideError("error-dept");
            updateSlotMeta();
            refreshSlotAvailability(); // Recalculate capacity!
        });
    }

    /* ── DYNAMIC SLOT CAPACITY (THE 3-PATIENT FIX) ────── */
    function refreshSlotAvailability() {
        const slots = document.querySelectorAll(".slot");

        // 1. Get all appointments
        const allApts = getAllAppointments();

        // 2. Filter down to ONLY the selected Date and Department
        const relevantApts = allApts.filter(apt =>
            apt.date === selectedDate &&
            apt.department === selectedDept &&
            apt.status !== "Cancelled"
        );

        // 3. Count how many patients are booked for each specific time
        // E.g., { "9:00 AM": 2, "10:30 AM": 3 }
        const timeCounts = {};
        relevantApts.forEach(apt => {
            timeCounts[apt.time] = (timeCounts[apt.time] || 0) + 1;
        });

        // 4. Update the UI buttons dynamically based on the count
        slots.forEach(slot => {
            const slotTime = slot.dataset.time || slot.querySelector("strong").textContent.trim();
            const bookedCount = timeCounts[slotTime] || 0;
            const span = slot.querySelector("span");

            // Reset the button first
            slot.classList.remove("selected", "booked", "limited", "available");
            slot.disabled = false;

            if (selectedDate && selectedDept && selectedDept !== "none") {
                if (bookedCount >= MAX_PATIENTS_PER_SLOT) {
                    // Fully Booked (3/3)
                    slot.classList.add("booked");
                    slot.disabled = true;
                    if (span) span.textContent = "Booked";
                } else if (bookedCount > 0) {
                    // Partially Booked (1/3 or 2/3) - Show how many are left!
                    slot.classList.add("limited");
                    const slotsLeft = MAX_PATIENTS_PER_SLOT - bookedCount;
                    if (span) span.textContent = slotsLeft + (slotsLeft === 1 ? " Left" : " Left");
                } else {
                    // Completely Empty (0/3)
                    slot.classList.add("available");
                    if (span) span.textContent = "Available";
                }
            } else {
                // Default state when no dept is selected yet
                slot.classList.add("available");
                if (span) span.textContent = "Available";
            }
        });

        // Clear the user's selection since the grid just updated
        selectedTime = null;
        updateSummary();
    }

    function updateSlotMeta() {
        const meta = document.getElementById("slot-meta");
        if (!meta) return;
        const datePart = selectedDate ? formatDate(selectedDate) : "No date selected";
        const deptPart = selectedDept || "No department";
        meta.textContent = datePart + " · " + deptPart;
    }

    function initSlots() {
        const slots = document.querySelectorAll(".slot");
        slots.forEach(slot => {
            slot.addEventListener("click", () => {
                if (slot.classList.contains("booked") || slot.disabled) return;

                document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
                slot.classList.add("selected");

                selectedTime = slot.dataset.time || slot.textContent.trim();
                hideError("error-slot");
                updateSummary();
            });
        });
    }

    /* ── SUMMARY PANEL ────────────────────────────────── */
    function updateSummary() {
        setText("slot-date", selectedDate ? formatDate(selectedDate) : "—");
        setText("slot-time", selectedTime || "—");
        setText("slot-dept", selectedDept || "—");
        setText("slot-visit", "PRE will assign");
    }

    /* ── VALIDATE ─────────────────────────────────────── */
    function validateForm() {
        let valid = true;

        if (!selectedDept || selectedDept === "none") {
            showError("error-dept", "Please select a department.");
            valid = false;
        }
        if (!selectedDate) {
            showError("error-date", "Please select a date.");
            valid = false;
        }
        if (!selectedTime) {
            showError("error-slot", "Please select a time slot.");
            valid = false;
        }

        return valid;
    }

    /* ── CONFIRM BOOKING ──────────────────────────────── */
    function initConfirmButton() {
        const btn = document.getElementById("confirm-booking");
        if (!btn) return;

        btn.addEventListener("click", async () => {
            if (!validateForm()) return;

            btn.disabled = true;
            const originalLabel = btn.textContent;
            btn.textContent = "Booking…";

            try {
                const newId = await addAppointment({
                    date: selectedDate,
                    displayDate: formatDate(selectedDate),
                    time: selectedTime,
                    department: selectedDept,
                    type: "",
                    status: "Pending",
                    doctorId: null
                });

                // Re-run the availability check so the slot updates instantly on screen
                refreshSlotAvailability();

                btn.textContent = "Booked ✓";
                btn.style.opacity = "0.7";

                UIFeedback.toast("Appointment request sent! Reference #" + newId, "success");

                setTimeout(() => {
                    window.location.href = "patient-dashboard.html";
                }, 2000);
            } catch (err) {
                btn.disabled = false;
                btn.textContent = originalLabel;
                UIFeedback.toast(err?.message || "Could not book this slot. Please try again.", "warning");
            }
        });
    }

    /* ── SAVE DRAFT & FILE UPLOAD ─────────────────────── */
    function initSaveDraft() {
        document.getElementById("save-draft")?.addEventListener("click", () => {
            UIFeedback.toast("Draft saved. Complete your booking before the slot fills up.", "info");
        });
    }

    function initFileUpload() {
        const dropZone = document.querySelector(".upload-box") || document.querySelector(".file-drop-zone");
        if (!dropZone) return;
        const fileInput = document.getElementById("file-upload");
        if (!fileInput) return;

        fileInput.addEventListener("change", (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            updateFileName(files[0].name);
        });

        function updateFileName(name) {
            const textElement = dropZone.querySelector("strong") || dropZone;
            textElement.innerHTML = `Attached: <span style="color:var(--primary)">${name}</span>`;
            UIFeedback.toast("File attached to this booking.", "success");
        }
    }

    /* ── NAVIGATION & UTILS ───────────────────────────── */
    function initNavigation() {
        const routes = {
            "nav-dashboard": "patient-dashboard.html",
            "nav-book": "patient-book-appointment.html",
            "nav-bill": "patient-billing.html",
            "nav-profile": "patient-profile.html",
            "profile-chip": "patient-profile.html",
            "breadcrumb-home": "patient-dashboard.html"
        };
        Object.entries(routes).forEach(([id, url]) => {
              document.getElementById(id)?.addEventListener("click", () => {
                window.location.href = url;
              });
        });
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return UIFeedback.toast(msg, "warning");
        el.textContent = msg;
        el.classList.remove("hidden");
    }

    function hideError(id) {
        document.getElementById(id)?.classList.add("hidden");
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const d = new Date(iso + "T00:00:00");
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
});
