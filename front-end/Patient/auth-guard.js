(function () {
  var LOGIN_PAGE = "../login/login-page.html";

  if (!window.RoleAccess) return;

  var actor = window.RoleAccess.getCurrentActor();
  if (!actor) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  if (!window.RoleAccess.hasModuleAccess("PATIENT", actor)) {
    alert("Access Denied: " + actor + " cannot open the Patient module.");
    window.location.href = window.RoleAccess.getActorHome(actor, "PATIENT");
    return;
  }

  var session = window.RoleAccess.getSessionInfo();
  window.PatientSession = {
    uhid: (session && session.patientUhid) || null,
    patientId: (session && session.patientId) || null,
    loggedIn: true,
  };
})();
