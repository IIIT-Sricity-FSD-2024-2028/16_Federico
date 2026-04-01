function publishEOD() {
    const p = AppState.admissions[AppState.currentPatientId];
    const data = getPatientData(p.ledger_id, 'NEW');
    if (data.entries.length === 0) return alert("No new charges to publish.");

    AppState.publishedBills.unshift({
        bill_id: `EOD-${Date.now()}`,
        patient: p.patient_name,
        amount: data.total,
        link: `https://federico.patient/view/${p.uhid}`
    });

    p.last_published_ts = Date.now();
    saveState();
    alert(`EOD Bill Generated for ${p.patient_name}.`);
    render();
}

window.approveRequest = function (id) {
    // 1. Find the specific service request that was clicked
    const req = AppState.serviceRequests.find(r => r.id === id);
    if (!req) return;

    // 2. Find the patient's admission data to get their correct ledger ID
    const admission = AppState.admissions[req.patient_id];
    if (!admission) {
        alert("Error: Patient admission record not found.");
        return;
    }

    // 3. Mark the request as APPROVED so it updates on the dashboard
    req.status = "APPROVED";

    // 4. Find their ledger and add the financial charge
    const ledgerId = admission.ledger_id;
    if (!AppState.ledgers[ledgerId]) {
        AppState.ledgers[ledgerId] = [];
    }

    // Pull the quantity from the request, and set a mock price/tax
    const qty = req.service_count || 1;
    const price = 1200;

    AppState.ledgers[ledgerId].push({
        entry_id: Date.now(),
        service_name: req.service,
        qty: qty,
        price: price,
        tax: price * 0.05 * qty, // 5% mock tax
        ts: Date.now()
    });

    // 5. Save everything to localStorage
    saveState();

    // 6. Switch the active patient and jump directly to the Ledger screen!
    AppState.currentPatientId = req.patient_id;
    location.hash = '#/ledger';
    render();
};

function handlePaymentMethodChange() {
    const method = document.getElementById('paymentMethod').value;
    const container = document.getElementById('methodActionContainer');
    const p = AppState.admissions[AppState.currentPatientId];
    const data = getPatientData(p.ledger_id, 'ALL');
    const netPayable = data.total - p.coverage;

    if (method === 'UPI') {
        const paymentUrl = `upi://pay?pa=hospital@upi&pn=HospitalBilling&am=${netPayable}&cu=INR&tn=Bill-${p.uhid}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(paymentUrl)}`;
        const shareableLink = `https://pay.hospital.in/bill?uhid=${p.uhid}&amount=${netPayable}&patient=${encodeURIComponent(p.patient_name)}`;

        container.innerHTML = `
        <div style="text-align:center; padding:15px; border:1px solid #ddd; border-radius:10px; background:#f9f9f9; margin-top:10px;">
          <p>Scan to Pay <strong>₹${netPayable.toLocaleString()}</strong></p>
          <img src="${qrApiUrl}" alt="QR Code" style="border-radius:8px;">
          <div style="margin-top:10px; padding:8px; background:#e8f5f5; border-radius:8px; font-size:11px; word-break:break-all; color:#00827d;">
            🔗 ${shareableLink}
          </div>
          <button class="btn-primary" style="width:100%; margin-top:10px;" onclick="navigator.clipboard.writeText('${shareableLink}').then(()=>alert('Payment link copied to clipboard!'))">
            📋 Copy Payment Link
          </button>
          <button class="btn-primary" style="width:100%; margin-top:8px; background:#10b981;" onclick="confirmPayment('UPI')">
            ✅ Confirm UPI Payment
          </button>
        </div>`;
    } else if (method === 'CARD') {
        container.innerHTML = `
        <div style="padding:15px; border:1px solid #ddd; border-radius:10px; background:#f9f9f9; margin-top:10px;">
          <p>Amount to Charge: <strong>₹${netPayable.toLocaleString()}</strong></p>
          <p>Status: <strong style="color:#f59e0b;">Awaiting Swipe...</strong></p>
          <button class="btn-primary" style="width:100%; margin-top:8px;" onclick="confirmPayment('CARD')">
            ✅ Confirm Card Payment
          </button>
        </div>`;
    } else {
        container.innerHTML = `
        <div style="padding:15px; border:1px solid #ddd; border-radius:10px; background:#f9f9f9; margin-top:10px;">
          <p>Collect Cash: <strong>₹${netPayable.toLocaleString()}</strong></p>
          <button class="btn-primary" style="width:100%;" onclick="confirmPayment('CASH')">
            ✅ Confirm & Print Cash Receipt
          </button>
        </div>`;
    }
}

function confirmPayment(method) {
    const p = AppState.admissions[AppState.currentPatientId];
    const data = getPatientData(p.ledger_id, 'ALL');
    const netPayable = data.total - p.coverage;

    if (netPayable <= 0) {
        alert('No outstanding amount. Fully covered by insurance.');
        return;
    }

    const receiptId = Date.now();
    AppState.receipts.push({
        id: receiptId, patient: p.patient_name, uhid: p.uhid, amount: netPayable,
        gross: data.total, coverage: p.coverage, insurance: p.insurance_provider,
        mode: method, status: 'Paid', ts: receiptId
    });

    if (p.coverage > 0) p.claim_status = 'SUBMITTED';
    p.discharged = true;
    alert(`✅ Payment of ₹${netPayable.toLocaleString()} confirmed via ${method}.\nReceipt saved. File closed.`);
    printReceipt(receiptId);
    render();
}

function printReceipt(receiptId) {
    const receipt = AppState.receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt - ${receipt.patient}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
        h2 { color: #00a19a; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .total { font-weight: 800; font-size: 18px; color: #00a19a; }
        .badge { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      </style></head>
      <body>
        <h2>🏥 Hospital Billing Receipt</h2>
        <p>Receipt ID: <strong>PAY${receipt.id}</strong> &nbsp; <span class="badge">PAID</span></p>
        <hr>
        <div class="row"><span>Patient</span><strong>${receipt.patient}</strong></div>
        <div class="row"><span>Patient ID</span><span>${receipt.patient_id || receipt.uhid}</span></div>
        <div class="row"><span>Insurance</span><span>${receipt.insurance}</span></div>
        <div class="row"><span>Gross Total</span><span>₹${receipt.gross.toLocaleString()}</span></div>
        <div class="row"><span>Insurance Coverage</span><span style="color:red">-₹${receipt.coverage.toLocaleString()}</span></div>
        <div class="row total"><span>Net Paid</span><span>₹${receipt.amount.toLocaleString()}</span></div>
        <div class="row"><span>Payment Mode</span><span>${receipt.mode}</span></div>
        <div class="row"><span>Date</span><span>${new Date(receipt.ts).toLocaleString()}</span></div>
        <br><br>
        <button onclick="window.print()" style="background:#00a19a;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">🖨️ Print / Save PDF</button>
      </body></html>
    `);
    win.document.close();
}

window.publishEOD = function () {
    const currentPid = AppState.currentPatientId || 701;
    const p = AppState.admissions[currentPid];
    if (!p) return;

    // Grab all unpublished charges
    const data = getPatientData(p.ledger_id, 'NEW');

    if (data.entries.length === 0) {
        alert("No new charges to publish.");
        return;
    }

    // Create a unique Bill ID
    const newBillId = `EOD-${Date.now()}`;

    // Add it to the History array
    AppState.publishedBills.unshift({
        bill_id: newBillId,
        patient: p.patient_name,
        amount: data.total,
        link: `https://federico.patient/view/${p.uhid}`
    });

    // 🚨 CRITICAL: Update the patient's timestamp so these charges are no longer marked as "NEW"
    p.last_published_ts = Date.now();

    // Save to localStorage
    saveState();

    alert(`✅ ${newBillId} generated successfully and sent to ${p.patient_name}'s portal!`);

    // Re-render the page to instantly update the UI
    render();
};


window.confirmDischarge = function () {
    const currentPid = AppState.currentPatientId;
    const p = AppState.admissions[currentPid];

    if (!p) return;

    // 1. Get final math and selected payment method
    const data = getPatientData(p.ledger_id, 'ALL');
    const grossTotal = data.total;
    const insuranceDeduction = p.coverage || 0;
    const netPayable = Math.max(0, grossTotal - insuranceDeduction);
    const method = document.getElementById('discharge-payment-method').value;

    // 2. Generate the final receipt
    const receiptId = Date.now();
    AppState.receipts.unshift({
        id: receiptId,
        patient: p.patient_name,
        amount: netPayable,
        mode: method,
        status: 'Paid',
        ts: receiptId
    });

    // 3. Mark the patient as officially discharged!
    p.discharged = true;

    // 4. Save to database
    saveState();

    // 5. Alert and Redirect
    alert(`Success! ${p.patient_name} has been fully discharged.\nPayment of ₹${netPayable.toLocaleString()} via ${method} confirmed.`);

    // Send the user to the receipts page to view the final transaction
    location.hash = '#/receipts';
    render();
};


/* ── 1. DYNAMIC PAYMENT UI (QR CODES & LINKS) ── */
window.handlePaymentMethodChange = function () {
    const method = document.getElementById('discharge-payment-method').value;
    const container = document.getElementById('dynamic-payment-area');

    const p = AppState.admissions[AppState.currentPatientId];
    const data = getPatientData(p.ledger_id, 'ALL');
    const netPayable = Math.max(0, data.total - (p.coverage || 0));

    if (method === 'UPI') {
        // Generates a real QR code using an open API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=federico@upi&pn=FedericoHospital&am=${netPayable}`;
        container.innerHTML = `
            <div style="margin-bottom: 24px; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <img src="${qrUrl}" alt="UPI QR" style="border-radius: 8px; margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 13px; color: var(--primary); font-weight: 700;">📲 Scan to Pay ₹${netPayable.toLocaleString()}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Payment link auto-dispatched to patient via WhatsApp.</div>
            </div>
        `;
    } else if (method === 'CREDIT CARD') {
        container.innerHTML = `
            <div style="margin-bottom: 24px; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <div style="font-size: 32px; margin-bottom: 8px;">💳</div>
                <div style="font-size: 13px; color: var(--primary); font-weight: 700;">Secure Payment Link Generated</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Link dispatched to +91 ******7604. Awaiting patient payment...</div>
            </div>
        `;
    } else {
        container.innerHTML = '<div style="margin-bottom: 24px;"></div>'; // Cash needs no extra UI
    }
};

/* ── 2. CONFIRM & CLOSE FILE ── */
window.confirmDischarge = function () {
    const currentPid = AppState.currentPatientId;
    const p = AppState.admissions[currentPid];
    if (!p) return;

    const method = document.getElementById('discharge-payment-method').value;
    p.discharged = true;
    saveState();

    alert(`File Closed! Final payment via ${method} confirmed.`);
    location.hash = '#/dashboard';
    render();
};

/* ── 3. PIXEL-PERFECT PDF RECEIPT GENERATOR ── */
/* ── 3. PIXEL-PERFECT PDF: DISCHARGE & BILL SUMMARY ── */
window.printDischargeSummary = function () {
    const currentPid = AppState.currentPatientId;
    const p = AppState.admissions[currentPid];
    if (!p) return;

    // Financial Data
    const data = getPatientData(p.ledger_id, 'ALL');
    const grossTotal = data.total;
    const insurance = p.coverage || 0;
    const netPayable = Math.max(0, grossTotal - insurance);
    const method = document.getElementById('discharge-payment-method').value;

    // Clinical Data (Extracting services from the ledger to show what treatments they got)
    const treatmentsReceived = data.entries.map(e => e.service_name).join(', ') || 'Standard Care';
    const admissionDate = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toLocaleDateString(); // Mocking admission to 3 days ago
    const dischargeDate = new Date().toLocaleString('en-US');
    const receiptId = `PAY${Date.now()}`;

    // Open a new tab for printing
    const printWindow = window.open('', '_blank');

    // Write the HTML document
    printWindow.document.write(`
        <html>
        <head>
            <title>Discharge & Billing Summary - ${p.patient_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                
                /* Header */
                .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #00a19a; padding-bottom: 20px; margin-bottom: 30px; }
                .hospital-name { color: #00a19a; font-size: 28px; font-weight: 800; margin: 0; }
                .doc-title { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                
                /* Sections */
                .section-title { background: #f8fafc; padding: 10px 16px; border-left: 4px solid #00a19a; font-size: 16px; font-weight: 700; color: #0f172a; margin: 30px 0 15px 0; text-transform: uppercase; }
                
                /* Patient Demographics Grid */
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
                .info-item { display: flex; flex-direction: column; }
                .info-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .info-value { color: #0f172a; font-weight: 600; }

                /* Text Blocks */
                .text-block { font-size: 14px; color: #334155; margin-bottom: 16px; background: #fff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
                
                /* Billing Table */
                .bill-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                .bill-row span:first-child { color: #475569; }
                .bill-row span:last-child { font-weight: 600; color: #0f172a; }
                .net-paid { color: #00a19a; font-size: 18px; font-weight: 800; border-bottom: 2px solid #00a19a; border-top: 2px solid #00a19a; margin-top: 10px; }
                .net-paid span { color: #00a19a !important; }

                /* Signatures */
                .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; }
                .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 14px; font-weight: 600; color: #0f172a; width: 250px; margin: 0 auto; }
                .sig-role { font-size: 12px; color: #64748b; font-weight: 400; }

                /* Print Button */
                .print-btn { background: #00a19a; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; margin-top: 50px; display: block; width: 100%; box-shadow: 0 4px 6px rgba(0,161,154,0.2); }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="hospital-name">Federico Hospital</h1>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">123 Health Avenue, Medical District</div>
                </div>
                <div style="text-align: right;">
                    <div class="doc-title">Discharge & Billing Summary</div>
                    <div style="font-size: 13px; color: #0f172a; margin-top: 4px; font-weight: 600;">Date: ${dischargeDate.split(',')[0]}</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item"><span class="info-label">Patient Name</span><span class="info-value">${p.patient_name}</span></div>
                <div class="info-item"><span class="info-label">Patient ID</span><span class="info-value">${getDisplayPatientId(p)}</span></div>
                <div class="info-item"><span class="info-label">Admitting Doctor</span><span class="info-value">${p.doctor_assigned || 'Duty Doctor'}</span></div>
                <div class="info-item"><span class="info-label">Ward / Room</span><span class="info-value">${p.ward_no || 'General'}</span></div>
                <div class="info-item"><span class="info-label">Date of Admission</span><span class="info-value">${admissionDate}</span></div>
                <div class="info-item"><span class="info-label">Date of Discharge</span><span class="info-value">${dischargeDate}</span></div>
            </div>

            <div class="section-title">Part 1: Clinical Discharge Summary</div>
            
            <div class="text-block">
                <strong style="display:block; margin-bottom:4px; color:#0f172a;">Primary Diagnosis:</strong>
                Successfully treated and stabilized for condition requiring admission. Patient is hemodynamically stable, afebrile, and fit for discharge.
            </div>

            <div class="text-block">
                <strong style="display:block; margin-bottom:4px; color:#0f172a;">Treatments & Services Rendered:</strong>
                ${treatmentsReceived}
            </div>

            <div class="text-block">
                <strong style="display:block; margin-bottom:4px; color:#0f172a;">Discharge Advice & Follow-up:</strong>
                1. Continue prescribed medications as directed.<br>
                2. Maintain a balanced diet and adequate hydration.<br>
                3. Follow up in the OPD with ${p.doctor_assigned || 'the consulting doctor'} after 7 days, or immediately if symptoms worsen.
            </div>

            <div class="section-title">Part 2: Final Billing Receipt</div>
            
            <div style="margin-bottom: 12px; font-size: 13px; color: #64748b;">Receipt ID: <strong>${receiptId}</strong> | Payment Mode: <strong>${method}</strong></div>
            
            <div class="bill-row"><span>Gross Total Charges</span><span>₹${grossTotal.toLocaleString()}</span></div>
            <div class="bill-row"><span>Insurance Coverage (${p.insurance_provider || 'Self-Pay'})</span><span style="color: #ef4444;">-₹${insurance.toLocaleString()}</span></div>
            <div class="bill-row net-paid"><span>Net Amount Paid</span><span>₹${netPayable.toLocaleString()}</span></div>

            <div class="signatures">
                <div>
                    <div class="sig-line">${p.doctor_assigned || 'Attending Physician'}</div>
                    <div class="sig-role">Authorized Clinical Signature</div>
                </div>
                <div>
                    <div class="sig-line">Finance Department</div>
                    <div class="sig-role">Authorized Billing Signature</div>
                </div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ Save Official Document as PDF</button>
            
            <script>
                // Automatically open the print dialog when the window loads
                setTimeout(() => { window.print(); }, 500);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};

/* ── 4. SIMPLIFIED DISCHARGE SUMMARY (Only requested details) ── */
window.generateDischargeSummary = function () {
    const currentPid = AppState.currentPatientId;
    const p = AppState.admissions[currentPid];
    if (!p) return;

    // Get Financials
    const data = getPatientData(p.ledger_id, 'ALL');
    const grossTotal = data.total;
    const insurance = p.coverage || 0;
    const netPayable = Math.max(0, grossTotal - insurance);

    // Get Services Used
    const servicesList = data.entries.map(e => `
        <li style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; color: #334155; font-size: 14px;">
            ${e.service_name} <span style="float: right; font-weight: 600;">(Qty: ${e.qty})</span>
        </li>
    `).join('');

    // Open a new tab
    const printWindow = window.open('', '_blank');

    // Write the highly-focused HTML document
    printWindow.document.write(`
        <html>
        <head>
            <title>Discharge Summary - ${p.patient_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
                .row .label { margin: 0; font-size: 14px; }
                .net { font-size: 20px; font-weight: 800; color: #6366f1; border-top: 2px solid #cbd5e1; padding-top: 16px; margin-top: 12px; }
                .print-btn { display: block; width: 100%; background: #0f172a; color: white; border: none; padding: 16px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 40px; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <h1>Official Discharge Summary</h1>
            
            <h3>👤 Patient & Doctor Details</h3>
            <div class="grid">
                <div><div class="label">Patient Name</div><div class="value">${p.patient_name}</div></div>
                <div><div class="label">Patient ID</div><div class="value">${getDisplayPatientId(p)}</div></div>
                <div><div class="label">Ward / Room</div><div class="value">${p.ward_no || 'General Ward'}</div></div>
                <div><div class="label">Attending Doctor</div><div class="value">${p.doctor_assigned || 'Duty Doctor'}</div></div>
            </div>

            <h3>🩺 Services Used</h3>
            <ul>
                ${servicesList || '<li>No services recorded.</li>'}
            </ul>

            <h3>💳 Financial & Insurance Details</h3>
            <div class="financials">
                <div class="row">
                    <span class="label">Insurance Provider</span>
                    <span class="value" style="color: #0ea5e9;">${p.insurance_provider || 'None / Self-Pay'}</span>
                </div>
                <div class="row">
                    <span class="label">Total Amount (Gross)</span>
                    <span class="value">₹${grossTotal.toLocaleString()}</span>
                </div>
                <div class="row" style="color: #ef4444;">
                    <span class="label">Insurance Coverage Deducted</span>
                    <span class="value">- ₹${insurance.toLocaleString()}</span>
                </div>
                <div class="row net">
                    <span>Final Payment Due</span>
                    <span>₹${netPayable.toLocaleString()}</span>
                </div>
            </div>

            <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>

            <script>
                setTimeout(() => { window.print(); }, 500);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};


/* ── 5. SINGLE RECEIPT PRINT FUNCTION ── */
window.printReceipt = function (receiptId) {
    const r = AppState.receipts.find(rec => rec.id === receiptId);
    if (!r) return;

    const dateStr = new Date(r.ts).toLocaleString('en-US');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Receipt - PAY${r.id}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; max-width: 700px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                h2 { color: #0f172a; margin: 0; font-size: 24px; display: flex; align-items: center; gap: 8px;}
                .badge { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; }
                .row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px dashed #cbd5e1; font-size: 15px; }
                .row span:first-child { color: #64748b; font-weight: 500; }
                .row span:last-child { font-weight: 600; color: #0f172a; }
                .net { font-size: 20px; font-weight: 800; color: #00a19a; border-bottom: 2px solid #00a19a; border-top: 2px solid #00a19a; padding: 20px 0; margin-top: 10px; }
                .net span { color: #00a19a !important; }
                .footer { margin-top: 60px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6; }
                .print-btn { background: #00a19a; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; margin-top: 40px; display: block; width: 100%; box-shadow: 0 4px 6px rgba(0,161,154,0.2); }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🧾 Payment Receipt</h2>
                <span class="badge">PAID</span>
            </div>

            <div class="row"><span>Receipt ID</span><span>PAY${r.id}</span></div>
            <div class="row"><span>Patient Name</span><span>${r.patient}</span></div>
            <div class="row"><span>Patient ID</span><span>${r.patient_id || r.uhid || 'N/A'}</span></div>
            <div class="row"><span>Date & Time</span><span>${dateStr}</span></div>
            <div class="row"><span>Payment Mode</span><span>${r.mode.toUpperCase()}</span></div>
            
            <div class="row net"><span>Total Amount Paid</span><span>₹${r.amount.toLocaleString()}</span></div>

            <div class="footer">
                <strong>Federico Hospital Finance Department</strong><br>
                This is a computer-generated receipt and does not require a physical signature.<br>
                Thank you for choosing Federico.
            </div>

            <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>

            <script>
                // Auto-open print dialog
                setTimeout(() => { window.print(); }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

function getServiceCatalogPricing(serviceName) {
    const pricing = {
        'X-Ray Chest': 1200,
        'MRI Brain': 6500,
        'ECG': 900,
        'Blood Test Panel': 1400,
        'CT Scan': 4800,
        'Physiotherapy Session': 1000
    };

    return pricing[serviceName] || 1200;
}

window.createLedgerAndOpen = function (admissionId) {
    const patient = AppState.admissions?.[admissionId];
    if (!patient) {
        alert('Admission record not found.');
        return;
    }

    if (!patient.ledger_id || !AppState.ledgers?.[patient.ledger_id]) {
        const nextLedgerId = Math.max(800, ...Object.keys(AppState.ledgers || {}).map((key) => Number(key) || 0)) + 1;
        patient.ledger_id = nextLedgerId;
        AppState.ledgers[nextLedgerId] = [];
    }

    if (!Array.isArray(AppState.billingRecords)) AppState.billingRecords = [];
    const existingBilling = AppState.billingRecords.find((item) => item.uhid === patient.uhid);
    if (!existingBilling) {
        AppState.billingRecords.push({
            id: Date.now(),
            patient: patient.patient_name,
            uhid: patient.uhid,
            dept: patient.doctor_assigned || 'General',
            bed: patient.ward_no,
            dailyRate: 3000,
            days: 0,
            supplyCharges: 0,
            total: 0,
            status: patient.discharge_requested ? 'Pending Discharge' : 'Active',
            statusVariant: patient.discharge_requested ? 'warning' : 'info'
        });
    }

    if (!Array.isArray(AppState.faLedgerRequests)) AppState.faLedgerRequests = [];
    AppState.faLedgerRequests = AppState.faLedgerRequests.map((request) =>
        request.admission_id === admissionId && request.status !== 'COMPLETED'
            ? { ...request, status: 'COMPLETED', completed_at: Date.now(), completed_by: 'FA' }
            : request
    );

    AppState.currentPatientId = admissionId;
    saveState();
    location.hash = '#/ledger';
    render();
};

let dispatchSequence = 0;

function queueDispatchArtifact(type, patient, amount, meta = {}) {
    if (!Array.isArray(AppState.dispatchQueue)) AppState.dispatchQueue = [];

    dispatchSequence += 1;
    const dispatchId = Date.now() + dispatchSequence;
    const patientIdentifier = getDisplayPatientId(patient);
    const payload = {
        id: dispatchId,
        type,
        patient_id: patient.admission_id,
        patient_identifier: patientIdentifier,
        patient_name: patient.patient_name,
        uhid: patient.uhid,
        amount,
        status: 'QUEUED',
        created_at: dispatchId,
        created_by: 'FA',
        ...meta
    };

    AppState.dispatchQueue.unshift(payload);
    return payload;
}

function buildPaymentArtifacts(patient, method, netPayable) {
    const patientIdentifier = getPatientRouteId(patient);
    const baseId = `FED-${patientIdentifier}-${Date.now()}`;
    const patientParam = encodeURIComponent(patient.patient_name);
    const upiIntent = `upi://pay?pa=federico.hospital@upi&pn=Federico Hospital&am=${netPayable}&cu=INR&tn=${baseId}`;
    const cardLink = `https://pay.federico.hospital/checkout?patientId=${encodeURIComponent(patientIdentifier)}&amount=${netPayable}&method=${encodeURIComponent(method)}&patient=${patientParam}`;
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntent)}`;

    return {
        upiIntent,
        cardLink,
        qrLink,
        summaryLink: `federico://documents/discharge/${patientIdentifier}`,
        billingLink: `federico://patient-ledger/${patientIdentifier}`
    };
}

window.approveRequest = function (id) {
    const req = AppState.serviceRequests.find(r => r.id === id);
    if (!req) return;

    const admission = AppState.admissions[req.patient_id];
    if (!admission) {
        alert('Patient admission record not found.');
        return;
    }

    req.status = 'APPROVED';
    req.approved_at = Date.now();
    req.approved_by = 'FA';

    const ledgerId = admission.ledger_id;
    if (!Array.isArray(AppState.ledgers[ledgerId])) AppState.ledgers[ledgerId] = [];

    const qty = req.service_count || 1;
    const price = getServiceCatalogPricing(req.service);

    AppState.ledgers[ledgerId].push({
        entry_id: Date.now(),
        service_name: req.service,
        qty,
        price,
        tax: Math.round(price * qty * 0.05),
        ts: Date.now(),
        source: 'FA_APPROVAL',
        request_id: req.id
    });

    AppState.currentPatientId = req.patient_id;
    saveState();
    location.hash = '#/ledger';
    render();
};

window.publishEOD = function () {
    const currentPid = AppState.currentPatientId || 701;
    const patient = AppState.admissions[currentPid];
    if (!patient) return;

    const data = getPatientData(patient.ledger_id, 'NEW');
    if (data.entries.length === 0) {
        alert('No new charges to publish.');
        return;
    }

    const billId = `EOD-${Date.now()}`;
    AppState.publishedBills.unshift({
        bill_id: billId,
        patient: patient.patient_name,
        patient_id: patient.admission_id,
        amount: data.total,
        link: `federico://patient-ledger/${getPatientRouteId(patient)}`,
        ts: Date.now()
    });

    queueDispatchArtifact('EOD_BILL', patient, data.total, {
        bill_id: billId,
        entry_count: data.entries.length,
        link: `federico://patient-ledger/${getPatientRouteId(patient)}`
    });

    patient.last_published_ts = Date.now();
    saveState();
    alert(`EOD billing packet queued for HOM dispatch for ${patient.patient_name}.`);
    render();
};

window.handlePaymentMethodChange = function () {
    const method = document.getElementById('discharge-payment-method')?.value;
    const container = document.getElementById('dynamic-payment-area');
    const patient = AppState.admissions[AppState.currentPatientId];
    if (!method || !container || !patient) return;

    const data = getPatientData(patient.ledger_id, 'ALL');
    const netPayable = Math.max(0, data.total - (patient.coverage || 0));
    const artifacts = buildPaymentArtifacts(patient, method, netPayable);

    if (method === 'UPI') {
        container.innerHTML = `
            <div style="margin-bottom: 24px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <div style="text-align: center;">
                    <img src="${artifacts.qrLink}" alt="UPI QR" style="width: 180px; height: 180px; border-radius: 12px; background: white; padding: 10px; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);">
                    <div style="font-size: 13px; color: var(--primary); font-weight: 700; margin-top: 12px;">Scan to Pay Rs ${netPayable.toLocaleString()}</div>
                </div>
                <div style="margin-top: 12px; padding: 10px; background: white; border-radius: 8px; font-size: 11px; word-break: break-all; color: #0f766e;">${artifacts.upiIntent}</div>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button class="btn-primary" style="flex:1; padding: 10px; border-radius: 8px;" onclick="navigator.clipboard.writeText('${artifacts.upiIntent}').then(()=>alert('UPI link copied.'))">Copy UPI Link</button>
                    <button class="btn-primary" style="flex:1; padding: 10px; border-radius: 8px; background:#0ea5e9;" onclick="window.open('${artifacts.billingLink}', '_blank')">Open Billing Link</button>
                </div>
            </div>
        `;
    } else if (method === 'CREDIT CARD' || method === 'DEBIT CARD') {
        container.innerHTML = `
            <div style="margin-bottom: 24px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <div style="font-size: 13px; color: var(--primary); font-weight: 700;">${method} payment link generated</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Send this secure checkout link to the patient after HOM dispatch.</div>
                <div style="margin-top: 12px; padding: 10px; background: white; border-radius: 8px; font-size: 11px; word-break: break-all; color: #1d4ed8;">${artifacts.cardLink}</div>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button class="btn-primary" style="flex:1; padding: 10px; border-radius: 8px;" onclick="navigator.clipboard.writeText('${artifacts.cardLink}').then(()=>alert('Card payment link copied.'))">Copy Card Link</button>
                    <button class="btn-primary" style="flex:1; padding: 10px; border-radius: 8px; background:#0ea5e9;" onclick="window.open('${artifacts.cardLink}', '_blank')">Open Checkout</button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="margin-bottom: 24px; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 13px;">
                Collect cash of Rs ${netPayable.toLocaleString()} and then close the file. The bill summary and discharge packet will still be queued for HOM to send.
            </div>
        `;
    }
};

window.confirmDischarge = function () {
    const currentPid = AppState.currentPatientId;
    const patient = AppState.admissions[currentPid];
    if (!patient) return;

    const method = document.getElementById('discharge-payment-method')?.value || 'CASH';
    const data = getPatientData(patient.ledger_id, 'ALL');
    const grossTotal = data.total;
    const insuranceDeduction = patient.coverage || 0;
    const netPayable = Math.max(0, grossTotal - insuranceDeduction);
    const receiptId = Date.now();
    const artifacts = buildPaymentArtifacts(patient, method, netPayable);

    AppState.receipts.unshift({
        id: receiptId,
        patient: patient.patient_name,
        patient_id: getDisplayPatientId(patient),
        uhid: patient.uhid,
        amount: netPayable,
        gross: grossTotal,
        coverage: insuranceDeduction,
        insurance: patient.insurance_provider,
        mode: method,
        status: 'Paid',
        ts: receiptId
    });

    patient.discharged = true;
    patient.discharge_requested = false;

    queueDispatchArtifact('DISCHARGE_SUMMARY', patient, netPayable, {
        receipt_id: receiptId,
        payment_mode: method,
        gross: grossTotal,
        insurance_deduction: insuranceDeduction,
        discharge_summary_link: artifacts.summaryLink
    });

    queueDispatchArtifact('PAYMENT_LINK', patient, netPayable, {
        receipt_id: receiptId,
        payment_mode: method,
        billing_link: artifacts.billingLink,
        payment_link: method === 'UPI' ? artifacts.upiIntent : method === 'CASH' ? '' : artifacts.cardLink
    });

    queueDispatchArtifact('FINAL_RECEIPT', patient, netPayable, {
        receipt_id: receiptId,
        payment_mode: method,
        receipt_link: `federico://receipts/${receiptId}`
    });

    saveState();
    alert(`Discharge summary, payment link, and receipt queued to HOM for ${patient.patient_name}.`);
    location.hash = '#/receipts';
    render();
};
