'use strict';

import { escapeHtml } from '../../lib/formatters.js';
import { openPrintWindow } from '../../lib/printDocument.js';
import { formatDDMMYYYY } from './patientStoreShape.js';

/**
 * Standard digital copy opener for receipts and transaction records.
 */
export function openDigitalCopy(record, context = {}, profile = {}) {
  const title = context.rowTitle || record.title || 'Official Receipt';
  const dateVal =
    record.receipt_sent_at ||
    record.confirmed_at ||
    record.payment_confirmed_at ||
    record.sent_at ||
    record.created_at ||
    record.ts ||
    record.generated_at ||
    Date.now();
  const createdAt = formatDDMMYYYY(dateVal);

  const patientName = record.patient_name || profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : record.uhid || 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'Federico Hospital';
  const paymentMode = record.payment_mode || record.mode || 'UPI';
  const gross = Number(record.gross_amount || record.amount || 0);
  const coverage = Number(record.insurance_deduction || 0);
  const amount = Number(record.amount || gross);
  const docStatus = record.status || 'PAID';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)} — ${escapeHtml(hospitalName)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px 20px; color: #1e293b; max-width: 620px; margin: 0 auto; background: #f8fafc; }
        .doc-sheet { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 18px; margin-bottom: 22px; }
        .hospital-brand { font-size: 20px; font-weight: 700; color: #0f766e; }
        .hospital-sub { font-size: 11px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        h2 { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 18px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13.5px; }
        .row span:first-child { color: #64748b; font-weight: 500; }
        .row span:last-child { font-weight: 600; color: #0f172a; }
        .net { font-size: 15px; font-weight: 700; background: #f0fdf4; padding: 14px 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #bbf7d0; }
        .net span:last-child { color: #166534; font-size: 17px; }
        .footer { margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 14px; }
        .print-btn { background: #0f766e; color: #ffffff; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 24px; width: 100%; }
        .print-btn:hover { background: #0d5f58; }
        @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .doc-sheet { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="doc-sheet">
        <div class="header">
          <div>
            <div class="hospital-brand">${escapeHtml(hospitalName)}</div>
            <div class="hospital-sub">Official Payment Receipt & Voucher</div>
          </div>
          <span class="badge">${escapeHtml(String(docStatus))}</span>
        </div>
        <h2>${escapeHtml(title)}</h2>
        <div class="row"><span>Patient Name</span><span>${escapeHtml(patientName)}</span></div>
        <div class="row"><span>UHID</span><span>${escapeHtml(uhid)}</span></div>
        <div class="row"><span>Receipt Date</span><span>${escapeHtml(createdAt)}</span></div>
        <div class="row"><span>Payment Mode</span><span>${escapeHtml(String(paymentMode).toUpperCase())}</span></div>
        <div class="row"><span>Gross Charges</span><span>₹${gross.toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Insurance Deduction</span><span>-₹${coverage.toLocaleString('en-IN')}</span></div>
        <div class="row net"><span>Total Paid & Cleared</span><span>₹${amount.toLocaleString('en-IN')}</span></div>
        <div class="footer">Computer-generated official receipt · ISO 9001:2015 Accredited</div>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
      </div>
    </body>
    </html>
  `;

  return openPrintWindow(html) !== null;
}

/**
 * Official Hospital Inpatient Discharge Certificate.
 */
export function openDischargeCertificate(record, profile = {}) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'Federico Hospital';
  const admitDate = record.admitDate || '—';
  const dischargeDate = record.dischargeDate || record.date || '—';
  const wardBed = (record.wardName ? record.wardName + ' · ' : '') + (record.bedNumber || 'Inpatient Bed');
  const clearanceStatement = record.notes || 'Patient treated and stabilized; fit for discharge.';
  const summaryNo = record.summaryId ? `#${record.summaryId}` : `#${record.admissionId || 'N/A'}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Discharge Clearance Certificate ${escapeHtml(summaryNo)} — ${escapeHtml(hospitalName)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px 20px; color: #1e293b; max-width: 660px; margin: 0 auto; background: #f8fafc; }
        .sheet { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 18px; margin-bottom: 22px; }
        .brand { font-size: 20px; font-weight: 700; color: #4f46e5; }
        .sub { font-size: 11px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
        .grid div strong { display: block; color: #0f172a; margin-top: 2px; }
        .grid div span { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        .statement-card { background: #f8fafc; border-left: 3px solid #4f46e5; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 22px; font-size: 13.5px; line-height: 1.5; color: #334155; }
        .status-row { display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px dashed #e2e8f0; font-size: 13px; }
        .footer { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 14px; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; margin-top: 24px; }
        @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .sheet { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="brand">${escapeHtml(hospitalName)}</div>
            <div class="sub">Department of Inpatient Hospital Operations</div>
          </div>
          <span class="badge">Discharge Cleared</span>
        </div>
        <h2>Official Inpatient Discharge Certificate</h2>
        <div class="grid">
          <div><span>Patient Name</span><strong>${escapeHtml(patientName)}</strong></div>
          <div><span>UHID</span><strong>${escapeHtml(uhid)}</strong></div>
          <div><span>Date of Admission</span><strong>${escapeHtml(admitDate)}</strong></div>
          <div><span>Date of Discharge</span><strong>${escapeHtml(dischargeDate)}</strong></div>
          <div style="grid-column: span 2;"><span>Ward &amp; Bed Allocated</span><strong>${escapeHtml(wardBed)}</strong></div>
        </div>
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Hospital Discharge Clearance Statement</div>
        <div class="statement-card">${escapeHtml(clearanceStatement)}</div>
        <div class="status-row"><span>Clinical Discharge Status:</span><strong style="color: #16a34a;">Approved &amp; Released</strong></div>
        <div class="status-row"><span>Billing Clearance:</span><strong style="color: #16a34a;">Settled &amp; Closed</strong></div>
        <div class="footer">Certified Hospital Inpatient Record · Issued by Medical Records Administration</div>
        <button class="print-btn" onclick="window.print()">Print / Save Certificate (PDF)</button>
      </div>
    </body>
    </html>
  `;

  return openPrintWindow(html) !== null;
}

/**
 * Official Hospital Inpatient Admission Certificate.
 */
export function openAdmissionCertificate(record, profile = {}) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'Federico Hospital';
  const certNo = `FED-ADM-${record.admissionId || '001'}`;
  const admitDate = record.admitDate || record.date || '—';
  const dischargeDate = record.dischargeDate || (record.status === 'Stay Completed' ? 'Discharged' : 'Active');
  const wardName = record.wardName || 'Inpatient Ward';
  const bedNumber = record.bedNumber || 'Bed Assigned';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Inpatient Admission Certificate ${escapeHtml(certNo)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px 20px; color: #1e293b; max-width: 660px; margin: 0 auto; background: #f8fafc; }
        .sheet { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 18px; margin-bottom: 22px; }
        .brand { font-size: 20px; font-weight: 700; color: #059669; }
        .sub { font-size: 11px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
        .grid div strong { display: block; color: #0f172a; margin-top: 2px; }
        .grid div span { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        .cert-statement { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; margin-bottom: 22px; font-size: 13px; line-height: 1.6; color: #166534; }
        .footer { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 14px; }
        .print-btn { background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; margin-top: 24px; }
        @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .sheet { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="brand">${escapeHtml(hospitalName)}</div>
            <div class="sub">Inpatient Care Administration</div>
          </div>
          <span class="badge">${escapeHtml(record.status || 'Active')}</span>
        </div>
        <h2>Inpatient Admission Certificate</h2>
        <div class="cert-statement">
          This is to certify that <strong>${escapeHtml(patientName)}</strong> (UHID: <strong>${escapeHtml(uhid)}</strong>)
          was formally admitted for inpatient medical care at <strong>${escapeHtml(hospitalName)}</strong>.
        </div>
        <div class="grid">
          <div><span>Certificate Number</span><strong>${escapeHtml(certNo)}</strong></div>
          <div><span>Admission Date</span><strong>${escapeHtml(admitDate)}</strong></div>
          <div><span>Allocated Ward</span><strong>${escapeHtml(wardName)}</strong></div>
          <div><span>Allocated Bed</span><strong>${escapeHtml(bedNumber)}</strong></div>
          <div><span>Inpatient Stay Status</span><strong>${escapeHtml(record.status || 'Admitted')}</strong></div>
          <div><span>Discharge Timestamp</span><strong>${escapeHtml(dischargeDate)}</strong></div>
        </div>
        <div class="footer">Valid for medical leave and health insurance claim reimbursement · Hospital Seal Affixed</div>
        <button class="print-btn" onclick="window.print()">Print / Save Certificate (PDF)</button>
      </div>
    </body>
    </html>
  `;

  return openPrintWindow(html) !== null;
}

/**
 * Official Outpatient Consultation Slip / Booking Token.
 */
export function openAppointmentSlip(record, profile = {}) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'Federico Hospital';
  const tokenNo = `APT-${record.appointmentId || '001'}`;
  const docName = record.doctorName || 'Duty Doctor';
  const dept = record.department || 'General Medicine';
  const slotDate = record.scheduledDate || record.date || '—';
  const slotTime = record.scheduledTime || '10:00 AM';
  const notes = record.notes ? record.notes : 'General consultation and medical check-up.';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Consultation Slip ${escapeHtml(tokenNo)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px 20px; color: #1e293b; max-width: 600px; margin: 0 auto; background: #f8fafc; }
        .sheet { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
        .brand { font-size: 19px; font-weight: 700; color: #0284c7; }
        .sub { font-size: 11px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
        h2 { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
        .token-box { text-align: center; background: #f0f9ff; border: 1px solid #bae6fd; padding: 14px; border-radius: 8px; margin-bottom: 18px; }
        .token-box span { font-size: 11px; color: #0369a1; text-transform: uppercase; font-weight: 600; display: block; }
        .token-box strong { font-size: 22px; color: #0369a1; letter-spacing: 0.05em; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 18px; font-size: 13px; }
        .grid div strong { display: block; color: #0f172a; margin-top: 2px; }
        .grid div span { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        .notes-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; font-size: 12.5px; color: #475569; margin-bottom: 18px; }
        .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
        .print-btn { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; margin-top: 18px; }
        @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .sheet { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="brand">${escapeHtml(hospitalName)}</div>
            <div class="sub">Outpatient Consultation Desk</div>
          </div>
          <span class="badge">Confirmed</span>
        </div>
        <div class="token-box">
          <span>Appointment Consultation Token</span>
          <strong>${escapeHtml(tokenNo)}</strong>
        </div>
        <div class="grid">
          <div><span>Patient Name</span><strong>${escapeHtml(patientName)}</strong></div>
          <div><span>UHID</span><strong>${escapeHtml(uhid)}</strong></div>
          <div><span>Consulting Doctor</span><strong>${escapeHtml(docName)}</strong></div>
          <div><span>Specialization</span><strong>${escapeHtml(dept)}</strong></div>
          <div><span>Scheduled Date</span><strong>${escapeHtml(slotDate)}</strong></div>
          <div><span>Time Slot</span><strong>${escapeHtml(slotTime)}</strong></div>
        </div>
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Intake Symptoms / Visit Purpose</div>
        <div class="notes-card">${escapeHtml(notes)}</div>
        <div class="footer">Please report to the OPD Reception 15 minutes before your scheduled slot.</div>
        <button class="print-btn" onclick="window.print()">Print / Save Slip (PDF)</button>
      </div>
    </body>
    </html>
  `;

  return openPrintWindow(html) !== null;
}

/**
 * Official Digital Health Insurance Card Preview & Print.
 */
export function openInsuranceCardModal(record, profile = {}) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'Federico Hospital';
  const provider = record.provider || 'Self Pay';
  const policyNo = record.policyNumber || 'N/A';
  const memberId = record.memberId || 'N/A';
  const validTo = record.validTo || 'N/A';
  const coverage = Number(record.coverage || 0);
  const copay = Number(record.copayPercentage || 0);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Health Insurance Card — ${escapeHtml(provider)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px 20px; color: #1e293b; max-width: 600px; margin: 0 auto; background: #f8fafc; }
        .card-wrap { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 28px; color: white; box-shadow: 0 10px 25px -5px rgba(30, 27, 75, 0.3); margin-bottom: 24px; position: relative; overflow: hidden; }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
        .card-provider { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; }
        .card-badge { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .card-num { font-family: monospace; font-size: 18px; letter-spacing: 0.1em; margin-bottom: 20px; color: #e0e7ff; }
        .card-bottom { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; font-size: 11px; }
        .card-bottom span { display: block; color: #a5b4fc; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 2px; }
        .card-bottom strong { font-size: 13px; color: #ffffff; font-weight: 600; }
        .sheet { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; }
        .meta-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .meta-row span:first-child { color: #64748b; }
        .meta-row span:last-child { font-weight: 600; color: #0f172a; }
        .print-btn { background: #312e81; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; margin-top: 20px; }
        @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } }
      </style>
    </head>
    <body>
      <div class="card-wrap">
        <div class="card-top">
          <div>
            <div class="card-provider">${escapeHtml(provider)}</div>
            <div style="font-size: 11px; color: #c7d2fe; margin-top: 2px;">Cashless Health Network Card</div>
          </div>
          <span class="card-badge">Active Policy</span>
        </div>
        <div class="card-num">${escapeHtml(policyNo)}</div>
        <div class="card-bottom">
          <div><span>Insured Patient</span><strong>${escapeHtml(patientName)}</strong></div>
          <div><span>Member ID</span><strong>${escapeHtml(memberId)}</strong></div>
          <div><span>Valid Thru</span><strong>${escapeHtml(validTo)}</strong></div>
        </div>
      </div>
      <div class="sheet">
        <div class="meta-row"><span>Hospital Network</span><span>${escapeHtml(hospitalName)}</span></div>
        <div class="meta-row"><span>Patient UHID</span><span>${escapeHtml(uhid)}</span></div>
        <div class="meta-row"><span>Maximum Coverage Limit</span><span>₹${coverage.toLocaleString('en-IN')}</span></div>
        <div class="meta-row"><span>Patient Co-Pay Share</span><span>${copay}%</span></div>
        <div class="meta-row"><span>Cashless Verification</span><span style="color: #16a34a;">Verified for Direct Settlement</span></div>
        <button class="print-btn" onclick="window.print()">Print / Save Card (PDF)</button>
      </div>
    </body>
    </html>
  `;

  return openPrintWindow(html) !== null;
}

/**
 * Itemized Hospital Invoice & Bill Printable Document.
 */
export function openInvoiceDigitalCopy(bill, profile) {
  const patientName = profile?.name || 'Patient';
  const uhid = profile?.uhid || (profile?.patientId ? `FED-${profile.patientId}` : 'UHID-882100');
  const hospitalName = profile?.hospitalName || profile?.orgName || 'City General Hospital';
  const supportPhone = profile?.supportPhone || '+91 1800-456-7890';
  const dateStr = formatDDMMYYYY(bill.date || Date.now());

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
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${escapeHtml(bill.billNo || `#${bill.ledgerId}`)} – Hospital Bill</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
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

/** Canonical alias for digital receipt copies. */
export const openBillingDigitalCopy = openDigitalCopy;
