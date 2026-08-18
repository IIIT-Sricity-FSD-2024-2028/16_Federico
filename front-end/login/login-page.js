document.addEventListener("DOMContentLoaded", () => {
  const roleTabs = document.querySelectorAll(".role-tab");
  const loginForm = document.getElementById("login-form");
  const helperBox = document.getElementById("login-credential-helper");
  const errorBox = document.getElementById("login-error");
  const orgSelect = document.getElementById("organization");
  const submitButton = loginForm?.querySelector("button[type='submit'], .login-submit");

  // Organization Marketplace (tasks.md §11: Search Organizations -> Tenant
  // Resolver). Public endpoint. Preselects from ?org=<id> when arriving via
  // a marketplace "Login" link.
  (async function loadOrganizations() {
    if (!orgSelect) return;
    const preselect = new URLSearchParams(window.location.search).get("org");
    try {
      const organizations = await window.ApiClient.marketplace.organizations();
      orgSelect.innerHTML = organizations
        .map((org) => `<option value="${org.organization_id}">${org.name}</option>`)
        .join("");
      if (preselect && organizations.some((o) => String(o.organization_id) === preselect)) {
        orgSelect.value = preselect;
      }
      renderCredentialHelper(document.querySelector(".role-tab.active")?.textContent.trim() || "Patient");
    } catch (err) {
      orgSelect.innerHTML = '<option value="">Could not load hospitals — refresh to retry</option>';
      window.UIFeedback?.toast("Could not load the list of hospitals. Please refresh.", "error");
    }
  })();

  orgSelect?.addEventListener("change", () => {
    renderCredentialHelper(document.querySelector(".role-tab.active")?.textContent.trim() || "Patient");
  });

  function renderCredentialHelper(role) {
    const organizationId = orgSelect?.value ? Number(orgSelect.value) : 1;
    const accounts = window.RoleAccess?.mockAccountsFor?.(organizationId)?.[role] || [];
    if (!helperBox) return;

    helperBox.innerHTML = accounts
      .map(
        (account) => `
            <div class="demo-credential-row">
                <strong>${account.displayName}</strong>
                <span>${account.email}</span>
                <code>${account.password}</code>
            </div>
        `,
      )
      .join("");
  }

  function clearError() {
    if (errorBox) errorBox.textContent = "";
  }

  function showError(message) {
    if (errorBox) errorBox.textContent = message;
  }

  // 1. Handle Tab Switching
  roleTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      roleTabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      clearError();
      renderCredentialHelper(tab.textContent.trim());
    });
  });

  async function handleLogin() {
    const emailInput = document.getElementById("email").value;
    const passwordInput = document.getElementById("password").value;

    if (!emailInput || !passwordInput) {
      showError("Enter both email and password.");
      return;
    }

    const activeRole = document
      .querySelector(".role-tab.active")
      .textContent.trim();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
      submitButton.textContent = "Signing in…";
    }

    const organizationId = orgSelect?.value ? Number(orgSelect.value) : null;

    try {
      const authResult = await window.RoleAccess?.authenticate(
        activeRole,
        emailInput,
        passwordInput,
        organizationId,
      );
      if (!authResult) {
        showError(window.RoleAccess?.lastAuthError || `Invalid ${activeRole} credentials.`);
        return;
      }
      clearError();

      // Route to the actual dashboard entry points for each actor
      if (activeRole === "Patient") {
        window.location.href = "../Patient/patient-dashboard.html";
      } else if (activeRole === "PRE") {
        window.location.href = "../PRE/index.html";
      } else if (activeRole === "HOM") {
        window.location.href = "../HOM/screen-01-dashboard.html";
      } else if (activeRole === "FA") {
        window.location.href = "../FA/index.html";
      }
    } catch (err) {
      showError(err?.status === 0 ? err.message : "Something went wrong. Please try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText;
      }
    }
  }

  // 2. Handle Login Routing & Form Validation
  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleLogin();
  });

  renderCredentialHelper("Patient");
});
