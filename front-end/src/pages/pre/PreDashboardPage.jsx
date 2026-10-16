'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import StatCard from '../../components/ui/StatCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, formatDate, to12Hour } from './preHelpers.js';
import BedRequestModal from './BedRequestModal.jsx';

/**
 * Ported from PRE/pages/PRE.html + PRE.js.
 *
 * Each approved patient row shows the two PRE decisions that remain in the
 * workflow: Follow Up or Admitted.
 */
export default function PreDashboardPage() {
  useDocumentTitle('Dashboard');
  const [bedRequestId, setBedRequestId] = useState(null);

  const { data, reload, error } = useApi(async () => {
    const [preRequests, patients, doctors, wards, bedRequests] = await Promise.all([
      api.preRequests.list().catch(() => []),
      api.patients.list().catch(() => []),
      api.doctors.list().catch(() => []),
      api.wards.list().catch(() => []),
      api.wards.bedRequests.list().catch(() => []),
    ]);

    const doctorsById = {};
    (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));
    const joined = joinPreRequestsWithPatients(preRequests, patients, doctorsById);

    return { rows: joined, all: preRequests || [], wards: wards || [], bedRequests: bedRequests || [] };
  }, []);

  const rows = data?.rows || [];
  const all = data?.all || [];
  const wards = data?.wards || [];
  const bedRequests = data?.bedRequests || [];
  const pendingBedRequestIds = new Set(
    bedRequests
      .filter((r) => r.status === 'PENDING')
      .map((r) => r.pre_request_id)
      .filter(Boolean),
  );

  const counters = {
    pending: all.filter((r) => r.status === 'PENDING').length,
    rejected: all.filter((r) => r.status === 'REJECTED').length,
    admitted: all.filter((r) => r.status === 'ADMITTED').length,
    discharge: all.filter((r) => r.status === 'DISCHARGE_APPROVED' || r.status === 'DISCHARGE_REQUESTED').length,
  };

  // Approved queue: everything still awaiting PRE action.
  const approved = rows.filter((r) => {
    if (['REJECTED', 'DISCHARGED'].includes(r.status)) return false;
    if (r.status === 'ADMITTED') return false;
    if (r.status === 'CONSULTATION_DONE') return false;
    return r.status === 'APPROVED';
  });

  async function completeFollowUp(id) {
    try {
      await api.preRequests.checkIn(id, { visit_type: 'OPD' });
      await api.preRequests.update(id, { visit_type: 'Follow-Up' });
      toast('Follow up completed and patient record updated.', 'success');
    } catch (err) {
      toast(err.message || 'Could not complete follow up', 'error');
    }
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Patient Relational Executive (PRE)"
      />

      <div className="cards" style={{ padding: '0 0 24px 0', margin: 0 }}>
        <StatCard to="/PRE/pages/request.html" label="Pending Requests" value={counters.pending + ' Requests'} variant="warning" />
        <StatCard to="/PRE/pages/rejected.html" label="Rejected Requests" value={counters.rejected + ' Requests'} variant="error" />
        <StatCard to="/PRE/pages/admitted.html" label="Admitted Patients" value={counters.admitted + ' Patients'} variant="info" />
        <StatCard to="/PRE/pages/discharge.html" label="Discharge Approvals" value={counters.discharge + ' In Queue'} variant="primary" />
      </div>

      <div className="table-container" style={{ margin: 0 }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-fg)' }}>Approved Patients</h2>
              <Badge variant="neutral">{approved.length} {approved.length === 1 ? 'Patient' : 'Patients'}</Badge>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
              <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="approvedTable">
            {error ? (
              <EmptyState
                asTableRow
                colSpan={10}
                icon={null}
                title="Failed to load approved patients"
                message={error.message}
              />
            ) : approved.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={10}
                icon={null}
                title="No Scheduled Patients Awaiting Check-in"
              />
            ) : (
              approved.map((r) => {
                const hasPendingBedRequest = pendingBedRequestIds.has(r.pre_request_id);

                return (
                  <tr key={r.pre_request_id}>
                    <td><strong style={{ color: 'var(--md-primary, #0f766e)' }}>{r.patientUhid}</strong></td>
                    <td>{r.patientName}</td>
                    <td>{r.patientAge}</td>
                    <td>{r.patientGender}</td>
                    <td>{r.department}</td>
                    <td>{r.doctorName}</td>
                    <td>{formatDate(r.requested_date)}</td>
                    <td>{to12Hour(r.requested_time) || '-'}</td>
                    <td>
                      <Badge variant={hasPendingBedRequest ? 'info' : 'success'}>
                        {hasPendingBedRequest ? 'Pending Bed Request' : 'Scheduled'}
                      </Badge>
                    </td>
                    <td>
                      {hasPendingBedRequest ? (
                        <Badge variant="warning">Awaiting HOM Bed</Badge>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button variant="secondary" size="sm" className="suggest" onClick={() => completeFollowUp(r.pre_request_id)}>
                            Follow Up
                          </Button>
                          <Button variant="primary" size="sm" className="approve" onClick={() => setBedRequestId(r.pre_request_id)}>
                            Admitted
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <BedRequestModal
        request={approved.find((r) => r.pre_request_id === bedRequestId) || null}
        wards={wards}
        onClose={() => setBedRequestId(null)}
        onSubmitted={reload}
      />
    </>
  );
}

