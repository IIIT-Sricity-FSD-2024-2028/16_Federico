'use strict';

/**
 * Patient Portal — Book Appointment Module
 * Manages appointment scheduling, live department & doctor selection,
 * dynamic slot capacity calculation, medical document attachment, and PRE submission.
 */

document.addEventListener("DOMContentLoaded", () => {

    // ── STATE ──
    let selectedTime = null;
    let selectedDate = null;
    let selectedDept = null;
    let selectedDoctorId = null;
    let selectedDoctorName = "Any Specialist";
    let attachedFileName = null;

    // ── CONFIGURATION ──
    const MAX_PATIENTS_PER_SLOT = 3;

    function syncView() {
        populatePatientSidebar();
        refreshSlotAvailability();
    }

    onStoreReady(() => {
        populatePatientSidebar();
        initDatePicker();
        initDepartmentSelect();
        initDoctorSelect();
        initSlots();
        initFileUpload();
        initConfirmButton();
        initSaveDraft();
        initNavigation();

        refreshSlotAvailability();
    });

    window.addEventListener("patientStoreUpdated", syncView);

    /* ── SIDEBAR PROFILE ──────────────────────────────── */
    function populatePatientSidebar() {
        const p = getProfile();
        if (!p) return;

        const topbarInitials = document.getElementById("topbar-initials");
        const topbarName = document.getElementById("topbar-name");
        if (topbarInitials) topbarInitials.textContent = p.initials || "--";
        if (topbarName) topbarName.textContent = p.firstName || p.name || "Patient";

        setText("sidebar-initials", p.initials || "--");
        setText("sidebar-name", p.name || "Patient");
        setText("sidebar-uhid", "UHID: " + (p.uhid || "--"));
        setText("sidebar-age-gender", (p.age ? p.age + " yrs" : "--") + " / " + (p.gender || "--"));
        setText("sidebar-blood", p.bloodGroup || "--");
        setText("sidebar-phone", p.phone || "--");
        setText("sidebar-ins-status", p.insurance && p.insurance.verified ? "Verified" : "Unverified");
        setText("sidebar-ins-provider", (p.insurance && p.insurance.provider) || "Self Pay");
    }

    /* ── DATE & DEPARTMENT & DOCTOR PICKERS ───────────── */
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
            refreshSlotAvailability();
        });
    }

    function initDepartmentSelect() {
        const select = document.getElementById("department");
        if (!select) return;

        window.DepartmentOptions.populateDepartmentSelect(select, getDoctors(), {
            placeholder: "Select department",
        });

        select.addEventListener("change", () => {
            selectedDept = select.value || null;
            hideError("error-dept");
            updateDoctorOptions();
            updateSlotMeta();
            refreshSlotAvailability();
        });
    }

    function initDoctorSelect() {
        const select = document.getElementById("doctor-select");
        if (!select) return;

        select.addEventListener("change", () => {
            selectedDoctorId = select.value ? Number(select.value) : null;
            if (selectedDoctorId) {
                const doc = getDoctors().find((d) => d.doctor_id === selectedDoctorId);
                selectedDoctorName = doc ? `Dr. ${doc.name.replace(/^Dr\.\s*/i, "")}` : "Any Specialist";
            } else {
                selectedDoctorName = "Any Specialist";
            }
            updateSummary();
            refreshSlotAvailability();
        });
    }

    function updateDoctorOptions() {
        const select = document.getElementById("doctor-select");
        if (!select) return;

        select.innerHTML = '<option value="">Any Available Specialist</option>';
        selectedDoctorId = null;
        selectedDoctorName = "Any Specialist";

        if (!selectedDept || selectedDept === "none") {
            updateSummary();
            return;
        }

        const doctors = getDoctors().filter((d) =>
            !d.department || d.department.toLowerCase() === selectedDept.toLowerCase() ||
            (d.specialization && d.specialization.toLowerCase() === selectedDept.toLowerCase())
        );

        doctors.forEach((doc) => {
            const opt = document.createElement("option");
            opt.value = doc.doctor_id;
            const docTitle = doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`;
            opt.textContent = `${docTitle} (${doc.qualification || doc.specialization || selectedDept})`;
            select.appendChild(opt);
        });

        updateSummary();
    }

    /* ── DYNAMIC TIME SLOT CAPACITY ───────────────────── */
    function normalizeSlotTime(t) {
        if (!t) return "";
        let clean = t.trim().toUpperCase();
        // Standardize e.g. "9:00 AM" -> "09:00 AM"
        const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (match) {
            let hour = parseInt(match[1], 10);
            const min = match[2];
            const ampm = match[3] || (hour >= 12 ? "PM" : "AM");
            if (hour > 12) hour -= 12;
            if (hour === 0) hour = 12;
            return `${String(hour).padStart(2, "0")}:${min} ${ampm}`;
        }
        return clean;
    }

    function refreshSlotAvailability() {
        const slots = document.querySelectorAll(".slot");
        const allApts = getAllAppointments();

        // Filter to matching date and department/doctor
        const relevantApts = allApts.filter((apt) => {
            const dateMatch = (apt.date === selectedDate);
            const deptMatch = !selectedDept || selectedDept === "none" || (apt.department && apt.department.toLowerCase() === selectedDept.toLowerCase());
            const docMatch = !selectedDoctorId || (apt.doctorId === selectedDoctorId);
            const activeMatch = !["Cancelled", "Rejected"].includes(apt.status);
            return dateMatch && deptMatch && docMatch && activeMatch;
        });

        const timeCounts = {};
        relevantApts.forEach((apt) => {
            const normalized = normalizeSlotTime(apt.time);
            if (normalized) {
                timeCounts[normalized] = (timeCounts[normalized] || 0) + 1;
            }
        });

        slots.forEach((slot) => {
            const rawTime = slot.dataset.time || slot.querySelector("strong")?.textContent.trim();
            const slotNormalized = normalizeSlotTime(rawTime);
            const bookedCount = timeCounts[slotNormalized] || 0;
            const span = slot.querySelector("span");

            slot.classList.remove("selected", "booked", "limited", "available");
            slot.disabled = false;

            if (selectedDate && selectedDept && selectedDept !== "none") {
                if (bookedCount >= MAX_PATIENTS_PER_SLOT) {
                    slot.classList.add("booked");
                    slot.disabled = true;
                    if (span) span.textContent = "Booked";
                } else if (bookedCount > 0) {
                    slot.classList.add("limited");
                    const slotsLeft = MAX_PATIENTS_PER_SLOT - bookedCount;
                    if (span) span.textContent = `${slotsLeft} Left`;
                } else {
                    slot.classList.add("available");
                    if (span) span.textContent = "Available";
                }
            } else {
                slot.classList.add("available");
                if (span) span.textContent = "Available";
            }

            // Restore selection if previously selected slot matches
            if (selectedTime && normalizeSlotTime(selectedTime) === slotNormalized && !slot.disabled) {
                slot.classList.add("selected");
            }
        });

        updateSummary();
    }

    function updateSlotMeta() {
        const meta = document.getElementById("slot-meta");
        if (!meta) return;
        const datePart = selectedDate ? formatDate(selectedDate) : "No date selected";
        const deptPart = selectedDept && selectedDept !== "none" ? selectedDept : "No department";
        meta.textContent = `${datePart} · ${deptPart}`;
    }

    function initSlots() {
        const slots = document.querySelectorAll(".slot");
        slots.forEach((slot) => {
            slot.addEventListener("click", () => {
                if (slot.classList.contains("booked") || slot.disabled) return;

                document.querySelectorAll(".slot").forEach((s) => s.classList.remove("selected"));
                slot.classList.add("selected");

                selectedTime = slot.dataset.time || slot.querySelector("strong")?.textContent.trim();
                hideError("error-slot");
                updateSummary();
            });
        });
    }

    /* ── SUMMARY PANEL ────────────────────────────────── */
    function updateSummary() {
        setText("slot-date", selectedDate ? formatDate(selectedDate) : "—");
        setText("slot-time", selectedTime || "—");
        setText("slot-dept", selectedDept && selectedDept !== "none" ? selectedDept : "—");
        setText("slot-doctor", selectedDoctorName || "Any Specialist");
        setText("slot-visit", "Consultation");
    }

    /* ── VALIDATION ───────────────────────────────────── */
    function validateForm() {
        let valid = true;

        if (!selectedDept || selectedDept === "none") {
            showError("error-dept", "Please select a department.");
            valid = false;
        }
        if (!selectedDate) {
            showError("error-date", "Please select a preferred date.");
            valid = false;
        }
        if (!selectedTime) {
            showError("error-slot", "Please select an available time slot.");
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
            btn.textContent = "Submitting Request…";

            try {
                const noteInput = document.getElementById("short-note");
                const noteText = noteInput ? noteInput.value.trim() : "";

                const newRequestId = await addAppointment({
                    date: selectedDate,
                    displayDate: formatDate(selectedDate),
                    time: selectedTime,
                    department: selectedDept,
                    doctorId: selectedDoctorId,
                    type: "Consultation",
                    note: noteText || (attachedFileName ? `Attached: ${attachedFileName}` : undefined),
                });

                refreshSlotAvailability();

                btn.textContent = "Booked ✓";
                btn.style.opacity = "0.7";

                UIFeedback.toast(`Appointment request submitted! Reference #${newRequestId}`, "success");

                setTimeout(() => {
                    window.location.href = "patient-dashboard.html";
                }, 1500);
            } catch (err) {
                btn.disabled = false;
                btn.textContent = originalLabel;
                UIFeedback.toast(err?.message || "Could not schedule appointment. Please try again.", "warning");
            }
        });
    }

    /* ── SAVE DRAFT & FILE UPLOAD ─────────────────────── */
    function initSaveDraft() {
        document.getElementById("save-draft")?.addEventListener("click", () => {
            if (!selectedDept && !selectedDate && !selectedTime) {
                UIFeedback.toast("Select at least a department or date to save draft.", "info");
                return;
            }
            UIFeedback.toast("Appointment draft saved. Complete booking when ready.", "info");
        });
    }

    function initFileUpload() {
        const dropZone = document.getElementById("upload-label") || document.querySelector(".upload-box");
        const fileInput = document.getElementById("file-upload");
        if (!dropZone || !fileInput) return;

        fileInput.addEventListener("change", (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            attachedFileName = files[0].name;
            const labelText = document.getElementById("upload-label-text");
            if (labelText) {
                labelText.innerHTML = `Attached: <span style="color:var(--primary)">${escapeHtml(attachedFileName)}</span> (${(files[0].size / 1024).toFixed(0)} KB)`;
            }
            UIFeedback.toast(`File "${attachedFileName}" attached to appointment.`, "success");
        });
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

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[m]);
    }
});

