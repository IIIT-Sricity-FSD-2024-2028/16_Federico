import { useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, formatDate, to12Hour } from './preHelpers.js';
import { useAppDispatch, useAppSelector, useLoader, useUiState } from '../../store/hooks.js';
import { loadPreAdmitted } from '../../store/pageLoaders.js';
import { selectPreRequests, updatePreRequest } from '../../store/slices/preRequestsSlice.js';
import { selectPatients } from '../../store/slices/patientsSlice.js';
import { selectDoctors } from '../../store/slices/doctorsSlice.js';
import { selectBeds } from '../../store/slices/wardsSlice.js';

/** Ported from PRE/pages/admitted.html + admitted.js. */
export default function AdmittedPage() {
  useDocumentTitle('Admitted Patients');
  const [actionId, setActionId] = useUiState('AdmittedPage.actionId', null);
  const [query, setQuery] = useUiState('AdmittedPage.query', '');
  const [deptFilter, setDeptFilter] = useUiState('AdmittedPage.deptFilter', '');

  const dispatch = useAppDispatch();
  const { loading, error, reload } = useLoader(loadPreAdmitted);
  const preRequestList = useAppSelector(selectPreRequests);
  const patientList = useAppSelector(selectPatients);
  const doctorList = useAppSelector(selectDoctors);
  const bedList = useAppSelector(selectBeds);

  const admitted = useMemo(() => {
    const doctorsById = {};
    doctorList.forEach((d) => (doctorsById[d.doctor_id] = d));
    return joinPreRequestsWithPatients(preRequestList, patientList, doctorsById).filter((r) => r.status === 'ADMITTED');
  }, [preRequestList, patientList, doctorList]);
  const bedsById = useMemo(() => {
    const byId = {};
    bedList.forEach((b) => (byId[b.bed_id] = b));
    return byId;
  }, [bedList]);

  const departments = useMemo(() => {
    const depts = new Set();
    admitted.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [admitted]);

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
      await dispatch(updatePreRequest({ id, patch: { status: 'DISCHARGE_REQUESTED' } })).unwrap();
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

