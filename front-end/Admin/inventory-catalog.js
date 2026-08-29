'use strict';

/**
 * Admin/inventory-catalog.js — inventory catalog add-or-remove (table.md
 * issue #2). HOM's own Inventory screen already logs usage/reorders
 * against existing items (inventory:write, PUT /inventory/items/:id) but
 * never created or removed catalog items — POST existed with no frontend
 * caller, and there was no delete endpoint at all. This screen is the
 * missing UI for the inventoryCatalog:read/write/delete endpoints added
 * alongside it.
 */

let itemsCache = [];
let editingItemId = null;

document.addEventListener('DOMContentLoaded', async () => {
  bindDialogControls();
  await loadAndRender();
});

async function loadAndRender() {
  itemsCache = await window.ApiClient.inventory.items.list();
  renderMetrics();
  renderTable();
}

function renderMetrics() {
  const lowStock = itemsCache.filter((i) => i.stock_quantity < i.reorder_level).length;
  const categories = new Set(itemsCache.map((i) => i.category)).size;

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">📦</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${itemsCache.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Catalog Items</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEE2E2;">⚠️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: var(--error);">${lowStock}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Below Reorder Level</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">🏷️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${categories}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Categories</div></div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('items-tbody');
  window.DomTable.renderRows(tbody, itemsCache, {
    colspan: 5,
    emptyMessage: 'No catalog items yet.',
    toRow: (item) => `
      <tr>
        <td style="font-weight: 500;">${window.Formatters.escapeHtml(item.item_name)}</td>
        <td>${window.Formatters.escapeHtml(item.category)}</td>
        <td>${item.stock_quantity}</td>
        <td>${item.reorder_level}</td>
        <td>
          ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Edit', dataAttrs: { action: 'edit-item', itemId: item.item_id } })}
          ${window.UI.Button({ variant: 'danger', size: 'sm', children: 'Delete', dataAttrs: { action: 'delete-item', itemId: item.item_id } })}
        </td>
      </tr>
    `,
  });
}

// Delegated click handling for each row's Edit/Delete action — one listener
// instead of a per-row onclick string (same pattern as HOM/inventory.js).
document.addEventListener('click', (event) => {
  const editTrigger = event.target.closest('[data-action="edit-item"]');
  if (editTrigger) return openItemDialog(Number(editTrigger.dataset.itemId));

  const deleteTrigger = event.target.closest('[data-action="delete-item"]');
  if (deleteTrigger) return deleteItem(Number(deleteTrigger.dataset.itemId));
});

function bindDialogControls() {
  document.getElementById('new-item-btn').addEventListener('click', () => openItemDialog(null));
  document.getElementById('item-cancel').addEventListener('click', () => document.getElementById('item-dialog').close());
  document.getElementById('item-form').addEventListener('submit', handleItemFormSubmit);
}

function openItemDialog(itemId) {
  editingItemId = itemId;
  const form = document.getElementById('item-form');
  form.reset();

  const item = itemId ? itemsCache.find((i) => i.item_id === itemId) : null;
  document.getElementById('item-dialog-title').textContent = item ? `Edit ${item.item_name}` : 'Add a Catalog Item';
  document.getElementById('item-name').value = item ? item.item_name : '';
  document.getElementById('item-category').value = item ? item.category : 'Medicine';
  document.getElementById('item-stock').value = item ? item.stock_quantity : '';
  document.getElementById('item-reorder').value = item ? item.reorder_level : '';

  document.getElementById('item-dialog').showModal();
}

async function handleItemFormSubmit(event) {
  event.preventDefault();
  const item_name = document.getElementById('item-name').value.trim();
  const category = document.getElementById('item-category').value;
  const stock_quantity = Number(document.getElementById('item-stock').value);
  const reorder_level = Number(document.getElementById('item-reorder').value);
  if (!item_name) return;

  try {
    if (editingItemId) {
      await window.ApiClient.inventory.items.update(editingItemId, { item_name, category, stock_quantity, reorder_level });
      window.UIFeedback.toast(`${item_name} updated.`, 'success');
    } else {
      await window.ApiClient.inventory.items.create({ item_name, category, stock_quantity, reorder_level });
      window.UIFeedback.toast(`${item_name} added to the catalog.`, 'success');
    }
    document.getElementById('item-dialog').close();
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not save this item.', 'error');
  }
}

async function deleteItem(itemId) {
  const item = itemsCache.find((i) => i.item_id === itemId);
  if (!item) return;
  const confirmed = await window.UIFeedback.confirm({
    title: `Delete ${item.item_name}?`,
    body: 'This removes it from HOM\'s inventory screen entirely. This cannot be undone.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await window.ApiClient.inventory.items.remove(itemId);
    window.UIFeedback.toast(`${item.item_name} deleted.`, 'warning');
    await loadAndRender();
  } catch (err) {
    window.UIFeedback.toast(err.message || 'Could not delete this item.', 'error');
  }
}
