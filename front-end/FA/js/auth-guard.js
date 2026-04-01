(function () {
  if (!window.RoleAccess) return;

  var actor = window.RoleAccess.getCurrentActor();
  if (!actor) {
    window.location.href = "../Patient/login-page.html";
    return;
  }

  if (window.RoleAccess.hasModuleAccess("FA", actor)) return;

  alert("Access Denied: " + actor + " cannot open the FA module.");
  window.location.href = window.RoleAccess.getActorHome(actor, "FA");
})();
  