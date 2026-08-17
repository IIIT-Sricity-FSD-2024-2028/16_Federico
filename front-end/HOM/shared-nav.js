/**
 * shared-nav.js
 * Injects the global Top Navigation and handles all routing, 
 * active states, and overlay interactions.
 */

document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("main-nav");
  if (!navContainer) return;

  // 1. Define the Navigation HTML Template
  const navHTML = `
    <style>
      .top-nav { height: 76px; background: var(--color-bg); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: var(--font-body); }
      .nav-logo-group { display: flex; align-items: center; gap: 12px; }
      .nav-logo-icon { width: 32px; height: 32px; border-radius: 0; background: var(--color-fg); color: var(--color-bg); display: grid; place-items: center; font-family: var(--font-heading); font-size: 16px; }
      .nav-logo-text { font-family: var(--font-heading); font-size: 19px; display: flex; gap: 6px; }
      .nav-logo-text .federico { color: var(--color-fg); }
      .nav-logo-text .hospital { color: var(--color-muted-fg); font-style: italic; }

      .nav-links { display: flex; align-items: center; gap: 4px; }
      .nav-link { padding: 8px 14px; border-radius: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-muted-fg); text-decoration: none; transition: color var(--duration-base) var(--ease-luxury); cursor: pointer; border: none; border-bottom: 2px solid transparent; background: transparent; }
      .nav-link:hover { color: var(--color-fg); background: transparent; }
      .nav-link.active { background: transparent; color: var(--color-fg); border-bottom-color: var(--color-accent); }

      .nav-actions { display: flex; align-items: center; gap: 16px; position: relative; }

      .nav-bell { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 0; color: var(--color-muted-fg); transition: color var(--duration-base) var(--ease-luxury); }
      .nav-bell:hover { background: transparent; color: var(--color-fg); }
      .nav-bell-badge { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: var(--status-error); border-radius: 50%; }

      .nav-profile { display: flex; align-items: center; gap: 10px; padding: 6px 14px 6px 6px; border-radius: 0; background: transparent; border: 1px solid var(--color-border); cursor: pointer; transition: border-color var(--duration-base) var(--ease-luxury); }
      .nav-profile:hover { border-color: var(--color-fg); }
      .nav-avatar { width: 28px; height: 28px; border-radius: 0; background: var(--color-fg); color: var(--color-bg); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
      .nav-profile-text { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-fg); }

      /* Overlays */
      .nav-overlay { position: absolute; top: calc(100% + 8px); background: var(--color-bg); border-radius: 0; box-shadow: var(--shadow-card-hover); border: 1px solid var(--color-border); display: none; flex-direction: column; overflow: hidden; z-index: 100; }
      .nav-overlay.active { display: flex; }

      #overlay-notifications { width: 360px; right: 140px; }
      #overlay-profile-dropdown { width: 200px; right: 0; }

      .overlay-header { padding: 14px 16px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
      .overlay-header h3 { font-family: var(--font-heading); font-size: 15px; font-weight: 500; color: var(--color-fg); margin: 0; }
      .overlay-link { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-accent); text-decoration: none; cursor: pointer; }
      .overlay-link:hover { text-decoration: underline; }

      .notif-item { padding: 14px 16px; border-bottom: 1px solid var(--color-border-subtle); display: flex; gap: 12px; cursor: pointer; transition: background var(--duration-base) var(--ease-luxury); background: var(--color-bg); text-align: left; border-left: none; border-right: none; border-top: none; width: 100%; }
      .notif-item:hover { background: var(--color-muted-bg); }
      .notif-item.unread { background: rgba(212, 175, 55, 0.06); }
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
          <span class="hospital">Hospital</span>
        </div>
      </div>

      <div class="nav-links">
        <a href="screen-01-dashboard.html" class="nav-link" data-flow="nav-dashboard">Dashboard</a>
        <a href="screen-02-bed-management.html" class="nav-link" data-flow="nav-beds">Bed Management</a>
        <a href="screen-03-patient-flow.html" class="nav-link" data-flow="nav-patients">Patient Flow</a>
        <a href="screen-04-inventory.html" class="nav-link" data-flow="nav-inventory">Inventory</a>
        <a href="screen-05-billing.html" class="nav-link" data-flow="nav-billing">Billing Summary</a>
      </div>

      <div class="nav-actions">
        <button class="nav-bell" data-flow="open-notifications" id="btn-notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <div class="nav-bell-badge"></div>
        </button>

        <button class="nav-profile" data-flow="open-profile" id="btn-profile">
          <div class="nav-avatar" id="nav-avatar">SU</div>
          <span class="nav-profile-text" id="nav-profile-text">Super User</span>
        </button>

        <div class="nav-overlay" id="overlay-notifications">
          <div class="overlay-header">
            <h3>Notifications</h3>
            <span class="overlay-link" data-flow="mark-all-read">Mark all read</span>
          </div>
          <div style="max-height: 400px; overflow-y: auto;">
            <button class="notif-item unread" data-flow="notification-1">
              <div class="notif-dot" style="background: #EF4444;"></div>
              <div>
                <p class="notif-title">Critical: Bed ICU-01 at capacity</p>
                <p class="notif-time">2 min ago</p>
              </div>
            </button>
            <button class="notif-item unread" data-flow="notification-2">
              <div class="notif-dot" style="background: #F59E0B;"></div>
              <div>
                <p class="notif-title">Inventory: IV Cannula stock low</p>
                <p class="notif-time">18 min ago</p>
              </div>
            </button>
            <button class="notif-item unread" data-flow="notification-3">
              <div class="notif-dot" style="background: #3B82F6;"></div>
              <div>
                <p class="notif-title">PRE-Rekha submitted admission request</p>
                <p class="notif-time">32 min ago</p>
              </div>
            </button>
            <button class="notif-item" data-flow="notification-4">
              <div class="notif-dot" style="background: #10B981;"></div>
              <div>
                <p class="notif-title">Discharge approved: Preethi Iyer</p>
                <p class="notif-time">1h ago</p>
              </div>
            </button>
          </div>
          <div style="padding: 12px 16px; border-top: 1px solid #E2E8F0;">
            <span class="overlay-link" data-flow="view-all-notifications">View all notifications →</span>
          </div>
        </div>

        <div class="nav-overlay" id="overlay-profile-dropdown">
          <div style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;">
            <p id="nav-profile-title" style="font-size: 14px; font-weight: 500; color: #1E293B; margin: 0;">Super User</p>
            <p id="nav-profile-email" style="font-size: 12px; color: #94A3B8; margin: 2px 0 0 0;">hom.superuser@federico.hospital</p>
          </div>
          <div style="padding: 4px 0;">
            <button class="profile-item">⚙️ Settings</button>
            <button class="profile-item">❓ Help</button>
            <button class="profile-item danger" id="btn-signout">🚪 Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  `;

  navContainer.innerHTML = navHTML;

  const currentProfile = window.RoleAccess?.getProfile?.();
  const avatar = document.getElementById('nav-avatar');
  const profileText = document.getElementById('nav-profile-text');
  const profileTitle = document.getElementById('nav-profile-title');
  const profileEmail = document.getElementById('nav-profile-email');

  if (avatar) avatar.textContent = currentProfile?.accessRole === 'SUPER_USER' ? 'SU' : 'HO';
  if (profileText) profileText.textContent = currentProfile?.accessRole === 'SUPER_USER' ? 'Super User' : 'HOM';
  if (profileTitle) profileTitle.textContent = currentProfile?.accessRole === 'SUPER_USER' ? 'HOM Super User' : 'HOM';
  if (profileEmail) profileEmail.textContent = currentProfile?.accessRole === 'SUPER_USER'
    ? 'hom.superuser@federico.hospital'
    : 'hom@federico.hospital';

  // 2. Map Active State based on Current URL
  const currentPath = window.location.pathname.split('/').pop() || 'screen-01-dashboard.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    // Exact matching logic
    if (link.getAttribute('href') === currentPath || 
       (currentPath === 'index.html' && link.getAttribute('data-flow') === 'nav-dashboard')) {
      link.classList.add('active');
    }
  });

  // 3. Handle Overlay Interactions
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
    else sessionStorage.removeItem('userRole');
    window.location.href = '../landing/landing-page.html';
  });

  // Handle Notifications Navigation (from CONNECTION-MAP.md)
  document.querySelectorAll('[data-flow^="notification-"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const flow = e.currentTarget.getAttribute('data-flow');
      if(flow === 'notification-1') window.location.href = 'screen-02-bed-management.html';
      if(flow === 'notification-2') window.location.href = 'screen-04-inventory.html';
      if(flow === 'notification-3') window.location.href = 'screen-01-dashboard.html';
      if(flow === 'notification-4') window.location.href = 'screen-03-patient-flow.html';
    });
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-actions')) {
      closeAllOverlays();
    }
  });
});
