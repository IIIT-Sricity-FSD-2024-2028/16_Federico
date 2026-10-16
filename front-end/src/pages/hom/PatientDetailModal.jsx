'use strict';

import { useEffect, useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { api } from '../../api/index.js';
import { getSession } from '../../api/session.js';
import { openPrintWindow } from '../../lib/printDocument.js';
import {
  escapeHtml,
  statusLabel,
  statusVariant,
  daysSince,
  formatDate,
  formatDateTime,
  formatCurrency,
} from './homHelpers.js';

/**
 * Clean Inpatient Detail & Payment Receipt Modal for HOM Patient Flow.
 * Handles both "View" (Overview & Ward Care) and "View Receipt" (Official Settlement & Itemized Charges).
 */
export default function PatientDetailModal({ row, initialTab = 'overview', onClose, onOpenDischarge }) {
  const normalizedInitial =
    initialTab === 'supply' || initialTab === 'receipt' || initialTab === 'billing' ? 'billing' : 'overview';

  const [tab, setTab] = useState(normalizedInitial);
  const [loading, setLoading] = useState(true);
  const [billingBundle, setBillingBundle] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [servicesById, setServicesById] = useState({});

  const session = getSession();
  const organizationName = session?.tenant?.organization_name || 'Federico Hospital';

  useEffect(() => {
    if (!row) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [bills, receipts, services] = await Promise.all([
          api.billing.patient.bills(row.patient_id).catch(() => []),
          api.billing.patient.receipts(row.patient_id).catch(() => []),
          api.billing.services.list().catch(() => []),
        ]);

        if (cancelled) return;

        const svcMap = {};
        (Array.isArray(services) ? services : []).forEach((s) => {
          svcMap[s.service_id] = s;
        });
        setServicesById(svcMap);

        // 1. Accurately match the admission and ledger bundle for this patient flow row
        const billList = Array.isArray(bills) ? bills : [];
        let matchedBundle = null;

        if (billList.length > 0) {
          // Priority 1: Match by assigned bed
          if (row.bed_id) {
            matchedBundle = billList.find(
              (b) => b.admission && Number(b.admission.bed_id) === Number(row.bed_id),
            );
          }
          // Priority 2: Match by admission status
          if (!matchedBundle && row.status) {
            matchedBundle = billList.find(
              (b) => b.admission && String(b.admission.status).toUpperCase() === String(row.status).toUpperCase(),
            );
          }
          // Priority 3: Fallback to admission with ledger
          if (!matchedBundle) {
            matchedBundle = billList.find((b) => b.ledger) || billList[0] || null;
          }
        }
        setBillingBundle(matchedBundle);

        // 2. Fetch or resolve itemized ledger entries
        let resolvedEntries = matchedBundle?.entries || [];
        if (matchedBundle?.ledger?.ledger_id && (!resolvedEntries || resolvedEntries.length === 0)) {
          resolvedEntries = await api.billing.ledger.entries(matchedBundle.ledger.ledger_id).catch(() => []);
        }
        if (cancelled) return;
        setEntries(Array.isArray(resolvedEntries) ? resolvedEntries : []);

        // 3. Match the official payment receipt
        const receiptList = Array.isArray(receipts) ? receipts : [];
        let matchedReceipt = null;

        if (receiptList.length > 0) {
          if (matchedBundle?.ledger?.ledger_id) {
            matchedReceipt = receiptList.find(
              (r) => Number(r.ledger_id) === Number(matchedBundle.ledger.ledger_id),
            );
          }
          if (!matchedReceipt && matchedBundle?.admission?.admission_id) {
            matchedReceipt = receiptList.find(
              (r) => Number(r.admission_id) === Number(matchedBundle.admission.admission_id),
            );
          }
          if (!matchedReceipt && row.status === 'DISCHARGED') {
            matchedReceipt = receiptList[receiptList.length - 1] || receiptList[0] || null;
          }
        }
        setReceipt(matchedReceipt);

        // 4. Fetch discharge summary if admission ID is available
        if (matchedBundle?.admission?.admission_id) {
          const summary = await api.billing.dischargeSummary
            .getByAdmission(matchedBundle.admission.admission_id)
            .catch(() => null);
          if (!cancelled) setDischargeSummary(summary);
        }
      } catch (err) {
        console.error('[PatientDetailModal] Failed to load billing/receipt data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [row]);

  if (!row) return null;

  const isDischarged = row.status === 'DISCHARGED';
  const grossTotal = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const deduction = dischargeSummary?.insurance_deduction ? Number(dischargeSummary.insurance_deduction) : 0;
  const netTotal = dischargeSummary?.final_amount !== undefined ? Number(dischargeSummary.final_amount) : grossTotal - deduction;
  const paidAmount = receipt?.amount !== undefined ? Number(receipt.amount) : netTotal;

  const receiptNumber = receipt
    ? `REC-${String(receipt.receipt_id).padStart(5, '0')}`
    : billingBundle?.ledger
      ? `LED-${String(billingBundle.ledger.ledger_id).padStart(5, '0')}`
      : 'PENDING';

  const paymentMode = receipt?.payment_mode
    ? String(receipt.payment_mode).toUpperCase()
    : isDischarged
      ? 'SETTLED'
      : 'PENDING SETTLEMENT';

  const transactionDate =
    receipt?.generated_at ||
    receipt?.receipt_time ||
    billingBundle?.admission?.discharge_time ||
    billingBundle?.ledger?.cleared_at ||
    null;

  function printOfficialReceipt() {
    const receiptRows = entries
      .map((e) => {
        const sName = escapeHtml(servicesById[e.service_id]?.service_name || `Service #${e.service_id}`);
        const cat = escapeHtml(servicesById[e.service_id]?.category || 'General Inpatient');
        const qty = e.quantity || 1;
        const rate = formatCurrency(e.unit_price || (e.amount / qty));
        const amt = formatCurrency(e.amount);
        return `<tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
            ${sName}
            <div style="font-size: 11px; color: #64748b; font-weight: 400; margin-top: 2px;">${cat}</div>
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">${qty}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${rate}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">${amt}</td>
        </tr>`;
      })
      .join('');

    openPrintWindow(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${escapeHtml(receiptNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 760px; margin: 0 auto; background: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
    .org-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .org-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .receipt-badge { background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .receipt-id { font-size: 16px; font-weight: 800; color: #0f172a; margin: 8px 0 4px; text-align: right; }
    .meta-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }
    .meta-val { font-size: 13.5px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; }
    .summary-box { margin-left: auto; width: 300px; border-top: 2px solid #0f172a; padding-top: 12px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; color: #475569; }
    .summary-row.total { font-size: 17px; font-weight: 800; color: #0f172a; padding-top: 8px; border-top: 1px dashed #cbd5e1; margin-top: 8px; }
    .footer-note { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .print-actions { margin-top: 32px; display: flex; justify-content: center; }
    .print-btn { background: #6750a4; color: #ffffff; border: none; padding: 12px 28px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; }
    @media print { .print-actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="org-name">${escapeHtml(organizationName)}</h1>
      <div class="org-sub">Hospital Operations & Inpatient Services • Official Settlement Receipt</div>
    </div>
    <div style="text-align: right;">
      <span class="receipt-badge">PAID IN FULL</span>
      <div class="receipt-id">${escapeHtml(receiptNumber)}</div>
      <div style="font-size: 12px; color: #64748b;">${formatDateTime(transactionDate)}</div>
    </div>
  </div>

  <div class="meta-card">
    <div><div class="meta-label">Patient Name</div><div class="meta-val">${escapeHtml(row.patientName || '-')}</div></div>
    <div><div class="meta-label">Patient UHID</div><div class="meta-val">${escapeHtml(row.patientUhid || '-')}</div></div>
    <div><div class="meta-label">Department / Bed</div><div class="meta-val">${escapeHtml(row.department || '-')} / ${escapeHtml(row.bedNumber || '-')}</div></div>
    <div><div class="meta-label">Payment Mode</div><div class="meta-val">${escapeHtml(paymentMode)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Service / Item Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${receiptRows || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No line items recorded.</td></tr>'}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span>Gross Hospital Charges</span>
      <span>${formatCurrency(grossTotal)}</span>
    </div>
    ${deduction > 0 ? `<div class="summary-row"><span>Insurance / Deduction</span><span>− ${formatCurrency(deduction)}</span></div>` : ''}
    <div class="summary-row total">
      <span>Total Paid</span>
      <span style="color: #166534;">${formatCurrency(paidAmount)}</span>
    </div>
  </div>

  <div class="footer-note">
    This is an authorized computer-generated document issued by ${escapeHtml(organizationName)}. No physical signature required.
  </div>

  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">Print Official Receipt</button>
  </div>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`);
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      size="lg"
      title={row.patientName}
      subtitle={`UHID: ${row.patientUhid} • ${row.department || 'General'} • Bed: ${row.bedNumber}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
          <div>
            {tab === 'overview' ? (
              <Button variant="outline" size="default" onClick={() => setTab('billing')}>
                {isDischarged ? 'View Payment Receipt' : 'View Billing Ledger'}
              </Button>
            ) : (
              <Button variant="outline" size="default" onClick={() => setTab('overview')}>
                Back to Overview
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button variant="secondary" size="default" onClick={onClose}>
              Close
            </Button>
            {tab === 'billing' && (receipt || isDischarged) && entries.length > 0 ? (
              <button
                type="button"
                className="btn btn-primary btn-default"
                onClick={printOfficialReceipt}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Receipt
              </button>
            ) : null}
            {row.status === 'DISCHARGE_REQUESTED' ? (
              <Button
                variant="primary"
                size="default"
                id="btn-pd-discharge"
                onClick={() => onOpenDischarge(row.pre_request_id)}
              >
                Approve Discharge
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="pd-modal-content">
        {/* Navigation & Status Header */}
        <div className="pd-nav-bar">
          <TabNav
            tabs={[
              { id: 'overview', label: 'Overview & Ward Care' },
              { id: 'billing', label: isDischarged ? 'Payment Receipt' : 'Billing Ledger' },
            ]}
            activeTab={tab}
            onChange={setTab}
            variant="pills"
          />
          <div className="pd-badges-group">
            {row.billsCleared ? <span className="pd-cleared-pill">Finance Cleared</span> : null}
            <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
          </div>
        </div>

        {/* TAB 1: Overview & Ward Care */}
        <div className={'tab-content-panel' + (tab === 'overview' ? ' active' : '')} id="content-overview">
          {/* Card 1: Patient Demographic & Contact */}
          <div className="pd-card">
            <div className="pd-card-header">
              <h3 className="pd-card-title">Patient Profile</h3>
              <span style={{ fontSize: 12, color: 'var(--color-muted-fg, #64748b)', fontWeight: 500 }}>
                UHID: {row.patientUhid}
              </span>
            </div>
            <div className="pd-grid-4col">
              <div className="pd-field">
                <span className="pd-field-label">Age / Gender</span>
                <span className="pd-field-value">{row.patientAge} / {row.patientGender}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Contact Number</span>
                <span className="pd-field-value">{row.patientPhone}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Blood Group</span>
                <span className="pd-field-value">{row.patientBloodGroup}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Hospital Account</span>
                <span className="pd-field-value subdued">{organizationName}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Admission & Ward Care Information */}
          <div className="pd-card">
            <div className="pd-card-header">
              <h3 className="pd-card-title">Inpatient Admission Record</h3>
              <span style={{ fontSize: 12, color: 'var(--color-muted-fg, #64748b)', fontWeight: 500 }}>
                Care Path: {row.department || 'General'}
              </span>
            </div>
            <div className="pd-grid-4col">
              <div className="pd-field">
                <span className="pd-field-label">Department</span>
                <span className="pd-field-value">{row.department || 'General'}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Assigned Bed</span>
                <span className="pd-field-value">{row.bedNumber}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Attending Physician</span>
                <span className="pd-field-value">{row.doctorName}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Specialization</span>
                <span className="pd-field-value subdued">{row.doctorSpecialization || '-'}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Admission Date</span>
                <span className="pd-field-value">{formatDate(row.decided_at || row.created_at)}</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Length of Stay</span>
                <span className="pd-field-value">{daysSince(row.decided_at || row.created_at)} days</span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Discharge Status</span>
                <span className="pd-field-value">
                  {isDischarged
                    ? `Discharged (${formatDate(billingBundle?.admission?.discharge_time || row.decided_at)})`
                    : statusLabel(row.status)}
                </span>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Financial Status</span>
                <span className="pd-field-value" style={{ color: row.billsCleared || isDischarged ? '#166534' : 'inherit' }}>
                  {isDischarged || receipt ? 'Paid & Settled' : row.billsCleared ? 'Bills Cleared' : 'Running Ledger'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Clinical Notes / Discharge Summary (if present) */}
          {dischargeSummary?.discharge_notes || row.reject_reason ? (
            <div className="pd-notes-card">
              <div className="pd-notes-title">Clinical & Discharge Notes</div>
              <p className="pd-notes-text">
                {dischargeSummary?.discharge_notes || row.reject_reason}
              </p>
            </div>
          ) : null}
        </div>

        {/* TAB 2: Payment Receipt & Billing Ledger */}
        <div className={'tab-content-panel' + (tab === 'billing' ? ' active' : '')} id="content-supply">
          {loading ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-muted-fg, #64748b)', fontSize: 13.5 }}>
              Loading billing and receipt details...
            </div>
          ) : isDischarged || receipt ? (
            <>
              {/* Official Receipt Header Banner */}
              <div className="pd-receipt-hero">
                <div className="pd-receipt-top">
                  <div>
                    <div className="pd-receipt-org">{organizationName}</div>
                    <div className="pd-receipt-subtitle">
                      Official Inpatient Settlement Receipt • Department of {row.department || 'Medicine'}
                    </div>
                  </div>
                  <div className="pd-receipt-badge-col">
                    <span className="pd-receipt-status-pill">PAID IN FULL</span>
                    <span className="pd-receipt-number">{receiptNumber}</span>
                  </div>
                </div>

                <div className="pd-receipt-meta-grid">
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Patient Name</span>
                    <span className="pd-receipt-meta-val">{row.patientName}</span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Patient UHID</span>
                    <span className="pd-receipt-meta-val">{row.patientUhid}</span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Payment Mode</span>
                    <span className="pd-receipt-meta-val">{paymentMode}</span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Settlement Date</span>
                    <span className="pd-receipt-meta-val">{formatDate(transactionDate)}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Services Breakdown Table */}
              <div className="pd-table-box">
                <div className="pd-table-header">
                  <h4 className="pd-table-title">Itemized Services & Hospital Charges</h4>
                  <span style={{ fontSize: 12, color: 'var(--color-muted-fg, #64748b)', fontWeight: 500 }}>
                    {entries.length} Line {entries.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <div className="pd-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Service / Procedure</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Rate</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody id="pd-charges-tbody">
                      {entries.length === 0 ? (
                        <EmptyState asTableRow colSpan={5} title="No itemized service charges recorded." />
                      ) : (
                        entries.map((e) => {
                          const svc = servicesById[e.service_id];
                          const qty = e.quantity || 1;
                          const rate = e.unit_price || (e.amount / qty);
                          return (
                            <tr key={e.entry_id || `${e.service_id}-${e.amount}`}>
                              <td style={{ fontWeight: 600, color: 'var(--color-fg, #0f172a)' }}>
                                {svc?.service_name || `Service #${e.service_id}`}
                              </td>
                              <td style={{ color: 'var(--color-muted-fg, #64748b)' }}>
                                {svc?.category || 'General'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 500 }}>{qty}</td>
                              <td style={{ textAlign: 'right', color: 'var(--color-muted-fg, #64748b)' }}>
                                {formatCurrency(rate)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-fg, #0f172a)' }}>
                                {formatCurrency(e.amount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown Card */}
              <div className="pd-totals-card">
                <div className="pd-totals-left">
                  <p className="pd-totals-note">
                    Ledger Status: <strong>{billingBundle?.ledger?.status || 'PAID'}</strong> • Finance Verification Complete
                  </p>
                  <p className="pd-totals-note" style={{ fontSize: 11.5 }}>
                    Bed allocated: {row.bedNumber} • Attending: {row.doctorName}
                  </p>
                </div>
                <div className="pd-totals-right">
                  <div className="pd-totals-row">
                    <span>Gross Charges</span>
                    <span>{formatCurrency(grossTotal)}</span>
                  </div>
                  {deduction > 0 ? (
                    <div className="pd-totals-row">
                      <span>Insurance / Coverage</span>
                      <span>− {formatCurrency(deduction)}</span>
                    </div>
                  ) : null}
                  <div className="pd-totals-row grand-total">
                    <span>Net Paid</span>
                    <span className="amount">{formatCurrency(paidAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Active / Running Ledger View for Inpatient */}
              <div className="pd-receipt-hero" style={{ borderColor: '#cbd5e1' }}>
                <div className="pd-receipt-top">
                  <div>
                    <div className="pd-receipt-org">{organizationName}</div>
                    <div className="pd-receipt-subtitle">
                      Active Inpatient Care Ledger • Department of {row.department || 'Medicine'}
                    </div>
                  </div>
                  <div className="pd-receipt-badge-col">
                    <span className="pd-receipt-status-pill open">
                      {billingBundle?.ledger?.status || 'OPEN'}
                    </span>
                    <span className="pd-receipt-number">{receiptNumber}</span>
                  </div>
                </div>

                <div className="pd-receipt-meta-grid">
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Patient Name</span>
                    <span className="pd-receipt-meta-val">{row.patientName}</span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Assigned Bed</span>
                    <span className="pd-receipt-meta-val">{row.bedNumber}</span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Ledger State</span>
                    <span className="pd-receipt-meta-val">
                      {row.billsCleared ? 'Finance Cleared' : 'Running Charges'}
                    </span>
                  </div>
                  <div className="pd-receipt-meta-item">
                    <span className="pd-receipt-meta-label">Current Total</span>
                    <span className="pd-receipt-meta-val" style={{ color: 'var(--primary, #6750a4)' }}>
                      {formatCurrency(grossTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Inpatient Services Table */}
              <div className="pd-table-box">
                <div className="pd-table-header">
                  <h4 className="pd-table-title">Inpatient Ledger Charges Posted</h4>
                  <span style={{ fontSize: 12, color: 'var(--color-muted-fg, #64748b)', fontWeight: 500 }}>
                    {entries.length} Line {entries.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <div className="pd-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Service / Procedure</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Rate</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody id="pd-charges-tbody">
                      {entries.length === 0 ? (
                        <EmptyState asTableRow colSpan={5} title="No billing ledger charges recorded yet." />
                      ) : (
                        entries.map((e) => {
                          const svc = servicesById[e.service_id];
                          const qty = e.quantity || 1;
                          const rate = e.unit_price || (e.amount / qty);
                          return (
                            <tr key={e.entry_id || `${e.service_id}-${e.amount}`}>
                              <td style={{ fontWeight: 600, color: 'var(--color-fg, #0f172a)' }}>
                                {svc?.service_name || `Service #${e.service_id}`}
                              </td>
                              <td style={{ color: 'var(--color-muted-fg, #64748b)' }}>
                                {svc?.category || 'General'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 500 }}>{qty}</td>
                              <td style={{ textAlign: 'right', color: 'var(--color-muted-fg, #64748b)' }}>
                                {formatCurrency(rate)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-fg, #0f172a)' }}>
                                {formatCurrency(e.amount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Card */}
              <div className="pd-totals-card">
                <div className="pd-totals-left">
                  <p className="pd-totals-note">
                    {row.billsCleared
                      ? 'Pre-discharge financial clearance complete. Finance has verified all charges.'
                      : 'Charges posted by nursing and pharmacy. Official settlement will be generated upon discharge.'}
                  </p>
                </div>
                <div className="pd-totals-right">
                  <div className="pd-totals-row grand-total">
                    <span>Total Accrued</span>
                    <span className="amount">{formatCurrency(grossTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
