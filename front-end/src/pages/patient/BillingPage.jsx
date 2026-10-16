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
import DocumentRow from './DocumentRow.jsx';
import BillDetailsModal from './BillDetailsModal.jsx';
import { openInvoiceDigitalCopy, openBillingDigitalCopy } from './patientInvoiceCopy.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientBillingCss from '../../styles/patient/patient-billing.css?inline';

const TABS = [
  { id: 'invoices', label: 'Itemized Invoices' },
  { id: 'receipts', label: 'Payment Receipts' },
  { id: 'discharge', label: 'Discharge Summaries' },
  { id: 'eod', label: 'EOD Bills' },
];

function EmptySection({ message }) {
  return <EmptyState icon={null} title={message} />;
}

export default function BillingPage() {
  usePageStyles(patientBillingCss);
  useDocumentTitle('My Bills & Receipts – Federico Hospital Portal');
  const { profile, bills, visits, billingSections, getBillingDocumentByRef, payBill } =
    usePatientStore();
  const ins = profile?.insurance;

  const [activeTab, setActiveTab] = useState('invoices');
  const [detailBill, setDetailBill] = useState(null);
  const [payingLedger, setPayingLedger] = useState(null);

  // ?bill=<id> (from the dashboard's Bill Summary) opens that invoice directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedBill = bills.find((b) => b.id === searchParams.get('bill')) || null;
  const shownBill = detailBill || linkedBill;

  function closeDetail() {
    setDetailBill(null);
    if (searchParams.has('bill')) setSearchParams({}, { replace: true });
  }

  const receipts = billingSections.receipts || [];
  const discharge = billingSections.discharge || [];
  const eod = billingSections.eod || [];

  const totalBilled = bills.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const paidTotal = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.youPay || 0), 0);
  const pendingTotal = bills
    .filter((b) => b.status !== 'paid')
    .reduce((sum, b) => sum + Number(b.youPay || 0), 0);

  async function selectPaymentMethod(amount) {
    return selectOne({
      title: 'Pay ₹' + Number(amount || 0).toLocaleString('en-IN'),
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

  function viewDocument(row) {
    const sourceType = row.sourceType || '';
    const sourceId = String(row.sourceId || '');
    if (!sourceType || !sourceId) {
      toast('Document source not available.', 'warning');
      return;
    }
    const record = getBillingDocumentByRef(sourceType, sourceId);
    if (!record) {
      toast('Unable to open digital copy.', 'warning');
      return;
    }
    const opened = openBillingDigitalCopy(
      record,
      { rowType: row.type || '', rowTitle: row.title || 'Digital Copy', sourceType, sourceId },
      profile,
    );
    if (!opened) toast('Please allow popups to view digital copy.', 'warning');
  }

  return (
    <>
      <main className="billing-page">
        <PageHeader
          title="My Bills & Invoices"
          subtitle="Review your itemized hospital bills, make secure online payments, track official receipts, and access discharge financial records."
        />

        <section className="kpi-grid">
          <StatCard
            label="Total Billed"
            value={`₹${totalBilled.toLocaleString('en-IN')}`}
            sub={`${bills.length} itemized invoices`}
          />
          <StatCard
            label="Paid Amount"
            value={`₹${paidTotal.toLocaleString('en-IN')}`}
            sub={`${receipts.filter((row) => row.type === 'RECEIPT').length} receipts`}
            variant="success"
          />
          <StatCard
            label="Outstanding Balance"
            value={`₹${pendingTotal.toLocaleString('en-IN')}`}
            sub={`${bills.filter((b) => b.status !== 'paid').length} pending payments`}
            variant="error"
          />
          <StatCard
            label="Care Interactions"
            value={String((visits || []).length || bills.length || 0)}
            sub="Visits & admissions"
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
                {ins?.hasInsurance ? `₹${Number(ins.coverage || 0).toLocaleString('en-IN')}` : '₹0'}
              </strong>
            </div>
            <div className="ins-item">
              <span>Valid Till</span>
              <strong id="ins-valid-till">
                {ins?.hasInsurance ? (ins.validTo || 'N/A') : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        <section className="bills-section">
          <div className="bills-header">
            <h2>Financial Documents</h2>
            <TabNav
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="pills"
            />
          </div>

          <div
            id="section-invoices"
            className={
              'billing-section' +
              (bills.length ? ' billing-list' : '') +
              (activeTab === 'invoices' ? '' : ' hidden')
            }
          >
            {bills.length === 0 ? (
              <EmptySection message="No hospital invoices generated yet." />
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
                        ) : bill.hasDischargeSummary ? (
                          <span className="status pending">Payable</span>
                        ) : (
                          <span className="status info">Interim EOD</span>
                        )}
                      </div>
                      <span className="billing-row-date">
                        {bill.date || 'N/A'} · {bill.description || 'Hospital Care'}
                      </span>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        {bill.items ? bill.items.length + ' itemized services' : ''} (Gross: ₹
                        {Number(bill.total || 0).toLocaleString('en-IN')}
                        {bill.insuranceCovered
                          ? ' · Ins. Covered: ₹' + Number(bill.insuranceCovered).toLocaleString('en-IN')
                          : ''}
                        )
                      </small>
                      {!isPaid && !bill.hasDischargeSummary ? (
                        <div style={{ color: 'var(--primary)', fontSize: '11px', marginTop: '2px' }}>
                          Daily interim statement · Payment opens upon final discharge summary
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
                          ₹{Number(bill.youPay || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="billing-row-actions">
                        <button className="btn-view" type="button" onClick={() => setDetailBill(bill)}>
                          View Details
                        </button>
                        {isPaid ? (
                          <button
                            className="btn-download"
                            type="button"
                            onClick={() => printInvoice(bill)}
                          >
                            Digital Copy
                          </button>
                        ) : bill.hasDischargeSummary ? (
                          <button
                            className="btn-view"
                            type="button"
                            disabled={payingLedger === bill.ledgerId}
                            onClick={() => payNow(bill)}
                          >
                            Pay Now
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
                            title="Daily interim statement. Online payment unlocks when the hospital sends the final Discharge Summary."
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

          <div
            id="section-receipts"
            className={
              'billing-section' +
              (receipts.length ? ' billing-list' : '') +
              (activeTab === 'receipts' ? '' : ' hidden')
            }
          >
            {receipts.length === 0 ? (
              <EmptySection message="No payment receipts available." />
            ) : (
              receipts.map((row) => (
                <DocumentRow
                  key={row.id}
                  row={row}
                  statusChip={<span className="status confirmed">Receipt</span>}
                  onView={viewDocument}
                />
              ))
            )}
          </div>

          <div
            id="section-discharge"
            className={
              'billing-section' +
              (discharge.length ? ' billing-list' : '') +
              (activeTab === 'discharge' ? '' : ' hidden')
            }
          >
            {discharge.length === 0 ? (
              <EmptySection message="No discharge summaries available." />
            ) : (
              discharge.map((row) => (
                <DocumentRow
                  key={row.id}
                  row={row}
                  statusChip={<span className="status confirmed">Completed</span>}
                  onView={viewDocument}
                />
              ))
            )}
          </div>

          <div
            id="section-eod"
            className={
              'billing-section' +
              (eod.length ? ' billing-list' : '') +
              (activeTab === 'eod' ? '' : ' hidden')
            }
          >
            {eod.length === 0 ? (
              <EmptySection message="No EOD bills available." />
            ) : (
              eod.map((row) => (
                <DocumentRow
                  key={row.id}
                  row={row}
                  statusChip={<span className="status confirmed">Statement</span>}
                  onView={viewDocument}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <BillDetailsModal
        open={Boolean(shownBill)}
        bill={shownBill}
        onClose={closeDetail}
        onPrint={printInvoice}
        onPay={(bill) => {
          // openBillModal()'s Pay handler closes the dialog before asking for
          // the payment method.
          closeDetail();
          payNow(bill);
        }}
      />
    </>
  );
}
