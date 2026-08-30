'use strict';

// js/app.js — Phase 3 rewrite. See fa-helpers.js for the data-loading rationale.
window.currentAdmissionId = window.currentAdmissionId || null;

async function render() {
    if (typeof parseHashRoute === 'function') parseHashRoute();
    if (typeof updateActiveNav === 'function') updateActiveNav();
    const appDiv = document.getElementById('app');
    const hash = location.hash || (window.Permissions ? Permissions.getDefaultRoute() : '#/dashboard');

    if (window.Permissions && !Permissions.enforceRoute(hash)) return;

    appDiv.innerHTML = '<div class="card" style="padding: 60px; text-align: center; color: var(--text-muted);">Loading…</div>';

    try {
        if (hash === '#/dashboard') appDiv.innerHTML = await renderDashboard();
        else if (hash === '#/charges') appDiv.innerHTML = await renderCharges();
        else if (hash.startsWith('#/ledger')) appDiv.innerHTML = await renderLedger();
        else if (hash === '#/eod') appDiv.innerHTML = await renderEodBilling();
        else if (hash === '#/discharge') appDiv.innerHTML = await renderDischarge();
        else if (hash === '#/receipts') appDiv.innerHTML = await renderReceipts();
        else appDiv.innerHTML = `<div class="card" style="padding: 50px; text-align: center;"><h2>Page Under Construction</h2></div>`;
    } catch (err) {
        console.error('FA render failed:', err);
        appDiv.innerHTML = `<div class="card" style="padding: 50px; text-align: center;"><h2>Something went wrong</h2><p style="color: var(--text-muted);">${window.FAHelpers.escapeHtml(err.message || String(err))}</p></div>`;
    }
    if (typeof updateActiveNav === 'function') updateActiveNav();
}
window.render = render;

const H = () => window.FAHelpers;

function statusBadge(row) {
    if (!row.ledger) return `<span class="badge badge-warning">Ledger Pending</span>`;
    if (row.ledger.status === 'PAID') return `<span class="badge badge-success">Paid</span>`;
    if (row.ledger.status === 'DISPATCHED') return `<span class="badge badge-info">Dispatched</span>`;
    return `<span class="badge badge-warning">Active</span>`;
}

async function renderDashboard() {
    const { rows } = await H().loadBillingOverview();
    const activeRows = rows.filter((r) => r.admission.status !== 'DISCHARGED');
    const pendingLedger = activeRows.filter((r) => !r.ledger);
    const dischargeReady = rows.filter((r) => r.dischargeApproved && r.admission.status !== 'DISCHARGED' && r.ledger?.status !== 'PAID');
    const receipts = (await window.ApiClient.billing.receipts.list().catch(() => [])).slice(0, 5);

    const queueRows = activeRows.map((r) => `
        <tr>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${r.admission.admission_id}</span></td>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(r.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${H().escapeHtml(r.bed.bed_number || '-')}</span></td>
            <td style="padding: 16px 20px;">${statusBadge(r)}</td>
            <td style="padding: 16px 20px;">
                <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="${r.ledger ? `navigate('#/ledger', ${r.admission.admission_id})` : `window.FAActions.createLedgerAndOpen(${r.admission.admission_id})`}">${r.ledger ? 'Open Ledger' : 'Create Ledger'}</button>
            </td>
        </tr>
    `).join('');

    const pendingLedgerRows = pendingLedger.map((r) => `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(r.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;">${H().escapeHtml(r.patient.uhid || '-')}</td>
            <td style="padding: 16px 20px;">${H().escapeHtml(r.bed.bed_number || '-')}</td>
            <td style="padding: 16px 20px;">HOM</td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px;" onclick="window.FAActions.createLedgerAndOpen(${r.admission.admission_id})">Create Ledger</button></td>
        </tr>
    `).join('');

    const dischargeRows = dischargeReady.map((r) => `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(r.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${r.admission.admission_id}</span></td>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${H().escapeHtml(r.bed.bed_number || '-')}</span></td>
            <td style="padding: 16px 20px;"><span class="badge badge-warning">HOM Approved</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px;" onclick="navigate('#/discharge', ${r.admission.admission_id})">Open Billing</button></td>
        </tr>
    `).join('');

    const receiptRows = receipts.map((rcpt) => {
        const admissionRow = rows.find((r) => r.admission.admission_id === rcpt.admission_id);
        return `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(admissionRow?.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;">${H().escapeHtml(admissionRow?.patient.uhid || '-')}</td>
            <td style="padding: 16px 20px;">${H().formatCurrency(rcpt.amount)}</td>
            <td style="padding: 16px 20px;"><span class="badge badge-success">Paid — ${H().escapeHtml(rcpt.payment_mode)}</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px;" onclick="window.FAActions.printReceipt(${rcpt.receipt_id})">Print</button></td>
        </tr>
    `;
    }).join('');

    return `
        <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">Finance Dashboard</h2>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Active IPD</div>
                <div style="font-size:26px; font-weight:800; color:var(--color-accent);">${activeRows.length}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Ledgers Pending Setup</div>
                <div style="font-size:26px; font-weight:800; color:var(--color-accent);">${pendingLedger.length}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">HOM Discharge Ready</div>
                <div style="font-size:26px; font-weight:800; color:var(--status-error);">${dischargeReady.length}</div>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 32px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--color-border); background: var(--color-bg);">
                <h3 style="margin: 0; font-size: 16px; color: var(--color-fg); font-weight: 700;">Patient Billing Queue</h3>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Admission</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bed</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody>${queueRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No patients found in queue.</td></tr>'}</tbody>
            </table>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: var(--color-fg); font-weight: 700;">New Admissions Awaiting Ledger Setup</h3>
                <span class="badge ${pendingLedger.length ? 'badge-warning' : 'badge-success'}">${pendingLedger.length} Pending</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">UHID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bed</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Requested By</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody>${pendingLedgerRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No ledger setup requests are pending.</td></tr>'}</tbody>
            </table>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: var(--color-fg); font-weight: 700;">HOM Requests: Discharge & Final Billing</h3>
                <span class="badge ${dischargeReady.length ? 'badge-warning' : 'badge-success'}">${dischargeReady.length} Open</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Admission</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bed</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody>${dischargeRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No discharge requests from HOM.</td></tr>'}</tbody>
            </table>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: var(--color-fg); font-weight: 700;">Recent Receipts</h3>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">UHID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Amount</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody>${receiptRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No receipts generated yet.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function updateActiveNav() {
    const hash = location.hash || (window.Permissions ? Permissions.getDefaultRoute() : '#/dashboard');
    const activeRoute = hash.split('?')[0].replace('#/', '') || 'dashboard';
    document.querySelectorAll('.nav-link').forEach((link) => {
        const onclickAttr = link.getAttribute('onclick') || '';
        const match = onclickAttr.match(/#\/([a-zA-Z0-9_-]+)/);
        const route = match ? match[1] : '';
        if (route === activeRoute) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
window.updateActiveNav = updateActiveNav;

async function renderCharges() {
    const [{ rows, servicesById, patientsById, admissionsById }, leaders] = await Promise.all([
        H().loadBillingOverview(),
        window.ApiClient.billing.leaders.list().catch(() => []),
    ]);

    // Pending items submitted by HOM (not yet approved into ledger)
    const pendingItems = (leaders || [])
        .filter((l) => l.status === 'PENDING')
        .map((l) => {
            const admission = admissionsById[l.admission_id];
            const patient = l.patient_id ? patientsById[l.patient_id] : (admission ? patientsById[admission.patient_id] : null);
            const service = servicesById[l.service_id];
            return {
                id: `pending-${l.leader_id}`,
                leaderId: l.leader_id,
                isPending: true,
                patientId: patient?.patient_id || admission?.patient_id || l.patient_id || '-',
                patientName: patient?.name || 'Patient',
                uhid: patient?.uhid || '-',
                serviceName: service?.service_name || `Service #${l.service_id}`,
                quantity: l.quantity,
                amount: l.amount,
                status: 'Pending',
                time: new Date(l.created_at || Date.now()),
            };
        });

    // Recent ledger entries approved in FA ledger
    const withLedgers = rows.filter((r) => r.ledger);
    const entryLists = await Promise.all(
        withLedgers.map((r) => H().loadLedgerEntries(r.ledger.ledger_id).then((entries) => ({ r, entries })))
    );
    const recentLedgerItems = entryLists
        .flatMap(({ r, entries }) => entries.map((e) => ({
            id: `entry-${r.ledger.ledger_id}-${e.entry_id}`,
            isPending: false,
            patientId: r.patient.patient_id || r.admission.patient_id || '-',
            patientName: r.patient.name,
            uhid: r.patient.uhid,
            serviceName: servicesById[e.service_id]?.service_name || 'Service #' + e.service_id,
            quantity: e.quantity,
            amount: e.amount,
            status: 'Approved',
            time: new Date(e.entry_time || Date.now()),
        })));

    // Combine pending items at top, followed by recent approved ledger items
    const allCharges = [...pendingItems, ...recentLedgerItems]
        .sort((a, b) => (b.isPending ? 1 : 0) - (a.isPending ? 1 : 0) || b.time - a.time);

    const chargeRows = allCharges.map((c) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 16px 20px;">
                <strong style="color: var(--color-fg);">${H().escapeHtml(c.patientName || '-')}</strong>
                <span style="font-size: 11px; color: var(--text-muted); display: block;">User ID: #${H().escapeHtml(String(c.patientId))}</span>
            </td>
            <td style="padding: 16px 20px;"><span class="uhid-badge">${H().escapeHtml(c.uhid || '-')}</span></td>
            <td style="padding: 16px 20px; color: var(--color-fg);">${H().escapeHtml(c.serviceName)}</td>
            <td style="padding: 16px 20px; text-align: center;"><strong>${c.quantity}</strong></td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--color-fg);">${H().formatCurrency(c.amount)}</td>
            <td style="padding: 16px 20px;">
                ${c.isPending 
                    ? `<span class="badge badge-warning">Pending</span>` 
                    : `<span class="badge badge-success">Approved</span>`}
            </td>
            <td style="padding: 16px 20px;">
                ${c.isPending
                    ? `<button class="btn-primary" style="padding: 6px 14px; font-size: 12px;" onclick="window.FAActions.approveLeader(${c.leaderId})">Approve</button>`
                    : `<span style="font-size: 12px; color: var(--text-muted);">In Ledger</span>`}
            </td>
        </tr>
    `).join('');

    return `
        <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">Charges</h2>

        <div class="card" style="padding: 0; overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px; color: var(--color-fg); font-weight: 700;">Recent Charges</h3>
                ${pendingItems.length ? `<span class="badge badge-warning">${pendingItems.length} Pending Approval</span>` : ''}
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">User / Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">UHID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Service</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: center;">Qty</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Amount</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody>${chargeRows || '<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No charges posted yet.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderPatientPicker(rows, currentAdmissionId) {
    if (!rows || !rows.length) return '';
    const options = rows.map((r) => {
        const isSel = r.admission.admission_id === currentAdmissionId ? 'selected' : '';
        const bedStr = r.bed ? `Bed ${r.bed.bed_number}` : 'No Bed';
        const st = r.ledger ? `[${r.ledger.status}]` : '[NO LEDGER]';
        return `<option value="${r.admission.admission_id}" ${isSel}>${H().escapeHtml(r.patient.name || 'Patient')} (${H().escapeHtml(r.patient.uhid || '-')}) — ${bedStr} ${st}</option>`;
    }).join('');

    return `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 12px 18px; background: var(--color-surface, #fff); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <label style="font-size: 12px; font-weight: 700; color: var(--color-muted-fg); text-transform: uppercase; white-space: nowrap;">Switch Inpatient:</label>
            <select style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600; border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-bg, #fdf8fd); color: var(--color-fg);"
                onchange="window.currentAdmissionId = Number(this.value); window.render();">
                ${options}
            </select>
        </div>
    `;
}

async function renderLedger() {
    const { rows, servicesById } = await H().loadBillingOverview();
    if (!window.currentAdmissionId && rows.length) window.currentAdmissionId = rows[0].admission.admission_id;
    const row = rows.find((r) => r.admission.admission_id === window.currentAdmissionId);

    if (!row) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;

    const pickerHtml = renderPatientPicker(rows, row.admission.admission_id);

    if (!row.ledger) {
        return `
            ${pickerHtml}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: var(--color-fg); font-weight: 700;">Ledger: ${H().escapeHtml(row.patient.name || '-')}</h2>
            </div>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: var(--status-warning-fg);">Ledger not created yet</h2>
                <p style="color: var(--color-muted-fg);">This patient has been admitted, but finance has not initialized the ledger yet.</p>
                <button class="btn-primary" style="padding: 10px 18px;" onclick="window.FAActions.createLedgerAndOpen(${row.admission.admission_id})">Create Ledger Now</button>
            </div>
        `;
    }

    const entries = await H().loadLedgerEntries(row.ledger.ledger_id);
    const total = H().ledgerTotal(entries);

    const serviceOptions = Object.values(servicesById || {}).map((s) => `<option value="${s.service_id}">${H().escapeHtml(s.service_name)} (${H().formatCurrency(s.base_cost)})</option>`).join('');

    const entryRows = entries.map((e) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 16px 24px; color: var(--color-muted-fg);">${H().escapeHtml(servicesById[e.service_id]?.service_name || 'Service #' + e.service_id)}</td>
            <td style="padding: 16px 24px; color: var(--color-fg);">${e.quantity}</td>
            <td style="padding: 16px 24px; color: var(--color-fg);">${H().formatCurrency(e.unit_price)}</td>
            <td style="padding: 16px 24px; font-weight: 600; color: var(--color-fg);">${H().formatCurrency(e.amount)}</td>
        </tr>
    `).join('');

    return `
        ${pickerHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h2 style="margin: 0; color: var(--color-fg); font-weight: 700;">Ledger: ${H().escapeHtml(row.patient.name || '-')} <span style="font-size: 14px; font-weight: 500; color: var(--color-muted-fg);">${statusBadge(row)}</span></h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--color-muted-fg);">User ID: #${H().escapeHtml(String(row.patient.patient_id || row.admission.patient_id || '-'))} &bull; UHID: <span class="uhid-badge">${H().escapeHtml(row.patient.uhid || '-')}</span></p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="md-btn md-btn-tonal" style="padding: 0 20px;" onclick="navigate('#/eod', ${row.admission.admission_id})">EOD Billing</button>
                <button class="btn-primary" style="padding: 10px 20px; font-size: 13px; background: ${row.dischargeApproved ? 'var(--md-primary)' : 'var(--md-surface-container-high)'}; color: ${row.dischargeApproved ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)'};" onclick="${row.dischargeApproved ? `navigate('#/discharge', ${row.admission.admission_id})` : "window.UIFeedback.toast('Waiting for HOM discharge approval for this patient.', 'warning')"}">${row.dischargeApproved ? 'Discharge' : 'Await HOM Approval'}</button>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
            <div style="padding: 16px 24px; background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span style="font-size: 13px; font-weight: 700; color: var(--color-fg);">Add Manual Charge:</span>
                <select id="ledger-add-service" style="padding: 8px 12px; font-size: 13px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: #fff; color: var(--color-fg); min-width: 220px;">
                    <option value="" disabled selected>Select service / item...</option>
                    ${serviceOptions}
                </select>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 12px; color: var(--color-muted-fg); font-weight: 600;">Qty:</label>
                    <input id="ledger-add-qty" type="number" min="1" value="1" style="width: 60px; padding: 8px 10px; font-size: 13px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: #fff; color: var(--color-fg);">
                </div>
                <button class="btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="window.FAActions.addChargeToCurrentLedger(${row.admission.admission_id}, ${row.ledger.ledger_id})">+ Post to Ledger</button>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Service</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Qty</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Unit Price</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>${entryRows || '<tr><td colspan="4" style="text-align:center; padding: 30px; color: var(--text-muted);">No ledger entries found.</td></tr>'}</tbody>
            </table>
            <div style="padding: 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); background: var(--color-bg);">
                <div>
                    <span style="font-size: 14px; font-weight: 600; color: var(--color-fg);">FA Approved Charges: <strong style="color: var(--md-primary, #6750A4);">${H().formatCurrency(total)}</strong></span>
                    <span style="font-size: 13px; color: var(--text-muted); margin-left: 8px;">(${entries.length} approved line ${entries.length === 1 ? 'item' : 'items'})</span>
                </div>
                <h3 style="margin: 0; font-size: 20px; color: var(--color-fg); font-weight: 700;">Total Due: <span style="color: var(--color-fg);">${H().formatCurrency(total)}</span></h3>
            </div>
        </div>
    `;
}

async function renderEodBilling() {
    const { rows, servicesById } = await H().loadBillingOverview();
    if (!window.currentAdmissionId && rows.length) window.currentAdmissionId = rows[0].admission.admission_id;
    const row = rows.find((r) => r.admission.admission_id === window.currentAdmissionId);
    if (!row) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;

    const pickerHtml = renderPatientPicker(rows, row.admission.admission_id);

    const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
    const total = H().ledgerTotal(entries);
    const canDispatch = Boolean(row.ledger) && row.ledger.status === 'OPEN' && total > 0;

    const breakdownRows = entries.map((e) => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; color: var(--color-muted-fg);">
            <span>${H().escapeHtml(servicesById[e.service_id]?.service_name || '-')} (x${e.quantity})</span>
            <span>${H().formatCurrency(e.amount)}</span>
        </div>
    `).join('');

    const dispatchedElsewhere = rows.filter((r) => r.ledger && (r.ledger.status === 'DISPATCHED' || r.ledger.status === 'PAID') && r.admission.admission_id !== row.admission.admission_id);
    const historyRows = dispatchedElsewhere.slice(0, 8).map((r) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--color-border);">
            <div>
                <div style="font-weight: 700; color: var(--color-fg); font-size: 14px;">${H().escapeHtml(r.patient.name || '-')}</div>
                <div style="font-size: 12px; color: var(--color-accent); margin-top: 4px;">${r.ledger.status === 'PAID' ? 'Paid' : 'Dispatched — awaiting payment'}</div>
            </div>
            <div style="font-weight: 600; color: var(--color-muted-fg); cursor: pointer;" onclick="navigate('#/ledger', ${r.admission.admission_id})">View →</div>
        </div>
    `).join('');

    return `
        ${pickerHtml}
        <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">EOD Dispatcher | <span style="color: var(--color-muted-fg);">${H().escapeHtml(row.patient.name || '-')}</span></h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--color-fg);">Current Ledger Total</h3>
                    <div style="font-size: 32px; font-weight: 800; color: var(--color-accent); margin-bottom: 20px;">${H().formatCurrency(total)}</div>
                    ${row.ledger && entries.length ? `
                        <div style="margin-bottom: 24px; padding: 16px; background: var(--color-muted-bg); border-radius: var(--radius-md);">
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Included in this bill:</div>
                            ${breakdownRows}
                        </div>
                    ` : `<p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">${row.ledger ? 'No charges recorded yet.' : 'No ledger exists for this admission yet.'}</p>`}
                </div>
                <button onclick="window.FAActions.dispatchCurrent(${row.ledger ? row.ledger.ledger_id : 'null'})" style="width: 100%; background: ${canDispatch ? 'var(--md-primary)' : 'var(--md-surface-container-high)'}; color: ${canDispatch ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)'}; border: none; padding: 14px; border-radius: var(--radius-full); font-weight: 700; cursor: ${canDispatch ? 'pointer' : 'not-allowed'}; font-size: 14px;" ${canDispatch ? '' : 'disabled'}>
                    ${!row.ledger ? 'No Ledger Yet' : row.ledger.status !== 'OPEN' ? 'Already Dispatched' : total === 0 ? 'Nothing to Dispatch' : 'Dispatch Bill to Patient'}
                </button>
            </div>

            <div class="card" style="padding: 24px; height: fit-content;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--color-fg);">Recently Dispatched</h3>
                <div>${historyRows || '<p style="color: var(--text-muted); font-size: 14px;">No other bills have been dispatched yet.</p>'}</div>
            </div>
        </div>
    `;
}

async function renderDischarge() {
    const { rows } = await H().loadBillingOverview();
    if (!window.currentAdmissionId && rows.length) window.currentAdmissionId = rows[0].admission.admission_id;
    const row = rows.find((r) => r.admission.admission_id === window.currentAdmissionId);
    if (!row) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected for discharge.</h2></div>`;

    const pickerHtml = renderPatientPicker(rows, row.admission.admission_id);

    if (!row.dischargeApproved) {
        return `
            ${pickerHtml}
            <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">Final Discharge Summary | <span style="color: var(--color-muted-fg);">${H().escapeHtml(row.patient.name || '-')}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: var(--color-fg);">Awaiting HOM discharge approval</h2>
                <p style="color: var(--color-muted-fg);">FA can finalize billing only after HOM approves this patient's discharge request.</p>
            </div>
        `;
    }

    const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
    const grossTotal = H().ledgerTotal(entries);

    let insurance = null;
    try {
        const list = await window.ApiClient.patients.insuranceForPatient(row.patient.patient_id);
        insurance = list && list[0] ? list[0] : null;
    } catch (err) {
        insurance = null;
    }
    const coverageLimit = insurance ? Math.min(Number(insurance.coverage_limit || 0), grossTotal) : 0;

    if (row.ledger && row.ledger.status === 'PAID') {
        return `
            ${pickerHtml}
            <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">Final Discharge Summary | <span style="color: var(--color-muted-fg);">${H().escapeHtml(row.patient.name || '-')}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: var(--color-accent);">Payment Received</h2>
                <p>Billing is finalized. <a href="#/receipts" style="color: var(--color-accent);">View Receipt</a></p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                    <button class="btn-primary" style="padding: 12px 20px;" onclick="window.FAActions.printDischargeSummary(${row.admission.admission_id})">🖨️ Print Discharge Summary</button>
                </div>
            </div>
        `;
    }

    const dispatched = Boolean(row.ledger) && row.ledger.status === 'DISPATCHED';

    return `
        ${pickerHtml}
        <h2 style="margin-bottom: 24px; color: var(--color-fg); font-weight: 700;">Final Discharge Summary | <span style="color: var(--color-muted-fg);">${H().escapeHtml(row.patient.name || '-')}</span></h2>

        <div class="card" style="padding: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px;">
            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: var(--color-fg);">Bill Summary</h3>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--color-border); color: var(--color-muted-fg); font-size: 15px;">
                    <span>Gross Total</span><span>${H().formatCurrency(grossTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--color-border); color: var(--status-error); font-size: 15px;">
                    <span>Insurance Deduction (${H().escapeHtml(insurance?.provider_name || 'None')})</span><span>- ${H().formatCurrency(coverageLimit)}</span>
                </div>
                <div class="md-field" style="margin: 12px 0 0;">
                    <label>Override Deduction (Rs)</label>
                    <input type="number" id="coverage-override" value="${coverageLimit}" min="0" max="${grossTotal}">
                </div>
                <div style="display: flex; justify-content: space-between; padding: 16px 0; color: var(--color-accent); font-size: 16px; font-weight: 700; margin-bottom: 20px;">
                    <span>Net Payable</span><span id="net-payable-preview">${H().formatCurrency(Math.max(0, grossTotal - coverageLimit))}</span>
                </div>
                <button class="btn-primary" style="width: 100%; padding: 14px; font-weight: 700; font-size: 13px;" onclick="window.FAActions.generateDischargeSummary(${row.admission.admission_id})">
                    📄 Generate Discharge Summary
                </button>
            </div>

            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: var(--color-fg);">Payment</h3>
                ${!row.ledger ? `
                    <p style="color: var(--color-muted-fg); font-size: 14px;">No ledger exists for this admission yet.</p>
                    <button class="btn-primary" style="width: 100%; padding: 14px; font-weight: 700;" onclick="window.FAActions.createLedgerAndOpen(${row.admission.admission_id})">Create Ledger</button>
                ` : !dispatched ? `
                    <p style="color: var(--color-muted-fg); font-size: 14px; margin-bottom: 16px;">Dispatch the bill so the patient can pay online, or record a manual payment for a walk-in.</p>
                    <button class="btn-primary" style="width: 100%; padding: 14px; font-weight: 700; margin-bottom: 12px;" onclick="window.FAActions.dispatchCurrent(${row.ledger.ledger_id})">Dispatch Bill to Patient</button>
                    <button class="btn-primary" style="width: 100%; padding: 14px; font-weight: 700; background: var(--md-secondary-container); color: var(--md-on-secondary-container);" onclick="window.FAActions.recordCashPayment(${row.ledger.ledger_id})">Record Cash Payment</button>
                ` : `
                    <div style="margin-bottom: 16px; padding: 16px; border-radius: var(--radius-md); background: var(--color-muted-bg); color: var(--color-muted-fg); font-size: 13px;">
                        Bill dispatched — the patient can pay from their own billing page. You can also record cash collected in person below.
                    </div>
                    <button class="btn-primary" style="width: 100%; padding: 14px; font-weight: 700;" onclick="window.FAActions.recordCashPayment(${row.ledger.ledger_id})">Record Cash Payment</button>
                `}
                <div id="discharge-payment-error" style="display:none; margin-top: 12px; font-size: 12px; color: var(--status-error); font-weight: 600;"></div>
            </div>
        </div>
    `;
}

async function renderReceipts() {
    const [receipts, { patientsById }] = await Promise.all([
        window.ApiClient.billing.receipts.list().catch(() => []),
        H().loadBillingOverview(),
    ]);
    const sorted = [...receipts].sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));

    return `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <h2 style="margin: 0; color: var(--color-fg); font-weight: 700;">Payment Receipts</h2>
            <div style="display: flex; gap: 12px;">
                <input type="text" id="receipt-search" placeholder="Search Patient or UHID..." style="padding: 10px 16px; border: none; border-radius: var(--radius-full); font-size: 13px; outline: none; width: 250px; font-family: inherit; background: var(--md-surface-container-high); color: var(--md-on-background);" onkeyup="window.FAActions.filterReceipts()">
                <select id="receipt-filter" style="padding: 10px 16px; border: none; border-radius: var(--radius-full); font-size: 13px; outline: none; font-family: inherit; background: var(--md-surface-container-high); color: var(--md-on-background);" onchange="window.FAActions.filterReceipts()">
                    <option value="ALL">All Payment Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                    <option value="NETBANKING">Netbanking</option>
                </select>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: var(--color-muted-bg); border-bottom: 1px solid var(--color-border);">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Receipt ID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Date & Time</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient Name</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Amount</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Mode</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Action</th>
                    </tr>
                </thead>
                <tbody id="receipts-tbody">${generateReceiptRows(sorted, patientsById)}</tbody>
            </table>
        </div>
    `;
}

function generateReceiptRows(receipts, patientsById) {
    if (!receipts.length) return '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No receipts found.</td></tr>';

    return receipts.map((r) => {
        const patient = patientsById[r.patient_id] || {};
        const mode = (r.payment_mode || 'UNKNOWN').toUpperCase();
        return `
        <tr class="receipt-row" style="border-bottom: 1px solid var(--color-border);" data-patient="${H().escapeHtml((patient.name || '').toLowerCase())}" data-id="PAY${r.receipt_id}" data-mode="${mode}">
            <td style="padding: 16px 20px; color: var(--color-fg); font-weight: 600;">PAY${r.receipt_id}</td>
            <td style="padding: 16px 20px; color: var(--color-muted-fg); font-size: 13px;">${H().formatDateTime(r.generated_at)}</td>
            <td style="padding: 16px 20px; color: var(--color-fg); font-weight: 600;">${H().escapeHtml(patient.name || '-')}</td>
            <td style="padding: 16px 20px; font-weight: 800; color: var(--color-accent);">${H().formatCurrency(r.amount)}</td>
            <td style="padding: 16px 20px;"><span class="badge">${mode}</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 14px; font-size: 12px;" onclick="window.FAActions.printReceipt(${r.receipt_id})">🖨️ Print</button></td>
        </tr>
    `;
    }).join('');
}
window.generateReceiptRows = generateReceiptRows;

// ── BOOT SEQUENCE ──
document.addEventListener('DOMContentLoaded', () => {
    Permissions.updateUI();
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            const api = window.API || window.ApiClient;
            if (api && api.auth && typeof api.auth.logout === 'function') {
                await api.auth.logout();
            }
        } catch (_) {}
        window.location.href = '../login/login-page.html';
    });
    render();
});
