/**
 * inventory.js
 * Complete Logic for the Non-Clinical Inventory Management page.
 */

let activeModalItem = null;
let restockPriority = 'normal';
let inventorySearch = '';

document.addEventListener("DOMContentLoaded", () => {
    try {
        const currentData = window.Store.get();
        if (!currentData || !currentData.inventoryItems) window.Store.reset();
    } catch (e) {
        console.error("Storage Check Failed:", e);
    }

    bindControls();
    renderPage();
    window.addEventListener('storeUpdated', renderPage);
});

function bindControls() {
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            inventorySearch = event.target.value.trim().toLowerCase();
            renderPage();
        });
    }
}

function setFormError(id, message) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message || '';
    element.style.display = message ? 'block' : 'none';
}

function clearFormError(id) {
    setFormError(id, '');
}

function getInventoryItems(data) {
    const items = data.inventoryItems || [];
    if (!inventorySearch) return items;

    return items.filter((item) => {
        const haystack = [item.name, item.category, String(item.stock), String(item.minThreshold)].join(' ').toLowerCase();
        return haystack.includes(inventorySearch);
    });
}

function findPatientByUhid(uhid) {
    if (!uhid) return null;
    const normalized = String(uhid).trim().toLowerCase();
    const data = window.Store.get() || {};
    return (data.patients || []).find((patient) => String(patient.uhid).toLowerCase() === normalized) || null;
}

function hasPatientLedger(uhid) {
    const data = window.Store.get() || {};
    return Boolean((data.billingRecords || []).find((record) => record.uhid === uhid));
}

function getItemById(itemId) {
    const data = window.Store.get() || {};
    return (data.inventoryItems || []).find((item) => item.id === Number(itemId)) || null;
}

function renderPage() {
    const data = window.Store.get() || {};
    try { renderMetrics(data); } catch (e) { console.error(e); }
    try { renderTable(data); } catch (e) { console.error(e); }
    try { renderSidebar(data); } catch (e) { console.error(e); }
    try { populateInventorySelects(data); } catch (e) { console.error(e); }
}

function renderMetrics(data) {
    const items = data.inventoryItems || [];
    const orders = data.pendingOrders || [];
    const totalSkus = items.length;
    const lowStockCount = items.filter((item) => item.stock < item.minThreshold).length;
    const moneyUsed = items.reduce((sum, item) => sum + (item.usedThisMonth * item.unitCost), 0);
    const moneyFormatted = (moneyUsed / 100000).toFixed(1) + "L";

    const icons = {
        box: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20B2AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
        alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
        money: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
    };

    const container = document.getElementById('metrics-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #E0F7F6;">${icons.box}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${totalSkus}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Tracked Items</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #FEE2E2;">${icons.alert}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: var(--error);">${lowStockCount}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Low Stock Alerts</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #E0F2FE;">${icons.money}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">Rs ${moneyFormatted}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Used This Month</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #FEF3C7;">${icons.clock}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: #F59E0B;">${orders.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Pending Orders</div></div>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    const items = getInventoryItems(data);
    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-secondary);">No inventory items match the current search.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map((item) => {
        let status = 'Adequate';
        let variant = 'success';
        if (item.stock < item.minThreshold) {
            status = item.stock <= (item.minThreshold / 2) ? 'Critical' : 'Low Stock';
            variant = status === 'Critical' ? 'error' : 'warning';
        }

        return `
            <tr>
                <td style="font-weight: 500; color: var(--text-primary);">${item.name}</td>
                <td style="color: var(--text-secondary);">${item.category}</td>
                <td style="color: var(--text-secondary);">${item.stock} / ${item.minThreshold}</td>
                <td style="color: var(--text-secondary);">Rs ${item.unitCost.toLocaleString()}</td>
                <td style="color: var(--text-secondary);">${item.usedThisMonth}</td>
                <td>${window.UI.Badge({ variant, children: status })}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Use', onClick: `openLogUsageModal(${item.id})` })}
                        ${window.UI.Button({ variant: 'outline', size: 'sm', children: 'Reorder', onClick: `openRestockModal(${item.id})` })}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderSidebar(data) {
    const items = data.inventoryItems || [];
    const orders = data.pendingOrders || [];
    const lowStockItems = items.filter((item) => item.stock < item.minThreshold);

    const lowStockBadge = document.getElementById('low-stock-badge');
    if (lowStockBadge) lowStockBadge.innerHTML = window.UI.Badge({ variant: 'error', children: String(lowStockItems.length) });

    const lowStockList = document.getElementById('low-stock-list');
    if (lowStockList) {
        lowStockList.innerHTML = lowStockItems.map((item) => `
            <div class="alert-card">
                <p style="font-size: 14px; font-weight: 500; color: var(--error-text); margin: 0 0 4px 0;">${item.name}</p>
                <p style="font-size: 12px; color: var(--error-text); margin: 0 0 8px 0;">${item.stock} units remaining</p>
                ${window.UI.Button({ variant: 'danger', size: 'sm', className: 'w-full', children: 'Reorder Now', onClick: `openRestockModal(${item.id})` })}
            </div>
        `).join('') || `<p style="font-size: 14px; color: var(--text-secondary); margin: 0;">No low stock alerts.</p>`;
    }

    const ordersBadge = document.getElementById('pending-orders-badge');
    if (ordersBadge) ordersBadge.innerHTML = window.UI.Badge({ variant: 'warning', children: String(orders.length) });

    const ordersList = document.getElementById('pending-orders-list');
    if (ordersList) {
        ordersList.innerHTML = orders.map((order) => `
            <div style="border-bottom: 1px solid var(--border); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <p style="font-size: 14px; font-weight: 500; color: var(--text-primary); margin: 0;">${order.id}</p>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 2px 0 0 0;">${order.item}</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Submitted ${order.date}</p>
                </div>
                ${window.UI.Badge({ variant: order.status === 'Approved' ? 'success' : 'warning', children: order.status })}
            </div>
        `).join('') || `<p style="font-size: 14px; color: var(--text-secondary); margin: 0;">No pending orders.</p>`;
    }
}

function populateInventorySelects(data) {
    const items = data.inventoryItems || [];
    const options = ['<option value="">Select item...</option>']
        .concat(items.map((item) => `<option value="${item.id}">${item.name} (Rs ${item.unitCost})</option>`))
        .join('');

    ['sidebar-item-select', 'modal-item-select', 'restock-item-select'].forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = options;
        if (currentValue && items.some((item) => String(item.id) === String(currentValue))) {
            select.value = currentValue;
        }
    });

    updateSidebarCost();
    updateModalCalc();
    updateRestockCalc();
}

window.findPatientName = function (uhid) {
    const patient = findPatientByUhid(uhid);
    return patient ? patient.name : null;
};

window.lookupSidebarPatient = function (value) {
    const nameBox = document.getElementById('sidebar-patient-name');
    const patient = findPatientByUhid(value);
    nameBox.innerText = patient ? `Patient: ${patient.name}` : '';
    clearFormError('sidebar-form-error');
};

window.updateSidebarQty = function (change) {
    const input = document.getElementById('sidebar-qty');
    const nextValue = Math.max(1, (Number(input.value) || 1) + change);
    input.value = nextValue;
    updateSidebarCost();
};

window.updateSidebarCost = function () {
    const select = document.getElementById('sidebar-item-select');
    const qty = Math.max(1, Number(document.getElementById('sidebar-qty').value) || 1);
    const costBox = document.getElementById('sidebar-cost-preview');
    const item = getItemById(select.value);
    costBox.innerText = item ? `Rs ${item.unitCost} x ${qty} = Rs ${(item.unitCost * qty).toLocaleString()}` : 'Rs 0';
};

function validateUsageSubmission(details) {
    const patient = findPatientByUhid(details.uhid);
    if (!patient) return 'Enter a valid patient UHID before posting usage.';
    if (!hasPatientLedger(patient.uhid)) return `Billing ledger is not ready yet for ${patient.name}. Ask FA to create the ledger first.`;
    if (!details.itemId) return 'Select an inventory item to post.';
    if (!Number.isInteger(details.qty) || details.qty < 1) return 'Quantity must be a whole number greater than 0.';

    const item = getItemById(details.itemId);
    if (!item) return 'The selected inventory item could not be found.';
    if (details.qty > item.stock) return `Only ${item.stock} units of ${item.name} are currently available.`;
    return '';
}

window.submitSidebarUsage = function () {
    const uhid = document.getElementById('sidebar-uhid').value.trim();
    const itemId = Number(document.getElementById('sidebar-item-select').value);
    const qty = Number(document.getElementById('sidebar-qty').value);
    const error = validateUsageSubmission({ uhid, itemId, qty });

    if (error) {
        setFormError('sidebar-form-error', error);
        return;
    }

    clearFormError('sidebar-form-error');
    window.Store.logInventoryUsage(uhid, itemId, qty);
    document.getElementById('sidebar-uhid').value = '';
    document.getElementById('sidebar-patient-name').innerText = '';
    document.getElementById('sidebar-item-select').value = '';
    document.getElementById('sidebar-qty').value = '1';
    updateSidebarCost();
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
    const nextValue = Math.max(1, (Number(input.value) || 1) + change);
    input.value = nextValue;
    updateModalCalc();
};

window.updateModalCalc = function () {
    const qty = Math.max(1, Number(document.getElementById('modal-qty').value) || 1);
    const calcText = document.getElementById('modal-calc-text');
    const totalText = document.getElementById('modal-total-cost');

    if (!activeModalItem) {
        calcText.innerText = 'Rs 0 x 0 = ';
        totalText.innerText = 'Rs 0';
        return;
    }

    calcText.innerText = `Rs ${activeModalItem.unitCost.toLocaleString()} x ${qty} = `;
    totalText.innerText = `Rs ${(activeModalItem.unitCost * qty).toLocaleString()}`;
};

window.submitModalUsage = function () {
    const uhid = document.getElementById('modal-uhid').value.trim();
    const qty = Number(document.getElementById('modal-qty').value);
    const itemId = activeModalItem ? activeModalItem.id : Number(document.getElementById('modal-item-select').value);
    const error = validateUsageSubmission({ uhid, itemId, qty });

    if (error) {
        setFormError('modal-usage-error', error);
        return;
    }

    clearFormError('modal-usage-error');
    window.Store.logInventoryUsage(uhid, itemId, qty);
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

    if (!activeModalItem) {
        calcText.innerText = 'Rs 0 x 0 = ';
        totalText.innerText = 'Rs 0';
        return;
    }

    calcText.innerText = `Rs ${activeModalItem.unitCost.toLocaleString()} x ${qty} = `;
    totalText.innerText = `Rs ${(activeModalItem.unitCost * qty).toLocaleString()}`;
};

window.setRestockPriority = function (priority) {
    restockPriority = priority === 'urgent' ? 'urgent' : 'normal';
    const btnNormal = document.getElementById('btn-priority-normal');
    const btnUrgent = document.getElementById('btn-priority-urgent');

    if (restockPriority === 'normal') {
        btnNormal.style.background = 'var(--primary-light)';
        btnNormal.style.color = 'var(--primary)';
        btnNormal.style.borderColor = 'var(--primary)';
        btnUrgent.style.background = 'transparent';
        btnUrgent.style.color = 'var(--text-primary)';
        btnUrgent.style.borderColor = 'var(--border)';
    } else {
        btnUrgent.style.background = 'var(--primary-light)';
        btnUrgent.style.color = 'var(--primary)';
        btnUrgent.style.borderColor = 'var(--primary)';
        btnNormal.style.background = 'transparent';
        btnNormal.style.color = 'var(--text-primary)';
        btnNormal.style.borderColor = 'var(--border)';
    }
};

window.submitRestock = function () {
    const itemId = Number(document.getElementById('restock-item-select').value);
    const quantity = Number(document.getElementById('restock-qty').value);
    const supplier = document.getElementById('restock-supplier').value.trim();
    const notes = document.getElementById('restock-notes').value.trim();
    const item = getItemById(itemId);

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
    alert(`Purchase order created for ${quantity} units of ${item.name} via ${supplier} (${restockPriority}).`);
    closeModals();
};

window.closeModals = function () {
    document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
    activeModalItem = null;
    clearFormError('modal-usage-error');
    clearFormError('restock-form-error');
};
