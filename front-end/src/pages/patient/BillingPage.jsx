'use strict';

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast, selectOne } from '../../components/feedback/feedback.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import BillDetailsModal from './BillDetailsModal.jsx';
import { openInvoiceDigitalCopy, openBillingDigitalCopy } from './patientDocumentCopy.js';
import { formatINR, formatDDMMYYYY } from './patientStoreShape.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientBillingCss from '../../styles/patient/patient-billing.css?inline';

const TABS = [
  { id: 'invoices', label: 'Itemized Invoices' },
  { id: 'receipts', label: 'Payment Receipts' },
  { id: 'insurance', label: 'Insurance & Co-Pay' },
];

export default function BillingPage() {
  usePageStyles(patientBillingCss);
  useDocumentTitle('My Bills & Receipts – Federico Hospital Portal');
  const { profile, bills, visits, appointments, billingSections, getBillingDocumentByRef, payBill } =
    usePatientStore();
  const ins = profile?.insurance;

  const [activeTab, setActiveTab] = useState('invoices');
  const [detailBill, setDetailBill] = useState(null);
  const [payingLedger, setPayingLedger] = useState(null);

  // ?bill=<id> opens invoice directly from dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const billList = Array.isArray(bills) ? bills : [];
  const linkedBill = billList.find((b) => b.id === searchParams.get('bill')) || null;
  const shownBill = detailBill || linkedBill;

  function closeDetail() {
    setDetailBill(null);
    if (searchParams.has('bill')) setSearchParams({}, { replace: true });
  }

  const receipts = billingSections?.receipts || [];

  const totalBilled = billList.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const totalCovered = billList.reduce((sum, b) => sum + Number(b.insuranceCovered || 0), 0);
  const paidTotal = billList
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.youPay || 0), 0);
  const pendingBills = billList.filter((b) => b.status !== 'paid');
  const pendingTotal = pendingBills.reduce((sum, b) => sum + Number(b.youPay || 0), 0);

  const completedVisitsCount = (visits || []).length;
  const concludedApptsCount = (appointments || []).filter(
    (a) =>
      ['completed', 'discharged'].includes(String(a.status || '').toLowerCase()) ||
      ['COMPLETED', 'DISCHARGED', 'CONSULTATION_DONE'].includes(String(a.rawStatus || '').toUpperCase()),
  ).length;
  const careInteractionsCount = completedVisitsCount + concludedApptsCount;

  async function selectPaymentMethod(amount) {
    return selectOne({
      title: 'Pay ' + formatINR(amount),
      options: ['UPI', 'CARD', 'NETBANKING', 'CASH'],
    });
  }

  async function payNow(bill) {
    const method = await selectPaymentMethod(bill.youPay);
    if (!method) return;

    setPayingLedger(bill.ledgerId);
    try {
      await payBill(bill, method);
      toast('Payment successful! Receipt has been generated.', 'success');
      setActiveTab('receipts');
    } catch (err) {
      toast(err?.message || 'Payment processing failed.', 'warning');
    } finally {
      setPayingLedger(null);
    }
  }

  function printInvoice(bill) {
    if (!openInvoiceDigitalCopy(bill, profile)) {
      toast('Please allow popups to view digital copy.', 'warning');
    }
  }

  function viewReceipt(row) {
    const sourceType = row.sourceType || 'RECEIPT';
    const sourceId = String(row.sourceId || '');
    const record = getBillingDocumentByRef(sourceType, sourceId);
    const opened = openBillingDigitalCopy(
      record || {
        gross_amount: row.amount,
        amount: row.amount,
        payment_mode: row.mode || 'UPI',
        status: 'PAID',
        sourceId: row.sourceId,
      },
      { rowType: 'RECEIPT', rowTitle: row.title || `Receipt #${row.sourceId}`, sourceType, sourceId },
      profile,
    );
    if (!opened) toast('Please allow popups to view digital copy.', 'warning');
  }

  return (
    <>
      <main className="billing-page">
        <PageHeader
          title="My Bills & Receipts"
          subtitle="Review your itemized hospital bills, make secure online payments, track official receipts, and access insurance coverage details."
        />

        <section className="kpi-grid">
          <StatCard
            label="Total Billed"
            value={formatINR(totalBilled)}
            sub={
              totalCovered > 0
                ? `${formatINR(totalCovered)} covered by insurance`
                : `${billList.length} itemized invoice${billList.length !== 1 ? 's' : ''}`
            }
          />
          <StatCard
            label="Paid Amount"
            value={formatINR(paidTotal)}
            sub={`${receipts.length} payment receipt${receipts.length !== 1 ? 's' : ''}`}
            variant="success"
          />
          <StatCard
            label="Outstanding Balance"
            value={formatINR(pendingTotal)}
            sub={`${pendingBills.length} pending payment${pendingBills.length !== 1 ? 's' : ''}`}
            variant={pendingTotal > 0 ? 'error' : 'success'}
          />
          <StatCard
            label="Care Interactions"
            value={String(careInteractionsCount)}
            sub={
              careInteractionsCount === 0
                ? 'No past encounters'
                : `${completedVisitsCount} stay${completedVisitsCount !== 1 ? 's' : ''}, ${concludedApptsCount} consultation${concludedApptsCount !== 1 ? 's' : ''}`
            }
            variant="primary"
          />
        </section>

        {/* Dynamic Insurance Banner */}
        <div className="insurance-banner" id="insurance-banner">
          <div className="ins-left">
            <span
              className="ins-badge"
              id="ins-status-badge"
              style={
                ins?.hasInsurance
                  ? undefined
                  : { background: 'var(--md-surface-container-low)', color: 'var(--muted)' }
              }
            >
              {ins?.hasInsurance ? (ins.verified ? 'Verified Active' : 'Active Policy') : 'Self Pay'}
            </span>
            <div>
              <strong id="ins-provider-name">
                {ins?.hasInsurance ? ins.provider : 'Self Pay (No Active Insurance)'}
              </strong>
              <p id="ins-policy-meta">
                {ins?.hasInsurance
                  ? `Policy #${ins.policyNumber || 'N/A'}${ins.memberId ? ` · Member ID: ${ins.memberId}` : ''}`
                  : 'Add your health insurance policy in My Profile for instant cashless claims.'}
              </p>
            </div>
          </div>
          <div className="ins-breakdown">
            <div className="ins-item">
              <span>Coverage Type</span>
              <strong id="ins-coverage-type">
                {ins?.hasInsurance ? `${ins.coverageType} Coverage` : 'Self Sponsored'}
              </strong>
            </div>
            <div className="ins-item">
              <span>Coverage Limit</span>
              <strong id="ins-coverage-limit">
                {ins?.hasInsurance ? formatINR(ins.coverage) : '₹0'}
              </strong>
            </div>
            <div className="ins-item">
              <span>Valid Till</span>
              <strong id="ins-valid-till">
                {ins?.hasInsurance ? ins.validTo || 'N/A' : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        <section className="bills-section">
          <div className="bills-header">
            <h2>Financial Hub</h2>
            <TabNav
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="pills"
            />
          </div>

          {/* TAB 1: Itemized Invoices */}
          {activeTab === 'invoices' ? (
            <div id="section-invoices" className="billing-section billing-list">
              {bills.length === 0 ? (
                <EmptyState
                  title="No hospital invoices generated yet"
                  message="Active or discharged hospital bills will appear here."
                />
              ) : (
                bills.map((bill) => {
                  const isPaid = bill.status === 'paid';
                  return (
                    <div className="billing-row" key={bill.id}>
                      <div className="billing-row-main">
                        <div className="billing-row-title">
                          <strong>Invoice {bill.billNo || '#' + bill.ledgerId}</strong>
                          {isPaid ? (
                            <span className="status paid">Paid</span>
                          ) : bill.status === 'partial' ? (
                            <span className="status pending">Partially paid</span>
                          ) : bill.hasDischargeSummary ? (
                            <span className="status pending">Payable</span>
                          ) : (
                            <span className="status info">Interim Statement</span>
                          )}
                        </div>
                        <span className="billing-row-date">
                          {bill.date || 'N/A'} · {bill.description || 'Hospital Care'}
                        </span>
                        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          {bill.items ? bill.items.length + ' itemized services' : ''} (Gross: {formatINR(bill.total)}
                          {bill.insuranceCovered
                            ? ' · Ins. Covered: ' + formatINR(bill.insuranceCovered)
                            : ''}
                          )
                        </small>
                        {!isPaid && !bill.hasDischargeSummary ? (
                          <div style={{ color: 'var(--primary)', fontSize: '11px', marginTop: '2px' }}>
                            Daily interim statement · Final payment clears after discharge
                          </div>
                        ) : null}
                      </div>
                      <div className="billing-row-meta">
                        <div style={{ textAlign: 'right' }}>
                          <small
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'var(--muted)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Net Payable
                          </small>
                          <strong className="billing-row-amount">
                            {formatINR(bill.youPay)}
                          </strong>
                        </div>
                        <div className="billing-row-actions">
                          <button className="btn-view" type="button" onClick={() => setDetailBill(bill)}>
                            View Details
                          </button>
                          {isPaid ? (
                            <>
                              <button
                                className="btn-download"
                                type="button"
                                onClick={() => printInvoice(bill)}
                              >
                                Download Invoice
                              </button>
                              <button
                                className="btn-view"
                                type="button"
                                onClick={() => setActiveTab('receipts')}
                              >
                                View Receipt
                              </button>
                            </>
                          ) : bill.hasDischargeSummary ? (
                            <button
                              className="btn-view"
                              type="button"
                              disabled={payingLedger === bill.ledgerId}
                              onClick={() => payNow(bill)}
                            >
                              {payingLedger === bill.ledgerId ? 'Processing...' : 'Pay Now'}
                            </button>
                          ) : (
                            <button
                              className="btn-view"
                              type="button"
                              disabled
                              style={{
                                opacity: 0.6,
                                cursor: 'not-allowed',
                                background: 'var(--muted)',
                              }}
                              title="Daily interim statement. Online payment unlocks when the hospital issues the final discharge summary."
                            >
                              Interim Bill
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {/* TAB 2: Payment Receipts */}
          {activeTab === 'receipts' ? (
            <div id="section-receipts" className="billing-section billing-list">
              {receipts.length === 0 ? (
                <EmptyState
                  title="No payment receipts found"
                  message="Receipts are generated immediately after a successful bill payment."
                />
              ) : (
                receipts.map((row) => (
                  <div className="billing-row" key={row.id}>
                    <div className="billing-row-main">
                      <div className="billing-row-title">
                        <strong>{row.title || `Receipt #${row.sourceId}`}</strong>
                        <span className="status paid">Paid &amp; Cleared</span>
                      </div>
                      <span className="billing-row-date">
                        {formatDDMMYYYY(row.createdAt)} · Payment via {String(row.mode || 'UPI').toUpperCase()}
                      </span>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Official Hospital Payment Voucher · Reference: REC-{row.sourceId}
                      </small>
                    </div>
                    <div className="billing-row-meta">
                      <div style={{ textAlign: 'right' }}>
                        <small
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Paid Amount
                        </small>
                        <strong className="billing-row-amount" style={{ color: '#16a34a' }}>
                          {formatINR(row.amount)}
                        </strong>
                      </div>
                      <div className="billing-row-actions">
                        <button className="btn-download" type="button" onClick={() => viewReceipt(row)}>
                          View Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {/* TAB 3: Insurance & Co-Pay Breakdown */}
          {activeTab === 'insurance' ? (
            <div id="section-insurance" className="billing-section">
              <div
                style={{
                  background: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    paddingBottom: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                      Health Insurance Coverage &amp; Co-Pay Policy
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--muted, #64748b)', marginTop: '2px' }}>
                      Detailed policy coverage, patient co-pay percentage, and cashless settlement terms.
                    </p>
                  </div>
                  <span
                    className="ins-badge"
                    style={{
                      background: ins?.hasInsurance ? '#ecfdf5' : '#f1f5f9',
                      color: ins?.hasInsurance ? '#065f46' : '#64748b',
                      border: ins?.hasInsurance ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {ins?.hasInsurance ? (ins.verified ? 'Verified Active Policy' : 'Active Policy') : 'Self Pay'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Insurance Provider
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.hasInsurance ? ins.provider : 'Self Pay'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Policy Number
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.policyNumber || 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Member ID
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.memberId || 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Coverage Limit
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.hasInsurance ? formatINR(ins.coverage) : '₹0'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Patient Co-Pay
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.hasInsurance ? `${ins.copayPercentage || 0}%` : '100% (Self)'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Valid Till
                    </span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>
                      {ins?.validTo || 'N/A'}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: '#166534',
                  }}
                >
                  {ins?.hasInsurance
                    ? 'Your insurance covers approved inpatient and consultation charges. Co-pay deductions are calculated automatically at checkout.'
                    : 'No health insurance is registered. You can add or update your health insurance policy anytime from your Profile.'}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <BillDetailsModal
        open={Boolean(shownBill)}
        bill={shownBill}
        onClose={closeDetail}
        onPrint={printInvoice}
        onPay={(bill) => {
          closeDetail();
          payNow(bill);
        }}
      />
    </>
  );
}
