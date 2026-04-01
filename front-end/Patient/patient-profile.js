document.addEventListener("DOMContentLoaded", () => {
    const sections = ["personal", "contact", "password", "insurance"];
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.forEach((item) => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    onStoreReady(() => {
        populateProfileForm();
        initializeSectionEditing();
    });
    window.addEventListener("patientStoreUpdated", populateProfileForm);

    setupPasswordHint();
    setupEyeToggles();
    setupUploads();
    setupLogout();

    function populateProfileForm() {
        const profile = getProfile();
        if (!profile) return;

        renderProfileShell(profile);

        const [firstName, ...rest] = (profile.name || "").split(" ");
        setValue("first-name", firstName || "");
        setValue("last-name", rest.join(" "));
        setValue("dob", profile.dob || "");
        setValue("gender", profile.gender || "");
        setValue("blood-group", profile.bloodGroup || "");
        setValue("uhid", profile.uhid || "");
        setValue("email", profile.email || "");
        setValue("phone", profile.phone || "");
        setValue("alt-phone", profile.altPhone || "");
        setValue("address", profile.address || "");
        setValue("ins-provider", profile.insurance?.provider || "");
        setValue("ins-coverage", profile.insurance?.coverageType || "");
        setValue("policy-number", profile.insurance?.policyNumber || "");
        setValue("member-id", profile.insurance?.memberId || "");
        setValue("valid-from", profile.insurance?.validFrom || "");
        setValue("valid-to", profile.insurance?.validTo || "");
        setValue("coverage-amount", Number(profile.insurance?.coverage || 0).toLocaleString("en-IN"));
    }

    function renderProfileShell(profile) {
        const firstName = profile.firstName || (profile.name || "").split(" ")[0] || "Patient";
        const insurance = profile.insurance || {};

        document.querySelectorAll(".user-avatar").forEach((element) => {
            element.textContent = profile.initials || "P";
        });

        const topbarName = document.querySelector(".user-meta strong");
        if (topbarName) topbarName.textContent = firstName;

        const bigAvatar = document.querySelector(".big-avatar");
        if (bigAvatar) bigAvatar.textContent = profile.initials || "P";

        const avatarBlock = document.querySelector(".avatar-block");
        if (avatarBlock) {
            const nameEl = avatarBlock.querySelector("strong");
            const infoSpans = avatarBlock.querySelectorAll("span");
            if (nameEl) nameEl.textContent = profile.name || "";
            if (infoSpans[0]) infoSpans[0].textContent = `UHID: ${profile.uhid || ""}`;
            if (infoSpans[1]) infoSpans[1].textContent = "Patient";
        }

        const sideRows = document.querySelectorAll(".side-info .side-row strong");
        if (sideRows[0]) sideRows[0].textContent = `${profile.age || ""} yrs / ${profile.gender || ""}`;
        if (sideRows[1]) sideRows[1].textContent = profile.bloodGroup || "";
        if (sideRows[2]) sideRows[2].textContent = profile.phone || "";
        if (sideRows[3]) sideRows[3].innerHTML = `<span class="verified-badge">${insurance.verified ? "Verified" : "Unverified"}</span>`;
        if (sideRows[4]) sideRows[4].textContent = insurance.provider || "";
        if (sideRows[5]) sideRows[5].textContent = `â‚¹${Number(insurance.coverage || 0).toLocaleString("en-IN")}`;
    }

    function initializeSectionEditing() {
        sections.forEach((section) => {
            const form = document.getElementById(`form-${section}`);
            const actions = document.getElementById(`actions-${section}`);
            const editBtn = document.querySelector(`.edit-btn[data-section="${section}"]`);
            const cancelBtn = document.querySelector(`.cancel-btn[data-section="${section}"]`);
            const saveBtn = document.querySelector(`.save-btn[data-section="${section}"]`);
            if (!form || !actions || !editBtn || !cancelBtn || !saveBtn) return;

            const inputs = [...form.querySelectorAll("input, select, textarea")];
            const originalValues = {};
            captureValues();
            disableSection();

            editBtn.addEventListener("click", enableSection);
            cancelBtn.addEventListener("click", () => {
                restoreValues();
                resetPasswordFeedback();
                disableSection();
            });
            saveBtn.addEventListener("click", () => saveSection(section, inputs, originalValues, disableSection));

            function captureValues() {
                inputs.forEach((input) => {
                    if (input.id) originalValues[input.id] = input.value;
                });
            }

            function restoreValues() {
                inputs.forEach((input) => {
                    if (input.id in originalValues) input.value = originalValues[input.id];
                });
            }

            function enableSection() {
                inputs.forEach((input) => {
                    if (!input.readOnly) input.disabled = false;
                });
                toggleInsuranceUploads(section, false);
                actions.classList.remove("hidden");
                editBtn.textContent = "Editing...";
                editBtn.disabled = true;
            }

            function disableSection() {
                inputs.forEach((input) => { input.disabled = true; });
                toggleInsuranceUploads(section, true);
                actions.classList.add("hidden");
                editBtn.textContent = section === "password" ? "Change" : "Edit";
                editBtn.disabled = false;
            }

            function refreshSnapshots() {
                captureValues();
            }

            form.dataset.refreshSnapshots = refreshSnapshots;
        });
    }

    function saveSection(section, inputs, originalValues, disableSection) {
        if (section === "password") {
            const nextPassword = document.getElementById("new-password")?.value || "";
            const confirmPassword = document.getElementById("confirm-password")?.value || "";
            const hint = document.getElementById("password-match-hint");
            if (!nextPassword || nextPassword !== confirmPassword) {
                if (hint) {
                    hint.textContent = "Passwords do not match.";
                    hint.className = "hint-text no-match";
                }
                return;
            }
            if (hint) {
                hint.textContent = "Password updated successfully.";
                hint.className = "hint-text match";
            }
            inputs.forEach((input) => {
                if (input.id) originalValues[input.id] = input.value;
            });
            disableSection();
            showToast("Password updated.", "success");
            return;
        }

        if (section === "personal") {
            const fullName = [valueOf("first-name"), valueOf("last-name")].filter(Boolean).join(" ");
            updateProfile({
                name: fullName,
                firstName: valueOf("first-name"),
                initials: fullName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
                dob: valueOf("dob"),
                gender: valueOf("gender"),
                bloodGroup: valueOf("blood-group")
            });
        }

        if (section === "contact") {
            updateProfile({
                email: valueOf("email"),
                phone: valueOf("phone"),
                altPhone: valueOf("alt-phone"),
                address: valueOf("address")
            });
        }

        if (section === "insurance") {
            updateInsurance({
                provider: valueOf("ins-provider"),
                coverageType: valueOf("ins-coverage"),
                policyNumber: valueOf("policy-number"),
                memberId: valueOf("member-id"),
                validFrom: valueOf("valid-from"),
                validTo: valueOf("valid-to"),
                coverage: parseCoverage(valueOf("coverage-amount"))
            });
            setValue("coverage-amount", Number(getProfile()?.insurance?.coverage || 0).toLocaleString("en-IN"));
        }

        inputs.forEach((input) => {
            if (input.id) originalValues[input.id] = input.value;
        });
        populateProfileForm();
        disableSection();
        showToast(`${capitalize(section)} details saved.`, "success");
    }

    function setupPasswordHint() {
        const newPw = document.getElementById("new-password");
        const confPw = document.getElementById("confirm-password");
        const hint = document.getElementById("password-match-hint");
        if (!newPw || !confPw || !hint) return;

        function checkPasswordMatch() {
            if (!newPw.value && !confPw.value) {
                hint.textContent = "";
                hint.className = "hint-text";
                return;
            }
            if (newPw.value === confPw.value) {
                hint.textContent = "Passwords match.";
                hint.className = "hint-text match";
            } else {
                hint.textContent = "Passwords do not match.";
                hint.className = "hint-text no-match";
            }
        }

        newPw.addEventListener("input", checkPasswordMatch);
        confPw.addEventListener("input", checkPasswordMatch);
    }

    function setupEyeToggles() {
        document.querySelectorAll(".eye-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const target = document.getElementById(btn.dataset.target);
                if (!target) return;
                target.type = target.type === "password" ? "text" : "password";
            });
        });
    }

    function setupUploads() {
        const uploadMappings = [
            ["upload-front", "front-name"],
            ["upload-back", "back-name"]
        ];

        uploadMappings.forEach(([inputId, labelId]) => {
            const input = document.getElementById(inputId);
            const label = document.getElementById(labelId);
            if (!input || !label) return;
            input.addEventListener("change", (event) => {
                const file = event.target.files?.[0];
                if (file) label.innerHTML = `<strong>${file.name}</strong>`;
            });
        });
    }

    function setupLogout() {
        const logout = () => {
            showToast("Logging out...", "success");
            setTimeout(() => {
                if (window.RoleAccess) window.RoleAccess.logout();
                else sessionStorage.removeItem("userRole");
                window.location.href = "landing-page.html";
            }, 900);
        };

        document.getElementById("logout-btn")?.addEventListener("click", logout);
        document.getElementById("logout-danger")?.addEventListener("click", logout);
        document.getElementById("side-logout")?.addEventListener("click", logout);
    }

    function toggleInsuranceUploads(section, disabled) {
        if (section !== "insurance") return;
        document.getElementById("upload-front")?.toggleAttribute("disabled", disabled);
        document.getElementById("upload-back")?.toggleAttribute("disabled", disabled);
        document.getElementById("upload-front-label")?.classList.toggle("disabled", disabled);
        document.getElementById("upload-back-label")?.classList.toggle("disabled", disabled);
    }

    function resetPasswordFeedback() {
        const hint = document.getElementById("password-match-hint");
        if (!hint) return;
        hint.textContent = "";
        hint.className = "hint-text";
    }

    function valueOf(id) {
        return document.getElementById(id)?.value?.trim() || "";
    }

    function setValue(id, value) {
        const input = document.getElementById(id);
        if (input) input.value = value;
    }

    function parseCoverage(value) {
        return Number(String(value).replace(/,/g, "")) || 0;
    }

    function showToast(message, type = "success") {
        const existing = document.querySelector(".toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add("visible"));
        });

        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
});
