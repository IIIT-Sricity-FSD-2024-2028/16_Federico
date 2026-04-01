(function () {
  if (!window.RoleAccess) return;

  var actor = window.RoleAccess.getCurrentActor();
  if (!actor) {
    window.location.href = "../Patient/login-page.html";
    return;
  }

  if (window.RoleAccess.hasModuleAccess("HOM", actor)) return;

  alert("Access Denied: " + actor + " cannot open the HOM module.");
  window.location.href = actor === "FA"
    ? "../FA/index.html"
    : window.RoleAccess.getActorHome(actor, "HOM");
})();
