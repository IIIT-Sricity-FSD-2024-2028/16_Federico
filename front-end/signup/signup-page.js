const LEGACY_STORAGE_KEY = "hospitalFinanceAppState";
const ROOT_STORAGE_KEY = "HospitalAppState";
const SHARED_STORAGE_KEY = ROOT_STORAGE_KEY;

function nextGeneratedId(namespace) {
  if (window.IDGenerator && typeof window.IDGenerator.nextId === "function") return window.IDGenerator.nextId(namespace);
  return `${namespace}-fallback`;
}

document.addEventListener("DOMContentLoaded", () => {
  const createButton = document.querySelector(".create-btn");
  const loginShortcut = document.querySelector(".login-shortcut");

  loginShortcut?.addEventListener("click", () => {
    window.location.href = "../login/login-page.html";
  });

  createButton?.addEventListener("click", () => {
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

    const sharedState = ensureSharedState();
    const patientAccounts =
      window.RoleAccess?.refreshMockAccounts?.() ||
      window.RoleAccess?.mockAccounts?.Patient ||
      [];
    const emailAlreadyExists = patientAccounts.some(
      (account) => String(account.email || "").toLowerCase() === email,
    );
    const phoneAlreadyExists = Object.values(
      sharedState.patientProfiles || {},
    ).some((profile) => profile?.phone === phone);

    if (emailAlreadyExists) {
      showToast("An account with this email already exists.", "warn");
      return;
    }

    if (phoneAlreadyExists) {
      showToast("A patient with this phone number already exists.", "warn");
      return;
    }

    const patientId = buildNextPatientId(sharedState);
    const age = calculateAge(dob);
    const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
    const profile = {
      id: nextGeneratedId("user"),
      name: fullName,
      firstName,
      initials: initials || "P",
      uhid: patientId,
      age,
      gender,
      bloodGroup: bloodGroup || "NA",
      phone,
      altPhone: "",
      email,
      address: "",
      dob,
      insurance: {
        verified: Boolean(provider || policyNumber || memberId),
        provider: provider || "Self Pay",
        policyNumber: policyNumber || `POL-${patientId}`,
        memberId: memberId || `MEM-${patientId}`,
        coverage: 0,
        validFrom: validFrom || "",
        validTo: validTo || "",
        coverageType: coverageType || "Self",
      },
    };

    if (!Array.isArray(sharedState.patientDirectory))
      sharedState.patientDirectory = [];
    if (
      !sharedState.patientProfiles ||
      typeof sharedState.patientProfiles !== "object"
    )
      sharedState.patientProfiles = {};

    sharedState.patientDirectory.unshift({
      id: patientId,
      uhid: patientId,
      name: fullName,
      age: String(age),
      gender,
      phone,
      address: "",
    });
    sharedState.patientProfiles[patientId] = profile;

    const payload = JSON.stringify(sharedState);
    localStorage.setItem(ROOT_STORAGE_KEY, payload);
    window.dispatchEvent(new Event("sharedStateUpdated"));

    window.RoleAccess?.registerPatientAccount?.({
      email,
      password,
      displayName: fullName,
      patientUhid: patientId,
    });

    createButton.disabled = true;
    createButton.textContent = "Account Created";
    createButton.style.opacity = "0.8";

    showToast(
      `Account created. Patient ID ${patientId} is now in shared records.`,
      "success",
    );

    setTimeout(() => {
      window.location.href = "../login/login-page.html";
    }, 1400);
  });

  function ensureSharedState() {
    try {
      const raw = localStorage.getItem(SHARED_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) {
      console.warn("[Signup] Could not read shared state:", error);
    }

    const seed = window.CanonicalHospitalSeed?.buildSharedStateSeed?.();
    return seed && typeof seed === "object" ? seed : {};
  }

  function buildNextPatientId(state) {
    const year = new Date().getFullYear();
    const prefix = `FED-${year}-`;
    const ids = []
      .concat(
        (state.patientDirectory || []).map((entry) => entry?.id || entry?.uhid),
      )
      .concat(Object.keys(state.patientProfiles || {}));

    let maxId = 9000;
    ids.forEach((id) => {
      const match = String(id || "").match(new RegExp(`^FED-${year}-(\\d+)$`));
      if (!match) return;
      maxId = Math.max(maxId, Number(match[1]));
    });

    return `${prefix}${maxId + 1}`;
  }

  function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }

    return Math.max(age, 0);
  }

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




