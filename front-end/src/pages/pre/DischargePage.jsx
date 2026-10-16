'use strict';

import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, statusLabel, formatDate, to12Hour } from './preHelpers.js';

export default function DischargePage() {
  useDocumentTitle('Discharge Requests');
  const [finalizingId, setFinalizingId] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const { data, loading, error, reload } = useApi(async () => {
    const [preRequests, patients, doctors, beds, admissions, ledgers] = await Promise.all([
      api.preRequests.list(),
      api.patients.list(),
      api.doctors.list(),
      api.wards.beds(),
      api.admissions.list().catch(() => []),
      api.billing.ledger.listAll().catch(() => []),
    ]);

    const doctorsById = {};
    doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
    const bedsById = {};
    beds.forEach((b) => (bedsById[b.bed_id] = b));

    const ledgerByAdmission = {};
    (Array.isArray(ledgers) ? ledgers : []).forEach((l) => (ledgerByAdmission[l.admission_id] = l));
    const billsClearedByPatient = {};
    (Array.isArray(admissions) ? admissions : []).forEach((a) => {
      // Focus on the patient's active admission so a historical paid admission does not falsely clear an unpaid current stay
      if (a.status !== 'DISCHARGED') {
        const ledger = ledgerByAdmission[a.admission_id];
        if (a.receipt_sent_to_hom || (ledger && ledger.status === 'PAID')) {
          billsClearedByPatient[a.patient_id] = true;
        }
      }
    });

    return joinPreRequestsWithPatients(preRequests, patients, doctorsById).map((r) => ({
      ...r,
      bedNumber: bedsById[r.bed_id]?.bed_number || '-',
      billsCleared: Boolean(billsClearedByPatient[r.patient_id]),
    }));
  }, []);

  const joined = data || [];
  const pending = joined.filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = joined.filter((r) => r.status === 'DISCHARGE_APPROVED');

  const tabs = [
    { id: 'requests', label: 'Discharge Requests', count: pending.length },
    { id: 'approved', label: 'Approved Discharges', count: approved.length },
  ];

  const departments = useMemo(() => {
    const depts = new Set();
    (data || []).forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [data]);

  const q = query.trim().toLowerCase();
  const filterRow = (r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (!q) return true;
    return (
      (r.patientUhid && r.patientUhid.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
      (r.bedNumber && r.bedNumber.toLowerCase().includes(q)) ||
      (r.hom_status && r.hom_status.toLowerCase().includes(q))
    );
  };

  const filteredPending = pending.filter(filterRow);
  const filteredApproved = approved.filter(filterRow);

  async function finalApprove(id) {
    setFinalizingId(id);
    try {
      await api.preRequests.update(id, { status: 'DISCHARGED' });
      toast('Discharge finalized — bed released.', 'success');
      await reload();
    } catch (err) {
      toast(err.message || 'Could not finalize discharge', 'error');
    } finally {
      setFinalizingId(null);
    }
  }

  const baseCells = (r) => (
    <>
      <td>{r.patientUhid}</td>
      <td>{r.patientName}</td>
      <td>{r.patientAge}</td>
      <td>{r.patientGender}</td>
      <td>{r.department}</td>
      <td>{r.doctorName}</td>
      <td>{formatDate(r.requested_date)}</td>
      <td>{to12Hour(r.requested_time) || '-'}</td>
      <td>{r.bedNumber}</td>
      <td>
        <Badge variant={r.status === 'DISCHARGE_APPROVED' ? 'success' : 'warning'}>
          {statusLabel(r.status)}
        </Badge>
      </td>
    </>
  );

  return (
    <div className="container">
      <PageHeader
        title="Discharge Requests & Clearance"
        subtitle="Review discharge clearance, coordinate with Operations, and finalize patient discharge processing"
      />
      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      <div style={{ marginTop: 16 }}>
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search by patient name, UHID, doctor, bed..."
          filters={
            departments.length > 0
              ? [
                  {
                    id: 'department',
                    value: deptFilter,
                    onChange: setDeptFilter,
                    options: [
                      { value: '', label: 'All Departments' },
                      ...departments.map((d) => ({ value: d, label: d })),
                    ],
                  },
                ]
              : []
          }
        />
      </div>

      {activeTab === 'requests' ? (
        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
              <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Bed No</th><th>Patient Status</th><th>HOM Status</th>
            </tr>
          </thead>
          <tbody id="dischargeTable">
            {loading ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading discharge requests…</td></tr>
            ) : error ? (
              <EmptyState asTableRow colSpan={11} icon={null} title="Failed to load discharge requests" message={error.message} />
            ) : pending.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={11}
                icon={null}
                title="No Pending Discharge Requests"
                message="No discharge requests are currently awaiting HOM coordination."
              />
            ) : filteredPending.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={11}
                icon={null}
                title="No Matching Discharge Requests"
                message="No discharge requests match your search criteria."
              />
            ) : (
              filteredPending.map((r) => (
                <tr key={r.pre_request_id}>
                  {baseCells(r)}
                  <td style={{ color: 'var(--status-warning-fg, #b45309)', fontWeight: 500 }}>{r.hom_status || 'Awaiting HOM'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
              <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Bed No</th><th>Patient Status</th><th>Clearance</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="approvedDischargeTable">
            {loading ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading approved discharges…</td></tr>
            ) : error ? (
              <EmptyState asTableRow colSpan={12} icon={null} title="Failed to load approved discharges" message={error.message} />
            ) : approved.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={12}
                icon={null}
                title="No Approved Discharge Requests"
                message="No patients are currently cleared and waiting for bed release."
              />
            ) : filteredApproved.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={12}
                icon={null}
                title="No Matching Approved Discharges"
                message="No approved discharges match your search criteria."
              />
            ) : (
              filteredApproved.map((r) => (
                <tr key={r.pre_request_id}>
                  {baseCells(r)}
                  {r.billsCleared ? (
                    <td style={{ color: 'var(--status-success, #15803d)', fontWeight: 600 }}>Bills cleared by Finance</td>
                  ) : (
                    <td style={{ color: 'var(--status-warning-fg, #b45309)', fontWeight: 600 }}>Awaiting Finance payment</td>
                  )}
                  <td>
                    {r.billsCleared ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="approve"
                        disabled={finalizingId === r.pre_request_id}
                        onClick={() => finalApprove(r.pre_request_id)}
                      >
                        {finalizingId === r.pre_request_id ? 'Finalizing…' : 'Discharge & release bed'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="approve"
                        disabled
                        title="Patient bill not cleared yet"
                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        Discharge &amp; release bed
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
