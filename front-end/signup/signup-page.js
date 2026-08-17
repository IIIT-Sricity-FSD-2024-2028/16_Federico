document.addEventListener("DOMContentLoaded", () => {
  const createButton = document.querySelector(".create-btn");
  const loginShortcut = document.querySelector(".login-shortcut");

  loginShortcut?.addEventListener("click", () => {
    window.location.href = "../login/login-page.html";
  });

  createButton?.addEventListener("click", async () => {
    const firstName = valueOf("first-name");
    const lastName = valueOf("last-name");
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const dob = document.getElementById("dob")?.value || "";
    const gender = selectValue("gender");
    const email = valueOf("email").toLowerCase();
    const phone = valueOf("phone");
    const bloodGroup = selectValue("blood-group");
    const password = document.getElementById("password")?.value || "";
    const confirmPassword =
      document.getElementById("confirm-password")?.value || "";
    const provider = valueOf("provider");
    const coverageType = selectValue("coverage");
    const policyNumber = valueOf("policy-number");
    const memberId = valueOf("member-id");
    const validFrom = valueOf("valid-from");
    const validTo = valueOf("valid-to");
    const termsChecked = Boolean(
      document.querySelector(".terms-row input[type='checkbox']")?.checked,
    );

    if (
      !firstName ||
      !lastName ||
      !dob ||
      !gender ||
      !email ||
      !phone ||
      !password
    ) {
      showToast("Please fill in all required fields.", "warn");
      return;
    }

    const dobDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(dobDate.getTime())) {
      showToast("Please enter a valid date of birth.", "warn");
      return;
    }

    if (dobDate > today) {
      showToast("Date of Birth cannot be in the future.", "warn");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.", "warn");
      return;
    }

    if (!/^\+?[0-9\s\-]{8,15}$/.test(phone)) {
      showToast("Please enter a valid phone number.", "warn");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long.", "warn");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match. Please try again.", "warn");
      return;
    }

    if (!termsChecked) {
      showToast(
        "You must agree to the Terms of Service and Privacy Policy to register.",
        "warn",
      );
      return;
    }

    createButton.disabled = true;
    const originalLabel = createButton.textContent;
    createButton.textContent = "Creating account…";

    try {
      const result = await window.RoleAccess.signupPatient({
        name: fullName,
        email,
        password,
        phone,
        dob,
        gender,
        blood_group: bloodGroup || undefined,
      });

      // Optional insurance — the backend models it as a separate record
      // tied to the new patient, and only accepts it once every required
      // field is present. Partial insurance info is fine; it can be
      // completed later from the patient profile page.
      if (provider && policyNumber && memberId && validFrom && validTo) {
        try {
          await window.ApiClient.patients.createInsurance({
            patient_id: result.patient.patient_id,
            provider_name: provider,
            policy_number: policyNumber,
            member_id: memberId,
            coverage_type: coverageType || "Individual",
            valid_from: validFrom,
            valid_to: validTo,
          });
        } catch (insuranceErr) {
          console.warn("[Signup] Insurance could not be saved, continuing:", insuranceErr);
        }
      }

      createButton.textContent = "Account Created";
      createButton.style.opacity = "0.8";

      showToast(
        `Account created. Your UHID is ${result.patient.uhid}.`,
        "success",
      );

      setTimeout(() => {
        window.location.href = "../Patient/patient-dashboard.html";
      }, 1400);
    } catch (err) {
      createButton.disabled = false;
      createButton.textContent = originalLabel;
      const message =
        err?.status === 409
          ? "An account with this email already exists."
          : err?.message || "Could not create your account. Please try again.";
      showToast(message, "warn");
    }
  });

  function valueOf(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function selectValue(id) {
    const value = document.getElementById(id)?.value || "";
    return value.startsWith("Select ") ? "" : value.trim();
  }

  function showToast(message, type = "info") {
    document.querySelector(".toast-notify")?.remove();
    const bgColors = { success: "#1a5c3a", warn: "#b45309", info: "#1c2f42" };

    const t = document.createElement("div");
    t.className = "toast-notify";
    t.textContent = message;

    Object.assign(t.style, {
      position: "fixed",
      bottom: "28px",
      right: "28px",
      zIndex: "9999",
      background: bgColors[type] || bgColors.info,
      color: "#fff",
      padding: "13px 20px",
      borderRadius: "12px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "Inter, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      maxWidth: "380px",
      lineHeight: "1.5",
      transform: "translateY(80px)",
      opacity: "0",
      transition: "transform 280ms ease, opacity 280ms ease",
    });

    document.body.appendChild(t);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        t.style.transform = "translateY(0)";
        t.style.opacity = "1";
      }),
    );

    setTimeout(() => {
      t.style.transform = "translateY(80px)";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }
});
