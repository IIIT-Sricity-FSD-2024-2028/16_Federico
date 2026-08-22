/**
 * platform-login.js — Platform Super User sign-in. A wholly separate
 * session domain from the org actor login (shared/rbac.js's RoleAccess) —
 * platform accounts live in a different backend table entirely
 * (platformSuperUsers, not users) and are never allowed to resolve to an
 * org actor role. Session shape stored via the same ApiClient.setSession
 * mechanism, but tagged isPlatformUser: true so platform-dashboard.js's
 * guard (and every other app's shared/auth-guard.js) can tell them apart.
 */
(function () {
  var form = document.getElementById("platform-login-form");
  var submitBtn = document.getElementById("submit-btn");

  // Already signed in as platform? Skip straight to the dashboard.
  var existing = window.ApiClient.getSession();
  if (existing && existing.isPlatformUser) {
    window.location.href = "platform-dashboard.html";
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      var result = await window.ApiClient.platform.auth.login(email, password);
      window.ApiClient.setSession({
        token: result.token,
        actor: "PLATFORM",
        role: "PLATFORM",
        isPlatformUser: true,
        displayName: result.user.name,
        email: result.user.email,
        platformUserId: result.user.platform_user_id,
      });
      window.location.href = "platform-dashboard.html";
    } catch (err) {
      window.UIFeedback.toast(err.status === 401 ? "Invalid email or password." : (err.message || "Login failed."), "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });
})();
