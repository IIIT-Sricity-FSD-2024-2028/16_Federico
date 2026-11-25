'use strict';

import { useMemo } from 'react';

import { usePolling } from '../../hooks/usePolling.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSearchParam } from '../../hooks/useSearchParam.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { csvEscape, downloadCsv } from '../../lib/csv.js';
import { toast } from '../../components/feedback/feedback.js';
import { statusLabel, statusVariant, daysSince, formatDate, joinPreRequestsWithPatients } from './homHelpers.js';
import PatientDetailModal from './PatientDetailModal.jsx';
import DischargeModal from './DischargeModal.jsx';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientFlowCss from '../../styles/hom/patient-flow.css?inline';
import { useAppSelector, useLoader, useUiState } from '../../store/hooks.js';
import { loadHomPatientFlow } from '../../store/pageLoaders.js';
import { selectBeds } from '../../store/slices/wardsSlice.js';
import { selectPatients } from '../../store/slices/patientsSlice.js';
import { selectPreRequests } from '../../store/slices/preRequestsSlice.js';
import { selectDoctors } from '../../store/slices/doctorsSlice.js';
import { selectAdmissions } from '../../store/slices/admissionsSlice.js';
import { selectLedgers } from '../../store/slices/billingSlice.js';

const FLOW_STATUSES = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED', 'DISCHARGED'];

/** Ported from HOM/screen-03-patient-flow.html + patient-flow.js. */
export default function PatientFlowPage() {
  usePageStyles(patientFlowCss);
  useDocumentTitle('Patient Flow | Federico Hospital HOM');
  const uhidParam = useSearchParam('uhid');

  const [filters, setFilters] = useUiState('PatientFlowPage.filters', { search: uhidParam || '', department: '', status: '', dateRange: '' });
  const [detail, setDetail] = useUiState('PatientFlowPage.detail', null); // { id, tab }
  const [dischargeId, setDischargeId] = useUiState('PatientFlowPage.dischargeId', null);

  const { reload, loaded } = useLoader(loadHomPatientFlow);
  const preRequestList = useAppSelector(selectPreRequests);
  const patientList = useAppSelector(selectPatients);
  const doctorList = useAppSelector(selectDoctors);
  const bedList = useAppSelector(selectBeds);
  const admissionList = useAppSelector(selectAdmissions);
  const ledgerList = useAppSelector(selectLedgers);

  // The joined flow rows are derived from the slices, not stored.
  const rows = useMemo(() => {
    const doctorsById = {};
    (Array.isArray(doctorList) ? doctorList : []).forEach((d) => (doctorsById[d.doctor_id] = d));
    const bedsById = {};
    (Array.isArray(bedList) ? bedList : []).forEach((b) => (bedsById[b.bed_id] = b));

    // "Bills cleared" is Finance's signal that the patient is financially clear:
    // their active admission has a PAID ledger. HOM watches it so it knows PRE
    // can safely release the bed.
    const ledgerByAdmission = {};
    (Array.isArray(ledgerList) ? ledgerList : []).forEach((l) => (ledgerByAdmission[l.admission_id] = l));
    const billsClearedByPatient = {};
    (Array.isArray(admissionList) ? admissionList : []).forEach((a) => {
      const ledger = ledgerByAdmission[a.admission_id];
      if (a.receipt_sent_to_hom || (ledger && ledger.status === 'PAID')) {
        billsClearedByPatient[a.patient_id] = true;
      }
    });

    return joinPreRequestsWithPatients(
      (Array.isArray(preRequestList) ? preRequestList : []).filter((r) => FLOW_STATUSES.includes(r.status)),
      Array.isArray(patientList) ? patientList : [],
      doctorsById,
    ).map((r) => ({
      ...r,
      bedNumber: bedsById[r.bed_id]?.bed_number || '-',
      billsCleared: Boolean(billsClearedByPatient[r.patient_id]),
    }));
  }, [preRequestList, patientList, doctorList, bedList, admissionList, ledgerList]);

  usePolling(reload, 15000);

  const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))].sort();

  function matchesDateRange(row) {
    if (!filters.dateRange) return true;
    const days = daysSince(row.decided_at || row.created_at);
    switch (filters.dateRange) {
      case 'today': return days === 0;
      case 'last3': return days <= 3;
      case 'last7': return days <= 7;
      case 'older': return days > 7;
      default: return true;
    }
  }

  const q = filters.search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (filters.department && row.department !== filters.department) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (!matchesDateRange(row)) return false;
    if (!q) return true;
    return [row.patientUhid, row.patientName, row.department, row.bedNumber, row.doctorName]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const pending = rows.filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = rows.filter((r) => r.status === 'DISCHARGE_APPROVED');

  function exportCsv() {
    if (!filtered.length) {
      toast('There are no patient flow rows to export for the current filters.', 'warning');
      return;
    }
    const csv = [
      ['UHID', 'Patient', 'Department', 'Bed', 'Physician', 'Status', 'Days Stay'].join(','),
      ...filtered.map((r) =>
        [r.patientUhid, r.patientName, r.department, r.bedNumber, r.doctorName, statusLabel(r.status), daysSince(r.decided_at || r.created_at)]
          .map(csvEscape)
          .join(','),
      ),
    ].join('\n');
    downloadCsv('hom-patient-flow.csv', csv);
  }

  const queueRow = (row, actionCell) => (
    <tr key={row.pre_request_id}>
      <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{row.patientUhid}</td>
      <td>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.patientName}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.patientAge}</div>
      </td>
      <td>{row.department || 'General'}</td>
      <td style={{ fontWeight: 500 }}>{row.bedNumber}</td>
      <td>{row.doctorName}</td>
      <td>{formatDate(row.decided_at || row.created_at)}</td>
      <td>{daysSince(row.decided_at || row.created_at)} days</td>
      {actionCell}
    </tr>
  );

  return (
    <>
      <main className="dashboard-container">
        <PageHeader
          title="Patient Flow & Admissions"
          subtitle="Manage inpatient care paths and process PRE discharge clearances"
          actions={
            <button className="btn btn-secondary btn-default" id="patient-flow-export" onClick={exportCsv}>Export CSV</button>
          }
        />

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>Pending Discharge Clearances</h2>
              <p className="body-text" style={{ fontSize: 13, marginTop: 2 }}>Review and approve discharge requests submitted by PRE</p>
            </div>
            <span id="discharge-queue-badge">
              <Badge variant={pending.length ? 'warning' : 'success'}>
                {pending.length ? pending.length + ' Clearance Pending' : 'All Cleared'}
              </Badge>
            </span>
          </div>
          <div className="table-scroll-container" style={{ maxHeight: 280 }}>
            <table className="data-table">
              <thead>
                <tr><th>UHID</th><th>Patient</th><th>Department</th><th>Assigned Bed</th><th>Physician</th><th>Admitted</th><th>Days Stay</th><th>Action</th></tr>
              </thead>
              <tbody id="discharge-queue-tbody">
                {pending.length === 0 && approved.length === 0 ? (
                  <EmptyState
                    asTableRow
                    colSpan={8}
                    title="No pending discharge clearance requests"
                    message="All active inpatients are under ongoing ward care."
                  />
                ) : (
                  <>
                    {pending.map((row) =>
                      queueRow(row, (
                        <td>
                          <Button variant="primary" size="sm" onClick={() => setDischargeId(row.pre_request_id)}>
                            Approve Clearance
                          </Button>
                        </td>
                      )),
                    )}
                    {approved.map((row) =>
                      queueRow(row, (
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 500, color: row.billsCleared ? 'var(--status-success-fg, #1b5e20)' : 'var(--status-warning-fg, #7a5300)' }}>
                            {row.billsCleared ? 'Bills cleared · PRE can release bed' : 'Awaiting Finance payment'}
                          </span>
                        </td>
                      )),
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--md-surface-container)' }}>
            <h2 className="h2" style={{ fontSize: 18 }}>Inpatient &amp; Admissions Registry</h2>
          </div>

          <SearchToolbar
            searchQuery={filters.search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="Search by UHID, patient, bed, doctor..."
            filters={[
              {
                id: 'department',
                value: filters.department,
                onChange: (v) => setFilters((f) => ({ ...f, department: v })),
                options: [
                  { value: '', label: 'All Departments' },
                  ...departments.map((d) => ({ value: d, label: d })),
                ],
              },
              {
                id: 'status',
                value: filters.status,
                onChange: (v) => setFilters((f) => ({ ...f, status: v })),
                options: [
                  { value: '', label: 'All Care Statuses' },
                  { value: 'ADMITTED', label: 'Admitted / Active' },
                  { value: 'DISCHARGE_REQUESTED', label: 'Discharge Requested' },
                  { value: 'DISCHARGE_APPROVED', label: 'Discharge Approved' },
                  { value: 'DISCHARGED', label: 'Discharged' },
                ],
              },
              {
                id: 'dateRange',
                value: filters.dateRange,
                onChange: (v) => setFilters((f) => ({ ...f, dateRange: v })),
                options: [
                  { value: '', label: 'All Dates' },
                  { value: 'today', label: 'Admitted Today' },
                  { value: 'last3', label: 'Last 3 Days' },
                  { value: 'last7', label: 'Last 7 Days' },
                  { value: 'older', label: 'Older Than 7 Days' },
                ],
              },
            ]}
            actions={
              <button
                className="btn btn-outline btn-default"
                style={{ height: 44 }}
                id="patient-flow-clear"
                onClick={() => setFilters({ search: '', department: '', status: '', dateRange: '' })}
              >
                Clear Filters
              </button>
            }
          />

          <div className="table-scroll-container" style={{ maxHeight: 480, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>UHID</th><th>Patient</th><th>Department</th><th>Assigned Bed</th><th>Physician</th><th>Admitted</th><th>Days Stay</th><th>Care Status</th><th>Actions</th></tr>
              </thead>
              <tbody id="patients-table-body">
                {filtered.length === 0 ? (
                  <EmptyState
                    asTableRow
                    colSpan={9}
                    title="No patients match the selected filters"
                  />
                ) : (
                  filtered.map((row) => (
                    <tr key={row.pre_request_id}>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{row.patientUhid}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.patientName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{row.patientAge}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{row.department || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{row.bedNumber}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{row.doctorName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(row.decided_at || row.created_at)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{daysSince(row.decided_at || row.created_at)} days</td>
                      <td><Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="secondary" size="sm" onClick={() => setDetail({ id: row.pre_request_id, tab: 'overview' })}>View</Button>
                          {row.status === 'DISCHARGE_REQUESTED' ? (
                            <Button variant="primary" size="sm" onClick={() => setDischargeId(row.pre_request_id)}>Approve Discharge</Button>
                          ) : row.status === 'DISCHARGED' ? (
                            <Button variant="outline" size="sm" onClick={() => setDetail({ id: row.pre_request_id, tab: 'receipt' })}>
                              View Receipt
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--md-surface-container)' }}>
            <p className="text-small" id="patient-flow-count">
              {loaded ? 'Showing ' + filtered.length + ' patient' + (filtered.length === 1 ? '' : 's') : 'Loading patients...'}
            </p>
          </div>
        </div>
      </main>

      <PatientDetailModal
        key={detail ? 'detail-' + detail.id + '-' + detail.tab : 'detail-closed'}
        row={detail ? rows.find((r) => r.pre_request_id === detail.id) || null : null}
        initialTab={detail?.tab}
        onClose={() => setDetail(null)}
        onOpenDischarge={(id) => { setDetail(null); setDischargeId(id); }}
      />

      <DischargeModal
        key={'discharge-' + (dischargeId ?? 'closed')}
        row={rows.find((r) => r.pre_request_id === dischargeId) || null}
        onClose={() => setDischargeId(null)}
        onChanged={reload}
      />
    </>
  );
}

