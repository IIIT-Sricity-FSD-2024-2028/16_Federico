'use strict';

/**
 * admin.js — Roles & Staff (Dynamic RBAC, tasks.md §9).
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindDialogControls();
  await Promise.all([loadRoles(), loadStaff()]);
});

let rolesCache = [];
let permissionsCache = [];
let selectedRoleId = null;

async function loadRoles() {
  const listEl = document.getElementById('roles-list');
  try {
    [rolesCache, permissionsCache] = await Promise.all([
      window.ApiClient.rbac.roles(),
      window.ApiClient.rbac.permissions(),
    ]);
    renderRolesList();
  } catch (err) {
    listEl.innerHTML = '<div class="md-empty-state"><span>Could not load roles.</span></div>';
    window.UIFeedback.toast(err.message || 'Could not load custom roles.', 'error');
  }
}

function renderRolesList() {
  const listEl = document.getElementById('roles-list');
  if (rolesCache.length === 0) {
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
          <span class="badge badge-neutral">›</span>
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
  document.getElementById('permissions-card-title').textContent = role.role_name;
  document.getElementById('permissions-card-desc').textContent = 'Toggle which of the fixed permissions this role grants.';

  const checklistEl = document.getElementById('permissions-checklist');
  checklistEl.innerHTML = '<div class="md-empty-state"><span>Loading permissions…</span></div>';

  let grantedIds;
  try {
    const granted = await window.ApiClient.rbac.permissionsForRole(roleId);
    grantedIds = granted.map((p) => p.permission_id);
  } catch (err) {
    checklistEl.innerHTML = '<div class="md-empty-state"><span>Could not load this role\'s permissions.</span></div>';
    window.UIFeedback.toast(err.message || 'Could not load permissions.', 'error');
    return;
  }

  checklistEl.innerHTML = permissionsCache
    .map((permission) => {
      const checked = grantedIds.includes(permission.permission_id) ? 'checked' : '';
      return `
        <label class="permission-row">
          <input type="checkbox" data-permission-id="${permission.permission_id}" ${checked} />
          <code>${window.Formatters.escapeHtml(permission.permission_code)}</code>
          <span style="color: var(--text-secondary); font-size: 12px;">${window.Formatters.escapeHtml(permission.description || '')}</span>
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
          window.UIFeedback.toast('Permission granted.', 'success');
        } else {
          await window.ApiClient.rbac.unassignPermission(roleId, permissionId);
          window.UIFeedback.toast('Permission revoked.', 'warning');
        }
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        window.UIFeedback.toast(err.message || 'Could not update permission.', 'error');
      }
    });
  });
}

// ---- Create role dialog ----
function bindDialogControls() {
  const dialog = document.getElementById('role-dialog');
  document.getElementById('new-role-btn').addEventListener('click', () => {
    document.getElementById('role-form').reset();
    dialog.showModal();
  });
  document.getElementById('role-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('role-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-description').value.trim();
    if (!name) return;
    try {
      const role = await window.ApiClient.rbac.createRole({ role_name: name, description: description || undefined });
      dialog.close();
      window.UIFeedback.toast(`Role "${role.role_name}" created.`, 'success');
      await loadRoles();
      selectRole(role.custom_role_id);
    } catch (err) {
      window.UIFeedback.toast(err.message || 'Could not create role.', 'error');
    }
  });
}

// ---- Staff table ----
async function loadStaff() {
  const tbody = document.getElementById('staff-tbody');
  try {
    const staff = await window.ApiClient.rbac.staff();
    renderStaffTable(staff);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Could not load staff.</td></tr>';
    window.UIFeedback.toast(err.message || 'Could not load staff.', 'error');
  }
}

function renderStaffTable(staff) {
  const tbody = document.getElementById('staff-tbody');
  if (staff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No staff in this organization yet.</td></tr>';
    return;
  }

  tbody.innerHTML = staff
    .map((member) => {
      const chips = member.custom_roles
        .map(
          (role) => `
            <span class="badge badge-info staff-role-chip" data-user-id="${member.user_id}" data-role-id="${role.custom_role_id}">
              ${window.Formatters.escapeHtml(role.role_name)}
              <button type="button" title="Remove role" data-remove-role>✕</button>
            </span>
          `,
        )
        .join(' ') || '<span style="color: var(--text-secondary); font-size: 12px;">None</span>';

      const roleOptions = rolesCache
        .filter((r) => !member.custom_roles.some((cr) => cr.custom_role_id === r.custom_role_id))
        .map((r) => `<option value="${r.custom_role_id}">${window.Formatters.escapeHtml(r.role_name)}</option>`)
        .join('');

      return `
        <tr>
          <td>${window.Formatters.escapeHtml(member.name)}</td>
          <td>${window.Formatters.escapeHtml(member.email)}</td>
          <td><span class="badge badge-neutral">${window.Formatters.escapeHtml(member.actor_role)}</span></td>
          <td>${chips}</td>
          <td>
            ${
              roleOptions
                ? `<div style="display:flex; gap:6px;">
                     <select class="input" style="height:36px; padding:0 10px;" data-grant-select data-user-id="${member.user_id}">${roleOptions}</select>
                     <button type="button" class="btn btn-secondary btn-sm" data-grant-btn data-user-id="${member.user_id}">Grant</button>
                   </div>`
                : '<span style="color: var(--text-secondary); font-size: 12px;">All roles granted</span>'
            }
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-remove-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const chip = btn.closest('.staff-role-chip');
      try {
        await window.ApiClient.rbac.unassignStaffRole(+chip.dataset.userId, +chip.dataset.roleId);
        window.UIFeedback.toast('Role removed.', 'warning');
        await loadStaff();
      } catch (err) {
        window.UIFeedback.toast(err.message || 'Could not remove role.', 'error');
      }
    });
  });

  tbody.querySelectorAll('[data-grant-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = +btn.dataset.userId;
      const select = tbody.querySelector(`[data-grant-select][data-user-id="${userId}"]`);
      if (!select || !select.value) return;
      try {
        await window.ApiClient.rbac.assignStaffRole(userId, +select.value);
        window.UIFeedback.toast('Role granted.', 'success');
        await loadStaff();
      } catch (err) {
        window.UIFeedback.toast(err.message || 'Could not grant role.', 'error');
      }
    });
  });
}
