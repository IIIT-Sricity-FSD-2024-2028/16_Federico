'use strict';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import StatCard from '../../components/ui/StatCard.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import AppointmentRows from './AppointmentRows.jsx';
import VisitItems from './VisitItems.jsx';
import { getEffectiveStatus, getLatestConcludedEncounter } from './patientDashboardUtils.js';
import { openAppointmentSlip } from './patientDocumentCopy.js';
import { formatDDMMYYYY } from './patientStoreShape.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientDashboardCss from '../../styles/patient/patient-dashboard.css?inline';

const NOTIFICATION_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export default function DashboardPage() {
  usePageStyles(patientDashboardCss);
  useDocumentTitle('Patient Dashboard');
  const navigate = useNavigate();

  const {
    profile,
    bills,
    visits,
    appointments,
    upcomingAppointments,
    notifications,
  } = usePatientStore();

  const [apptTab, setApptTab] = useState('all');

  const allAppointments = useMemo(
    () => (Array.isArray(appointments) ? appointments : []),
    [appointments],
  );

  const counts = useMemo(() => {
    let booked = 0;
    let confirmed = 0;
    let completed = 0;
    allAppointments.forEach((a) => {
      const s = String(a.status || '').toLowerCase();
      const raw = String(a.rawStatus || '').toUpperCase();
      if (['pending', 'scheduled', 'booked'].includes(s) || ['PENDING', 'SCHEDULED'].includes(raw)) {
        booked++;
      } else if (s === 'confirmed' || ['CONFIRMED', 'APPROVED'].includes(raw)) {
        confirmed++;
      } else if (s === 'completed' || ['COMPLETED', 'CONSULTATION_DONE', 'DISCHARGED'].includes(raw)) {
        completed++;
      }
    });
    return {
      all: allAppointments.length,
      booked,
      confirmed,
      completed,
    };
  }, [allAppointments]);

  const apptTabs = useMemo(
    () => [
      { id: 'all', label: `All (${counts.all})` },
      { id: 'booked', label: `Booked (${counts.booked})` },
      { id: 'confirmed', label: `Confirmed (${counts.confirmed})` },
      { id: 'completed', label: `Completed (${counts.completed})` },
    ],
    [counts],
  );

  const filteredAppointments = useMemo(() => {
    if (apptTab === 'booked') {
      return allAppointments.filter(
        (a) =>
          ['pending', 'scheduled', 'booked'].includes(String(a.status || '').toLowerCase()) ||
          ['PENDING', 'SCHEDULED'].includes(String(a.rawStatus || '').toUpperCase()),
      );
    }
    if (apptTab === 'confirmed') {
      return allAppointments.filter(
        (a) =>
          String(a.status || '').toLowerCase() === 'confirmed' ||
          ['CONFIRMED', 'APPROVED'].includes(String(a.rawStatus || '').toUpperCase()),
      );
    }
    if (apptTab === 'completed') {
      return allAppointments.filter(
        (a) =>
          String(a.status || '').toLowerCase() === 'completed' ||
          ['COMPLETED', 'CONSULTATION_DONE', 'DISCHARGED'].includes(String(a.rawStatus || '').toUpperCase()),
      );
    }
    return allAppointments;
  }, [allAppointments, apptTab]);

  function handleViewSlip(appointment) {
    const opened = openAppointmentSlip(appointment, profile);
    if (!opened) {
      toast('Please allow popups to view consultation slip.', 'warning');
    }
  }

  const billList = Array.isArray(bills) ? bills : [];
  const unpaid = billList.filter((b) => getEffectiveStatus(b) !== 'paid');
  const overdueCount = unpaid.filter((b) => getEffectiveStatus(b) === 'overdue').length;
  const totalOwed = unpaid.reduce((sum, b) => sum + (Number(b?.youPay) || 0), 0);

  const latestEncounter = useMemo(
    () => getLatestConcludedEncounter(visits || [], allAppointments),
    [visits, allAppointments],
  );
  const lastVisitHeading = latestEncounter ? formatDDMMYYYY(latestEncounter.date) : '—';
  const lastVisitCaption = latestEncounter ? latestEncounter.caption : 'No visits yet';

  return (
    <main className="dashboard-page">
      <p className="welcome-text">
        Welcome back, <span>{profile ? profile.firstName : 'Patient'}</span>! Here&apos;s your health
        summary for today.
      </p>

      <div className="dashboard-layout">
        <section className="summary-grid">
            <StatCard
              label="Upcoming Appointments"
              value={upcomingAppointments.length}
              sub={
                upcomingAppointments.length > 0
                  ? `Next: ${upcomingAppointments[0].displayDate}, ${upcomingAppointments[0].time}`
                  : 'No upcoming appointments'
              }
              variant="primary"
            />
            <StatCard
              label="Pending Bills"
              value={`₹${totalOwed.toLocaleString('en-IN')}`}
              sub={
                unpaid.length === 0
                  ? '0 bills due'
                  : overdueCount > 0
                    ? `${unpaid.length} bill${unpaid.length !== 1 ? 's' : ''} (${overdueCount} overdue)`
                    : `${unpaid.length} bill${unpaid.length !== 1 ? 's' : ''} due`
              }
              variant={overdueCount > 0 ? 'error' : unpaid.length > 0 ? 'warning' : 'success'}
              to="/Patient/patient-billing.html"
            />
            <StatCard
              label="Last Visit"
              value={lastVisitHeading}
              sub={lastVisitCaption}
              variant="info"
            />
          </section>

          {/* Primary Component: Interactive Appointments Hub */}
          <section className="panel table-panel appointments-hub-panel">
            <div className="panel-head" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Appointments</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted, #64748b)' }}>
                  Track your scheduled consultations and booking requests.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <TabNav
                  tabs={apptTabs}
                  activeTab={apptTab}
                  onChange={setApptTab}
                  variant="pills"
                />
                <button
                  type="button"
                  className="btn-book-shortcut"
                  onClick={() => navigate('/Patient/patient-book-appointment.html')}
                >
                  + Book Appointment
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Department &amp; Doctor</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <AppointmentRows
                    appointments={filteredAppointments}
                    onViewSlip={handleViewSlip}
                    emptyMessage={
                      apptTab === 'booked'
                        ? 'No pending appointment bookings.'
                        : apptTab === 'confirmed'
                          ? 'No confirmed consultations currently scheduled.'
                          : apptTab === 'completed'
                            ? 'No past completed appointments.'
                            : 'No appointments on record.'
                    }
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Hospital Stays & Inpatient Admissions */}
          <section className="panel visits-panel">
            <div className="panel-head">
              <div>
                <h3>Recent Hospital Stays</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted, #64748b)' }}>
                  Inpatient admissions, ward stays, and emergency care logs.
                </p>
              </div>
              <button
                type="button"
                className="view-all-link"
                id="toggle-visits"
                onClick={() => navigate('/Patient/documents')}
              >
                View Admission Certificates →
              </button>
            </div>

            <div className="visit-list">
              <VisitItems
                visits={visits.slice(0, 4)}
                emptyMessage="No inpatient hospital stays recorded."
                departmentFontSize="11px"
              />
            </div>
          </section>

          {/* PRE Updates / Hospital Notifications */}
          <section className="panel visits-panel">
            <div className="panel-head">
              <h3>PRE Updates</h3>
            </div>

            <div className="visit-list" id="patient-notifications-list">
              {notifications.length === 0 ? (
                <div className="visit-item">
                  <div className="visit-title">
                    <span className="visit-dot" />
                    <strong>No updates yet</strong>
                  </div>
                  <span className="visit-date">PRE decisions will appear here.</span>
                </div>
              ) : (
                notifications.slice(0, 4).map((note) => (
                  <div className="visit-item" key={note.id}>
                    <div className="visit-title">
                      <span
                        className="visit-dot"
                        style={{
                          background: NOTIFICATION_COLORS[note.variant] || NOTIFICATION_COLORS.info,
                        }}
                      />
                      <div>
                        <strong>{note.title}</strong>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            marginTop: '4px',
                            lineHeight: 1.4,
                          }}
                        >
                          {note.message}
                        </div>
                      </div>
                    </div>
                    <span className="visit-date">
                      {formatDDMMYYYY(note.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
    </main>
  );
}
