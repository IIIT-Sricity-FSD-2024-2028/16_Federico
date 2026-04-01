// front-end/landing-page.js
document.addEventListener("DOMContentLoaded", () => {
    // Clear any leftover session data when arriving at the landing page
    if (window.RoleAccess) window.RoleAccess.logout();
    else sessionStorage.removeItem("userRole");

    const primaryBtn = document.querySelector(".primary-btn"); // Login to Portal
    const secondaryBtn = document.querySelector(".secondary-btn"); // Create Account

    if (primaryBtn) {
        primaryBtn.addEventListener("click", () => {
            window.location.href = "login-page.html";
        });
    }

    if (secondaryBtn) {
        secondaryBtn.addEventListener("click", () => {
            window.location.href = "signup-page.html";
        });
    }

    /* ── GOOGLE MAPS FOR BRANCH LOCATIONS ── */
    const branchDirectionBtns = document.querySelectorAll(".branch-directions-btn");

    branchDirectionBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault(); // Stops the page from jumping to the top if it's an <a> tag

            // Grab the address from the HTML
            const address = btn.getAttribute("data-address");

            if (address) {
                // Convert spaces to URL format (e.g., %20)
                const query = encodeURIComponent(address);
                // Open Google Maps in a new tab
                window.open(`https://www.google.com/maps/search/?api=1&query=$${query}`, "_blank");
            }
        });
    });
});
