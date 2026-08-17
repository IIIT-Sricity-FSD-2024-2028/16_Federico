// js/app.js — Phase 3 rewrite. See fa-helpers.js for the data-loading rationale.

// A plain top-level `let` here would create a script-scoped binding, NOT
// a property of `window` — router.js and modules/billing.js both set
// `window.currentAdmissionId` directly, so every read in this file must
// go through `window.currentAdmissionId` too, or navigation silently
// stops working (found via live testing: createLedgerAndOpen navigated
// to #/ledger but the page still showed "no ledger" for a ledger that
// really did just get created).
window.currentAdmissionId = window.currentAdmissionId || null;

async function render() {
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
}
window.render = render;

const H = () => window.FAHelpers;

function statusBadge(row) {
    if (!row.ledger) return `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Ledger Pending</span>`;
    if (row.ledger.status === 'PAID') return `<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Paid</span>`;
    if (row.ledger.status === 'DISPATCHED') return `<span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Dispatched</span>`;
    return `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Active</span>`;
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
                <button class="btn-primary" style="padding: 8px 16px; font-size: 12px; border-radius: 6px;" onclick="${r.ledger ? `navigate('#/ledger', ${r.admission.admission_id})` : `window.FAActions.createLedgerAndOpen(${r.admission.admission_id})`}">${r.ledger ? 'Open Ledger' : 'Create Ledger'}</button>
            </td>
        </tr>
    `).join('');

    const pendingLedgerRows = pendingLedger.map((r) => `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(r.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;">${H().escapeHtml(r.patient.uhid || '-')}</td>
            <td style="padding: 16px 20px;">${H().escapeHtml(r.bed.bed_number || '-')}</td>
            <td style="padding: 16px 20px;">HOM</td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px;" onclick="window.FAActions.createLedgerAndOpen(${r.admission.admission_id})">Create Ledger</button></td>
        </tr>
    `).join('');

    const dischargeRows = dischargeReady.map((r) => `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(r.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${r.admission.admission_id}</span></td>
            <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${H().escapeHtml(r.bed.bed_number || '-')}</span></td>
            <td style="padding: 16px 20px;"><span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">HOM Approved</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px;" onclick="navigate('#/discharge', ${r.admission.admission_id})">Open Billing</button></td>
        </tr>
    `).join('');

    const receiptRows = receipts.map((rcpt) => {
        const admissionRow = rows.find((r) => r.admission.admission_id === rcpt.admission_id);
        return `
        <tr>
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(admissionRow?.patient.name || '-')}</strong></td>
            <td style="padding: 16px 20px;">${H().escapeHtml(admissionRow?.patient.uhid || '-')}</td>
            <td style="padding: 16px 20px;">${H().formatCurrency(rcpt.amount)}</td>
            <td style="padding: 16px 20px;"><span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Paid — ${H().escapeHtml(rcpt.payment_mode)}</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px; background: #0ea5e9;" onclick="window.FAActions.printReceipt(${rcpt.receipt_id})">Print</button></td>
        </tr>
    `;
    }).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Finance Dashboard</h2>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Active IPD</div>
                <div style="font-size:26px; font-weight:800; color:var(--primary);">${activeRows.length}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Ledgers Pending Setup</div>
                <div style="font-size:26px; font-weight:800; color:var(--primary);">${pendingLedger.length}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">HOM Discharge Ready</div>
                <div style="font-size:26px; font-weight:800; color:#ef4444;">${dischargeReady.length}</div>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 32px; border: 1px solid #f1f5f9;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">Patient Billing Queue</h3>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
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

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px; border: 1px solid #f1f5f9;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">New Admissions Awaiting Ledger Setup</h3>
                <span style="background: ${pendingLedger.length ? '#fef3c7' : '#dcfce7'}; color: ${pendingLedger.length ? '#92400e' : '#166534'}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${pendingLedger.length} Pending</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
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

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px; border: 1px solid #f1f5f9;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">HOM Requests: Discharge & Final Billing</h3>
                <span style="background: ${dischargeReady.length ? '#fef3c7' : '#dcfce7'}; color: ${dischargeReady.length ? '#92400e' : '#166534'}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${dischargeReady.length} Open</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
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

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px; border: 1px solid #f1f5f9;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">Recent Receipts</h3>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
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

async function renderCharges() {
    const { rows, servicesById } = await H().loadBillingOverview();
    const admissionOptions = rows.map((r) => `<option value="${r.admission.admission_id}">${H().escapeHtml(r.patient.name || 'Patient')} — ${H().escapeHtml(r.patient.uhid || '')}</option>`).join('');
    const serviceOptions = Object.values(servicesById).map((s) => `<option value="${s.service_id}">${H().escapeHtml(s.service_name)} (${H().formatCurrency(s.base_cost)})</option>`).join('');

    const withLedgers = rows.filter((r) => r.ledger);
    const entryLists = await Promise.all(withLedgers.map((r) => H().loadLedgerEntries(r.ledger.ledger_id).then((entries) => ({ r, entries }))));
    const recentEntries = entryLists
        .flatMap(({ r, entries }) => entries.map((e) => ({ ...e, patientName: r.patient.name, uhid: r.patient.uhid })))
        .sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time))
        .slice(0, 15);

    const recentRows = recentEntries.map((e) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 16px 20px;"><strong>${H().escapeHtml(e.patientName || '-')}</strong></td>
            <td style="padding: 16px 20px;"><span class="uhid-badge" style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px;">${H().escapeHtml(e.uhid || '-')}</span></td>
            <td style="padding: 16px 20px; color: #1e293b;">${H().escapeHtml(servicesById[e.service_id]?.service_name || 'Service #' + e.service_id)}</td>
            <td style="padding: 16px 20px; text-align: center;"><strong>${e.quantity}</strong></td>
            <td style="padding: 16px 20px;">${H().formatCurrency(e.amount)}</td>
        </tr>
    `).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Charges</h2>

        <div class="card" style="padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Add a Charge to an Admission</h3>
            <div style="display: grid; grid-template-columns: 2fr 2fr 100px 140px; gap: 12px; align-items: end;">
                <div>
                    <label style="display:block; font-size: 12px; color: #64748b; margin-bottom: 6px;">Admission</label>
                    <select id="charge-admission" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;"><option value="">Select patient...</option>${admissionOptions}</select>
                </div>
                <div>
                    <label style="display:block; font-size: 12px; color: #64748b; margin-bottom: 6px;">Service</label>
                    <select id="charge-service" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;"><option value="">Select service...</option>${serviceOptions}</select>
                </div>
                <div>
                    <label style="display:block; font-size: 12px; color: #64748b; margin-bottom: 6px;">Qty</label>
                    <input id="charge-qty" type="number" min="1" value="1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                </div>
                <button class="btn-primary" style="padding: 10px; border-radius: 6px;" onclick="window.FAActions.addChargeFromForm()">Add Charge</button>
            </div>
            <div id="charges-form-error" style="display:none; margin-top: 12px; font-size: 12px; color: #ef4444; font-weight: 600;"></div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9;"><h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">Recent Charges</h3></div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">UHID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Service</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: center;">Qty</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Amount</th>
                    </tr>
                </thead>
                <tbody>${recentRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No charges posted yet.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

async function renderLedger() {
    const { rows, servicesById } = await H().loadBillingOverview();
    if (!window.currentAdmissionId && rows.length) window.currentAdmissionId = rows[0].admission.admission_id;
    const row = rows.find((r) => r.admission.admission_id === window.currentAdmissionId);

    if (!row) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;

    const serviceOptions = Object.values(servicesById).map((s) => `<option value="${s.service_id}">${H().escapeHtml(s.service_name)} (${H().formatCurrency(s.base_cost)})</option>`).join('');

    if (!row.ledger) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Ledger: ${H().escapeHtml(row.patient.name || '-')}</h2>
            </div>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: #92400e;">Ledger not created yet</h2>
                <p style="color: #64748b;">This patient has been admitted, but finance has not initialized the ledger yet.</p>
                <button class="btn-primary" style="padding: 10px 18px; border-radius: 8px;" onclick="window.FAActions.createLedgerAndOpen(${row.admission.admission_id})">Create Ledger Now</button>
            </div>
        `;
    }

    const entries = await H().loadLedgerEntries(row.ledger.ledger_id);
    const total = H().ledgerTotal(entries);

    const entryRows = entries.map((e) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 16px 24px; color: #475569;">${H().escapeHtml(servicesById[e.service_id]?.service_name || 'Service #' + e.service_id)}</td>
            <td style="padding: 16px 24px; color: #1e293b;">${e.quantity}</td>
            <td style="padding: 16px 24px; color: #1e293b;">${H().formatCurrency(e.unit_price)}</td>
            <td style="padding: 16px 24px; font-weight: 600; color: #0f172a;">${H().formatCurrency(e.amount)}</td>
        </tr>
    `).join('');

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Ledger: ${H().escapeHtml(row.patient.name || '-')} <span style="font-size: 14px; font-weight: 500; color: #64748b;">${statusBadge(row)}</span></h2>
            <div style="display: flex; gap: 12px;">
                <button style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;" onclick="navigate('#/eod', ${row.admission.admission_id})">EOD Billing</button>
                <button class="btn-primary" style="padding: 10px 20px; border-radius: 6px; font-size: 13px; background: ${row.dischargeApproved ? 'var(--primary)' : '#cbd5e1'};" onclick="${row.dischargeApproved ? `navigate('#/discharge', ${row.admission.admission_id})` : "alert('Waiting for HOM discharge approval for this patient.')"}">${row.dischargeApproved ? 'Discharge' : 'Await HOM Approval'}</button>
            </div>
        </div>

        <div class="card" style="padding: 20px; border: 1px solid #f1f5f9; margin-bottom: 24px; display: grid; grid-template-columns: 2fr 100px 140px; gap: 12px; align-items: end;">
            <div>
                <label style="display:block; font-size: 12px; color: #64748b; margin-bottom: 6px;">Add a service</label>
                <select id="ledger-add-service" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;"><option value="">Select service...</option>${serviceOptions}</select>
            </div>
            <div>
                <label style="display:block; font-size: 12px; color: #64748b; margin-bottom: 6px;">Qty</label>
                <input id="ledger-add-qty" type="number" min="1" value="1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
            </div>
            <button class="btn-primary" style="padding: 10px; border-radius: 6px;" onclick="window.FAActions.addChargeToCurrentLedger(${row.admission.admission_id}, ${row.ledger.ledger_id})">Add to Ledger</button>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9;">
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Service</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Qty</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Unit Price</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>${entryRows || '<tr><td colspan="4" style="text-align:center; padding: 30px; color: var(--text-muted);">No ledger entries found.</td></tr>'}</tbody>
            </table>
            <div style="padding: 24px; text-align: right; border-top: 1px solid #f1f5f9; background: white;">
                <h3 style="margin: 0; font-size: 20px; color: #1e293b; font-weight: 700;">Total Due: <span style="color: #0f172a;">${H().formatCurrency(total)}</span></h3>
            </div>
        </div>
    `;
}

async function renderEodBilling() {
    const { rows, servicesById } = await H().loadBillingOverview();
    if (!window.currentAdmissionId && rows.length) window.currentAdmissionId = rows[0].admission.admission_id;
    const row = rows.find((r) => r.admission.admission_id === window.currentAdmissionId);
    if (!row) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;

    const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
    const total = H().ledgerTotal(entries);
    const canDispatch = Boolean(row.ledger) && row.ledger.status === 'OPEN' && total > 0;

    const breakdownRows = entries.map((e) => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; color: #475569;">
            <span>${H().escapeHtml(servicesById[e.service_id]?.service_name || '-')} (x${e.quantity})</span>
            <span>${H().formatCurrency(e.amount)}</span>
        </div>
    `).join('');

    const dispatchedElsewhere = rows.filter((r) => r.ledger && (r.ledger.status === 'DISPATCHED' || r.ledger.status === 'PAID') && r.admission.admission_id !== row.admission.admission_id);
    const historyRows = dispatchedElsewhere.slice(0, 8).map((r) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
            <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${H().escapeHtml(r.patient.name || '-')}</div>
                <div style="font-size: 12px; color: var(--primary); margin-top: 4px;">${r.ledger.status === 'PAID' ? 'Paid' : 'Dispatched — awaiting payment'}</div>
            </div>
            <div style="font-weight: 600; color: #475569; cursor: pointer;" onclick="navigate('#/ledger', ${r.admission.admission_id})">View →</div>
        </div>
    `).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">EOD Dispatcher | <span style="color: #475569;">${H().escapeHtml(row.patient.name || '-')}</span></h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card" style="padding: 24px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Current Ledger Total</h3>
                    <div style="font-size: 32px; font-weight: 800; color: var(--primary); margin-bottom: 20px;">${H().formatCurrency(total)}</div>
                    ${row.ledger && entries.length ? `
                        <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Included in this bill:</div>
                            ${breakdownRows}
                        </div>
                    ` : `<p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">${row.ledger ? 'No charges recorded yet.' : 'No ledger exists for this admission yet.'}</p>`}
                </div>
                <button onclick="window.FAActions.dispatchCurrent(${row.ledger ? row.ledger.ledger_id : 'null'})" style="width: 100%; background: ${canDispatch ? 'var(--primary)' : '#cbd5e1'}; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 700; cursor: ${canDispatch ? 'pointer' : 'not-allowed'}; font-size: 14px;" ${canDispatch ? '' : 'disabled'}>
                    ${!row.ledger ? 'No Ledger Yet' : row.ledger.status !== 'OPEN' ? 'Already Dispatched' : total === 0 ? 'Nothing to Dispatch' : 'Dispatch Bill to Patient'}
                </button>
            </div>

            <div class="card" style="padding: 24px; border: 1px solid #f1f5f9; height: fit-content;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Recently Dispatched</h3>
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

    if (!row.dischargeApproved) {
        return `
            <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${H().escapeHtml(row.patient.name || '-')}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: #0f172a;">Awaiting HOM discharge approval</h2>
                <p style="color: #64748b;">FA can finalize billing only after HOM approves this patient's discharge request.</p>
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
            <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${H().escapeHtml(row.patient.name || '-')}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: var(--primary);">Payment Received</h2>
                <p>Billing is finalized. <a href="#/receipts" style="color: var(--primary);">View Receipt</a></p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                    <button class="btn-primary" style="padding: 12px 20px; border-radius: 8px; background: #0ea5e9;" onclick="window.FAActions.printDischargeSummary(${row.admission.admission_id})">🖨️ Print Discharge Summary</button>
                </div>
            </div>
        `;
    }

    const dispatched = Boolean(row.ledger) && row.ledger.status === 'DISPATCHED';

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${H().escapeHtml(row.patient.name || '-')}</span></h2>

        <div class="card" style="padding: 32px; border: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 60px;">
            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1e293b;">Bill Summary</h3>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 15px;">
                    <span>Gross Total</span><span>${H().formatCurrency(grossTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-size: 15px;">
                    <span>Insurance Deduction (${H().escapeHtml(insurance?.provider_name || 'None')})</span><span>- ${H().formatCurrency(coverageLimit)}</span>
                </div>
                <div style="margin-top: 12px;">
                    <label style="font-size: 12px; color: #64748b;">Override Deduction (Rs)</label>
                    <input type="number" id="coverage-override" value="${coverageLimit}" min="0" max="${grossTotal}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;">
                </div>
                <div style="display: flex; justify-content: space-between; padding: 16px 0; color: var(--primary); font-size: 16px; font-weight: 700; margin-bottom: 20px;">
                    <span>Net Payable</span><span id="net-payable-preview">${H().formatCurrency(Math.max(0, grossTotal - coverageLimit))}</span>
                </div>
                <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 13px; background: #6366f1;" onclick="window.FAActions.generateDischargeSummary(${row.admission.admission_id})">
                    📄 Generate Discharge Summary
                </button>
            </div>

            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1e293b;">Payment</h3>
                ${!row.ledger ? `
                    <p style="color: #64748b; font-size: 14px;">No ledger exists for this admission yet.</p>
                    <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700;" onclick="window.FAActions.createLedgerAndOpen(${row.admission.admission_id})">Create Ledger</button>
                ` : !dispatched ? `
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">Dispatch the bill so the patient can pay online, or record a manual payment for a walk-in.</p>
                    <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700; margin-bottom: 12px;" onclick="window.FAActions.dispatchCurrent(${row.ledger.ledger_id})">Dispatch Bill to Patient</button>
                    <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700; background: #6b7280;" onclick="window.FAActions.recordCashPayment(${row.ledger.ledger_id})">Record Cash Payment</button>
                ` : `
                    <div style="margin-bottom: 16px; padding: 14px; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 13px;">
                        Bill dispatched — the patient can pay from their own billing page. You can also record cash collected in person below.
                    </div>
                    <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700;" onclick="window.FAActions.recordCashPayment(${row.ledger.ledger_id})">Record Cash Payment</button>
                `}
                <div id="discharge-payment-error" style="display:none; margin-top: 12px; font-size: 12px; color: #ef4444; font-weight: 600;"></div>
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
            <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Payment Receipts</h2>
            <div style="display: flex; gap: 12px;">
                <input type="text" id="receipt-search" placeholder="Search Patient or UHID..." style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 250px; font-family: inherit;" onkeyup="window.FAActions.filterReceipts()">
                <select id="receipt-filter" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; font-family: inherit; background: white;" onchange="window.FAActions.filterReceipts()">
                    <option value="ALL">All Payment Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                    <option value="NETBANKING">Netbanking</option>
                </select>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9;">
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
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
        <tr class="receipt-row" style="border-bottom: 1px solid #f1f5f9;" data-patient="${H().escapeHtml((patient.name || '').toLowerCase())}" data-id="PAY${r.receipt_id}" data-mode="${mode}">
            <td style="padding: 16px 20px; color: #0f172a; font-weight: 600;">PAY${r.receipt_id}</td>
            <td style="padding: 16px 20px; color: #475569; font-size: 13px;">${H().formatDateTime(r.generated_at)}</td>
            <td style="padding: 16px 20px; color: #0f172a; font-weight: 600;">${H().escapeHtml(patient.name || '-')}</td>
            <td style="padding: 16px 20px; font-weight: 800; color: var(--primary);">${H().formatCurrency(r.amount)}</td>
            <td style="padding: 16px 20px;"><span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0;">${mode}</span></td>
            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 14px; font-size: 12px; border-radius: 6px; background: #0ea5e9;" onclick="window.FAActions.printReceipt(${r.receipt_id})">🖨️ Print</button></td>
        </tr>
    `;
    }).join('');
}
window.generateReceiptRows = generateReceiptRows;

// ── BOOT SEQUENCE ──
document.addEventListener('DOMContentLoaded', () => {
    Permissions.updateUI();
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (window.RoleAccess) window.RoleAccess.logout();
        window.location.href = '../landing/landing-page.html';
    });
    render();
});
