'use strict';

/**
 * admin.js — Roles & Staff (Dynamic RBAC Management).
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindDialogControls();
  bindBrandingUpload();
  await loadRoles();
  await loadStaff();
});

// ---- Hospital branding logo upload ----
function bindBrandingUpload() {
  const input = document.getElementById('branding-file-input');
  const button = document.getElementById('branding-upload-btn');
  const meta = document.getElementById('branding-meta');
  if (!input || !button) return;

  button.addEventListener('click', async () => {
    const file = input.files && input.files[0];
    if (!file) {
      window.UIFeedback?.toast('Choose a logo file first.', 'warning');
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Uploading…';
    if (meta) meta.textContent = '';

    try {
      const result = await window.ApiClient.uploads.branding(file);
      renderBrandingPreview(result);
      window.UIFeedback?.toast(`Logo uploaded (${formatFileSize(result.sizeBytes)}).`, 'success');
      input.value = '';
    } catch (err) {
      window.UIFeedback?.toast(err.message || 'Could not upload logo.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

function renderBrandingPreview(uploadResult) {
  const preview = document.getElementById('branding-preview');
  const meta = document.getElementById('branding-meta');
  if (!preview) return;

  if (uploadResult.mimetype === 'application/pdf') {
    preview.innerHTML = '<span>PDF<br>uploaded</span>';
  } else {
    const url = window.ApiClient.uploads.staticUrl('branding', uploadResult.filename);
    preview.innerHTML = `<img src="${url}" alt="Hospital logo" />`;
  }

  if (meta) {
    meta.textContent = `${uploadResult.originalName} · ${formatFileSize(uploadResult.sizeBytes)} · uploaded just now`;
  }
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let rolesCache = [];
let permissionsCache = [];
let selectedRoleId = null;

async function loadRoles() {
  const listEl = document.getElementById('roles-list');
  try {
    [rolesCache, permissionsCache] = await Promise.all([
      window.ApiClient.rbac.roles().catch(() => []),
      window.ApiClient.rbac.permissions().catch(() => []),
    ]);
    renderRolesList();
  } catch (err) {
    if (listEl) listEl.innerHTML = '<div class="md-empty-state"><span>Could not load roles.</span></div>';
    window.UIFeedback?.toast(err.message || 'Could not load custom roles.', 'error');
  }
}

function renderRolesList() {
  const listEl = document.getElementById('roles-list');
  if (!listEl) return;

  if (!rolesCache || rolesCache.length === 0) {
    listEl.innerHTML = '<div class="md-empty-state"><strong>No custom roles yet.</strong><span>Create one to grant extra access to a specific staff member.</span></div>';
    return;
  }

  listEl.innerHTML = rolesCache
    .map(
      (role) => `
        <div class="role-row${role.custom_role_id === selectedRoleId ? ' is-selected' : ''}" data-role-id="${role.custom_role_id}">
          <div>
            <div class="role-row-name">${window.Formatters.escapeHtml(role.role_name)}</div>
            <div class="role-row-meta">${window.Formatters.escapeHtml(role.description || 'No description')}</div>
          </div>
          <span class="badge badge-neutral">Edit</span>
        </div>
      `,
    )
    .join('');

  listEl.querySelectorAll('.role-row').forEach((row) => {
    row.addEventListener('click', () => selectRole(+row.dataset.roleId));
  });
}

async function selectRole(roleId) {
  selectedRoleId = roleId;
  renderRolesList();

  const role = rolesCache.find((r) => r.custom_role_id === roleId);
  if (!role) return;

  const titleEl = document.getElementById('permissions-card-title');
  const descEl = document.getElementById('permissions-card-desc');
  if (titleEl) titleEl.textContent = role.role_name;
  if (descEl) descEl.textContent = 'Toggle which permissions this role grants.';

  const checklistEl = document.getElementById('permissions-checklist');
  if (!checklistEl) return;
  checklistEl.innerHTML = '<div class="md-empty-state"><span>Loading permissions…</span></div>';

  let grantedIds = [];
  try {
    const granted = await window.ApiClient.rbac.permissionsForRole(roleId);
    grantedIds = (granted || []).map((p) => p.permission_id);
  } catch (err) {
    checklistEl.innerHTML = '<div class="md-empty-state"><span>Could not load permissions.</span></div>';
    window.UIFeedback?.toast(err.message || 'Could not load permissions.', 'error');
    return;
  }

  checklistEl.innerHTML = (permissionsCache || [])
    .map((permission) => {
      const checked = grantedIds.includes(permission.permission_id) ? 'checked' : '';
      return `
        <label class="permission-row" style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); cursor:pointer;">
          <input type="checkbox" data-permission-id="${permission.permission_id}" ${checked} style="width:16px; height:16px;" />
          <div>
            <code style="font-weight:700;">${window.Formatters.escapeHtml(permission.permission_code)}</code>
            <span style="color: var(--text-secondary); font-size: 12px; display:block;">${window.Formatters.escapeHtml(permission.description || '')}</span>
          </div>
        </label>
      `;
    })
    .join('');

  checklistEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const permissionId = +checkbox.dataset.permissionId;
      try {
        if (checkbox.checked) {
          await window.ApiClient.rbac.assignPermission(roleId, permissionId);
          window.UIFeedback?.toast('Permission granted.', 'success');
        } else {
          await window.ApiClient.rbac.unassignPermission(roleId, permissionId);
          window.UIFeedback?.toast('Permission revoked.', 'warning');
        }
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        window.UIFeedback?.toast(err.message || 'Could not update permission.', 'error');
      }
    });
  });
}

// ---- Create role dialog ----
function bindDialogControls() {
  const dialog = document.getElementById('role-dialog');
  document.getElementById('new-role-btn')?.addEventListener('click', () => {
    document.getElementById('role-form')?.reset();
    dialog.showModal();
  });
  document.getElementById('role-cancel')?.addEventListener('click', () => dialog.close());
  document.getElementById('role-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('role-name')?.value.trim();
    const description = document.getElementById('role-description')?.value.trim();
    if (!name) return;
    try {
      const role = await window.ApiClient.rbac.createRole({ role_name: name, description: description || undefined });
      dialog.close();
      window.UIFeedback?.toast(`Role "${role.role_name}" created.`, 'success');
      await loadRoles();
      await loadStaff();
      selectRole(role.custom_role_id);
    } catch (err) {
      window.UIFeedback?.toast(err.message || 'Could not create role.', 'error');
    }
  });
}

// ---- Staff table ----
async function loadStaff() {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;
  try {
    const staff = await window.ApiClient.rbac.staff().catch(() => []);
    renderStaffTable(staff || []);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Could not load staff.</td></tr>';
    window.UIFeedback?.toast(err.message || 'Could not load staff.', 'error');
  }
}

function renderStaffTable(staff) {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  if (!staff || staff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-secondary);">No staff registered in this organization yet.</td></tr>';
    return;
  }

  tbody.innerHTML = staff
    .map((member) => {
      const memberRoles = member.custom_roles || [];
      const chips = memberRoles
        .map(
          (role) => `
            <span class="badge badge-info staff-role-chip" data-user-id="${member.user_id}" data-role-id="${role.custom_role_id}">
              ${window.Formatters.escapeHtml(role.role_name)}
              <button type="button" title="Remove role" data-remove-role style="margin-left:4px; border:none; background:transparent; cursor:pointer; font-weight:bold;">✕</button>
            </span>
          `,
        )
        .join(' ') || '<span style="color: var(--text-secondary); font-size: 12px;">No extra roles</span>';

      const unassignedRoles = (rolesCache || []).filter(
        (r) => !memberRoles.some((cr) => cr.custom_role_id === r.custom_role_id),
      );

      let grantControl = '';
      if (!rolesCache || rolesCache.length === 0) {
        grantControl = '<span style="color: var(--text-secondary); font-size: 12px;">No custom roles created</span>';
      } else if (unassignedRoles.length === 0) {
        grantControl = '<span style="color: var(--text-secondary); font-size: 12px;">All custom roles granted</span>';
      } else {
        const options = unassignedRoles
          .map((r) => `<option value="${r.custom_role_id}">${window.Formatters.escapeHtml(r.role_name)}</option>`)
          .join('');

        grantControl = `
          <div style="display:flex; gap:6px; align-items:center;">
            <select class="input" style="height:34px; padding:0 8px; font-size:12px;" data-grant-select data-user-id="${member.user_id}">
              <option value="" disabled selected>Select role…</option>
              ${options}
            </select>
            <button type="button" class="btn btn-primary btn-sm" data-grant-btn data-user-id="${member.user_id}" style="padding:4px 10px; font-size:12px;">Grant</button>
          </div>
        `;
      }

      return `
        <tr>
          <td><strong>${window.Formatters.escapeHtml(member.name || '-')}</strong></td>
          <td>${window.Formatters.escapeHtml(member.email || '-')}</td>
          <td><span class="badge badge-neutral">${window.Formatters.escapeHtml(member.actor_role || '-')}</span></td>
          <td>${chips}</td>
          <td>${grantControl}</td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-remove-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const chip = btn.closest('.staff-role-chip');
      if (!chip) return;
      try {
        await window.ApiClient.rbac.unassignStaffRole(+chip.dataset.userId, +chip.dataset.roleId);
        window.UIFeedback?.toast('Role removed from user.', 'warning');
        await loadStaff();
      } catch (err) {
        window.UIFeedback?.toast(err.message || 'Could not remove role.', 'error');
      }
    });
  });

  tbody.querySelectorAll('[data-grant-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = +btn.dataset.userId;
      const select = tbody.querySelector(`[data-grant-select][data-user-id="${userId}"]`);
      if (!select || !select.value) {
        window.UIFeedback?.toast('Please select a custom role to grant.', 'warning');
        return;
      }
      try {
        await window.ApiClient.rbac.assignStaffRole(userId, +select.value);
        window.UIFeedback?.toast('Role granted to user.', 'success');
        await loadStaff();
      } catch (err) {
        window.UIFeedback?.toast(err.message || 'Could not grant role.', 'error');
      }
    });
  });
}
