(function checkAccess() {
    if (!window.RoleAccess) {
        const currentRole = sessionStorage.getItem("userRole");
        if (!currentRole) {
            window.location.href = "landing-page.html";
            return;
        }
        if (currentRole !== "Patient") {
            alert("Access Denied: You are logged in as a " + currentRole + ".");
            window.location.href = "login-page.html";
        }
        return;
    }

    const actor = window.RoleAccess.getCurrentActor();
    if (!actor) {
        window.location.href = "landing-page.html";
        return;
    }

    if (window.RoleAccess.hasModuleAccess("PATIENT", actor)) return;

    alert("Access Denied: " + actor + " cannot open the Patient module.");
    window.location.href = window.RoleAccess.getActorHome(actor, "PATIENT");
})();
