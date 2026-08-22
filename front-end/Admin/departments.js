/**
 * Admin/departments.js — ward/department add-or-remove (table.md issue #2).
 *
 * Previously nobody could add or remove a ward at all: POST /ward existed
 * on the backend but no frontend screen ever called it, and there was no
 * delete/resize endpoint. This screen is the missing UI for the
 * wardAdmin:read/write/delete endpoints added alongside it.
 */

let wardsCache = [];
let bedsCache = [];
let editingWardId = null;

document.addEventListener('DOMContentLoaded', async () => {
  bindDialogControls();
  await loadAndRender();
});

async function loadAndRender() {
  const [wards, beds] = await Promise.all([
    window.ApiClient.wards.list(),
    window.ApiClient.wards.beds(),
  ]);
  wardsCache = wards;
  bedsCache = beds;
  renderMetrics();
  renderWardsList();
}

function bedsForWard(wardId) {
  return bedsCache.filter((b) => b.ward_id === wardId);
}

function renderMetrics() {
  const totalBeds = bedsCache.length;
  const occupied = bedsCache.filter((b) => b.status === 'OCCUPIED').length;

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">🏥</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${wardsCache.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Departments / Wards</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F2FE;">🛏️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${totalBeds}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Total Beds</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">📈</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${totalBeds ? Math.round((occupied / totalBeds) * 100) : 0}%</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Occupancy</div></div>
    </div>
  `;
}

function renderWardsList() {
  const container = document.getElementById('wards-list');
  if (!wardsCache.length) {
    container.innerHTML = '<div class="md-empty-state"><strong>No wards yet.</strong><span>Add one to start allocating beds.</span></div>';
    return;
  }

  container.innerHTML = wardsCache
    .map((ward) => {
      const beds = bedsForWard(ward.ward_id);
      const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
      return `
        <div class="ward-card">
          <div>
            <div class="ward-card-name">${window.Formatters.escapeHtml(ward.ward_name)}</div>
            <div class="ward-card-meta">${window.Formatters.escapeHtml(ward.description || 'No description')}</div>
          </div>
          <div class="ward-card-stats">
            <div class="ward-stat"><div class="ward-stat-value">${beds.length}</div><div class="ward-stat-label">Beds</div></div>
            <div class="ward-stat"><div class="ward-stat-value">${occupied}</div><div class="ward-stat-label">Occupied</div></div>
            ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Edit', dataAttrs: { action: 'edit-ward', wardId: ward.ward_id } })}
            ${window.UI.Button({ variant: 'danger', size: 'sm', children: 'Delete', dataAttrs: { action: 'delete-ward', wardId: ward.ward_id } })}
          </div>
        </div>
      `;
    })
    .join('');
}

// Delegated click handling for each ward row's Edit/Delete — one listener
// instead of per-row onclick strings (same pattern as HOM/billing.js and
// HOM/inventory.js).
document.addEventListener('click', (event) => {
  const editTrigger = event.target.closest('[data-action="edit-ward"]');
  if (editTrigger) return openWardDialog(Number(editTrigger.dataset.wardId));

  const deleteTrigger = event.target.closest('[data-action="delete-ward"]');
  if (deleteTrigger) return deleteWard(Number(deleteTrigger.dataset.wardId));
});

function bindDialogControls() {
  const dialog = document.getElementById('ward-dialog');
  document.getElementById('new-ward-btn').addEventListener('click', () => openWardDialog(null));
  document.getElementById('ward-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('ward-form').addEventListener('submit', handleWardFormSubmit);
}

function openWardDialog(wardId) {
  editingWardId = wardId;
  const dialog = document.getElementById('ward-dialog');
  const form = document.getElementById('ward-form');
  form.reset();

  const ward = wardId ? wardsCache.find((w) => w.ward_id === wardId) : null;
  document.getElementById('ward-dialog-title').textContent = ward ? `Edit ${ward.ward_name}` : 'Add a Ward';
  document.getElementById('ward-name').value = ward ? ward.ward_name : '';
  document.getElementById('ward-description').value = ward ? ward.description || '' : '';
  document.getElementById('ward-beds').value = ward ? bedsForWard(ward.ward_id).length : '';

  dialog.showModal();
}

async function handleWardFormSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('ward-name').value.trim();
  const description = document.getElementById('ward-description').value.trim();
  const totalBeds = Number(document.getElementById('ward-beds').value);
  if (!name || !totalBeds || totalBeds < 1) return;

  try {
    if (editingWardId) {
      const result = await window.ApiClient.wards.update(editingWardId, {
        ward_name: name,
        description: description || undefined,
        total_beds: totalBeds,
      });
      if (result && result.error) {
        window.UIFeedback.toast(result.message, 'error');
        return;
      }
      window.UIFeedback.toast(`${name} updated.`, 'success');
    } else {
      await window.ApiClient.wards.create({ ward_name: name, description: description || undefined, total_beds: totalBeds });
      window.UIFeedback.toast(`${name} created.`, 'success');
    }
    document.getElementById('ward-dialog').close();
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not save this ward.', 'error');
  }
}

async function deleteWard(wardId) {
  const ward = wardsCache.find((w) => w.ward_id === wardId);
  if (!ward) return;
  const confirmed = await window.UIFeedback.confirm({
    title: `Delete ${ward.ward_name}?`,
    body: 'This cannot be undone. Wards with any occupied bed cannot be deleted.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  try {
    const result = await window.ApiClient.wards.remove(wardId);
    if (result && result.error) {
      window.UIFeedback.toast(result.message, 'error');
      return;
    }
    window.UIFeedback.toast(`${ward.ward_name} deleted.`, 'warning');
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not delete this ward.', 'error');
  }
}
