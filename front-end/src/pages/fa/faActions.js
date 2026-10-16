'use strict';

import { api } from '../../api/index.js';
import { toast, confirm } from '../../components/feedback/feedback.js';
import { openPrintWindow } from '../../lib/printDocument.js';
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  loadBillingOverview,
  loadLedgerEntries,
  ledgerTotal,
} from './faHelpers.js';

/**
 * Ported from FA/js/modules/billing.js.
 *
 * Payment creation already auto-generates the receipt and marks the ledger PAID
 * on the backend, so there is no separate confirm-then-receipt step here.
 *
 * Every action the legacy module ended with `window.render()`; here each one
 * takes a `ctx` carrying `reload` (the equivalent), `navigate`, and
 * `setCurrentAdmissionId`. The two that read `#coverage-override` off the DOM
 * now take the value through `ctx.coverageOverrideRef` instead.
 */

function readCoverageOverride(ctx, grossTotal) {
  const el = ctx.coverageOverrideRef?.current;
  return el ? Math.min(Number(el.value) || 0, grossTotal) : 0;
}

export async function createLedgerAndOpen(ctx, admissionId) {
  try {
    await api.billing.ledger.create({ admission_id: admissionId, status: 'OPEN' });
  } catch (err) {
    toast(err.message || 'Unable to create ledger.', 'error');
    return;
  }
  ctx.setCurrentAdmissionId(admissionId);
  ctx.navigate('#/ledger');
  ctx.reload();
}

async function addCharge(ledgerId, serviceId, qty) {
  const { servicesById } = await loadBillingOverview();
  const service = servicesById[serviceId];
  if (!service) throw new Error('Select a valid service.');
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error('Quantity must be a whole number greater than 0.');
  }

  await api.billing.ledger.addEntry({
    ledger_id: ledgerId,
    service_id: serviceId,
    quantity: qty,
    unit_price: service.base_cost,
    amount: service.base_cost * qty,
  });
}

export async function addChargeToCurrentLedger(ctx, admissionId, ledgerId, serviceId, qty) {
  if (!serviceId) {
    toast('Select a service before adding a charge.', 'warning');
    return;
  }

  try {
    await addCharge(ledgerId, Number(serviceId), Number(qty));
  } catch (err) {
    toast(err.message || 'Unable to add charge.', 'error');
    return;
  }
  ctx.setCurrentAdmissionId(admissionId);
  ctx.reload();
}

export async function dispatchCurrent(ctx, ledgerId) {
  if (!ledgerId) return;

  const confirmed = await confirm({
    title: 'Send EOD bill to patient?',
    body: "This sends the running statement to the patient so they can review today's hospital charges.",
    confirmLabel: 'Send Bill',
    cancelLabel: 'Cancel',
  });
  if (!confirmed) return;

  try {
    await api.billing.ledger.dispatch(ledgerId);
    toast('EOD bill sent to patient.', 'success');
  } catch (err) {
    toast(err.message || 'Unable to send this bill.', 'error');
    return;
  }
  ctx.reload();
}

export async function recordCashPayment(ctx, ledgerId) {
  const entries = await loadLedgerEntries(ledgerId);
  const grossTotal = ledgerTotal(entries);
  const deduction = readCoverageOverride(ctx, grossTotal);
  const netPayable = Math.max(0, grossTotal - deduction);

  if (netPayable <= 0) {
    return ctx.showFormError('discharge-payment-error', 'Nothing due to collect for this patient.');
  }

  try {
    await api.billing.payments.create({
      ledger_id: ledgerId,
      amount_paid: netPayable,
      payment_mode: 'CASH',
    });
  } catch (err) {
    return ctx.showFormError('discharge-payment-error', err.message || 'Unable to record payment.');
  }
  return ctx.reload();
}

async function ensureDischargeSummary(ctx, admissionId) {
  const { rows } = await loadBillingOverview();
  const row = rows.find((r) => r.admission.admission_id === admissionId);
  if (!row) return { row: null, summary: null };

  const existing = await api.billing.dischargeSummary.getByAdmission(admissionId).catch(() => null);
  if (existing) return { row, summary: existing };

  const entries = row.ledger ? await loadLedgerEntries(row.ledger.ledger_id) : [];
  const grossTotal = ledgerTotal(entries);
  const deduction = readCoverageOverride(ctx, grossTotal);
  const finalAmount = Math.max(0, grossTotal - deduction);

  const summary = await api.billing.dischargeSummary.create({
    admission_id: admissionId,
    patient_id: row.patient.patient_id,
    discharge_notes:
      'Patient treated and stabilized for the condition requiring admission; fit for discharge.',
    gross_amount: grossTotal,
    insurance_deduction: deduction,
    final_amount: finalAmount,
  });
  return { row, summary };
}

export async function generateDischargeSummary(ctx, admissionId) {
  const { row, summary } = await ensureDischargeSummary(ctx, admissionId);
  if (!row) return;

  if (row.ledger && row.ledger.status === 'OPEN') {
    try {
      await api.billing.ledger.dispatch(row.ledger.ledger_id);
      toast('Discharge summary generated and bill sent to the patient.', 'success');
    } catch (err) {
      toast(err.message || 'Discharge summary created, but the bill could not be sent.', 'warning');
    }
  }

  const entries = row.ledger ? await loadLedgerEntries(row.ledger.ledger_id) : [];
  const { servicesById } = await loadBillingOverview();
  const grossTotal = ledgerTotal(entries);

  const servicesList = entries
    .map(
      (e) => `
            <li style="padding: 8px 0; border-bottom: 1px dashed #D8D2C8; color: #6C6863; font-size: 14px;">
                ${escapeHtml(servicesById[e.service_id]?.service_name || '-')} <span style="float: right; font-weight: 600;">(Qty: ${e.quantity})</span>
            </li>
        `,
    )
    .join('');

  openPrintWindow(`
            <html><head><title>Discharge Summary - ${escapeHtml(row.patient.name || '')}</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1A1A1A; max-width: 800px; margin: 0 auto; background: #F9F8F6; }
                h1 { font-family: 'Playfair Display', serif; font-weight: 500; color: #1A1A1A; text-align: center; border-bottom: 1px solid #1A1A1A; padding-bottom: 20px; font-size: 28px; }
                h3 { font-family: 'Playfair Display', serif; font-weight: 500; color: #1A1A1A; margin-top: 30px; border-bottom: 1px solid #D8D2C8; padding-bottom: 8px; font-size: 18px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .label { color: #6C6863; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .value { font-size: 15px; font-weight: 600; color: #1A1A1A; }
                ul { list-style: none; padding: 0; margin: 0; }
                .financials { background: #EBE5DE; padding: 20px; border-radius: 0; border: none; border-top: 1px solid #1A1A1A; margin-top: 10px; }
                .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; }
                .net { font-size: 20px; font-weight: 800; color: #9C7A1E; border-top: 1px solid #1A1A1A; padding-top: 16px; margin-top: 12px; }
                .print-btn { display: block; width: 100%; background: #1A1A1A; color: #F9F8F6; border: none; padding: 16px; border-radius: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; margin-top: 40px; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <h1>Official Discharge Summary</h1>
                <h3>Patient & Admission Details</h3>
                <div class="grid">
                    <div><div class="label">Patient Name</div><div class="value">${escapeHtml(row.patient.name || '-')}</div></div>
                    <div><div class="label">UHID</div><div class="value">${escapeHtml(row.patient.uhid || '-')}</div></div>
                    <div><div class="label">Bed</div><div class="value">${escapeHtml(row.bed.bed_number || '-')}</div></div>
                    <div><div class="label">Attending Doctor</div><div class="value">${escapeHtml(row.doctorName || 'Duty Doctor')}</div></div>
                </div>
                <h3>Services Used</h3>
                <ul>${servicesList || '<li>No services recorded.</li>'}</ul>
                <h3>Financial Summary</h3>
                <div class="financials">
                    <div class="row"><span class="label">Total Amount (Gross)</span><span class="value">${formatCurrency(grossTotal)}</span></div>
                    <div class="row net"><span>Final Payment Due</span><span>${formatCurrency(summary.final_amount)}</span></div>
                </div>
                <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
  ctx.reload();
}

export async function printDischargeSummary(ctx, admissionId, hospitalName) {
  const { row, summary } = await ensureDischargeSummary(ctx, admissionId);
  if (!row) return;

  const entries = row.ledger ? await loadLedgerEntries(row.ledger.ledger_id) : [];
  const { servicesById } = await loadBillingOverview();
  const grossTotal = ledgerTotal(entries);
  const treatmentsReceived =
    entries
      .map((e) => servicesById[e.service_id]?.service_name)
      .filter(Boolean)
      .join(', ') || 'Standard Care';

  openPrintWindow(`
            <html><head><title>Discharge & Billing Summary - ${escapeHtml(row.patient.name || '')}</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1A1A1A; max-width: 900px; margin: 0 auto; line-height: 1.5; background: #F9F8F6; }
                .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #1A1A1A; padding-bottom: 20px; margin-bottom: 30px; }
                .hospital-name { font-family: 'Playfair Display', serif; font-weight: 500; color: #1A1A1A; font-size: 28px; margin: 0; }
                .section-title { background: #EBE5DE; padding: 10px 16px; border-left: 3px solid #D4AF37; font-size: 12px; letter-spacing: 0.1em; font-weight: 600; color: #1A1A1A; margin: 30px 0 15px 0; text-transform: uppercase; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
                .info-label { color: #6C6863; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .info-value { color: #1A1A1A; font-weight: 600; }
                .text-block { font-size: 14px; color: #4A4742; margin-bottom: 16px; background: #F9F8F6; border: 1px solid #D8D2C8; padding: 16px; border-radius: 0; }
                .bill-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #D8D2C8; font-size: 14px; }
                .net-paid { color: #9C7A1E; font-size: 18px; font-weight: 800; border-bottom: 1px solid #1A1A1A; border-top: 1px solid #1A1A1A; margin-top: 10px; }
                .print-btn { background: #1A1A1A; color: #F9F8F6; border: none; padding: 14px 28px; border-radius: 0; cursor: pointer; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 50px; display: block; width: 100%; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <div class="header">
                    <div><h1 class="hospital-name">${escapeHtml(hospitalName)}</h1><div style="font-size: 13px; color: #6C6863; margin-top: 4px;">123 Health Avenue, Medical District</div></div>
                    <div style="text-align: right;"><div style="font-size: 12px; color: #6C6863; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Discharge & Billing Summary</div></div>
                </div>
                <div class="info-grid">
                    <div><div class="info-label">Patient Name</div><div class="info-value">${escapeHtml(row.patient.name || '-')}</div></div>
                    <div><div class="info-label">UHID</div><div class="info-value">${escapeHtml(row.patient.uhid || '-')}</div></div>
                    <div><div class="info-label">Admitting Doctor</div><div class="info-value">${escapeHtml(row.doctorName || 'Duty Doctor')}</div></div>
                    <div><div class="info-label">Ward / Bed</div><div class="info-value">${escapeHtml(row.bed.bed_number || '-')}</div></div>
                </div>
                <div class="section-title">Part 1: Clinical Discharge Summary</div>
                <div class="text-block"><strong style="display:block; margin-bottom:4px;">Primary Diagnosis:</strong>Successfully treated and stabilized for the condition requiring admission. Patient is fit for discharge.</div>
                <div class="text-block"><strong style="display:block; margin-bottom:4px;">Treatments & Services Rendered:</strong>${escapeHtml(treatmentsReceived)}</div>
                <div class="section-title">Part 2: Final Billing Receipt</div>
                <div class="bill-row"><span>Gross Total Charges</span><span>${formatCurrency(grossTotal)}</span></div>
                <div class="bill-row net-paid"><span>Net Amount Due</span><span>${formatCurrency(summary.final_amount)}</span></div>
                <button class="print-btn" onclick="window.print()">Save Official Document as PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
  ctx.reload();
}

export async function printReceipt(receiptId) {
  const [receipts, { patientsById }] = await Promise.all([
    api.billing.receipts.list().catch(() => []),
    loadBillingOverview(),
  ]);
  const r = receipts.find((rec) => rec.receipt_id === receiptId);
  if (!r) {
    toast('Receipt not found.', 'error');
    return;
  }
  const patient = patientsById[r.patient_id] || {};

  openPrintWindow(`
            <html><head><title>Receipt - PAY${r.receipt_id}</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 50px; color: #1A1A1A; max-width: 700px; margin: 0 auto; background: #F9F8F6; }
                h2 { font-family: 'Playfair Display', serif; font-weight: 500; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1A1A1A; padding-bottom: 20px; margin-bottom: 30px; }
                .badge { background: #E7F0EA; color: #2C5B41; padding: 6px 14px; border-radius: 0; font-size: 11px; letter-spacing: 0.08em; font-weight: 700; }
                .row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px dashed #D8D2C8; font-size: 15px; }
                .net { font-size: 20px; font-weight: 800; color: #9C7A1E; border-bottom: 1px solid #1A1A1A; border-top: 1px solid #1A1A1A; padding: 20px 0; margin-top: 10px; }
                .print-btn { background: #1A1A1A; color: #F9F8F6; border: none; padding: 14px 28px; border-radius: 0; cursor: pointer; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 40px; display: block; width: 100%; }
                @media print { .print-btn { display: none; } body { padding: 0; } }
            </style></head>
            <body>
                <div class="header"><h2>🧾 Payment Receipt</h2><span class="badge">PAID</span></div>
                <div class="row"><span>Receipt ID</span><span>PAY${r.receipt_id}</span></div>
                <div class="row"><span>Patient Name</span><span>${escapeHtml(patient.name || '-')}</span></div>
                <div class="row"><span>UHID</span><span>${escapeHtml(patient.uhid || '-')}</span></div>
                <div class="row"><span>Date & Time</span><span>${formatDateTime(r.generated_at)}</span></div>
                <div class="row"><span>Payment Mode</span><span>${escapeHtml((r.payment_mode || '').toUpperCase())}</span></div>
                <div class="row net"><span>Total Amount Paid</span><span>${formatCurrency(r.amount)}</span></div>
                <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body></html>
        `);
}

export async function approveLeader(ctx, leaderId) {
  if (!leaderId) return;
  try {
    await api.billing.leaders.approve(leaderId);
    toast(
      'Charge approved and posted to the patient ledger. Send the EOD bill from the EOD & Settlement tab when ready.',
      'success',
    );
    await ctx.reload();
  } catch (err) {
    toast(err.message || 'Unable to approve this charge.', 'error');
    await ctx.reload();
  }
}
