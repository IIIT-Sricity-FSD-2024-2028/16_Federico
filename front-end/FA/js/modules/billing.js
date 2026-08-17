/**
 * FA/js/modules/billing.js — Phase 3 rewrite.
 *
 * Real billing actions against window.ApiClient. Payment creation
 * (billing.service.js#createPayment) already auto-generates the receipt
 * and marks the ledger PAID on the backend — there is no separate
 * "confirm then generate receipt" step here the way the old two-step
 * HOM<->FA handshake required.
 */
(function () {
    const H = () => window.FAHelpers;

    function showFormError(id, message) {
        const el = document.getElementById(id);
        if (!el) {
            alert(message);
            return;
        }
        el.textContent = message;
        el.style.display = 'block';
    }

    async function createLedgerAndOpen(admissionId) {
        try {
            await window.ApiClient.billing.ledger.create({ admission_id: admissionId, status: 'OPEN' });
        } catch (err) {
            alert(err.message || 'Unable to create ledger.');
            return;
        }
        window.currentAdmissionId = admissionId;
        location.hash = '#/ledger';
        window.render();
    }

    async function addCharge(ledgerId, serviceId, qty) {
        const { servicesById } = await H().loadBillingOverview();
        const service = servicesById[serviceId];
        if (!service) throw new Error('Select a valid service.');
        if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be a whole number greater than 0.');

        await window.ApiClient.billing.ledger.addEntry({
            ledger_id: ledgerId,
            service_id: serviceId,
            quantity: qty,
            unit_price: service.base_cost,
            amount: service.base_cost * qty,
        });
    }

    async function addChargeFromForm() {
        const admissionId = Number(document.getElementById('charge-admission').value);
        const serviceId = Number(document.getElementById('charge-service').value);
        const qty = Number(document.getElementById('charge-qty').value);

        if (!admissionId) return showFormError('charges-form-error', 'Select a patient before adding a charge.');
        if (!serviceId) return showFormError('charges-form-error', 'Select a service before adding a charge.');

        const { rows } = await H().loadBillingOverview();
        const row = rows.find((r) => r.admission.admission_id === admissionId);
        if (!row || !row.ledger) return showFormError('charges-form-error', 'This admission has no ledger yet — create one first from the Dashboard.');

        try {
            await addCharge(row.ledger.ledger_id, serviceId, qty);
        } catch (err) {
            return showFormError('charges-form-error', err.message || 'Unable to add charge.');
        }
        window.render();
    }

    async function addChargeToCurrentLedger(admissionId, ledgerId) {
        const serviceId = Number(document.getElementById('ledger-add-service').value);
        const qty = Number(document.getElementById('ledger-add-qty').value);
        if (!serviceId) return alert('Select a service before adding a charge.');

        try {
            await addCharge(ledgerId, serviceId, qty);
        } catch (err) {
            alert(err.message || 'Unable to add charge.');
            return;
        }
        window.currentAdmissionId = admissionId;
        window.render();
    }

    async function dispatchCurrent(ledgerId) {
        if (!ledgerId) return;
        try {
            await window.ApiClient.billing.ledger.dispatch(ledgerId);
        } catch (err) {
            alert(err.message || 'Unable to dispatch this bill.');
            return;
        }
        window.render();
    }

    async function recordCashPayment(ledgerId) {
        const entries = await H().loadLedgerEntries(ledgerId);
        const grossTotal = H().ledgerTotal(entries);
        const override = document.getElementById('coverage-override');
        const deduction = override ? Math.min(Number(override.value) || 0, grossTotal) : 0;
        const netPayable = Math.max(0, grossTotal - deduction);

        if (netPayable <= 0) return showFormError('discharge-payment-error', 'Nothing due to collect for this patient.');

        try {
            await window.ApiClient.billing.payments.create({ ledger_id: ledgerId, amount_paid: netPayable, payment_mode: 'CASH' });
        } catch (err) {
            return showFormError('discharge-payment-error', err.message || 'Unable to record payment.');
        }
        window.render();
    }

    async function ensureDischargeSummary(admissionId) {
        const { rows } = await H().loadBillingOverview();
        const row = rows.find((r) => r.admission.admission_id === admissionId);
        if (!row) return null;

        const existing = await window.ApiClient.billing.dischargeSummary.getByAdmission(admissionId).catch(() => null);
        if (existing) return { row, summary: existing };

        const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
        const grossTotal = H().ledgerTotal(entries);
        const override = document.getElementById('coverage-override');
        const deduction = override ? Math.min(Number(override.value) || 0, grossTotal) : 0;
        const finalAmount = Math.max(0, grossTotal - deduction);

        const summary = await window.ApiClient.billing.dischargeSummary.create({
            admission_id: admissionId,
            patient_id: row.patient.patient_id,
            discharge_notes: 'Patient treated and stabilized for the condition requiring admission; fit for discharge.',
            final_amount: finalAmount,
        });
        return { row, summary };
    }

    async function generateDischargeSummary(admissionId) {
        const { row, summary } = await ensureDischargeSummary(admissionId);
        if (!row) return;

        const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
        const { servicesById } = await H().loadBillingOverview();
        const grossTotal = H().ledgerTotal(entries);

        const servicesList = entries.map((e) => `
            <li style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; color: #334155; font-size: 14px;">
                ${H().escapeHtml(servicesById[e.service_id]?.service_name || '-')} <span style="float: right; font-weight: 600;">(Qty: ${e.quantity})</span>
            </li>
        `).join('');

        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Discharge Summary - ${H().escapeHtml(row.patient.name || '')}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                h1 { color: #0f172a; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; font-size: 28px; }
                h3 { color: #6366f1; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 18px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .label { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .value { font-size: 15px; font-weight: 600; color: #0f172a; }
                ul { list-style: none; padding: 0; margin: 0; }
                .financials { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; }
                .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; }
                .net { font-size: 20px; font-weight: 800; color: #6366f1; border-top: 2px solid #cbd5e1; padding-top: 16px; margin-top: 12px; }
                .print-btn { display: block; width: 100%; background: #0f172a; color: white; border: none; padding: 16px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 40px; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <h1>Official Discharge Summary</h1>
                <h3>Patient & Admission Details</h3>
                <div class="grid">
                    <div><div class="label">Patient Name</div><div class="value">${H().escapeHtml(row.patient.name || '-')}</div></div>
                    <div><div class="label">UHID</div><div class="value">${H().escapeHtml(row.patient.uhid || '-')}</div></div>
                    <div><div class="label">Bed</div><div class="value">${H().escapeHtml(row.bed.bed_number || '-')}</div></div>
                    <div><div class="label">Attending Doctor</div><div class="value">${H().escapeHtml(row.doctorName || 'Duty Doctor')}</div></div>
                </div>
                <h3>Services Used</h3>
                <ul>${servicesList || '<li>No services recorded.</li>'}</ul>
                <h3>Financial Summary</h3>
                <div class="financials">
                    <div class="row"><span class="label">Total Amount (Gross)</span><span class="value">${H().formatCurrency(grossTotal)}</span></div>
                    <div class="row net"><span>Final Payment Due</span><span>${H().formatCurrency(summary.final_amount)}</span></div>
                </div>
                <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
        win.document.close();
        window.render();
    }

    async function printDischargeSummary(admissionId) {
        const { row, summary } = await ensureDischargeSummary(admissionId);
        if (!row) return;

        const entries = row.ledger ? await H().loadLedgerEntries(row.ledger.ledger_id) : [];
        const { servicesById } = await H().loadBillingOverview();
        const grossTotal = H().ledgerTotal(entries);
        const treatmentsReceived = entries.map((e) => servicesById[e.service_id]?.service_name).filter(Boolean).join(', ') || 'Standard Care';

        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Discharge & Billing Summary - ${H().escapeHtml(row.patient.name || '')}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #00a19a; padding-bottom: 20px; margin-bottom: 30px; }
                .hospital-name { color: #00a19a; font-size: 28px; font-weight: 800; margin: 0; }
                .section-title { background: #f8fafc; padding: 10px 16px; border-left: 4px solid #00a19a; font-size: 16px; font-weight: 700; color: #0f172a; margin: 30px 0 15px 0; text-transform: uppercase; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
                .info-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .info-value { color: #0f172a; font-weight: 600; }
                .text-block { font-size: 14px; color: #334155; margin-bottom: 16px; background: #fff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
                .bill-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                .net-paid { color: #00a19a; font-size: 18px; font-weight: 800; border-bottom: 2px solid #00a19a; border-top: 2px solid #00a19a; margin-top: 10px; }
                .print-btn { background: #00a19a; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; margin-top: 50px; display: block; width: 100%; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <div class="header">
                    <div><h1 class="hospital-name">Federico Hospital</h1><div style="font-size: 13px; color: #64748b; margin-top: 4px;">123 Health Avenue, Medical District</div></div>
                    <div style="text-align: right;"><div style="font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase;">Discharge & Billing Summary</div></div>
                </div>
                <div class="info-grid">
                    <div><div class="info-label">Patient Name</div><div class="info-value">${H().escapeHtml(row.patient.name || '-')}</div></div>
                    <div><div class="info-label">UHID</div><div class="info-value">${H().escapeHtml(row.patient.uhid || '-')}</div></div>
                    <div><div class="info-label">Admitting Doctor</div><div class="info-value">${H().escapeHtml(row.doctorName || 'Duty Doctor')}</div></div>
                    <div><div class="info-label">Ward / Bed</div><div class="info-value">${H().escapeHtml(row.bed.bed_number || '-')}</div></div>
                </div>
                <div class="section-title">Part 1: Clinical Discharge Summary</div>
                <div class="text-block"><strong style="display:block; margin-bottom:4px;">Primary Diagnosis:</strong>Successfully treated and stabilized for the condition requiring admission. Patient is fit for discharge.</div>
                <div class="text-block"><strong style="display:block; margin-bottom:4px;">Treatments & Services Rendered:</strong>${H().escapeHtml(treatmentsReceived)}</div>
                <div class="section-title">Part 2: Final Billing Receipt</div>
                <div class="bill-row"><span>Gross Total Charges</span><span>${H().formatCurrency(grossTotal)}</span></div>
                <div class="bill-row net-paid"><span>Net Amount Due</span><span>${H().formatCurrency(summary.final_amount)}</span></div>
                <button class="print-btn" onclick="window.print()">Save Official Document as PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
        win.document.close();
        window.render();
    }

    async function printReceipt(receiptId) {
        const [receipts, { patientsById }] = await Promise.all([
            window.ApiClient.billing.receipts.list().catch(() => []),
            H().loadBillingOverview(),
        ]);
        const r = receipts.find((rec) => rec.receipt_id === receiptId);
        if (!r) return alert('Receipt not found.');
        const patient = patientsById[r.patient_id] || {};

        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Receipt - PAY${r.receipt_id}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; max-width: 700px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                .badge { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; }
                .row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px dashed #cbd5e1; font-size: 15px; }
                .net { font-size: 20px; font-weight: 800; color: #00a19a; border-bottom: 2px solid #00a19a; border-top: 2px solid #00a19a; padding: 20px 0; margin-top: 10px; }
                .print-btn { background: #00a19a; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; margin-top: 40px; display: block; width: 100%; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <div class="header"><h2>🧾 Payment Receipt</h2><span class="badge">PAID</span></div>
                <div class="row"><span>Receipt ID</span><span>PAY${r.receipt_id}</span></div>
                <div class="row"><span>Patient Name</span><span>${H().escapeHtml(patient.name || '-')}</span></div>
                <div class="row"><span>UHID</span><span>${H().escapeHtml(patient.uhid || '-')}</span></div>
                <div class="row"><span>Date & Time</span><span>${H().formatDateTime(r.generated_at)}</span></div>
                <div class="row"><span>Payment Mode</span><span>${H().escapeHtml((r.payment_mode || '').toUpperCase())}</span></div>
                <div class="row net"><span>Total Amount Paid</span><span>${H().formatCurrency(r.amount)}</span></div>
                <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
        win.document.close();
    }

    function filterReceipts() {
        const query = (document.getElementById('receipt-search')?.value || '').toLowerCase();
        const modeFilter = document.getElementById('receipt-filter')?.value || 'ALL';
        document.querySelectorAll('.receipt-row').forEach((row) => {
            const patient = row.getAttribute('data-patient');
            const id = (row.getAttribute('data-id') || '').toLowerCase();
            const mode = row.getAttribute('data-mode');
            const matches = (patient.includes(query) || id.includes(query)) && (modeFilter === 'ALL' || mode === modeFilter);
            row.style.display = matches ? '' : 'none';
        });
    }

    window.FAActions = {
        createLedgerAndOpen,
        addChargeFromForm,
        addChargeToCurrentLedger,
        dispatchCurrent,
        recordCashPayment,
        generateDischargeSummary,
        printDischargeSummary,
        printReceipt,
        filterReceipts,
    };
})();
