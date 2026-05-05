(function () {
  const LOGIN_PAGE = "../landing/landing-page.html";

  function redirectToLogin() {
    const currentPath = window.location.pathname;
    if (currentPath.endsWith("landing-page.html")) return;
    window.location.replace(LOGIN_PAGE);
  }

  try {
    const actor = sessionStorage.getItem("userRole");
    if (actor !== "Patient") {
      redirectToLogin();
      return;
    }

    const uhid = sessionStorage.getItem("patientUhid") || null;
    window.PatientSession = { uhid, loggedIn: true };
  } catch (_err) {
    redirectToLogin();
  }
})();
