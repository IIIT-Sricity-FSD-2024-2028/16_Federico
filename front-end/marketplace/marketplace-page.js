'use strict';

/**
 * marketplace-page.js — Organization Marketplace.
 * Public, unauthenticated: fetches GET /marketplace/organizations and
 * renders a searchable directory. Each card deep-links into login/signup
 * with ?org=<id> so the chosen organization carries through.
 */
(function () {
  function escape(str) {
    if (window.Formatters && typeof window.Formatters.escapeHtml === 'function') {
      return window.Formatters.escapeHtml(str);
    }
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var allOrganizations = [];

  var grid = document.getElementById('org-grid');
  var searchInput = document.getElementById('search-input');
  var emergencyFilter = document.getElementById('emergency-filter');
  var template = document.getElementById('org-card-template');

  function matchesSearch(org, query) {
    if (!query) return true;
    var haystack = [
      org.name,
      org.specialties?.join(' '),
      org.branches?.map(function (b) { return b.name + ' ' + (b.city || ''); }).join(' '),
    ].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function render() {
    var query = searchInput.value.trim();
    var emergencyOnly = emergencyFilter.checked;

    var filtered = allOrganizations.filter(function (org) {
      if (emergencyOnly && !org.emergency_available) return false;
      return matchesSearch(org, query);
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'md-empty-state';
      empty.innerHTML = '<strong>No hospitals match your search.</strong><span>Try a different name, city, or specialty.</span>';
      grid.appendChild(empty);
      return;
    }

    filtered.forEach(function (org) {
      var node = template.content.cloneNode(true);
      var mark = node.querySelector('.org-mark');
      mark.textContent = (org.branding && org.branding.initial) || org.name.charAt(0).toUpperCase();
      mark.style.background = (org.branding && org.branding.primary_color) || 'var(--md-primary)';

      node.querySelector('.org-name').textContent = org.name;
      var branchNames = (org.branches || []).map(function (b) { return b.name.replace(org.name + ' — ', '').replace(org.name, 'Main Campus'); });
      node.querySelector('.org-branches').textContent = (org.branches || []).length
        ? (org.branches.length === 1 ? org.branches[0].city || org.branches[0].name : org.branches.length + ' branches — ' + branchNames.join(', '))
        : 'No branches listed';

      var emergencyChip = node.querySelector('.emergency-chip');
      if (!org.emergency_available) emergencyChip.remove();

      var specialtiesEl = node.querySelector('.org-specialties');
      (org.specialties || []).forEach(function (s) {
        var chip = document.createElement('span');
        chip.className = 'md-chip md-chip-neutral';
        chip.textContent = s;
        specialtiesEl.appendChild(chip);
      });

      var contactParts = [org.contact?.phone, org.contact?.email].filter(Boolean);
      node.querySelector('.org-contact').textContent = contactParts.join(' · ') || 'Contact details unavailable';

      node.querySelector('.org-login-link').href = '../login/login-page.html?org=' + encodeURIComponent(org.organization_id);
      node.querySelector('.org-register-link').href = '../signup/signup-page.html?org=' + encodeURIComponent(org.organization_id);

      grid.appendChild(node);
    });
  }

  async function loadOrganizations() {
    try {
      var api = window.API || window.ApiClient;
      allOrganizations = await api.marketplace.organizations();
      render();
    } catch (_) {
      grid.innerHTML = '<div class="md-empty-state"><strong>Could not load hospitals.</strong><span>Is the backend running? Refresh to retry.</span></div>';
      window.UIFeedback?.toast('Could not reach the Federico platform. Please refresh.', 'error');
    }
  }

  searchInput.addEventListener('input', render);
  emergencyFilter.addEventListener('change', render);

  loadOrganizations();
})();
