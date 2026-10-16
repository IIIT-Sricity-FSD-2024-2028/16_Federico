'use strict';

import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, statusLabel, formatDate } from './preHelpers.js';

/** Ported from PRE/pages/rejected.html + rejected.js. */
export default function RejectedPage() {
  useDocumentTitle('Rejected Requests');

  const { data, loading, error } = useApi(async () => {
    const [preRequests, patients, doctors] = await Promise.all([
      api.preRequests.list(),
      api.patients.list(),
      api.doctors.list(),
    ]);
    const doctorsById = {};
    (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));
    return joinPreRequestsWithPatients(preRequests, patients, doctorsById).filter((r) => r.status === 'REJECTED');
  }, []);

  const rows = data || [];
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = useMemo(() => {
    const depts = new Set();
    (data || []).forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [data]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (!q) return true;
    return (
      (r.patientUhid && r.patientUhid.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
      (r.reject_reason && r.reject_reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container">
      <PageHeader
        title="Rejected Patient Requests"
      />
      <SearchToolbar
        searchQuery={query}
        onSearchChange={setQuery}
        placeholder="Search by patient name, UHID, doctor, reason..."
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
            <th>Doctor</th><th>Appointment Date</th><th>Booked Date</th><th>Rejection Reason</th><th>Status</th>
          </tr>
        </thead>
        <tbody id="rejectedTable">
          {loading ? (
            <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading rejected requests…</td></tr>
          ) : error ? (
            <EmptyState asTableRow colSpan={10} icon={null} title="Failed to load rejected requests" message={error.message} />
          ) : rows.length === 0 ? (
            <EmptyState
              asTableRow
              colSpan={10}
              icon={null}
              title="No Rejected Requests"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              asTableRow
              colSpan={10}
              icon={null}
              title="No Matching Requests"
            />
          ) : (
            filtered.map((r) => (
              <tr key={r.pre_request_id}>
                <td>{r.patientUhid}</td>
                <td>{r.patientName}</td>
                <td>{r.patientAge}</td>
                <td>{r.patientGender}</td>
                <td>{r.department}</td>
                <td>{r.doctorName}</td>
                <td>{formatDate(r.requested_date)}</td>
                <td>{formatDate(r.created_at)}</td>
                <td>{r.reject_reason || '-'}</td>
                <td><Badge variant="error">{statusLabel(r.status)}</Badge></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

