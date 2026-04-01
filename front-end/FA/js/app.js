// js/app.js

// ── 1. CORE RENDERING ENGINE ──
// ── 1. CORE RENDERING ENGINE ──
// ── 1. CORE RENDERING ENGINE ──
function render() {
    const appDiv = document.getElementById('app');
    const hash = location.hash || (window.Permissions ? Permissions.getDefaultRoute() : '#/dashboard');

    if (window.Permissions && !Permissions.enforceRoute(hash)) return;

    appDiv.innerHTML = '';

    if (hash === '#/dashboard') {
        appDiv.innerHTML = renderDashboard();
    } else if (hash === '#/charges') {
        appDiv.innerHTML = renderCharges();
    } else if (hash.startsWith('#/ledger')) {
        appDiv.innerHTML = renderLedger();
    } else if (hash === '#/eod') {
        appDiv.innerHTML = renderEodBilling();
    } else if (hash === '#/discharge') {
        appDiv.innerHTML = renderDischarge(); // <-- ADD THIS LINE
    } else if (hash === '#/receipts') {
        appDiv.innerHTML = renderReceipts();
    } else {
        appDiv.innerHTML = `<div class="card" style="padding: 50px; text-align: center;"><h2>Page Under Construction</h2></div>`;
    }

    if (hash === '#/discharge' && typeof window.handlePaymentMethodChange === 'function') {
        setTimeout(() => window.handlePaymentMethodChange(), 0);
    }
}

// ── 2. VIEW TEMPLATES ──

function renderDashboard() {
    const stats = getLiveStats();
    // Grab pending claims from stats
    const claims = AppState.stats.pendingClaims || 0;
    const dischargeRequests = Object.values(AppState.admissions || {}).filter(a => a.discharge_requested && !a.discharged);
    const pendingLedgerRequests = (AppState.faLedgerRequests || []).filter((item) => item.status !== 'COMPLETED');

    // Build the "Patient Billing Queue" rows
    const admissions = Object.values(AppState.admissions);
    let queueRows = admissions.map(a => {
        const isDischarged = a.discharged;
        const patientId = getDisplayPatientId(a);
        const hasLedger = Boolean(a.ledger_id && AppState.ledgers?.[a.ledger_id]);

        // Match the badge colors from your image
        const statusBadge = !hasLedger
            ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Ledger Pending</span>`
            : isDischarged
            ? `<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Discharged</span>`
            : `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Active</span>`;

        // Match the button colors from your image (Gray if discharged, Green if active)
        const btnStyle = !hasLedger
            ? `background: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;`
            : isDischarged
            ? `background: #94a3b8; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;`
            : `background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;`;

        return `
            <tr>
                <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${patientId}</span></td>
                <td style="padding: 16px 20px;"><strong>${a.patient_name}</strong></td>
                <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${a.ward_no}</span></td>
                <td style="padding: 16px 20px;">${statusBadge}</td>
                <td style="padding: 16px 20px;">
                    <button style="${btnStyle}" onclick="${hasLedger ? `navigate('#/ledger', ${a.admission_id})` : `createLedgerAndOpen(${a.admission_id})`}">${hasLedger ? 'Open Ledger' : 'Create Ledger'}</button>
                </td>
            </tr>
        `;
    }).join('');

    const dischargeRows = dischargeRequests.map(a => `
            <tr>
                <td style="padding: 16px 20px;"><strong>${a.patient_name}</strong></td>
                <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${getDisplayPatientId(a)}</span></td>
                <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${a.ward_no}</span></td>
                <td style="padding: 16px 20px;"><span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Awaiting FA</span></td>
                <td style="padding: 16px 20px;">
                    <button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px;" onclick="navigate('#/ledger', ${a.admission_id})">Open Billing</button>
                </td>
            </tr>
        `).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Finance Dashboard</h2>
        
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px;">
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Revenue</div>
                <div style="font-size:26px; font-weight:800; color:var(--primary);">₹${stats.revenue.toLocaleString()}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Active IPD</div>
                <div style="font-size:26px; font-weight:800; color:var(--primary);">${stats.activeIPD}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">HOM Req</div>
                <div style="font-size:26px; font-weight:800; color:var(--primary);">${stats.pendingHOM}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Claims</div>
                <div style="font-size:26px; font-weight:800; color:#f59e0b;">${claims}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">HOM Discharge</div>
                <div style="font-size:26px; font-weight:800; color:#ef4444;">${dischargeRequests.length}</div>
            </div>
            <div class="card" style="padding: 20px; margin-bottom: 0;">
                <div style="font-size:13px; color:var(--text-muted); font-weight:700; margin-bottom: 12px;">Failed</div>
                <div style="font-size:26px; font-weight:800; color:#ef4444;">${stats.failedPayments}</div>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 32px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">Patient Billing Queue</h3>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient ID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Ward</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${queueRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No patients found in queue.</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">New Admissions Awaiting Ledger Setup</h3>
                <span style="background: ${pendingLedgerRequests.length ? '#fef3c7' : '#dcfce7'}; color: ${pendingLedgerRequests.length ? '#92400e' : '#166534'}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${pendingLedgerRequests.length} Pending</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">UHID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Ward</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Requested By</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingLedgerRequests.map((item) => `
                        <tr>
                            <td style="padding: 16px 20px;"><strong>${item.patient_name}</strong></td>
                            <td style="padding: 16px 20px;">${item.uhid}</td>
                            <td style="padding: 16px 20px;">${item.ward_no}</td>
                            <td style="padding: 16px 20px;">${item.requested_by || 'HOM'}</td>
                            <td style="padding: 16px 20px;"><button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px;" onclick="createLedgerAndOpen(${item.admission_id})">Create Ledger</button></td>
                        </tr>
                    `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No ledger setup requests are pending.</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; margin-top: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; background: white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">HOM Requests: Discharge & Final Billing</h3>
                <span style="background: ${dischargeRequests.length ? '#fef3c7' : '#dcfce7'}; color: ${dischargeRequests.length ? '#92400e' : '#166534'}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${dischargeRequests.length} Open</span>
            </div>
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient ID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Ward</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${dischargeRows || '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">No discharge requests from HOM.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderCharges() {
    const requests = AppState.serviceRequests || [];

    if (requests.length === 0) {
        return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Pending Charges (HOM)</h2>
        
        <div class="card" style="padding: 32px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background: white; border-radius: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">No HOM service requests yet</h3>
            <p style="margin: 0; color: #64748b;">New services raised from HOM will appear here automatically.</p>
        </div>
    `;
    }

    let rows = requests.map(req => {
        // Now it just grabs the data directly from the request!
        const patientId = getDisplayPatientId(req);
        const patientName = req.patient_name || 'Unknown Patient';
        const apptId = req.appt_id || 'N/A';
        const service = req.service || 'Unknown Service';
        const qty = req.service_count || 1;

        const statusBadge = req.status === 'PENDING'
            ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">PENDING</span>`
            : `<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${req.status}</span>`;

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 16px 20px;"><span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">${patientId}</span></td>
                <td style="padding: 16px 20px;"><strong>${patientName}</strong></td>
                <td style="padding: 16px 20px;"><span class="uhid-badge" style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px;">${apptId}</span></td>
                <td style="padding: 16px 20px; color: #1e293b;">${service}</td>
                <td style="padding: 16px 20px; text-align: center;"><strong>${qty}</strong></td>
                <td style="padding: 16px 20px;">${statusBadge}</td>
                <td style="padding: 16px 20px;">
                    ${req.status === 'PENDING'
                ? `<button class="btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 6px; background: var(--primary); color: white; border: none; font-weight: 600; cursor: pointer;" onclick="approveRequest(${req.id})">Approve</button>`
                : '<span style="color:var(--text-muted); font-size:12px; font-weight:600;">Resolved</span>'}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Pending Charges (HOM)</h2>
        
        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background: white; border-radius: 12px;">
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient ID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Patient Name</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Appt ID</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                        <th style="padding: 14px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No pending charges.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderLedger() {
    // Grab the current active patient (defaults to Qasim if none selected)
    const currentPid = AppState.currentPatientId || 701;
    const p = AppState.admissions[currentPid];

    if (!p) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;
    if (!p.ledger_id || !AppState.ledgers?.[p.ledger_id]) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Ledger: ${p.patient_name}</h2>
            </div>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: #92400e;">Ledger not created yet</h2>
                <p style="color: #64748b;">This patient has been admitted, but finance has not initialized the ledger yet.</p>
                <button class="btn-primary" style="padding: 10px 18px; border-radius: 8px;" onclick="createLedgerAndOpen(${p.admission_id})">Create Ledger Now</button>
            </div>
        `;
    }

    // Fetch their specific ledger entries
    const data = getPatientData(p.ledger_id, 'ALL');

    // Build the clean rows matching your UI
    let rows = data.entries.map(e => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 16px 24px; color: #475569;">${e.service_name}</td>
            <td style="padding: 16px 24px; color: #1e293b;">${e.qty}</td>
            <td style="padding: 16px 24px; color: #1e293b;">₹${e.tax.toLocaleString()}</td>
            <td style="padding: 16px 24px; font-weight: 600; color: #0f172a;">₹${((e.qty * e.price) + e.tax).toLocaleString()}</td>
        </tr>
    `).join('');

    const dischargeReady = Boolean(p.discharge_requested);

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Ledger: ${p.patient_name}</h2>
            <div style="display: flex; gap: 12px;">
                <button style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;" onclick="navigate('#/eod')">EOD Billing</button>
                <button class="btn-primary" style="padding: 10px 20px; border-radius: 6px; font-size: 13px; background: ${dischargeReady ? 'var(--primary)' : '#cbd5e1'};" onclick="${dischargeReady ? "navigate('#/discharge')" : "alert('Waiting for HOM discharge request for this patient.')" }">${dischargeReady ? 'Discharge' : 'Await HOM Request'}</button>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background: white; border-radius: 12px;">
            <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <tr>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Tax</th>
                        <th style="padding: 16px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="4" style="text-align:center; padding: 30px; color: var(--text-muted);">No ledger entries found.</td></tr>'}
                </tbody>
            </table>
            
            <div style="padding: 24px; text-align: right; border-top: 1px solid #f1f5f9; background: white;">
                <h3 style="margin: 0; font-size: 20px; color: #1e293b; font-weight: 700;">
                    Total Due: <span style="color: #0f172a;">₹${data.total.toLocaleString()}</span>
                </h3>
            </div>
        </div>
    `;
}

/* ── RECEIPTS PAGE TEMPLATE ── */
function renderReceipts() {
    // 1. Sort receipts so the newest ones are always at the top
    const receipts = [...(AppState.receipts || [])].sort((a, b) => b.ts - a.ts);

    return `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #1e293b; font-weight: 700;">Payment Receipts</h2>
            
            <div style="display: flex; gap: 12px;">
                <input type="text" id="receipt-search" placeholder="Search Patient or Patient ID..." style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 250px; font-family: inherit;" onkeyup="filterReceipts()">
                
                <select id="receipt-filter" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; font-family: inherit; background: white;" onchange="filterReceipts()">
                    <option value="ALL">All Payment Methods</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT CARD">Credit Card</option>
                </select>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background: white; border-radius: 12px;">
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
                <tbody id="receipts-tbody">
                    ${generateReceiptRows(receipts)}
                </tbody>
            </table>
        </div>
    `;
}

/* ── RECEIPTS DYNAMIC ROW GENERATOR ── */
window.generateReceiptRows = function (receipts) {
    if (receipts.length === 0) return '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No receipts found.</td></tr>';

    return receipts.map(r => {
        // Format the timestamp nicely (e.g., "Oct 24, 2023, 02:30 PM")
        const dateStr = new Date(r.ts).toLocaleString('en-US', {
            month: 'short', day: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        // Ensure mode is upper case for styling
        const mode = r.mode ? r.mode.toUpperCase() : 'UNKNOWN';

        return `
        <tr class="receipt-row" style="border-bottom: 1px solid #f1f5f9;" data-patient="${r.patient.toLowerCase()}" data-id="PAY${r.id}" data-mode="${mode}">
            <td style="padding: 16px 20px; color: #0f172a; font-weight: 600;">PAY${r.id}</td>
            <td style="padding: 16px 20px; color: #475569; font-size: 13px;">${dateStr}</td>
            <td style="padding: 16px 20px; color: #0f172a; font-weight: 600;">${r.patient}</td>
            <td style="padding: 16px 20px; font-weight: 800; color: var(--primary);">₹${r.amount.toLocaleString()}</td>
            <td style="padding: 16px 20px;"><span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; letter-spacing: 0.5px;">${mode}</span></td>
            <td style="padding: 16px 20px;">
                <button class="btn-primary" style="padding: 6px 14px; font-size: 12px; border-radius: 6px; background: #0ea5e9;" onclick="printReceipt(${r.id})">🖨️ Print</button>
            </td>
        </tr>
    `}).join('');
};

/* ── RECEIPTS LIVE SEARCH & FILTER LOGIC ── */
window.filterReceipts = function () {
    const query = document.getElementById('receipt-search').value.toLowerCase();
    const modeFilter = document.getElementById('receipt-filter').value;
    const rows = document.querySelectorAll('.receipt-row');

    rows.forEach(row => {
        const patient = row.getAttribute('data-patient');
        const id = row.getAttribute('data-id').toLowerCase();
        const mode = row.getAttribute('data-mode');

        // Check if row matches both the search box AND the dropdown filter
        const matchesSearch = patient.includes(query) || id.includes(query);
        const matchesMode = modeFilter === 'ALL' || mode === modeFilter;

        // Hide or show the row instantly
        if (matchesSearch && matchesMode) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

// ── 3. GLOBAL UTILITIES ──

window.resetState = function () {
    if (confirm("Are you sure you want to reset all data?")) {
        localStorage.removeItem('hospitalFinanceAppState');
        location.reload();
    }
};

// ── 4. BOOT SEQUENCE ──

document.addEventListener("DOMContentLoaded", () => {
    loadState();             // Load data from localStorage (or fallback to mockData.js)
    Permissions.updateUI();  // Set navigation links based on userRole
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (window.RoleAccess) window.RoleAccess.logout();
        else sessionStorage.removeItem('userRole');
        window.location.href = '../Patient/landing-page.html';
    });
    render();                // Draw the initial screen based on the URL hash
});

window.addEventListener('storage', (event) => {
    if (event.key && event.key !== 'hospitalFinanceAppState') return;
    loadState();
    render();
});

window.addEventListener('load', () => {
    if ((location.hash || '#/dashboard') === '#/discharge' && typeof window.handlePaymentMethodChange === 'function') {
        window.handlePaymentMethodChange();
    }
});


function renderEodBilling() {
    const currentPid = AppState.currentPatientId || 701;
    const p = AppState.admissions[currentPid];

    if (!p) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected.</h2></div>`;

    // 1. Calculate ONLY the unpublished charges
    const newChargesData = getPatientData(p.ledger_id, 'NEW');
    const hasNewCharges = newChargesData.total > 0;

    // 2. Fetch the Link History for this specific patient
    const history = AppState.publishedBills.filter(b => b.patient === p.patient_name);
    const historyRows = history.map(h => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
            <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${h.bill_id}</div>
                <div style="font-size: 12px; color: var(--primary); margin-top: 4px; cursor: pointer; display: inline-block;" onclick="navigator.clipboard.writeText('${h.link}').then(()=>alert('Patient Link Copied!'))">
                    Queued for HOM dispatch (Click to Copy Reference)
                </div>
            </div>
            <div style="font-weight: 600; color: #475569;">₹${h.amount.toLocaleString()}</div>
        </div>
    `).join('');

    // 3. (IMPROVEMENT) Build a mini-breakdown of the pending items
    const breakdownRows = newChargesData.entries.map(e => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; color: #475569;">
            <span>${e.service_name} (x${e.qty})</span>
            <span>₹${((e.qty * e.price) + e.tax).toLocaleString()}</span>
        </div>
    `).join('');

    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">EOD Dispatcher | <span style="color: #475569;">${p.patient_name}</span></h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">

            <div class="card" style="padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background: white; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Unpublished Charges</h3>
                    <div style="font-size: 32px; font-weight: 800; color: var(--primary); margin-bottom: 20px;">
                        ₹${newChargesData.total.toLocaleString()}
                    </div>

                    ${hasNewCharges ? `
                        <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Included in this link:</div>
                            ${breakdownRows}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">All charges have been successfully published for today.</p>'}
                </div>

                <button 
                    onclick="publishEOD()" 
                    style="width: 100%; background: ${hasNewCharges ? 'var(--primary)' : '#cbd5e1'}; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 700; cursor: ${hasNewCharges ? 'pointer' : 'not-allowed'}; font-size: 14px; transition: all 0.2s;"
                    ${hasNewCharges ? '' : 'disabled'}>
                    ${hasNewCharges ? 'Generate EOD Packet for HOM' : 'Nothing to Publish'}
                </button>
            </div>

            <div class="card" style="padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background: white; height: fit-content;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Link History</h3>
                <div>
                    ${historyRows || '<p style="color: var(--text-muted); font-size: 14px;">No EOD links have been generated yet.</p>'}
                </div>
            </div>

        </div>
    `;
}


function renderDischarge() {
    const currentPid = AppState.currentPatientId || 701;
    const p = AppState.admissions[currentPid];

    if (!p) return `<div class="card" style="padding: 40px; text-align: center;"><h2>No patient selected for discharge.</h2></div>`;

    if (!p.discharge_requested) {
        return `
            <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${p.patient_name}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: #0f172a;">Awaiting HOM discharge instruction</h2>
                <p style="color: #64748b;">FA can generate the final discharge packet only after HOM marks this patient ready to be freed.</p>
            </div>
        `;
    }

    // 1. Calculate the final financials
    const data = getPatientData(p.ledger_id, 'ALL');
    const grossTotal = data.total;
    const insuranceDeduction = p.coverage || 0;

    // Ensure Net Payable doesn't drop below 0 if insurance covers more than the bill
    const netPayable = Math.max(0, grossTotal - insuranceDeduction);

    // 2. Check if already discharged
    if (p.discharged) {
        return `
            <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${p.patient_name}</span></h2>
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="color: var(--primary);">Patient Successfully Discharged</h2>
                <p>File is closed. <a href="#/receipts" style="color: var(--primary);">View Receipt</a></p>
            </div>
        `;
    }

    // 3. Render the UI (Matching your screenshot + Dynamic Payment & PDF links)
    return `
        <h2 style="margin-bottom: 24px; color: #1e293b; font-weight: 700;">Final Discharge Summary | <span style="color: #475569;">${p.patient_name}</span></h2>

        <div class="card" style="padding: 32px; border: 1px solid #f1f5f9; border-radius: 12px; background: white; display: grid; grid-template-columns: 1fr 1fr; gap: 60px;">
            
            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1e293b;">Bill Summary</h3>
                
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 15px;">
                    <span>Gross Total</span>
                    <span>₹${grossTotal.toLocaleString()}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-size: 15px;">
                    <span>Insurance Deduction (${p.insurance_provider || 'None'})</span>
                    <span>- ₹${insuranceDeduction.toLocaleString()}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 16px 0; color: var(--primary); font-size: 16px; font-weight: 700; margin-bottom: 20px;">
                    <span>Net Payable</span>
                    <span>₹${netPayable.toLocaleString()}</span>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button class="btn-primary" style="flex: 1; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 13px; background: #0ea5e9;" onclick="printDischargeSummary()">
                        🖨️ Print Receipt
                    </button>
                    <button class="btn-primary" style="flex: 1; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 13px; background: #6366f1;" onclick="generateDischargeSummary()">
                        📄 Discharge Summary
                    </button>
                </div>
            </div>

            <div>
                <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1e293b;">Payment</h3>
                
                <select id="discharge-payment-method" onchange="handlePaymentMethodChange()" style="width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; margin-bottom: 16px; outline: none; background: white; color: #1e293b; font-family: inherit;">
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="DEBIT CARD">Debit Card</option>
                    <option value="CREDIT CARD">Credit Card</option>
                </select>

                <div id="dynamic-payment-area"></div>

                <button class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 14px; background: var(--primary);" onclick="confirmDischarge()">
                    Generate & Send to HOM
                </button>
            </div>

        </div>
    `;
}
