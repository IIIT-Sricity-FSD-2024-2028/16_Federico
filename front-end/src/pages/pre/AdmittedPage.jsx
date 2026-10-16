import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, formatDate, to12Hour } from './preHelpers.js';

/** Ported from PRE/pages/admitted.html + admitted.js. */
export default function AdmittedPage() {
  useDocumentTitle('Admitted Patients');
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const { data, loading, error, reload } = useApi(async () => {
    const [preRequests, patients, doctors, beds] = await Promise.all([
      api.preRequests.list(),
      api.patients.list(),
      api.doctors.list(),
      api.wards.beds(),
    ]);
    const doctorsById = {};
    doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
    const bedsById = {};
    beds.forEach((b) => (bedsById[b.bed_id] = b));

    const admitted = joinPreRequestsWithPatients(preRequests, patients, doctorsById).filter((r) => r.status === 'ADMITTED');
    return { admitted, bedsById };
  }, []);

  const admitted = data?.admitted || [];
  const bedsById = data?.bedsById || {};

  const departments = useMemo(() => {
    const depts = new Set();
    (data?.admitted || []).forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [data?.admitted]);

  const q = query.trim().toLowerCase();
  const filtered = admitted.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (!q) return true;
    const bed = bedsById[r.bed_id];
    const bedNumber = bed ? String(bed.bed_number).toLowerCase() : '';
    return (
      (r.patientUhid && r.patientUhid.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
      bedNumber.includes(q)
    );
  });

  async function dischargePatient(id) {
    setActionId(id);
    try {
      await api.preRequests.update(id, { status: 'DISCHARGE_REQUESTED' });
      toast('Discharge request sent to HOM', 'success');
      await reload();
    } catch (err) {
      toast(err.message || 'Could not request discharge', 'error');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="Admitted Patients"
      />
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
      <table>
        <thead>
          <tr>
            <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
            <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Status</th><th>Bed No</th><th>Action</th>
          </tr>
        </thead>
        <tbody id="admittedTable">
          {loading ? (
            <tr><td colSpan="11" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading admitted patients…</td></tr>
          ) : error ? (
            <EmptyState asTableRow colSpan={11} icon={null} title="Failed to load admitted patients" message={error.message} />
          ) : admitted.length === 0 ? (
            <EmptyState
              asTableRow
              colSpan={11}
              icon={null}
              title="No Admitted Patients Found"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              asTableRow
              colSpan={11}
              icon={null}
              title="No Matching Patients"
            />
          ) : (
            filtered.map((r) => {
              const bed = bedsById[r.bed_id];
              return (
                <tr key={r.pre_request_id}>
                  <td>{r.patientUhid}</td>
                  <td>{r.patientName}</td>
                  <td>{r.patientAge}</td>
                  <td>{r.patientGender}</td>
                  <td>{r.department}</td>
                  <td>{r.doctorName}</td>
                  <td>{formatDate(r.requested_date)}</td>
                  <td>{to12Hour(r.requested_time) || '-'}</td>
                  <td><Badge variant="info">Admitted</Badge></td>
                  <td>{bed ? bed.bed_number : '-'}</td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      className="reject"
                      disabled={actionId === r.pre_request_id}
                      onClick={() => dischargePatient(r.pre_request_id)}
                    >
                      {actionId === r.pre_request_id ? 'Requesting…' : 'Discharge request'}
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

