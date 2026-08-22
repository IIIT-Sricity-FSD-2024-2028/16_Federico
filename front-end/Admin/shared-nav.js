/**
 * Admin/shared-nav.js
 * Injects the Admin top navigation. Adapted from HOM/shared-nav.js (same
 * shell mechanics — nav links, notification/profile overlays, sign out —
 * with Admin's own 4 nav items and profile labelling instead of HOM's).
 * A full nav-shell dedup between HOM and Admin is a reasonable follow-up,
 * out of scope for this pass (see table.md issue #1's fix notes).
 */

document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("main-nav");
  if (!navContainer) return;

  const navHTML = `
    <style>
      .top-nav { height: 76px; background: var(--color-bg); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: var(--font-body); }
      .nav-logo-group { display: flex; align-items: center; gap: 12px; }
      .nav-logo-icon { width: 32px; height: 32px; border-radius: var(--radius-sm, 8px); background: var(--color-accent); color: var(--md-on-primary, #fff); display: grid; place-items: center; font-family: var(--font-heading); font-size: 16px; }
      .nav-logo-text { font-family: var(--font-heading); font-size: 19px; display: flex; gap: 6px; }
      .nav-logo-text .federico { color: var(--color-fg); }
      .nav-logo-text .hospital { color: var(--color-muted-fg); font-style: italic; }

      .nav-links { display: flex; align-items: center; gap: 4px; }
      .nav-link { padding: 10px 16px; border-radius: var(--radius-full, 9999px); font-size: 13px; font-weight: 500; letter-spacing: 0.01em; color: var(--color-muted-fg); text-decoration: none; transition: color var(--duration-base) var(--ease-luxury), background-color var(--duration-fast) var(--ease-luxury); cursor: pointer; border: none; background: transparent; }
      .nav-link:hover { color: var(--color-fg); background: rgba(103, 80, 164, 0.08); }
      .nav-link.active { background: var(--md-secondary-container, var(--color-muted-bg)); color: var(--md-on-secondary-container, var(--color-fg)); font-weight: 600; }

      .nav-actions { display: flex; align-items: center; gap: 16px; position: relative; }

      .nav-bell { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: var(--radius-full, 9999px); color: var(--color-muted-fg); transition: color var(--duration-base) var(--ease-luxury), background-color var(--duration-fast) var(--ease-luxury); }
      .nav-bell:hover { background: rgba(103, 80, 164, 0.08); color: var(--color-fg); }
      .nav-bell-badge { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: var(--status-error); border-radius: 50%; }

      .nav-profile { display: flex; align-items: center; gap: 10px; padding: 6px 14px 6px 6px; border-radius: var(--radius-full, 9999px); background: transparent; border: 1px solid var(--color-border); cursor: pointer; transition: border-color var(--duration-base) var(--ease-luxury), background-color var(--duration-fast) var(--ease-luxury); }
      .nav-profile:hover { border-color: var(--color-accent); background: rgba(103, 80, 164, 0.06); }
      .nav-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent); color: var(--md-on-primary, #fff); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
      .nav-profile-text { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--color-fg); }

      .nav-overlay { position: absolute; top: calc(100% + 8px); background: var(--color-bg); border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-card-hover); border: 1px solid var(--color-border); display: none; flex-direction: column; overflow: hidden; z-index: 100; }
      .nav-overlay.active { display: flex; }

      #overlay-notifications { width: 320px; right: 140px; }
      #overlay-profile-dropdown { width: 200px; right: 0; }

      .overlay-header { padding: 14px 16px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
      .overlay-header h3 { font-family: var(--font-heading); font-size: 15px; font-weight: 500; color: var(--color-fg); margin: 0; }

      .notif-item { padding: 14px 16px; border-bottom: 1px solid var(--color-border-subtle); display: flex; gap: 12px; background: var(--color-bg); text-align: left; border-left: none; border-right: none; border-top: none; width: 100%; }
      .notif-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
      .notif-title { font-size: 13px; font-weight: 500; color: var(--color-fg); margin: 0; }
      .notif-time { font-size: 11px; color: var(--color-muted-fg); margin: 2px 0 0 0; }

      .profile-item { padding: 10px 16px; font-size: 13px; color: var(--color-muted-fg); cursor: pointer; display: flex; align-items: center; gap: 8px; background: var(--color-bg); border: none; width: 100%; text-align: left; transition: background var(--duration-base) var(--ease-luxury); }
      .profile-item:hover { background: var(--color-muted-bg); color: var(--color-fg); }
      .profile-item.danger { color: var(--status-error); border-top: 1px solid var(--color-border); }
      .profile-item.danger:hover { background: var(--status-error-bg); }
    </style>

    <div class="top-nav">
      <div class="nav-logo-group">
        <div class="nav-logo-icon">F</div>
        <div class="nav-logo-text">
          <span class="federico">Federico</span>
          <span class="hospital">Admin</span>
        </div>
      </div>

      <div class="nav-links">
        <a href="screen-01-dashboard.html" class="nav-link" data-flow="nav-dashboard">Dashboard</a>
        <a href="screen-02-departments.html" class="nav-link" data-flow="nav-departments">Departments</a>
        <a href="screen-03-inventory.html" class="nav-link" data-flow="nav-inventory">Inventory Catalog</a>
        <a href="screen-04-admin.html" class="nav-link" data-flow="nav-roles">Roles &amp; Staff</a>
      </div>

      <div class="nav-actions">
        <button class="nav-bell" data-flow="open-notifications" id="btn-notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        <button class="nav-profile" data-flow="open-profile" id="btn-profile">
          <div class="nav-avatar" id="nav-avatar">AD</div>
          <span class="nav-profile-text" id="nav-profile-text">Admin</span>
        </button>

        <div class="nav-overlay" id="overlay-notifications">
          <div class="overlay-header"><h3>Notifications</h3></div>
          <div style="max-height: 300px; overflow-y: auto;">
            <div class="notif-item">
              <div class="notif-dot" style="background: #94A3B8;"></div>
              <div>
                <p class="notif-title">No new administrative notifications</p>
                <p class="notif-time">You're all caught up</p>
              </div>
            </div>
          </div>
        </div>

        <div class="nav-overlay" id="overlay-profile-dropdown">
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--color-border);">
            <p id="nav-profile-title" style="font-size: 14px; font-weight: 500; color: var(--color-fg); margin: 0;">Admin</p>
            <p id="nav-profile-email" style="font-size: 12px; color: var(--color-muted-fg); margin: 2px 0 0 0;"></p>
          </div>
          <div style="padding: 4px 0;">
            <button class="profile-item danger" id="btn-signout">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  `;

  navContainer.innerHTML = navHTML;

  window.RoleAccess?.applyTenantBranding?.();

  const session = window.RoleAccess?.getSessionInfo?.();
  const profileEmail = document.getElementById('nav-profile-email');
  if (profileEmail && session?.email) profileEmail.textContent = session.email;

  const currentPath = window.location.pathname.split('/').pop() || 'screen-01-dashboard.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === currentPath) link.classList.add('active');
  });

  const btnNotifications = document.getElementById('btn-notifications');
  const overlayNotifications = document.getElementById('overlay-notifications');
  const btnProfile = document.getElementById('btn-profile');
  const overlayProfile = document.getElementById('overlay-profile-dropdown');

  function closeAllOverlays() {
    overlayNotifications.classList.remove('active');
    overlayProfile.classList.remove('active');
  }

  btnNotifications.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActivating = !overlayNotifications.classList.contains('active');
    closeAllOverlays();
    if (isActivating) overlayNotifications.classList.add('active');
  });

  btnProfile.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActivating = !overlayProfile.classList.contains('active');
    closeAllOverlays();
    if (isActivating) overlayProfile.classList.add('active');
  });

  document.getElementById('btn-signout')?.addEventListener('click', () => {
    if (window.RoleAccess) window.RoleAccess.logout();
    window.location.href = '../landing/landing-page.html';
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-actions')) closeAllOverlays();
  });
});
