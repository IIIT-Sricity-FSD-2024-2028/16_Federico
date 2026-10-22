'use strict';

import DialogShell from '../../components/layout/DialogShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatINR } from './patientStoreShape.js';

/**
 * Itemized invoice modal for one bill.
 */
export default function BillDetailsModal({ open, onClose, bill, onPay, onPrint }) {
  if (!bill) return null;

  const isPaid = bill.status === 'paid';
  const statusText = isPaid
    ? 'PAID'
    : bill.status === 'partial'
      ? 'PARTIALLY PAID'
    : bill.hasDischargeSummary
      ? 'PENDING PAYMENT (DISCHARGED)'
      : 'INTERIM EOD STATEMENT';
  const statusColor = isPaid
    ? 'var(--success)'
    : bill.hasDischargeSummary
      ? 'var(--warn)'
      : 'var(--muted)';

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Itemized Invoice Details"
      subtitle={`Invoice ${bill.billNo || '#' + bill.ledgerId}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
          <button
            className="btn-secondary"
            type="button"
            id="modal-btn-print"
            onClick={() => onPrint(bill)}
          >
            Print / Download
          </button>
          {isPaid ? null : !bill.hasDischargeSummary ? (
            <button
              className="btn-primary"
              type="button"
              id="modal-btn-pay"
              disabled
              style={{ opacity: '0.6', cursor: 'not-allowed' }}
            >
              Payment Opens on Discharge
            </button>
          ) : (
            <button
              className="btn-primary"
              type="button"
              id="modal-btn-pay"
              onClick={() => onPay(bill)}
            >
              Pay Now
            </button>
          )}
        </div>
      }
    >
      <div className="modal-meta-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="modal-meta">
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Invoice No</span>
          <strong id="modal-invoice-no">{bill.billNo || '#' + bill.ledgerId}</strong>
        </div>
        <div className="modal-meta">
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Admission</span>
          <strong id="modal-admission-id">
            {bill.admissionId ? '#' + bill.admissionId : 'N/A'}
          </strong>
        </div>
        <div className="modal-meta">
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Billing Date</span>
          <strong id="modal-bill-date">{bill.date || 'N/A'}</strong>
        </div>
        <div className="modal-meta">
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Status</span>
          <strong id="modal-bill-status" style={{ color: statusColor }}>
            {statusText}
          </strong>
        </div>
      </div>

      <div className="table-wrap itemized-table">
        <table>
          <thead>
            <tr>
              <th>Service / Item</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody id="modal-items-tbody">
            {bill.items && bill.items.length ? (
              bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{item.name || 'Hospital Service'}</strong>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.qty || 1}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatINR(item.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatINR(item.total)}
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState asTableRow colSpan={4} title="No line items recorded." />
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3">Gross Total</td>
              <td style={{ textAlign: 'right' }} id="modal-gross-total">
                {formatINR(bill.total)}
              </td>
            </tr>
            <tr className="ins-row">
              <td colSpan="3">Insurance Covered Amount</td>
              <td style={{ textAlign: 'right' }} id="modal-ins-deduction">
                -{formatINR(bill.insuranceCovered)}
              </td>
            </tr>
            <tr className="total-row">
              <td colSpan="3">Net Patient Share (You Pay)</td>
              <td style={{ textAlign: 'right' }} id="modal-net-payable">
                {formatINR(bill.patientShare ?? bill.youPay)}
              </td>
            </tr>
            {bill.paidAmount > 0 ? (
              <tr>
                <td colSpan="3">Payments Received</td>
                <td style={{ textAlign: 'right' }} id="modal-paid-amount">
                  -{formatINR(bill.paidAmount)}
                </td>
              </tr>
            ) : null}
            {bill.paidAmount > 0 ? (
              <tr className="total-row">
                <td colSpan="3">Balance Due</td>
                <td style={{ textAlign: 'right' }} id="modal-balance-due">
                  {formatINR(bill.youPay)}
                </td>
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>
    </DialogShell>
  );
}
