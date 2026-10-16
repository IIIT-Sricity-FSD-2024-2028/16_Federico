'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { formatAge } from './preHelpers.js';
import Patient360Modal from './Patient360Modal.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Ported from PRE/pages/patient-records.html + patient-records.js.
 *
 * The status ladder is order-sensitive - inpatient first, then pending
 * bed request, discharge/follow-up states, scheduled work, pending intake,
 * completed OPD, and finally "any encounter at all". Reordering it changes
 * which badge a patient shows.
 */
export default function PatientRecordsPage() {
  useDocumentTitle('Patient Directory & Records – Federico PRE');

  const [query, setQuery] = useState('');
  const [bloodFilter, setBloodFilter] = useState('');
  const [detailId, setDetailId] = useState(null);

  const { data, error } = useApi(async () => {
    const [patients, insurances, preRequests, appointments, admissions, beds, doctors, bedRequests, wards] = await Promise.all([
      api.patients.list().catch(() => []),
      api.patients.insuranceAll().catch(() => []),
      api.preRequests.list().catch(() => []),
      api.appointments.list().catch(() => []),
      api.admissions.list().catch(() => []),
      api.wards.beds().catch(() => []),
      api.doctors.list().catch(() => []),
      api.wards.bedRequests.list().catch(() => []),
      api.wards.list().catch(() => []),
    ]);

    const doctorsById = {};
    (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));
    const wardsById = {};
    (wards || []).forEach((w) => (wardsById[w.ward_id] = w));
    const bedsById = {};
    (beds || []).forEach((b) => {
      bedsById[b.bed_id] = {
        ...b,
        ward_name: b.ward_name || wardsById[b.ward_id]?.ward_name || wardsById[b.ward_id]?.name || 'Ward',
      };
    });

    const insurancesByPatient = {};
    (insurances || []).forEach((ins) => (insurancesByPatient[ins.patient_id] = ins));

    const group = (rows, key) => {
      const out = {};
      (rows || []).forEach((r) => {
        if (!out[r[key]]) out[r[key]] = [];
        out[r[key]].push(r);
      });
      return out;
    };
    const preByPatient = group(preRequests, 'patient_id');
    const aptByPatient = group(appointments, 'patient_id');
    const admByPatient = group(admissions, 'patient_id');
    const pendingBedPatientIds = new Set(
      (bedRequests || []).filter((r) => r.status === 'PENDING').map((r) => r.patient_id),
    );

    const rows = (patients || []).map((p) => {
      const pInsur = insurancesByPatient[p.patient_id] || null;
      const pApts = aptByPatient[p.patient_id] || [];
      const pAdms = admByPatient[p.patient_id] || [];
      const pPres = preByPatient[p.patient_id] || [];

      const activeAdm = pAdms.find((a) => a.status === 'ACTIVE' || a.status === 'ADMITTED');
      const activePre = pPres.find((pr) => pr.status === 'ADMITTED');
      const activeBedId = (activeAdm && activeAdm.bed_id) || (activePre && activePre.bed_id);
      const activeBed = activeBedId ? bedsById[activeBedId] : null;

      const totalEncounters = pApts.length + pAdms.length + pPres.length;
      // A department is only derived from the patient's OWN encounters; a
      // freshly registered patient keeps null rather than a fabricated default.
      const latestDept =
        (pPres[0] && pPres[0].department) || (pApts[0] && pApts[0].department) || (pAdms[0] && pAdms[0].department) || null;

      const activeInpatient = Boolean(activeBed);

      return {
        ...p,
        age: formatAge(p.dob),
        insurance: pInsur,
        activeBed,
        isInpatient: activeInpatient,
        pendingBedRequest: pendingBedPatientIds.has(p.patient_id),
        hasDischarged: !activeInpatient && (pPres.some((pr) => pr.status === 'DISCHARGED') || pAdms.some((a) => a.status === 'DISCHARGED')),
        hasFollowUp: pPres.some((pr) => pr.status === 'CONSULTATION_DONE' && pr.visit_type === 'Follow-Up'),
        hasScheduled: pPres.some((pr) => pr.status === 'APPROVED' || pr.status === 'CONFIRMED') || pApts.some((apt) => apt.status === 'CONFIRMED' || apt.status === 'SCHEDULED'),
        hasPendingIntake: pPres.some((pr) => pr.status === 'PENDING'),
        hasConsultationDone: pPres.some((pr) => pr.status === 'CONSULTATION_DONE') || pApts.some((apt) => apt.status === 'COMPLETED'),
        totalEncounters,
        latestDept,
        appointments: pApts,
        admissions: pAdms,
        preRequests: pPres,
      };
    });

    return { rows, doctorsById, bedsById };
  }, []);

  const rows = data?.rows || [];

  const total = rows.length;
  const inpatients = rows.filter((p) => p.isInpatient).length;
  const insured = rows.filter((p) => p.insurance).length;

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((p) => {
    if (bloodFilter && p.blood_group !== bloodFilter) return false;
    if (!q) return true;
    return (
      (p.uhid || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  });

  function statusBadge(p) {
    if (p.isInpatient) return <Badge variant="info">{'Inpatient (' + (p.activeBed ? p.activeBed.bed_number : 'Bed Assigned') + ')'}</Badge>;
    if (p.pendingBedRequest) return <Badge variant="warning">Pending</Badge>;
    if (p.hasDischarged) return <Badge variant="neutral">Discharged</Badge>;
    if (p.hasFollowUp) return <Badge variant="success">Follow Up</Badge>;
    if (p.hasScheduled) return <Badge variant="info">Scheduled</Badge>;
    if (p.hasPendingIntake) return <Badge variant="warning">Pending Request</Badge>;
    if (p.hasConsultationDone) return <Badge variant="success">Completed (OPD)</Badge>;
    if (p.totalEncounters > 0) return <Badge variant="success">Outpatient</Badge>;
    return <Badge variant="neutral">Registered</Badge>;
  }

  return (
    <>
      <div className="cards">
        <StatCard label="Total Registered Patients" value={`${total} Patients`} variant="info" />
        <StatCard label="Active Inpatients" value={`${inpatients} In Beds`} variant="warning" />
        <StatCard label="Insured Patients" value={`${insured} Policies`} variant="success" />
      </div>

      <div className="container">
        <PageHeader
          title="Master Patient Directory"
          subtitle="Review verified patient demographics, active insurance policies, and complete clinical encounter logs."
        />
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search by name, UHID, phone..."
          filters={[
            {
              id: 'bloodGroup',
              value: bloodFilter,
              onChange: setBloodFilter,
              options: [
                { value: '', label: 'All Blood Groups' },
                ...BLOOD_GROUPS.map((b) => ({ value: b, label: b })),
              ],
            },
          ]}
        />

        <div className="table-container" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Patient UHID</th><th>Patient Name</th><th>Age / Gender</th><th>Contact Details</th>
                <th>Blood Group</th><th>Insurance Coverage</th><th>Activity Summary</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="recordTable">
              {error ? (
                <EmptyState asTableRow colSpan={9} icon={null} title="Failed to load patient directory" message={error.message} />
              ) : filtered.length === 0 ? (
                <EmptyState asTableRow colSpan={9} icon={null} title="No matching patient records found" />
              ) : (
                filtered.map((p) => (
                  <tr key={p.patient_id}>
                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                      <a href="javascript:void(0)" onClick={() => setDetailId(p.patient_id)} style={{ fontWeight: 700, color: 'var(--md-primary, #6750a4)', textDecoration: 'none' }}>
                        {p.uhid}
                      </a>
                    </td>
                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                      <strong>{p.name}</strong>
                      {p.address ? <div style={{ fontSize: 11, color: 'var(--color-muted-fg)', marginTop: 2 }}>{p.address}</div> : null}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>{p.age || '—'} / {p.gender || '—'}</td>
                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                      <div>{p.phone || '—'}</div>
                      {p.emergency_contact_phone ? <div style={{ fontSize: 10, color: 'var(--color-muted-fg)', marginTop: 2 }}>Em: {p.emergency_contact_phone}</div> : null}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 12px' }}>
                      {p.blood_group ? (
                        <Badge variant="error">{p.blood_group}</Badge>
                      ) : (
                        <span style={{ color: 'var(--color-muted-fg)', fontSize: 12 }}>{'—'}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      {p.insurance ? (
                        <Badge variant="success" title={'Policy #' + (p.insurance.policy_number || '')}>
                          {p.insurance.provider_name || 'Insured'}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Self Pay</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                      <div>{p.latestDept || <span style={{ color: 'var(--color-muted-fg)' }}>{'—'}</span>}</div>
                      <small style={{ color: 'var(--color-muted-fg)', fontSize: 11 }}>
                        {p.totalEncounters > 0 ? p.totalEncounters + ' Care Encounter(s)' : 'No visits yet'}
                      </small>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>{statusBadge(p)}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Button variant="secondary" size="sm" className="blue" onClick={() => setDetailId(p.patient_id)}>
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Patient360Modal
        patient={rows.find((p) => p.patient_id === detailId) || null}
        doctorsById={data?.doctorsById || {}}
        bedsById={data?.bedsById || {}}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}

