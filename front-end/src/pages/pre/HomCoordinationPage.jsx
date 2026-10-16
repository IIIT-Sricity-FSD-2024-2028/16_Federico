'use strict';

import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';

/** PRE coordination view for inpatient bed assignment status. */
export default function HomCoordinationPage() {
  useDocumentTitle('Bed Coordination - Federico PRE');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');

  const { data, loading, error } = useApi(async () => {
    const [patients, bedRequests, wards, beds] = await Promise.all([
      api.patients.list().catch(() => []),
      api.wards.bedRequests.list().catch(() => []),
      api.wards.list().catch(() => []),
      api.wards.beds().catch(() => []),
    ]);

    const patientsById = {};
    (patients || []).forEach((p) => (patientsById[p.patient_id] = p));
    const wardsById = {};
    (wards || []).forEach((w) => (wardsById[w.ward_id] = w));
    const bedsById = {};
    (beds || []).forEach((b) => (bedsById[b.bed_id] = b));

    // Show PENDING + ALLOCATED + DENIED so PRE can see the full bed allocation response.
    const allBedRequests = (bedRequests || []).filter((r) =>
      r.status === 'PENDING' || r.status === 'ALLOCATED' || r.status === 'DENIED',
    );

    return { allBedRequests, patientsById, wardsById, bedsById };
  }, []);

  const d = data || { allBedRequests: [], patientsById: {}, wardsById: {}, bedsById: {} };

  const wardOptions = useMemo(() => {
    return Object.values(d.wardsById || {})
      .map((w) => ({ value: String(w.ward_id), label: w.ward_name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [d.wardsById]);

  const q = query.trim().toLowerCase();
  const filteredRequests = d.allBedRequests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (wardFilter && String(r.ward_id) !== wardFilter) return false;
    if (!q) return true;

    const patient = d.patientsById[r.patient_id] || {};
    const ward = d.wardsById[r.ward_id];
    const wardName = ward?.ward_name || '';
    const bed = d.bedsById[r.bed_id];
    const bedNumber = bed?.bed_number || '';

    return (
      (patient.name && patient.name.toLowerCase().includes(q)) ||
      (patient.uhid && patient.uhid.toLowerCase().includes(q)) ||
      wardName.toLowerCase().includes(q) ||
      bedNumber.toLowerCase().includes(q) ||
      (r.priority && r.priority.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container">
      <PageHeader
        title="Bed Allocation & Coordination"
        subtitle="Monitor inpatient bed allocation requests submitted from PRE. Bed assignments are handled by Operations."
      />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Inpatient Bed Allocation Queue</h3>
          <span style={{ fontSize: 12, color: 'var(--color-muted-fg)' }}>Bed assignment is handled by Operations</span>
        </div>
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search by patient name, UHID, bed, ward..."
          filters={[
            {
              id: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'ALLOCATED', label: 'Allocated' },
                { value: 'DENIED', label: 'Rejected' },
              ],
            },
            ...(wardOptions.length > 0
              ? [
                  {
                    id: 'ward',
                    value: wardFilter,
                    onChange: setWardFilter,
                    options: [
                      { value: '', label: 'All Wards' },
                      ...wardOptions,
                    ],
                  },
                ]
              : []),
          ]}
        />
        <div className="table-container" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Patient UHID</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Patient Name</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Requested Ward</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Priority</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Bed</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody id="homRequestTable">
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted-fg)' }}>Loading bed allocation requests…</td></tr>
              ) : error ? (
                <EmptyState asTableRow colSpan={6} icon={null} title="Failed to load bed allocation requests" message={error.message} />
              ) : d.allBedRequests.length === 0 ? (
                <EmptyState asTableRow colSpan={6} icon={null} title="No bed allocation requests" />
              ) : filteredRequests.length === 0 ? (
                <EmptyState
                  asTableRow
                  colSpan={6}
                  icon={null}
                  title="No matching requests found"
                  message="Try adjusting your search query or filters."
                />
              ) : (
                filteredRequests.map((r) => {
                  const patient = d.patientsById[r.patient_id] || {};
                  const wardName = r.ward_id ? d.wardsById[r.ward_id]?.ward_name || 'Ward Requested' : 'HOM Decides';

                  const priorityBadge =
                    r.priority === 'CRITICAL' ? <Badge variant="error">Critical</Badge>
                    : r.priority === 'HIGH'   ? <Badge variant="warning">High</Badge>
                    : <Badge variant="neutral">Normal</Badge>;

                  let bedCell = <span style={{ color: 'var(--color-muted-fg)', fontSize: 12 }}>—</span>;
                  if (r.status === 'ALLOCATED' && r.bed_id && d.bedsById[r.bed_id]) {
                    bedCell = <strong style={{ color: 'var(--md-primary, #0f766e)' }}>{d.bedsById[r.bed_id].bed_number}</strong>;
                  } else if (r.status === 'DENIED') {
                    bedCell = <span style={{ color: '#6b7280', fontStyle: 'italic' }}>N/A</span>;
                  }

                  const statusBadge =
                    r.status === 'ALLOCATED' ? <Badge variant="success">Allocated</Badge>
                    : r.status === 'DENIED'  ? <Badge variant="error">Rejected</Badge>
                    : <Badge variant="warning">Pending</Badge>;

                  return (
                    <tr key={r.bed_request_id}>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                        <strong style={{ color: 'var(--md-primary, #0f766e)' }}>{patient.uhid || 'UHID-' + r.patient_id}</strong>
                      </td>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}><strong>{patient.name || '-'}</strong></td>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}>{wardName}</td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>{priorityBadge}</td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>{bedCell}</td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>{statusBadge}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
