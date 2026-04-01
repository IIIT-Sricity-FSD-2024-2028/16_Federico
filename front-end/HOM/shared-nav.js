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
      .top-nav { height: 64px; background: #ffffff; border-bottom: 1px solid #E2E8F0; position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: 'Inter', sans-serif; }
      .nav-logo-group { display: flex; align-items: center; gap: 8px; }
      .nav-logo-icon { width: 28px; height: 28px; background-color: #20B2AA; border-radius: 6px; }
      .nav-logo-text { font-size: 18px; font-weight: 600; display: flex; gap: 4px; }
      .nav-logo-text .federico { color: #20B2AA; }
      .nav-logo-text .hospital { color: #1E293B; }
      
      .nav-links { display: flex; align-items: center; gap: 4px; }
      .nav-link { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748B; text-decoration: none; transition: all 0.2s; cursor: pointer; border: none; background: transparent; }
      .nav-link:hover { color: #1E293B; background: #F8FAFC; }
      .nav-link.active { background: #E0F7F6; color: #20B2AA; }

      .nav-actions { display: flex; align-items: center; gap: 16px; position: relative; }
      
      .nav-bell { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: #64748B; transition: background 0.2s; }
      .nav-bell:hover { background: #F8FAFC; }
      .nav-bell-badge { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #EF4444; border-radius: 50%; }
      
      .nav-profile { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 9999px; background: #F8FAFC; cursor: pointer; border: none; transition: background 0.2s; }
      .nav-profile:hover { background: #E2E8F0; }
      .nav-avatar { width: 28px; height: 28px; border-radius: 50%; background: #20B2AA; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
      .nav-profile-text { font-size: 14px; font-weight: 500; color: #1E293B; }

      /* Overlays */
      .nav-overlay { position: absolute; top: calc(100% + 8px); background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; display: none; flex-direction: column; overflow: hidden; z-index: 100; }
      .nav-overlay.active { display: flex; }
      
      #overlay-notifications { width: 360px; right: 140px; }
      #overlay-profile-dropdown { width: 200px; right: 0; }

      .overlay-header { padding: 12px 16px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
      .overlay-header h3 { font-size: 14px; font-weight: 600; color: #1E293B; margin: 0; }
      .overlay-link { font-size: 12px; color: #20B2AA; text-decoration: none; cursor: pointer; }
      .overlay-link:hover { text-decoration: underline; }
      
      .notif-item { padding: 12px 16px; border-bottom: 1px solid #F1F5F9; display: flex; gap: 12px; cursor: pointer; transition: background 0.2s; background: white; text-align: left; border: none; width: 100%; }
      .notif-item:hover { background: #F8FAFC; }
      .notif-item.unread { background: #F0FDF4; }
      .notif-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
      .notif-title { font-size: 14px; font-weight: 500; color: #1E293B; margin: 0; }
      .notif-time { font-size: 12px; color: #94A3B8; margin: 2px 0 0 0; }

      .profile-item { padding: 8px 16px; font-size: 14px; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; border: none; width: 100%; text-align: left; transition: background 0.2s; }
      .profile-item:hover { background: #F8FAFC; color: #1E293B; }
      .profile-item.danger { color: #EF4444; border-top: 1px solid #E2E8F0; }
      .profile-item.danger:hover { background: #FEF2F2; }
    </style>

    <div class="top-nav">
      <div class="nav-logo-group">
        <div class="nav-logo-icon"></div>
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
        <a href="../FA/index.html" class="nav-link" data-flow="nav-finance" hidden>Finance Control</a>
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
  const financeLink = navContainer.querySelector('[data-flow="nav-finance"]');
  const avatar = document.getElementById('nav-avatar');
  const profileText = document.getElementById('nav-profile-text');
  const profileTitle = document.getElementById('nav-profile-title');
  const profileEmail = document.getElementById('nav-profile-email');

  if (financeLink) {
    financeLink.hidden = !(window.RoleAccess?.isSuperUser?.() && window.RoleAccess?.hasModuleAccess?.('FA'));
  }

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
    window.location.href = '../Patient/landing-page.html';
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
