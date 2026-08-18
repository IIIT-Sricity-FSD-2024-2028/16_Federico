/**
 * landing-page.js
 * Landing page interactions — redirects to login or signup.
 */

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const marketplaceBtn = document.getElementById("marketplace-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "../login/login-page.html";
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      window.location.href = "../signup/signup-page.html";
    });
  }

  if (marketplaceBtn) {
    marketplaceBtn.addEventListener("click", () => {
      window.location.href = "../marketplace/marketplace-page.html";
    });
  }
});
