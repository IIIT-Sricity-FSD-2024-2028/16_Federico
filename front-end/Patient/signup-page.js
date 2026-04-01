// front-end/signup-page.js

document.addEventListener("DOMContentLoaded", () => {
    const createButton = document.querySelector(".create-btn");
    const loginShortcut = document.querySelector(".login-shortcut");

    loginShortcut.addEventListener("click", () => {
        window.location.href = "login-page.html";
    });

    createButton.addEventListener("click", () => {
        // Grab all required values
        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const dob = document.getElementById("dob").value; // Format: YYYY-MM-DD
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;
        const termsChecked = document.querySelector(".terms-row input[type='checkbox']").checked;

        /* ── 1. EMPTY FIELD VALIDATION ── */
        if (!firstName || !lastName || !dob || !email || !phone || !password) {
            showToast("Please fill in all required fields, including Date of Birth.", "warn");
            return;
        }

        /* ── 2. DATE OF BIRTH EDGE CASE ── */
        const dobDate = new Date(dob);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison

        // Prevent users from selecting a date in the future
        if (dobDate > today) {
            showToast("Date of Birth cannot be in the future.", "warn");
            return;
        }

        /* ── 3. REGEX: EMAIL VALIDATION ── */
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address (e.g., name@domain.com).", "warn");
            return;
        }

        /* ── 4. REGEX: PHONE VALIDATION ── */
        const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;
        if (!phoneRegex.test(phone)) {
            showToast("Please enter a valid phone number.", "warn");
            return;
        }

        /* ── 5. PASSWORD EDGE CASES ── */
        if (password.length < 6) {
            showToast("Password must be at least 6 characters long.", "warn");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Passwords do not match. Please try again.", "warn");
            return;
        }

        /* ── 6. TERMS AND CONDITIONS CHECK ── */
        if (!termsChecked) {
            showToast("You must agree to the Terms of Service and Privacy Policy to register.", "warn");
            return;
        }

        /* ── 7. SUCCESS & REDIRECT ── */
        createButton.disabled = true;
        createButton.textContent = "Creating Account...";
        createButton.style.opacity = "0.8";

        showToast("Account created successfully! Redirecting to login...", "success");

        // Simulate network delay
        setTimeout(() => {
            window.location.href = "login-page.html";
        }, 2000);
    });

    /* ── TOAST NOTIFICATION HELPER ── */
    function showToast(message, type = "info") {
        document.querySelector(".toast-notify")?.remove();
        const bgColors = { success: "#1a5c3a", warn: "#b45309", info: "#1c2f42" };

        const t = document.createElement("div");
        t.className = "toast-notify";
        t.textContent = message;

        Object.assign(t.style, {
            position: "fixed", bottom: "28px", right: "28px", zIndex: "9999",
            background: bgColors[type] || bgColors.info, color: "#fff",
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
});