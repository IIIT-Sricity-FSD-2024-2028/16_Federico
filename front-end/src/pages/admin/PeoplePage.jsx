'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSession } from '../../auth/useSession.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast, confirm } from '../../components/feedback/feedback.js';
import StaffDialog from './StaffDialog.jsx';
import DoctorDialog from './DoctorDialog.jsx';

/** The portal roles a staff login can hold (Admin is the provisioned owner). */
const STAFF_ROLES = [
  { value: 'PRE', label: 'PRE' },
  { value: 'HOM', label: 'HOM' },
  { value: 'FA', label: 'FA' },
];

/**
 * Staff & Medical Directory for the organization.
 * Manages administrative logins (HOM, PRE, FA) and medical doctors/specialists.
 */
export default function PeoplePage() {
  useDocumentTitle('Staff & Doctors | Federico Hospital Admin');
  const { tenant } = useSession();
  const emailDomain = tenant?.email_domain || null;

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(undefined);
  const [staffQuery, setStaffQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('ALL');

  // staff / doctors: null = loading, false = failed, array = loaded.
  const staffLoad = useApi(async () => {
    try {
      return await api.rbac.staff();
    } catch (err) {
      toast(err.message || 'Could not load staff.', 'error');
      throw err;
    }
  }, []);
  const staff = staffLoad.error ? false : staffLoad.data;
  const loadStaff = staffLoad.reload;

  const doctorsLoad = useApi(async () => {
    try {
      const d = await api.doctors.list();
      return d || [];
    } catch (err) {
      toast(err.message || 'Could not load doctors.', 'error');
      throw err;
    }
  }, []);
  const doctors = doctorsLoad.error ? false : doctorsLoad.data;
  const loadDoctors = doctorsLoad.reload;

  const staffList = Array.isArray(staff) ? staff : [];
  const doctorList = Array.isArray(doctors) ? doctors : [];

  const activeStaffCount = staffList.filter((s) => s.is_active !== false).length;
  const uniqueSpecialties = Array.from(new Set(doctorList.map((d) => d.specialization).filter(Boolean))).sort();

  const filteredStaff = staffQuery.trim()
    ? staffList.filter((s) => {
        const q = staffQuery.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.actor_role && s.actor_role.toLowerCase().includes(q))
        );
      })
    : staffList;

  const filteredDoctors = doctorList.filter((d) => {
    const matchSpec =
      selectedSpecialization === 'ALL' || d.specialization === selectedSpecialization;
    if (!matchSpec) return false;
    if (!doctorQuery.trim()) return true;
    const q = doctorQuery.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.specialization && d.specialization.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q))
    );
  });

  async function toggleStaff(userId, next) {
    try {
      await api.rbac.setStaffActive(userId, next);
      toast(next ? 'Login enabled.' : 'Login disabled.', next ? 'success' : 'warning');
      await loadStaff();
    } catch (err) {
      toast(err.message || 'Could not update this login.', 'error');
    }
  }

  async function changeRole(member, nextRole) {
    if (nextRole === member.actor_role) return;
    try {
      const updated = await api.rbac.setStaffRole(member.user_id, nextRole);
      toast(
        member.name + ' is now ' + nextRole + '. They now sign in as ' + (updated?.email || member.email) + '.',
        'success',
      );
      await loadStaff();
    } catch (err) {
      toast(err.message || 'Could not change this role.', 'error');
    }
  }

  async function deleteDoctor(doctorId) {
    const doc = (doctorList || []).find((d) => d.doctor_id === doctorId);
    if (!doc) return;
    const ok = await confirm({
      title: 'Remove ' + doc.name + '?',
      body: 'The doctor will no longer be available for new appointments.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.doctors.remove(doctorId);
      toast(doc.name + ' removed.', 'warning');
      await loadDoctors();
    } catch (err) {
      toast(err.message || 'Could not remove this doctor.', 'error');
    }
  }

  return (
    <main className="dashboard-container">
      <PageHeader
        title="Staff & Medical Directory"
        subtitle={
          <>
            Manage administrative staff logins (HOM, PRE, FA) and registered medical doctors &amp; specialists.
            {emailDomain && (
              <span style={{ display: 'block', marginTop: 4 }}>
                Staff email domain: <strong>@{emailDomain}</strong> {'—'} logins follow{' '}
                <code>name.role@{emailDomain}</code>.
              </span>
            )}
          </>
        }
      />

      <div className="metrics-grid">
        <StatCard
          label="Staff Accounts"
          value={staffList.length}
          sub="HOM, PRE, and FA logins"
          variant="primary"
        />
        <StatCard
          label="Active Staff"
          value={activeStaffCount}
          sub={`${staffList.length - activeStaffCount} disabled accounts`}
          variant="success"
        />
        <StatCard
          label="Medical Doctors"
          value={doctorList.length}
          sub="Hospital physicians & consultants"
          variant="info"
        />
        <StatCard
          label="Clinical Specialties"
          value={uniqueSpecialties.length}
          sub="Distinct medical fields"
          variant="default"
        />
      </div>

      <div className="card">
        <div className="card-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="card-title">Staff Accounts</h2>
            <p className="card-description">
              HOM (operations), PRE (registration) and FA (finance) logins for this organization.
            </p>
          </div>
          <Button variant="primary" id="new-staff-btn" onClick={() => setStaffDialogOpen(true)}>
            + Add Person
          </Button>
        </div>
        <div style={{ padding: '0 24px 16px 24px' }}>
          <SearchToolbar
            searchQuery={staffQuery}
            onSearchChange={setStaffQuery}
            placeholder="Search staff by name, email, or role..."
          />
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Portal Role</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody id="staff-tbody">
                {staff === null ? null : staff === false ? (
                  <tr><td colSpan="5">Could not load staff.</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <EmptyState
                    asTableRow
                    colSpan={5}
                    title={staffList.length === 0 ? "No staff logins yet" : "No matching staff"}
                    message={staffList.length === 0 ? "Use “Add Person” to invite team members." : "Try adjusting your search query."}
                  />
                ) : (
                  filteredStaff.map((m) => {
                    const active = m.is_active !== false;
                    return (
                      <tr key={m.user_id}>
                        <td style={{ fontWeight: 500 }}>{m.name}</td>
                        <td>{m.email}</td>
                        <td>
                          <select
                            className="input"
                            aria-label={'Portal role for ' + m.name}
                            style={{ width: 'auto', minWidth: 96 }}
                            value={m.actor_role || ''}
                            onChange={(e) => changeRole(m, e.target.value)}
                          >
                            {STAFF_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <Badge variant={active ? 'success' : 'neutral'}>
                            {active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant={active ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => toggleStaff(m.user_id, !active)}
                          >
                            {active ? 'Disable' : 'Enable'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="card-title">Medical Doctors &amp; Specialists</h2>
            <p className="card-description">
              Registered hospital physicians, clinical consultants, and their medical specializations.
            </p>
          </div>
          <Button variant="primary" id="new-doctor-btn" onClick={() => setEditingDoctorId(null)}>
            + Add Doctor
          </Button>
        </div>
        <div style={{ padding: '0 24px 16px 24px' }}>
          <SearchToolbar
            searchQuery={doctorQuery}
            onSearchChange={setDoctorQuery}
            placeholder="Search doctors by name, specialization, or contact..."
            filters={[
              {
                id: 'specialization',
                value: selectedSpecialization,
                onChange: setSelectedSpecialization,
                options: [
                  { value: 'ALL', label: 'All Specializations' },
                  ...uniqueSpecialties.map((s) => ({ value: s, label: s })),
                ],
              },
            ]}
          />
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialization</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="doctors-tbody">
                {doctors === null ? null : doctors === false ? (
                  <tr><td colSpan="5">Could not load doctors.</td></tr>
                ) : filteredDoctors.length === 0 ? (
                  <EmptyState
                    asTableRow
                    colSpan={5}
                    title={doctorList.length === 0 ? "No doctors yet" : "No matching doctors"}
                    message={doctorList.length === 0 ? "Use “Add Doctor” to configure medical staff." : "Try adjusting your search query or filter."}
                  />
                ) : (
                  filteredDoctors.map((d) => (
                    <tr key={d.doctor_id}>
                      <td style={{ fontWeight: 500 }}>{d.name}</td>
                      <td>
                        <Badge variant="info">{d.specialization || 'General Practitioner'}</Badge>
                      </td>
                      <td>{d.phone || '—'}</td>
                      <td>{d.email || '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <Button variant="outline" size="sm" onClick={() => setEditingDoctorId(d.doctor_id)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteDoctor(d.doctor_id)}>Delete</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <StaffDialog
        open={staffDialogOpen}
        emailDomain={emailDomain}
        onClose={() => setStaffDialogOpen(false)}
        onSaved={loadStaff}
      />
      <DoctorDialog
        open={editingDoctorId !== undefined}
        doctor={editingDoctorId ? (doctorList || []).find((d) => d.doctor_id === editingDoctorId) : null}
        onClose={() => setEditingDoctorId(undefined)}
        onSaved={loadDoctors}
      />
    </main>
  );
}
