'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import { to12Hour } from './preHelpers.js';

/**
 * Ported from PRE/pages/doctor.html + doctor.js.
 *
 * Availability status is normalised from free text: anything matching
 * surgery|busy becomes "In Surgery", unavail|leave|off becomes "Unavailable",
 * everything else "Available". Duty hours fall back to 09:00 AM - 05:00 PM and
 * days to "Mon - Sat" when the record has none.
 */
export default function DoctorRosterPage() {
  useDocumentTitle('Doctor Availability – Federico PRE');

  const [query, setQuery] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, error } = useApi(async () => {
    const [doctors, availabilities] = await Promise.all([
      api.doctors.list().catch(() => []),
      api.doctors.availabilityAll().catch(() => []),
    ]);

    const availabilityByDoctor = {};
    (availabilities || []).forEach((a) => {
      if (!availabilityByDoctor[a.doctor_id]) availabilityByDoctor[a.doctor_id] = a;
    });

    return (doctors || []).map((d) => {
      const avail = availabilityByDoctor[d.doctor_id] || null;
      const rawStatus = (avail?.status || 'Available').trim();
      let normalizedStatus = 'Available';
      if (/surgery|busy/i.test(rawStatus)) normalizedStatus = 'In Surgery';
      else if (/unavail|leave|off/i.test(rawStatus)) normalizedStatus = 'Unavailable';

      const startTimeFormatted = avail?.start_time ? to12Hour(avail.start_time) : '09:00 AM';
      const endTimeFormatted = avail?.end_time ? to12Hour(avail.end_time) : '05:00 PM';

      return {
        ...d,
        availability: avail,
        status: normalizedStatus,
        rawStatus,
        dutyHours: startTimeFormatted + ' – ' + endTimeFormatted,
        days: avail?.available_date
          ? new Date(avail.available_date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : 'Mon – Sat',
      };
    });
  }, []);

  const roster = data || [];
  const specs = Array.from(new Set(roster.map((d) => d.specialization).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  const filtered = roster.filter((d) => {
    if (specFilter && d.specialization !== specFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (!q) return true;
    return (
      (d.name || '').toLowerCase().includes(q) ||
      String(d.doctor_id || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="container">
        <PageHeader
          title="Doctor Availability"
        />
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search doctor, dept, ID..."
          filters={[
            {
              id: 'spec',
              value: specFilter,
              onChange: setSpecFilter,
              options: [
                { value: '', label: 'All Specializations' },
                ...specs.map((s) => ({ value: s, label: s })),
              ],
            },
            {
              id: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'All Statuses' },
                { value: 'Available', label: 'Available' },
                { value: 'In Surgery', label: 'In Surgery' },
                { value: 'Unavailable', label: 'Unavailable / Off-Duty' },
              ],
            },
          ]}
        />

        <div className="table-container" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Doctor ID</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Doctor Name</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Specialization</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Consultation Days</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Duty Hours</th>
                <th style={{ textAlign: 'center', padding: '12px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody id="doctorTable">
              {error ? (
                <EmptyState asTableRow colSpan={6} icon={null} title="Could not load doctor roster" message={error.message} />
              ) : filtered.length === 0 ? (
                <EmptyState asTableRow colSpan={6} icon={null} title="No matching doctors found" />
              ) : (
                filtered.map((d) => {
                  const badge =
                    d.status === 'In Surgery' ? (
                      <Badge variant="warning">In Surgery</Badge>
                    ) : d.status === 'Unavailable' ? (
                      <Badge variant="neutral">Off-Duty</Badge>
                    ) : (
                      <Badge variant="success">Available</Badge>
                    );

                  return (
                    <tr key={d.doctor_id}>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                        <strong>DOC-{String(d.doctor_id).padStart(3, '0')}</strong>
                      </td>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                        <strong>{d.name.startsWith('Dr.') ? d.name : 'Dr. ' + d.name}</strong>
                        {d.phone ? <div style={{ fontSize: 11, color: 'var(--color-muted-fg)', marginTop: 2 }}>{d.phone}</div> : null}
                      </td>
                      <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-fg)' }}>{d.specialization || 'General'}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>{d.days}</td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}><div>{d.dutyHours}</div></td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>{badge}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
