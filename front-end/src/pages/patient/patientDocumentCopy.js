'use strict';

import { escapeHtml } from '../../lib/formatters.js';
import { openPrintWindow } from '../../lib/printDocument.js';

/**
 * patient-dashboard.js#openDigitalCopy, byte-identical.
 *
 * Returns false when the popup was blocked, so the caller can raise the same
 * "Please allow popups to view document copy." toast it always did.
 */
export function openDigitalCopy(record, context, profile) {
  const rowType = context.rowType || record.type || 'DOCUMENT';
  const title = context.rowTitle || record.title || 'Hospital Document';
  const createdAt = new Date(
    record.receipt_sent_at ||
      record.confirmed_at ||
      record.payment_confirmed_at ||
      record.sent_at ||
      record.created_at ||
      record.ts ||
      Date.now(),
  ).toLocaleString('en-IN');
  const patientName = record.patient_name || (profile && profile.name) || 'Patient';
  const uhid = (profile && profile.uhid) || (profile?.patientId ? `FED-${profile.patientId}` : (record.uhid || 'UHID-882100'));
  const hospitalName = (profile && (profile.hospitalName || profile.orgName)) || record.hospital_name || 'City General Hospital';
  const paymentMode = record.payment_mode || 'UPI';
  const gross = Number(record.gross_amount || record.amount || 0);
  const coverage = Number(record.insurance_deduction || 0);
  const amount = Number(record.amount || gross);
  const docStatus = record.status || 'OFFICIAL';

  const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(title)} — Federico Cloud Health</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 48px 24px; color: #1e293b; max-width: 640px; margin: 0 auto; background: #f8fafc; }
                    .doc-sheet { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6750A4; padding-bottom: 20px; margin-bottom: 24px; }
                    .hospital-brand { font-size: 20px; font-weight: 700; color: #6750A4; font-family: 'Playfair Display', serif; }
                    .hospital-sub { font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
                    .badge { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                    h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 20px; }
                    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
                    .row span:first-child { color: #64748b; font-weight: 500; }
                    .row span:last-child { font-weight: 600; color: #0f172a; }
                    .net { font-size: 16px; font-weight: 700; background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 16px 0; border-bottom: none; }
                    .net span:last-child { color: #6750A4; font-size: 18px; }
                    .print-btn { background: #6750A4; color: #ffffff; border: none; padding: 12px 24px; border-radius: 9999px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 28px; width: 100%; transition: background 0.2s; }
                    .print-btn:hover { background: #523e85; }
                    @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .doc-sheet { border: none; box-shadow: none; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="doc-sheet">
                    <div class="header">
                        <div>
                            <div class="hospital-brand">${escapeHtml(hospitalName)}</div>
                            <div class="hospital-sub">Official Medical & Financial Record</div>
                        </div>
                        <span class="badge">${escapeHtml(String(docStatus).replace(/_/g, ' '))}</span>
                    </div>
                    <h2>${escapeHtml(title)}</h2>
                    <div class="row"><span>Document Type</span><span>${escapeHtml(rowType.replace(/_/g, ' '))}</span></div>
                    <div class="row"><span>Patient Name</span><span>${escapeHtml(patientName)}</span></div>
                    <div class="row"><span>UHID</span><span>${escapeHtml(uhid)}</span></div>
                    <div class="row"><span>Issued Date</span><span>${escapeHtml(createdAt)}</span></div>
                    <div class="row"><span>Payment / Process Mode</span><span>${escapeHtml(String(paymentMode).toUpperCase())}</span></div>
                    <div class="row"><span>Gross Billed Amount</span><span>₹${gross.toLocaleString('en-IN')}</span></div>
                    <div class="row"><span>Insurance Deduction</span><span>-₹${coverage.toLocaleString('en-IN')}</span></div>
                    <div class="row net"><span>Net Paid / Settled</span><span>₹${amount.toLocaleString('en-IN')}</span></div>
                    <button class="print-btn" onclick="window.print()">Print / Save Document (PDF)</button>
                </div>
            </body>
            </html>
        `;

  return openPrintWindow(html) !== null;
}

