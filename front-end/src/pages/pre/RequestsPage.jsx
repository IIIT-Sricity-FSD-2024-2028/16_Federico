'use strict';

import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { joinPreRequestsWithPatients, statusLabel, formatDate, to12Hour } from './preHelpers.js';
import ApprovePopup from './ApprovePopup.jsx';
import SuggestPopup from './SuggestPopup.jsx';
import RejectPopup from './RejectPopup.jsx';

/**
 * Ported from PRE/pages/request.html + js/requests.js.
 *
 * Note the filename pair: the page is request.html (singular), its script was
 * requests.js (plural). They belong together - DEC-12.
 *
 * The three popups were built with document.createElement + innerHTML and
 * embedded onclick strings; they are controlled components here.
 */
export default function RequestsPage() {
  useDocumentTitle('Patient Requests');
  const [popup, setPopup] = useState(null); // { kind, id }

  const { data, loading, error, reload } = useApi(async () => {
    const [preRequests, patients, doctors] = await Promise.all([
      api.preRequests.list(),
      api.patients.list(),
      api.doctors.list(),
    ]);
    const doctorsById = {};
    doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
    return {
      pending: joinPreRequestsWithPatients(preRequests, patients, doctorsById).filter((r) => r.status === 'PENDING'),
      doctors: doctors || [],
    };
  }, []);

  const pending = data?.pending || [];
  const doctors = data?.doctors || [];
  const activeRequest = popup ? pending.find((r) => r.pre_request_id === popup.id) : null;

  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = useMemo(() => {
    const depts = new Set();
    (data?.pending || []).forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [data?.pending]);

  const q = query.trim().toLowerCase();
  const filtered = pending.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (!q) return true;
    return (
      (r.patientUhid && r.patientUhid.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
      (r.patientGender && r.patientGender.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="container">
        <PageHeader
          title="Patient Appointment Requests"
          subtitle="Review incoming patient requests, verify details, and assign consultation slots"
        />
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search by patient name, UHID, doctor, department..."
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
              <th>Doctor</th><th>Appointment Date</th><th>Booked Date</th><th>Appointment Time</th>
              <th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="requestTable">
            {loading ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading patient requests…</td></tr>
            ) : error ? (
              <EmptyState asTableRow colSpan={11} icon={null} title="Failed to load patient requests" message={error.message} />
            ) : pending.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={11}
                icon={null}
                title="No Pending Requests"
                message="There are no patient appointment requests waiting for review."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                asTableRow
                colSpan={11}
                icon={null}
                title="No Matching Requests"
                message="No patient requests match your search criteria."
              />
            ) : (
              filtered.map((r) => (
                <tr key={r.pre_request_id}>
                  <td>{r.patientUhid}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                    {(r.note || (r.document_urls && r.document_urls.length > 0)) && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {r.note && (
                          <span
                            className="badge badge-neutral"
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              maxWidth: 130,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title={r.note}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                            {r.note}
                          </span>
                        )}
                        {r.document_urls && r.document_urls.length > 0 && (
                          <span
                            className="badge badge-info"
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title={`${r.document_urls.length} document(s) attached`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            {r.document_urls.length} {r.document_urls.length === 1 ? 'file' : 'files'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{r.patientAge}</td>
                  <td>{r.patientGender}</td>
                  <td>{r.department}</td>
                  <td>{r.doctorName}</td>
                  <td>{formatDate(r.requested_date)}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>{to12Hour(r.requested_time) || '-'}</td>
                  <td><Badge variant="warning">{statusLabel(r.status)}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button variant="primary" size="sm" className="approve" onClick={() => setPopup({ kind: 'approve', id: r.pre_request_id })}>Approve</Button>
                      <Button variant="secondary" size="sm" className="suggest" onClick={() => setPopup({ kind: 'suggest', id: r.pre_request_id })}>Suggest</Button>
                      <Button variant="danger" size="sm" className="reject" onClick={() => setPopup({ kind: 'reject', id: r.pre_request_id })}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {popup?.kind === 'approve' ? (
        <ApprovePopup request={activeRequest} doctors={doctors} onClose={() => setPopup(null)} onDone={reload} />
      ) : null}
      {popup?.kind === 'suggest' ? (
        <SuggestPopup request={activeRequest} doctors={doctors} onClose={() => setPopup(null)} onDone={reload} />
      ) : null}
      {popup?.kind === 'reject' ? (
        <RejectPopup request={activeRequest} onClose={() => setPopup(null)} onDone={reload} />
      ) : null}
    </>
  );
}

