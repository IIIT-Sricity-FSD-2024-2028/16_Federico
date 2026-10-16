'use strict';

import { escapeHtml } from '../../lib/formatters.js';
import { openPrintWindow } from '../../lib/printDocument.js';

/** patient-billing.js#openInvoiceDigitalCopy, byte-identical. */
export function openInvoiceDigitalCopy(bill, profile) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'City General Hospital';
  const supportPhone = profile?.supportPhone || '+91 1800-456-7890';
  const dateStr =
    bill.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const itemsHtml = (bill.items || [])
    .map(
      (item) => `
      <tr style="border-bottom:1px solid #E5E5E5;">
        <td style="padding:10px 12px;"><strong>${escapeHtml(item.name || 'Hospital Care')}</strong></td>
        <td style="padding:10px 12px; text-align:center;">${item.qty || 1}</td>
        <td style="padding:10px 12px; text-align:right;">₹${Number(item.unitPrice || 0).toLocaleString('en-IN')}</td>
        <td style="padding:10px 12px; text-align:right;">₹${Number(item.total || 0).toLocaleString('en-IN')}</td>
      </tr>
    `,
    )
    .join('');

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)} – Hospital Bill</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; max-width: 780px; margin: 0 auto; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F766E; padding-bottom: 20px; margin-bottom: 24px; }
          .brand h1 { margin: 0; font-size: 24px; color: #0F766E; }
          .brand span { font-size: 12px; color: #64748B; display: block; margin-top: 2px; }
          .badge { background: ${bill.status === 'paid' ? '#DCFCE7; color:#15803D;' : '#FEF3C7; color:#B45309;'} padding: 6px 14px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F8FAFC; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
          .meta-grid div strong { display: block; color: #0F172A; font-size: 14px; }
          .meta-grid div span { color: #64748B; font-size: 11px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #F1F5F9; color: #475569; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .totals { margin-left: auto; width: 320px; font-size: 14px; }
          .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #CBD5E1; }
          .totals .net { font-size: 18px; font-weight: 700; color: #0F766E; border-top: 2px solid #0F766E; border-bottom: 2px solid #0F766E; padding: 12px 0; margin-top: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #94A3B8; font-size: 11px; border-top: 1px solid #E2E8F0; padding-top: 16px; }
          .print-btn { background: #0F766E; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 32px; display: block; width: 100%; font-size: 14px; }
          @media print { .print-btn { display:none; } body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>${escapeHtml(hospitalName.toUpperCase())}</h1>
            <span>Healthcare Excellence · Certified Hospital Inpatient &amp; Outpatient Billing</span>
          </div>
          <span class="badge">${bill.status === 'paid' ? 'PAID IN FULL' : 'PENDING PAYMENT'}</span>
        </div>
        <div class="meta-grid">
          <div>
            <span>Patient Details</span>
            <strong>${escapeHtml(patientName)}</strong>
            <small>UHID: ${escapeHtml(uhid)} · Age/Gender: ${escapeHtml(profile?.age ? `${profile.age} yrs / ${profile.gender}` : 'N/A')}</small>
          </div>
          <div style="text-align:right;">
            <span>Invoice Details</span>
            <strong>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)}</strong>
            <small>Billing Date: ${escapeHtml(dateStr)} · Admission #${bill.admissionId || 'N/A'}</small>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Service / Description</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4" style="text-align:center; padding:16px;">Itemized services consolidated.</td></tr>'}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Gross Amount:</span><span>₹${Number(bill.total || 0).toLocaleString('en-IN')}</span></div>
          <div class="row" style="color:#15803D;"><span>Insurance Deduction:</span><span>-₹${Number(bill.insuranceCovered || 0).toLocaleString('en-IN')}</span></div>
          <div class="row net"><span>Net Payable:</span><span>₹${Number(bill.youPay || 0).toLocaleString('en-IN')}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated tax invoice and receipt. No physical signature is required.</p>
          <p>${escapeHtml(hospitalName)} Network · ISO 9001:2015 Certified · 24x7 Support: ${escapeHtml(supportPhone)}</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print / Download PDF</button>
      </body>
      </html>
    `;

  return openPrintWindow(html) !== null;
}

/** patient-billing.js#openDigitalCopy - note this is NOT the dashboard's copy. */
export function openBillingDigitalCopy(record, context, profile) {
  const rowType = context.rowType || record.type || 'DOCUMENT';
  const title = context.rowTitle || 'Official Document';
  const createdAt = new Date(
    record.receipt_sent_at ||
      record.confirmed_at ||
      record.payment_confirmed_at ||
      record.sent_at ||
      record.created_at ||
      record.ts ||
      Date.now(),
  ).toLocaleString('en-IN');
  const patientName = record.patient_name || profile?.name || 'Patient';
  const patientId = record.patient_id || record.uhid || 'N/A';
  const paymentMode = record.payment_mode || 'UPI';
  const gross = Number(record.gross_amount || record.amount || 0);
  const coverage = Number(record.insurance_deduction || 0);
  const amount = Number(record.amount || 0);
  const reference =
    record.receipt_link ||
    record.discharge_summary_link ||
    record.billing_link ||
    record.payment_link ||
    record.link ||
    record.reference ||
    `REC-${record.sourceId || Date.now()}`;
  const docStatus = record.status || 'CONFIRMED';
  const hospitalName = profile?.hospitalName || profile?.orgName || record.hospital_name || 'City General Hospital';

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; max-width: 700px; margin: 0 auto; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F766E; padding-bottom: 20px; margin-bottom: 24px; }
          h2 { color: #0F766E; margin: 0; font-size: 22px; }
          .badge { background: #DCFCE7; color: #15803D; padding: 6px 14px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px dashed #E2E8F0; font-size: 14px; }
          .row span:first-child { color: #64748B; font-weight: 500; }
          .row span:last-child { font-weight: 600; color: #0F172A; }
          .net { font-size: 18px; font-weight: 700; color: #0F766E; border-bottom: 2px solid #0F766E; border-top: 2px solid #0F766E; padding: 16px 0; margin-top: 10px; }
          .net span { color: #0F766E !important; }
          .footer { margin-top: 36px; text-align: center; color: #94A3B8; font-size: 11px; }
          .print-btn { background: #0F766E; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 32px; display: block; width: 100%; }
          @media print { .print-btn { display:none; } body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2>${escapeHtml(hospitalName.toUpperCase())}</h2>
            <small style="color:#64748B;">Official Payment Receipt &amp; Voucher</small>
          </div>
          <span class="badge">${escapeHtml(String(docStatus).replace(/_/g, ' '))}</span>
        </div>
        <div class="row"><span>Document Title</span><span>${escapeHtml(title)}</span></div>
        <div class="row"><span>Document Type</span><span>${escapeHtml(rowType)}</span></div>
        <div class="row"><span>Patient Name</span><span>${escapeHtml(patientName)}</span></div>
        <div class="row"><span>Patient ID / Admission</span><span>${escapeHtml(String(patientId))}</span></div>
        <div class="row"><span>Generated Date &amp; Time</span><span>${escapeHtml(createdAt)}</span></div>
        <div class="row"><span>Payment Mode</span><span>${escapeHtml(String(paymentMode).toUpperCase())}</span></div>
        <div class="row"><span>Gross Bill Amount</span><span>₹${gross.toLocaleString('en-IN')}</span></div>
        <div class="row" style="color:#15803D;"><span>Insurance Covered</span><span>-₹${coverage.toLocaleString('en-IN')}</span></div>
        <div class="row net"><span>Net Paid</span><span>₹${amount.toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Transaction Reference</span><span>${escapeHtml(reference)}</span></div>
        <div class="footer">
          <p>${escapeHtml(hospitalName)} · Thank you for choosing our care network.</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
      </body>
      </html>
    `;

  return openPrintWindow(html) !== null;
}

