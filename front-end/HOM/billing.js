/**
 * billing.js
 * Logic for the Patient Billing Ledger page.
 */

document.addEventListener("DOMContentLoaded", () => {
    try {
        const currentData = window.Store.get();
        if (!currentData || !currentData.billingRecords) window.Store.reset();
    } catch (e) {
        console.error("Storage Check Failed:", e);
    }

    bindControls();
    applyUrlFilters();
    renderPage();
    window.addEventListener('storeUpdated', renderPage);
});

let billingSearch = '';

function bindControls() {
    const searchInput = document.getElementById('billing-search');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            billingSearch = event.target.value.trim().toLowerCase();
            renderPage();
        });
    }

    const exportButton = document.getElementById('billing-export');
    if (exportButton) exportButton.addEventListener('click', exportBillingRows);
}

function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const uhid = params.get('uhid');
    if (!uhid) return;

    billingSearch = uhid.toLowerCase();
    const searchInput = document.getElementById('billing-search');
    if (searchInput) searchInput.value = uhid;
}

function getFilteredLedgers() {
    const ledgers = window.Store.getBillingRows();
    if (!billingSearch) return ledgers;

    return ledgers.filter((record) => {
        const haystack = [record.patient, record.uhid, record.dept, record.bed, record.status].join(' ').toLowerCase();
        return haystack.includes(billingSearch);
    });
}

function renderPage() {
    const data = window.Store.get() || {};
    try { renderMetrics(data); } catch (e) { console.error(e); }
    try { renderTable(data); } catch (e) { console.error(e); }
}

function renderMetrics() {
    const ledgers = getFilteredLedgers();
    const activeCount = ledgers.length;
    let totalBilled = 0;
    let pendingFinalization = 0;

    ledgers.forEach((ledger) => {
        const roomTotal = ledger.dailyRate * ledger.days;
        const currentTotal = roomTotal + ledger.supplyCharges;
        totalBilled += currentTotal;
        if (ledger.status === 'Pending Discharge' || ledger.status === 'Active Critical' || ledger.status === 'Awaiting FA Ledger') {
            pendingFinalization += 1;
        }
    });

    const avgStay = activeCount > 0 ? Math.round(totalBilled / activeCount) : 0;
    const billedFormatted = (totalBilled / 100000).toFixed(2) + 'L';

    const icons = {
        users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20B2AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        dollar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        trend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`
    };

    const container = document.getElementById('metrics-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #E0F7F6;">${icons.users}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${activeCount}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Visible Ledgers</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #E0F2FE;">${icons.dollar}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">Rs ${billedFormatted}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Total Billed (Live)</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #FEF3C7;">${icons.clock}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: #F59E0B;">${pendingFinalization}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Pending Finalization</div></div>
        </div>
        <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
            <div class="metric-card-icon" style="background: #D1FAE5;">${icons.trend}</div>
            <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">Rs ${(avgStay / 1000).toFixed(1)}K</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Avg Stay Cost</div></div>
        </div>
    `;
}

function renderTable() {
    const tbody = document.getElementById('billing-tbody');
    if (!tbody) return;

    const ledgers = getFilteredLedgers();
    document.getElementById('pagination-text').innerText = `Showing 1-${ledgers.length} of ${ledgers.length} ledgers`;

    if (!ledgers.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 24px; text-align: center; color: var(--text-secondary);">No billing rows match the current search.</td></tr>`;
        return;
    }

    tbody.innerHTML = ledgers.map((record) => {
        const currentRoomCharge = record.dailyRate * record.days;
        const currentTotal = currentRoomCharge + record.supplyCharges;
        let actionButtons = window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View', onClick: `openBillingDetail('${record.uhid}')` });

        if (record.status === 'Active' || record.status === 'Active Critical') {
            actionButtons += window.UI.Button({ variant: record.status === 'Active Critical' ? 'danger' : 'outline', size: 'sm', children: 'Request Discharge', onClick: `requestDischarge('${record.uhid}')` });
        } else if (record.status === 'Pending Discharge') {
            actionButtons += window.UI.Button({ variant: 'outline', size: 'sm', children: 'Awaiting FA', disabled: true });
        } else if (record.status === 'Awaiting FA Ledger') {
            actionButtons += window.UI.Button({ variant: 'outline', size: 'sm', children: 'Ledger Pending', disabled: true });
        } else if (record.status === 'Finalized') {
            actionButtons += window.UI.Button({ variant: 'outline', size: 'sm', children: 'View Receipt', onClick: `openBillingDetail('${record.uhid}')` });
        }

        return `
            <tr>
                <td style="font-weight: 500; color: var(--text-primary);">${record.patient}</td>
                <td style="color: var(--text-secondary);">${record.uhid}</td>
                <td style="color: var(--text-secondary);">${record.dept}</td>
                <td style="color: var(--text-secondary);">${record.bed}</td>
                <td style="color: var(--text-secondary);">Rs ${record.dailyRate.toLocaleString()}/day</td>
                <td style="color: var(--text-secondary);">${record.days}</td>
                <td style="color: var(--text-secondary);">Rs ${record.supplyCharges.toLocaleString()}</td>
                <td style="font-weight: 600; color: var(--text-primary);">Rs ${currentTotal.toLocaleString()}</td>
                <td>${window.UI.Badge({ variant: record.statusVariant, children: record.status })}</td>
                <td><div style="display: flex; gap: 8px;">${actionButtons}</div></td>
            </tr>
        `;
    }).join('');
}

window.openBillingDetail = function (uhid) {
    const record = window.Store.getBillingRows().find((ledger) => ledger.uhid === uhid);
    if (!record) return;

    const roomTotal = record.dailyRate * record.days;
    const grandTotal = roomTotal + record.supplyCharges;

    document.getElementById('bd-title').innerText = `Billing Details - ${record.patient}`;
    document.getElementById('bd-uhid').innerText = record.uhid;
    document.getElementById('bd-dept').innerText = record.dept;
    document.getElementById('bd-bed').innerText = record.bed;
    document.getElementById('bd-status').innerHTML = window.UI.Badge({ variant: record.statusVariant, children: record.status });
    document.getElementById('bd-room-desc').innerText = `${record.bed} - ${record.dept}`;
    document.getElementById('bd-days').innerText = record.days;
    document.getElementById('bd-rate').innerText = `Rs ${record.dailyRate.toLocaleString()}`;
    document.getElementById('bd-room-amount').innerText = `Rs ${roomTotal.toLocaleString()}`;
    document.getElementById('bd-room-subtotal').innerText = `Rs ${roomTotal.toLocaleString()}`;
    document.getElementById('bd-supply-amount').innerText = `Rs ${record.supplyCharges.toLocaleString()}`;
    document.getElementById('bd-total').innerText = `Rs ${grandTotal.toLocaleString()}`;
    document.getElementById('modal-billing-detail').classList.add('active');
};

window.closeModals = function () {
    document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
};

window.requestDischarge = function (uhid) {
    const record = window.Store.getBillingRows().find((ledger) => ledger.uhid === uhid);
    if (!record) {
        alert('Unable to find the selected billing ledger.');
        return;
    }
    if (record.status === 'Awaiting FA Ledger') {
        alert(`Cannot request discharge for ${uhid} until FA creates the billing ledger.`);
        return;
    }
    if (record.status === 'Pending Discharge') {
        alert(`Discharge billing is already pending for ${uhid}.`);
        return;
    }
    if (record.status === 'Finalized') {
        alert(`Billing for ${uhid} is already finalized.`);
        return;
    }

    const success = window.Store.requestDischargeBilling(uhid);
    if (!success) {
        alert('Unable to queue discharge billing for this patient.');
        return;
    }

    alert(`Discharge billing request sent to FA for ${uhid}.`);
};

function exportBillingRows() {
    const rows = getFilteredLedgers();
    if (!rows.length) {
        alert('There are no billing rows to export for the current search.');
        return;
    }

    const csv = [
        ['Patient', 'UHID', 'Department', 'Bed', 'Daily Rate', 'Days', 'Supply Charges', 'Total', 'Status'].join(','),
        ...rows.map((record) => [record.patient, record.uhid, record.dept, record.bed, record.dailyRate, record.days, record.supplyCharges, record.total, record.status].map(csvEscape).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hom-billing-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}
