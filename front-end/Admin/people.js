'use strict';

/**
 * Admin/people.js — staff account creation + doctor/department management.
 *
 * Staff accounts   -> POST /rbac/staff       (HOM / PRE / FA logins)
 * Doctors          -> /doctor CRUD, gated by the DOCTOR module.
 */

const esc = (s) => (window.Formatters ? window.Formatters.escapeHtml(s) : String(s == null ? '' : s));

let wardsCache = [];
let editingDoctorId = null;

document.addEventListener('DOMContentLoaded', async () => {
  bindStaffDialog();
  bindDoctorDialog();
  await Promise.all([loadStaff(), loadDoctors()]);
});

/* ----------------------------- Staff accounts ----------------------------- */

function bindStaffDialog() {
  const dialog = document.getElementById('staff-dialog');
  document.getElementById('new-staff-btn').addEventListener('click', () => {
    document.getElementById('staff-form').reset();
    dialog.showModal();
  });
  document.getElementById('staff-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('staff-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById('staff-name').value.trim(),
      email: document.getElementById('staff-email').value.trim(),
      password: document.getElementById('staff-password').value,
      actor_role: document.getElementById('staff-role').value,
    };
    if (!payload.name || !payload.email || payload.password.length < 6) return;
    try {
      const created = await window.ApiClient.rbac.createStaff(payload);
      dialog.close();
      window.UIFeedback.toast(
        `${created.name} can now sign in as ${created.actor_role} with ${created.email}.`,
        'success',
      );
      await loadStaff();
    } catch (err) {
      window.UIFeedback.toast(err.message || 'Could not create this login.', 'error');
    }
  });
}

async function loadStaff() {
  const tbody = document.getElementById('staff-tbody');
  try {
    const staff = await window.ApiClient.rbac.staff();
    renderStaff(staff);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Could not load staff.</td></tr>';
    window.UIFeedback.toast(err.message || 'Could not load staff.', 'error');
  }
}

function renderStaff(staff) {
  const tbody = document.getElementById('staff-tbody');
  if (!staff.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-secondary);">No staff logins yet. Use “Add Person”.</td></tr>';
    return;
  }
  tbody.innerHTML = staff
    .map((m) => {
      const active = m.is_active !== false;
      return `
        <tr>
          <td style="font-weight:500;">${esc(m.name)}</td>
          <td>${esc(m.email)}</td>
          <td><span class="badge badge-neutral">${esc(m.actor_role)}</span></td>
          <td><span class="status-pill ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Disabled'}</span></td>
          <td>${window.UI.Button({
            variant: active ? 'outline' : 'primary',
            size: 'sm',
            children: active ? 'Disable' : 'Enable',
            dataAttrs: { action: 'toggle-staff', userId: m.user_id, next: active ? '0' : '1' },
          })}</td>
        </tr>`;
    })
    .join('');
}

/* ---------------------------- Doctors / depts ---------------------------- */

function bindDoctorDialog() {
  const dialog = document.getElementById('doctor-dialog');
  const newBtn = document.getElementById('new-doctor-btn');
  newBtn.addEventListener('click', () => {
    // The shared module-lock layer already intercepts the click when DOCTOR
    // is disabled — this only runs when the module is available.
    if (!window.RoleAccess.hasModule('DOCTOR')) return;
    editingDoctorId = null;
    openDoctorDialog(null);
  });
  document.getElementById('doctor-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('doctor-form').addEventListener('submit', handleDoctorSubmit);

  document.addEventListener('click', (event) => {
    const editT = event.target.closest('[data-action="edit-doctor"]');
    if (editT) return openDoctorDialog(Number(editT.dataset.doctorId));
    const delT = event.target.closest('[data-action="delete-doctor"]');
    if (delT) return deleteDoctor(Number(delT.dataset.doctorId));
    const toggleT = event.target.closest('[data-action="toggle-staff"]');
    if (toggleT) return toggleStaff(Number(toggleT.dataset.userId), toggleT.dataset.next === '1');
  });
}

async function toggleStaff(userId, next) {
  try {
    await window.ApiClient.rbac.setStaffActive(userId, next);
    window.UIFeedback.toast(next ? 'Login enabled.' : 'Login disabled.', next ? 'success' : 'warning');
    await loadStaff();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not update this login.', 'error');
  }
}

let doctorsCache = [];

async function loadDoctors() {
  const tbody = document.getElementById('doctors-tbody');
  if (!window.RoleAccess.hasModule('DOCTOR')) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-secondary);">The Doctor Management module is not enabled for your organization.</td></tr>';
    return;
  }
  try {
    [doctorsCache, wardsCache] = await Promise.all([
      window.ApiClient.doctors.list(),
      window.ApiClient.wards.list().catch(() => []),
    ]);
    renderDoctors();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Could not load doctors.</td></tr>';
    window.UIFeedback.toast(err.message || 'Could not load doctors.', 'error');
  }
}

function renderDoctors() {
  const tbody = document.getElementById('doctors-tbody');
  if (!doctorsCache.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-secondary);">No doctors yet. Use “Add Doctor”.</td></tr>';
    return;
  }
  tbody.innerHTML = doctorsCache
    .map(
      (d) => `
      <tr>
        <td style="font-weight:500;">${esc(d.name)}</td>
        <td>${esc(d.specialization || '—')}</td>
        <td>${esc(d.department || '—')}</td>
        <td>${esc(d.phone || d.email || '—')}</td>
        <td style="display:flex; gap:6px;">
          ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Edit', dataAttrs: { action: 'edit-doctor', doctorId: d.doctor_id } })}
          ${window.UI.Button({ variant: 'danger', size: 'sm', children: 'Delete', dataAttrs: { action: 'delete-doctor', doctorId: d.doctor_id } })}
        </td>
      </tr>`,
    )
    .join('');
}

function departmentOptions(selected) {
  const names = wardsCache.map((w) => w.ward_name);
  if (selected && !names.includes(selected)) names.unshift(selected);
  if (!names.length) return '<option value="">General</option>';
  return names
    .map((n) => `<option value="${esc(n)}" ${n === selected ? 'selected' : ''}>${esc(n)}</option>`)
    .join('');
}

function openDoctorDialog(doctorId) {
  editingDoctorId = doctorId;
  const dialog = document.getElementById('doctor-dialog');
  const doc = doctorId ? doctorsCache.find((d) => d.doctor_id === doctorId) : null;
  document.getElementById('doctor-dialog-title').textContent = doc ? `Edit ${doc.name}` : 'Add a Doctor';
  document.getElementById('doctor-name').value = doc ? doc.name : '';
  document.getElementById('doctor-spec').value = doc ? doc.specialization || '' : '';
  document.getElementById('doctor-dept').innerHTML = departmentOptions(doc ? doc.department : '');
  document.getElementById('doctor-phone').value = doc ? doc.phone || '' : '';
  document.getElementById('doctor-email').value = doc ? doc.email || '' : '';
  dialog.showModal();
}

async function handleDoctorSubmit(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('doctor-name').value.trim(),
    specialization: document.getElementById('doctor-spec').value.trim() || undefined,
    department: document.getElementById('doctor-dept').value || undefined,
    phone: document.getElementById('doctor-phone').value.trim() || undefined,
    email: document.getElementById('doctor-email').value.trim() || undefined,
  };
  if (!payload.name) return;
  try {
    if (editingDoctorId) {
      await window.ApiClient.doctors.update(editingDoctorId, payload);
      window.UIFeedback.toast(`${payload.name} updated.`, 'success');
    } else {
      await window.ApiClient.doctors.create(payload);
      window.UIFeedback.toast(`${payload.name} added.`, 'success');
    }
    document.getElementById('doctor-dialog').close();
    await loadDoctors();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not save this doctor.', 'error');
  }
}

async function deleteDoctor(doctorId) {
  const doc = doctorsCache.find((d) => d.doctor_id === doctorId);
  if (!doc) return;
  const ok = await window.UIFeedback.confirm({
    title: `Remove ${doc.name}?`,
    body: 'The doctor will no longer be available for new appointments.',
    confirmLabel: 'Remove',
    danger: true,
  });
  if (!ok) return;
  try {
    await window.ApiClient.doctors.remove(doctorId);
    window.UIFeedback.toast(`${doc.name} removed.`, 'warning');
    await loadDoctors();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not remove this doctor.', 'error');
  }
}
