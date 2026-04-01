document.addEventListener("DOMContentLoaded", () => {
    const roleTabs = document.querySelectorAll(".role-tab");
    const loginForm = document.getElementById("login-form");
    const helperBox = document.getElementById("login-credential-helper");
    const errorBox = document.getElementById("login-error");

    function renderCredentialHelper(role) {
        const accounts = window.RoleAccess?.mockAccounts?.[role] || [];
        if (!helperBox) return;

        helperBox.innerHTML = accounts.map((account) => `
            <div class="demo-credential-row">
                <strong>${account.displayName}</strong>
                <span>${account.email}</span>
                <code>${account.password}</code>
            </div>
        `).join("");
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

    function handleLogin() {
        const emailInput = document.getElementById("email").value;
        const passwordInput = document.getElementById("password").value;

        // Basic form validation for Review-3
        if (!emailInput || !passwordInput) {
            showError("Enter both email and password.");
            return;
        }

        // Find which role is currently selected
        const activeRole = document.querySelector(".role-tab.active").textContent.trim();

        const authResult = window.RoleAccess?.authenticate(activeRole, emailInput, passwordInput);
        if (!authResult) {
            showError(`Invalid ${activeRole} credentials.`);
            return;
        }
        clearError();

        // Route to the actual dashboard entry points for each actor
        if (activeRole === "Patient") {
            window.location.href = "patient-dashboard.html";
        } else if (activeRole === "PRE") {
            window.location.href = "../PRE/index.html";
        } else if (activeRole === "HOM") {
            window.location.href = "../HOM/screen-01-dashboard.html";
        } else if (activeRole === "FA") {
            window.location.href = "../FA/index.html";
        }
    }

    // 2. Handle Login Routing & Form Validation
    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleLogin();
    });

    renderCredentialHelper("Patient");
});
