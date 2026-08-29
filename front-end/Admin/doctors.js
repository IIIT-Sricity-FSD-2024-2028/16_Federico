'use strict';

/**
 * Admin/doctors.js — doctor directory add/edit/remove for the org owner.
 *
 * Backend: /doctor CRUD is gated by `doctorDirectory` in
 * middleware/actorAccess.js (write/delete allow 'Admin' and 'HOM').
 * `department` is a free-text string on the doctor; the form offers the 6
 * canonical departments from shared/constants.js plus an "Other…" free-text
 * option. Delete is a soft-deactivate on the backend (the row then drops out
 * of GET /doctor).
 */

let doctorsCache = [];
let editingDoctorId = null;

const OTHER_DEPARTMENT = '__other__';

function canonicalDepartments() {
  const list =
    (window.HospitalConstants && window.HospitalConstants.DEFAULT_DEPARTMENTS) || [];
  return list.map((d) => d.department);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindDialogControls();
  await loadAndRender();
});

async function loadAndRender() {
  doctorsCache = await window.ApiClient.doctors.list();
  renderMetrics();
  renderTable();
}

function renderMetrics() {
  const active = doctorsCache.filter((d) => d.is_active !== false).length;
  const departments = new Set(
    doctorsCache.map((d) => d.department).filter(Boolean),
  ).size;

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">👨‍⚕️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${doctorsCache.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Doctors</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #DCFCE7;">✅</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${active}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Active</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">🏷️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${departments}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Departments Covered</div></div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('doctors-tbody');
  window.DomTable.renderRows(tbody, doctorsCache, {
    colspan: 6,
    emptyMessage: 'No doctors yet. Add one to make it bookable for appointments.',
    toRow: (doc) => {
      const contact = [doc.phone, doc.email].filter(Boolean).join(' · ') || '—';
      const active = doc.is_active !== false;
      return `
        <tr>
          <td style="font-weight: 500;">${window.Formatters.escapeHtml(doc.name)}</td>
          <td>${window.Formatters.escapeHtml(doc.specialization || '—')}</td>
          <td>${window.Formatters.escapeHtml(doc.department || 'General')}</td>
          <td>${window.Formatters.escapeHtml(contact)}</td>
          <td>${active ? 'Active' : 'Inactive'}</td>
          <td>
            ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Edit', dataAttrs: { action: 'edit-doctor', doctorId: doc.doctor_id } })}
            ${window.UI.Button({ variant: 'danger', size: 'sm', children: 'Remove', dataAttrs: { action: 'delete-doctor', doctorId: doc.doctor_id } })}
          </td>
        </tr>
      `;
    },
  });
}

// Delegated click handling for each row's Edit/Remove — one listener instead
// of per-row onclick strings (same pattern as Admin/inventory-catalog.js).
document.addEventListener('click', (event) => {
  const editTrigger = event.target.closest('[data-action="edit-doctor"]');
  if (editTrigger) return openDoctorDialog(Number(editTrigger.dataset.doctorId));

  const deleteTrigger = event.target.closest('[data-action="delete-doctor"]');
  if (deleteTrigger) return deleteDoctor(Number(deleteTrigger.dataset.doctorId));
});

function bindDialogControls() {
  const dialog = document.getElementById('doctor-dialog');
  const deptSelect = document.getElementById('doctor-department');

  // Build the department dropdown once: canonical departments + "Other…".
  deptSelect.innerHTML =
    canonicalDepartments()
      .map((name) => `<option value="${window.Formatters.escapeHtml(name)}">${window.Formatters.escapeHtml(name)}</option>`)
      .join('') + `<option value="${OTHER_DEPARTMENT}">Other…</option>`;

  deptSelect.addEventListener('change', syncOtherDepartmentField);

  document.getElementById('new-doctor-btn').addEventListener('click', () => openDoctorDialog(null));
  document.getElementById('doctor-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('doctor-form').addEventListener('submit', handleDoctorFormSubmit);
}

function syncOtherDepartmentField() {
  const isOther = document.getElementById('doctor-department').value === OTHER_DEPARTMENT;
  document.getElementById('doctor-department-other-field').style.display = isOther ? '' : 'none';
}

function openDoctorDialog(doctorId) {
  editingDoctorId = doctorId;
  const dialog = document.getElementById('doctor-dialog');
  const form = document.getElementById('doctor-form');
  form.reset();

  const doc = doctorId ? doctorsCache.find((d) => d.doctor_id === doctorId) : null;
  document.getElementById('doctor-dialog-title').textContent = doc ? `Edit ${doc.name}` : 'Add a Doctor';
  document.getElementById('doctor-name').value = doc ? doc.name : '';
  document.getElementById('doctor-specialization').value = doc ? doc.specialization || '' : '';
  document.getElementById('doctor-phone').value = doc ? doc.phone || '' : '';
  document.getElementById('doctor-email').value = doc ? doc.email || '' : '';

  const deptSelect = document.getElementById('doctor-department');
  const known = canonicalDepartments();
  const currentDept = doc ? doc.department || '' : '';
  if (currentDept && !known.includes(currentDept)) {
    deptSelect.value = OTHER_DEPARTMENT;
    document.getElementById('doctor-department-other').value = currentDept;
  } else {
    deptSelect.value = currentDept || known[0] || OTHER_DEPARTMENT;
    document.getElementById('doctor-department-other').value = '';
  }
  syncOtherDepartmentField();

  // Active toggle only makes sense when editing an existing doctor.
  document.getElementById('doctor-active-field').style.display = doc ? 'flex' : 'none';
  document.getElementById('doctor-active').checked = doc ? doc.is_active !== false : true;

  dialog.showModal();
}

function selectedDepartment() {
  const value = document.getElementById('doctor-department').value;
  if (value === OTHER_DEPARTMENT) {
    return document.getElementById('doctor-department-other').value.trim();
  }
  return value;
}

async function handleDoctorFormSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('doctor-name').value.trim();
  const specialization = document.getElementById('doctor-specialization').value.trim();
  const department = selectedDepartment();
  const phone = document.getElementById('doctor-phone').value.trim();
  const email = document.getElementById('doctor-email').value.trim();
  if (!name || !specialization) return;

  const payload = {
    name,
    specialization,
    department: department || undefined,
    phone: phone || undefined,
    email: email || undefined,
  };

  try {
    if (editingDoctorId) {
      payload.is_active = document.getElementById('doctor-active').checked;
      await window.ApiClient.doctors.update(editingDoctorId, payload);
      window.UIFeedback.toast(`${name} updated.`, 'success');
    } else {
      await window.ApiClient.doctors.create(payload);
      window.UIFeedback.toast(`${name} added.`, 'success');
    }
    document.getElementById('doctor-dialog').close();
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not save this doctor.', 'error');
  }
}

async function deleteDoctor(doctorId) {
  const doc = doctorsCache.find((d) => d.doctor_id === doctorId);
  if (!doc) return;
  const confirmed = await window.UIFeedback.confirm({
    title: `Remove ${doc.name}?`,
    body: 'The doctor is deactivated and removed from appointment booking. Existing appointments are kept.',
    confirmLabel: 'Remove',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await window.ApiClient.doctors.remove(doctorId);
    window.UIFeedback.toast(`${doc.name} removed.`, 'warning');
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not remove this doctor.', 'error');
  }
}
