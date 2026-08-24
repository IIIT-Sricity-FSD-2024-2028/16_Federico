'use strict';

/**
 * inventory.js — HOM Inventory & Stock.
 */

let activeModalItem = null;
let restockPriority = 'normal';
let inventorySearch = '';
let inventoryData = {};

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  await loadAndRender();
});

// Delegated click handling for the inventory table/sidebar's per-item
// actions — one listener instead of each generated row baking its own
// onclick="openLogUsageModal(...)"/"openRestockModal(...)" string.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  if (trigger.dataset.action === 'log-usage') window.openLogUsageModal(Number(trigger.dataset.itemId));
  if (trigger.dataset.action === 'restock') window.openRestockModal(Number(trigger.dataset.itemId));
});

function bindControls() {
  const searchInput = document.getElementById('inventory-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      inventorySearch = event.target.value.trim().toLowerCase();
      renderTable();
    });
  }
}

function setFormError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}
function clearFormError(id) {
  setFormError(id, '');
}

async function loadAndRender() {
  const [items, requests, patients, services] = await Promise.all([
    window.ApiClient.inventory.items.list(),
    window.ApiClient.inventory.requests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.billing.services.list(),
  ]);
  inventoryData = { items, requests, patients, services };
  renderPage();
}

function serviceForItem(item) {
  if (!item || !item.service_id) return null;
  return (inventoryData.services || []).find((s) => s.service_id === item.service_id) || null;
}

function itemCost(item) {
  const service = serviceForItem(item);
  return service ? service.base_cost : null;
}

function getFilteredItems() {
  const items = inventoryData.items || [];
  if (!inventorySearch) return items;
  return items.filter((item) => [item.item_name, item.category].join(' ').toLowerCase().includes(inventorySearch));
}

function findPatientByUhid(uhid) {
  if (!uhid) return null;
  const normalized = String(uhid).trim().toLowerCase();
  return (inventoryData.patients || []).find((p) => String(p.uhid).toLowerCase() === normalized) || null;
}

function getItemById(itemId) {
  return (inventoryData.items || []).find((i) => i.item_id === Number(itemId)) || null;
}

function renderPage() {
  renderMetrics();
  renderTable();
  renderSidebar();
  populateSelects();
}

function renderMetrics() {
  const items = inventoryData.items || [];
  const orders = (inventoryData.requests || []).filter((r) => r.status === 'PENDING');
  const lowStockCount = items.filter((i) => i.stock_quantity < i.reorder_level).length;

  const icons = {
    box: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">${icons.box}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${items.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Tracked Items</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEE2E2;">${icons.alert}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: var(--error);">${lowStockCount}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Low Stock Alerts</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">${icons.clock}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: #F59E0B;">${orders.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Pending Orders</div></div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  const items = getFilteredItems();

  window.DomTable.renderRows(tbody, items, {
    colspan: 7,
    emptyMessage: 'No inventory items match the current search.',
    toRow: (item) => {
      let status = 'Adequate';
      let variant = 'success';
      if (item.stock_quantity < item.reorder_level) {
        status = item.stock_quantity <= item.reorder_level / 2 ? 'Critical' : 'Low Stock';
        variant = status === 'Critical' ? 'error' : 'warning';
      }
      const cost = itemCost(item);

      return `
        <tr>
          <td style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(item.item_name)}</td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(item.category)}</td>
          <td style="color: var(--text-secondary);">${item.stock_quantity} / ${item.reorder_level}</td>
          <td style="color: var(--text-secondary);">${cost !== null ? window.HOMHelpers.formatCurrency(cost) : '—'}</td>
          <td style="color: var(--text-secondary);">-</td>
          <td>${window.UI.Badge({ variant, children: status })}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              ${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Use', dataAttrs: { action: 'log-usage', itemId: item.item_id } })}
              ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Reorder', dataAttrs: { action: 'restock', itemId: item.item_id } })}
            </div>
          </td>
        </tr>
      `;
    },
  });
}

function renderSidebar() {
  const items = inventoryData.items || [];
  const orders = inventoryData.requests || [];
  const lowStockItems = items.filter((i) => i.stock_quantity < i.reorder_level);

  const lowStockBadge = document.getElementById('low-stock-badge');
  if (lowStockBadge) lowStockBadge.innerHTML = window.UI.Badge({ variant: 'error', children: String(lowStockItems.length) });

  const lowStockList = document.getElementById('low-stock-list');
  if (lowStockList) {
    lowStockList.innerHTML =
      lowStockItems
        .map(
          (item) => `
      <div class="alert-card">
        <p style="font-size: 14px; font-weight: 500; color: var(--error-text); margin: 0 0 4px 0;">${window.HOMHelpers.escapeHtml(item.item_name)}</p>
        <p style="font-size: 12px; color: var(--error-text); margin: 0 0 8px 0;">${item.stock_quantity} units remaining</p>
        ${window.UI.Button({ variant: 'danger', size: 'sm', className: 'w-full', children: 'Reorder Now', dataAttrs: { action: 'restock', itemId: item.item_id } })}
      </div>
    `,
        )
        .join('') || `<p style="font-size: 14px; color: var(--text-secondary); margin: 0;">No low stock alerts.</p>`;
  }

  const ordersBadge = document.getElementById('pending-orders-badge');
  if (ordersBadge) ordersBadge.innerHTML = window.UI.Badge({ variant: 'warning', children: String(orders.filter((o) => o.status === 'PENDING').length) });

  const ordersList = document.getElementById('pending-orders-list');
  if (ordersList) {
    const itemsById = {};
    items.forEach((i) => (itemsById[i.item_id] = i));
    ordersList.innerHTML =
      orders
        .map(
          (order) => `
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <p style="font-size: 14px; font-weight: 500; color: var(--text-primary); margin: 0;">PO #${order.request_id}</p>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 2px 0 0 0;">${window.HOMHelpers.escapeHtml(itemsById[order.item_id]?.item_name || '-')} × ${order.quantity_requested}</p>
          <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Submitted ${window.HOMHelpers.formatDate(order.requested_at)}</p>
        </div>
        ${window.UI.Badge({ variant: order.status === 'APPROVED' ? 'success' : 'warning', children: order.status })}
      </div>
    `,
        )
        .join('') || `<p style="font-size: 14px; color: var(--text-secondary); margin: 0;">No pending orders.</p>`;
  }
}

function populateSelects() {
  const items = inventoryData.items || [];
  const options = ['<option value="">Select item...</option>']
    .concat(items.map((item) => `<option value="${item.item_id}">${window.HOMHelpers.escapeHtml(item.item_name)}</option>`))
    .join('');

  ['sidebar-item-select', 'modal-item-select', 'restock-item-select'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = options;
    if (currentValue && items.some((i) => String(i.item_id) === String(currentValue))) select.value = currentValue;
  });

  updateSidebarCost();
  updateModalCalc();
  updateRestockCalc();
}

window.lookupSidebarPatient = function (value) {
  const nameBox = document.getElementById('sidebar-patient-name');
  const patient = findPatientByUhid(value);
  nameBox.innerText = patient ? `Patient: ${patient.name}` : '';
  clearFormError('sidebar-form-error');
};

window.updateSidebarQty = function (change) {
  const input = document.getElementById('sidebar-qty');
  input.value = Math.max(1, (Number(input.value) || 1) + change);
  updateSidebarCost();
};

window.updateSidebarCost = function () {
  const select = document.getElementById('sidebar-item-select');
  const qty = Math.max(1, Number(document.getElementById('sidebar-qty').value) || 1);
  const costBox = document.getElementById('sidebar-cost-preview');
  const item = getItemById(select.value);
  const cost = itemCost(item);
  costBox.innerText = cost !== null ? `${window.HOMHelpers.formatCurrency(cost)} x ${qty} = ${window.HOMHelpers.formatCurrency(cost * qty)}` : 'Not billable';
};

async function validateUsageSubmission(details) {
  const patient = findPatientByUhid(details.uhid);
  if (!patient) return 'Enter a valid patient UHID before posting usage.';
  if (!details.itemId) return 'Select an inventory item to post.';
  if (!Number.isInteger(details.qty) || details.qty < 1) return 'Quantity must be a whole number greater than 0.';

  const item = getItemById(details.itemId);
  if (!item) return 'The selected inventory item could not be found.';
  if (details.qty > item.stock_quantity) return `Only ${item.stock_quantity} units of ${item.item_name} are currently available.`;
  return '';
}

async function postUsage(uhid, itemId, qty) {
  const patient = findPatientByUhid(uhid);
  const item = getItemById(itemId);

  await window.ApiClient.inventory.items.update(item.item_id, { stock_quantity: item.stock_quantity - qty });

  const service = serviceForItem(item);
  if (service) {
    const bills = await window.ApiClient.billing.patient.bills(patient.patient_id);
    const openBill = bills.find((b) => b.ledger && b.ledger.status !== 'PAID');
    if (openBill) {
      await window.ApiClient.billing.ledger.addEntry({
        ledger_id: openBill.ledger.ledger_id,
        service_id: service.service_id,
        quantity: qty,
        unit_price: service.base_cost,
        amount: service.base_cost * qty,
      });
    }
  }

  await loadAndRender();
}

window.submitSidebarUsage = async function () {
  const uhid = document.getElementById('sidebar-uhid').value.trim();
  const itemId = Number(document.getElementById('sidebar-item-select').value);
  const qty = Number(document.getElementById('sidebar-qty').value);
  const error = await validateUsageSubmission({ uhid, itemId, qty });
  if (error) {
    setFormError('sidebar-form-error', error);
    return;
  }

  clearFormError('sidebar-form-error');
  try {
    await postUsage(uhid, itemId, qty);
  } catch (err) {
    setFormError('sidebar-form-error', err.message || 'Unable to post usage.');
    return;
  }
  document.getElementById('sidebar-uhid').value = '';
  document.getElementById('sidebar-patient-name').innerText = '';
  document.getElementById('sidebar-item-select').value = '';
  document.getElementById('sidebar-qty').value = '1';
};

window.openLogUsageModal = function (itemId = null) {
  document.getElementById('modal-uhid').value = '';
  document.getElementById('modal-qty').value = '1';
  document.getElementById('modal-patient-box').style.display = 'none';
  document.getElementById('modal-item-select').value = itemId ? String(itemId) : '';
  clearFormError('modal-usage-error');
  handleModalItemChange(itemId ? String(itemId) : '');
  document.getElementById('modal-log-usage').classList.add('active');
};

window.handleModalItemChange = function (itemId) {
  activeModalItem = getItemById(itemId);
  clearFormError('modal-usage-error');
  updateModalCalc();
};

window.lookupModalPatient = function (value) {
  const box = document.getElementById('modal-patient-box');
  const nameLabel = document.getElementById('modal-patient-name');
  const patient = findPatientByUhid(value);
  if (patient) {
    box.style.display = 'block';
    nameLabel.innerText = `Patient: ${patient.name}`;
  } else {
    box.style.display = 'none';
  }
  clearFormError('modal-usage-error');
};

window.updateModalQty = function (change) {
  const input = document.getElementById('modal-qty');
  input.value = Math.max(1, (Number(input.value) || 1) + change);
  updateModalCalc();
};

window.updateModalCalc = function () {
  const qty = Math.max(1, Number(document.getElementById('modal-qty').value) || 1);
  const calcText = document.getElementById('modal-calc-text');
  const totalText = document.getElementById('modal-total-cost');
  const cost = itemCost(activeModalItem);

  if (cost === null) {
    calcText.innerText = 'Not billable —';
    totalText.innerText = 'stock only';
    return;
  }
  calcText.innerText = `${window.HOMHelpers.formatCurrency(cost)} x ${qty} = `;
  totalText.innerText = window.HOMHelpers.formatCurrency(cost * qty);
};

window.submitModalUsage = async function () {
  const uhid = document.getElementById('modal-uhid').value.trim();
  const qty = Number(document.getElementById('modal-qty').value);
  const itemId = activeModalItem ? activeModalItem.item_id : Number(document.getElementById('modal-item-select').value);
  const error = await validateUsageSubmission({ uhid, itemId, qty });
  if (error) {
    setFormError('modal-usage-error', error);
    return;
  }

  clearFormError('modal-usage-error');
  try {
    await postUsage(uhid, itemId, qty);
  } catch (err) {
    setFormError('modal-usage-error', err.message || 'Unable to post usage.');
    return;
  }
  closeModals();
};

window.openRestockModal = function (itemId = '') {
  document.getElementById('restock-item-select').value = itemId ? String(itemId) : '';
  document.getElementById('restock-qty').value = '20';
  document.getElementById('restock-supplier').value = '';
  document.getElementById('restock-notes').value = '';
  setRestockPriority('normal');
  handleRestockItemChange(itemId ? String(itemId) : '');
  clearFormError('restock-form-error');
  document.getElementById('modal-request-restock').classList.add('active');
};

window.handleRestockItemChange = function (itemId) {
  activeModalItem = getItemById(itemId);
  clearFormError('restock-form-error');
  updateRestockCalc();
};

window.updateRestockCalc = function () {
  const qty = Math.max(0, Number(document.getElementById('restock-qty').value) || 0);
  const calcText = document.getElementById('restock-calc-text');
  const totalText = document.getElementById('restock-total-cost');
  const cost = itemCost(activeModalItem);

  if (cost === null) {
    calcText.innerText = 'No linked service cost —';
    totalText.innerText = 'estimate unavailable';
    return;
  }
  calcText.innerText = `${window.HOMHelpers.formatCurrency(cost)} x ${qty} = `;
  totalText.innerText = window.HOMHelpers.formatCurrency(cost * qty);
};

window.setRestockPriority = function (priority) {
  restockPriority = priority === 'urgent' ? 'urgent' : 'normal';
  const btnNormal = document.getElementById('btn-priority-normal');
  const btnUrgent = document.getElementById('btn-priority-urgent');
  if (restockPriority === 'normal') {
    btnNormal.className = 'btn btn-primary btn-default';
    btnUrgent.className = 'btn btn-outline btn-default';
  } else {
    btnUrgent.className = 'btn btn-primary btn-default';
    btnNormal.className = 'btn btn-outline btn-default';
  }
};

window.submitRestock = async function () {
  const itemId = Number(document.getElementById('restock-item-select').value);
  const quantity = Number(document.getElementById('restock-qty').value);
  const supplier = document.getElementById('restock-supplier').value.trim();
  const notes = document.getElementById('restock-notes').value.trim();
  const item = getItemById(itemId);
  const session = window.ApiClient.getSession();

  if (!item) {
    setFormError('restock-form-error', 'Select an inventory item before creating a purchase order.');
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    setFormError('restock-form-error', 'Restock quantity must be a whole number greater than 0.');
    return;
  }
  if (!supplier) {
    setFormError('restock-form-error', 'Choose a supplier for the purchase order.');
    return;
  }
  if (notes.length > 240) {
    setFormError('restock-form-error', 'Notes can be at most 240 characters.');
    return;
  }

  clearFormError('restock-form-error');
  try {
    await window.ApiClient.inventory.requests.create({
      item_id: item.item_id,
      quantity_requested: quantity,
      status: 'PENDING',
      requested_by: session ? session.userId : null,
    });
  } catch (err) {
    setFormError('restock-form-error', err.message || 'Unable to submit purchase order.');
    return;
  }

  closeModals();
  await loadAndRender();
};

window.closeModals = function () {
  document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
  activeModalItem = null;
  clearFormError('modal-usage-error');
  clearFormError('restock-form-error');
};
