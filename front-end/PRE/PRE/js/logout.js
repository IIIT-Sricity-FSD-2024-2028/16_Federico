document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".logout")?.addEventListener("click", () => {
    if (window.RoleAccess) window.RoleAccess.logout();
    else sessionStorage.removeItem("userRole");
    window.location.href = "../../../Patient/landing-page.html";
  });
});
