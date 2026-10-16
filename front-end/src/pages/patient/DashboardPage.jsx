'use strict';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { forRole } from '../../lib/sanitizer.js';
import { toast } from '../../components/feedback/feedback.js';
import StatCard from '../../components/ui/StatCard.jsx';
import AppointmentRows from './AppointmentRows.jsx';
import VisitItems from './VisitItems.jsx';
import DocumentGroup from './DocumentGroup.jsx';
import AppointmentsModal from './AppointmentsModal.jsx';
import { BillSummaryModal } from './BillDetailsModal.jsx';
import { openDigitalCopy } from './patientDocumentCopy.js';
import { BillStatusBadge } from './patientDashboardHelpers.jsx';
import { getEffectiveStatus, pastVisits, latestPastAppointment } from './patientDashboardUtils.js';
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
    documents,
    notifications,
    getBillingDocumentByRef,
  } = usePatientStore();

  const [openModal, setOpenModal] = useState(null);

  // The legacy page put .modal-open on <html> and <body> while any overlay was
  // visible; patient-dashboard.css locks scrolling off that class.
  useEffect(() => {
    if (!openModal) return undefined;
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    return () => {
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    };
  }, [openModal]);

  const past = pastVisits(visits);
  const latestAppointment = latestPastAppointment(appointments);
  const unpaid = bills.filter((b) => getEffectiveStatus(b) !== 'paid');
  const totalOwed = unpaid.reduce((sum, b) => sum + b.youPay, 0);

  /**
   * Card 3's heading and caption: renderSummaryCards() writes them and then
   * renderLastVisitSummary() immediately overwrites both, so only the latter's
   * values were ever visible. The difference is real - the summary version cut
   * the date at the first comma ("Mar 15"), the last-visit version keeps two
   * segments ("Mar 15, 2026") - so this reproduces the one that won.
   */
  const lastVisitHeading =
    past.length > 0
      ? past[0].date.split(',').slice(0, 2).join(',')
      : latestAppointment?.displayDate || '-';
  const lastVisitCaption =
    past.length > 0
      ? past[0].description
      : latestAppointment
        ? 'Last activity: ' + (latestAppointment.department || 'General') + ' appointment'
        : 'No visits yet';

  const receipts = documents.filter((doc) => doc.section === 'Receipts');
  const discharge = documents.filter((doc) => doc.section === 'Discharge Summary');
  const eod = documents.filter((doc) => doc.section === 'EOD Bills');

  function viewDocument(doc) {
    const record = getBillingDocumentByRef(doc.sourceType || '', doc.sourceId || '');
    const opened = openDigitalCopy(
      record || {
        type: doc.type || '',
        title: doc.title || '',
        ts: Date.now(),
        amount: 0,
        status: 'AVAILABLE',
      },
      { rowTitle: doc.title || '', rowType: doc.type || '' },
      profile,
    );
    if (!opened) toast('Please allow popups to view document copy.', 'warning');
  }

  return (
    <>
      <main className="dashboard-page">
        <p className="welcome-text">
          Welcome back, <span>{profile ? profile.firstName : 'Patient'}</span>! Here&apos;s your health
          summary for today.
        </p>

        <section className="dashboard-layout">
          <div className="content-area">
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
                sub={`${unpaid.length} bill${unpaid.length !== 1 ? 's' : ''} due`}
                variant={unpaid.length > 0 ? 'warning' : 'success'}
                to="/Patient/patient-billing.html"
              />
              <StatCard
                label="Last Visit"
                value={lastVisitHeading}
                sub={lastVisitCaption}
                variant="info"
              />
            </section>

            <section className="panel table-panel">
              <div className="panel-head">
                <h3>Upcoming Appointments</h3>
                <button
                  type="button"
                  className="view-all-link"
                  id="view-all-appt"
                  onClick={() => setOpenModal('appointments')}
                >
                  View All →
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AppointmentRows
                      appointments={upcomingAppointments}
                      emptyMessage="No upcoming appointments."
                    />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel visits-panel">
              <div className="panel-head">
                <h3>Recent Visits</h3>
                <button
                  type="button"
                  className="view-all-link"
                  id="toggle-visits"
                  onClick={() => setOpenModal('visits')}
                >
                  View History →
                </button>
              </div>

              <div className="visit-list">
                <VisitItems
                  visits={visits.slice(0, 3)}
                  emptyMessage="No visit history recorded."
                  departmentFontSize="11px"
                />
              </div>
            </section>

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
                        {new Date(note.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="sidebar-area">
            <section className="panel side-panel">
              <div className="panel-head">
                <h3>My Profile</h3>
              </div>

              <div className="profile-head">
                <div className="profile-avatar">{profile ? profile.initials : '--'}</div>
                <div className="profile-meta">
                  <strong>{profile ? profile.name : 'Loading...'}</strong>
                  <span>UHID: {profile ? profile.uhid : '--'}</span>
                </div>
              </div>

              {/* The legacy code addressed these three values by index
                  (.profile-grid .value[0..2]); they are explicit here. */}
              <div className="profile-grid">
                <div className="label">Age / Gender</div>
                <div className="value">{profile ? profile.age + ' yrs / ' + profile.gender : '--'}</div>

                <div className="label">Blood Group</div>
                <div className="value">{profile ? profile.bloodGroup : '--'}</div>

                <div className="label">Contact</div>
                <div className="value">{profile ? profile.phone : '--'}</div>
              </div>

              <hr />

              <div className="profile-grid insurance-grid">
                <div className="label">Insurance</div>
                <div className="value">
                  <span className="verify-badge">
                    {profile ? (profile.insurance.verified ? 'Verified' : 'Unverified') : '--'}
                  </span>
                </div>

                <div className="label">Provider</div>
                <div className="value">{profile ? profile.insurance.provider : '--'}</div>

                <div className="label">Coverage</div>
                <div className="value">
                  {profile ? '₹' + profile.insurance.coverage.toLocaleString('en-IN') : '--'}
                </div>
              </div>
            </section>

            <section className="panel side-panel">
              <div className="panel-head">
                <h3>Bill Summary</h3>
                <button
                  type="button"
                  className="view-all-link"
                  id="view-all-bills"
                  onClick={() => setOpenModal('bills')}
                >
                  View All →
                </button>
              </div>

              <div className="bill-list">
                {unpaid.length === 0 ? (
                  <div className="bill-item">
                    <div>
                      <span style={{ color: 'var(--muted)' }}>All bills paid — you&apos;re clear!</span>
                    </div>
                  </div>
                ) : (
                  unpaid.slice(0, 2).map((bill) => {
                    const safeBill = forRole(bill, 'PATIENT');
                    return (
                      <div className="bill-item" key={bill.id}>
                        <div>
                          <strong>{safeBill.billNo}</strong>
                          <span>
                            {safeBill.department} – {safeBill.date}
                          </span>
                        </div>
                        <div className="bill-meta">
                          <BillStatusBadge status={getEffectiveStatus(bill)} />
                          <strong>₹{bill.youPay.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bill-total">
                <span>Total Due</span>
                <strong>₹{totalOwed.toLocaleString('en-IN')}</strong>
              </div>
            </section>

            <section className="panel side-panel">
              <div className="panel-head">
                <h3>Documents From HOM</h3>
              </div>

              <div id="patient-documents-list" className="hom-documents-wrap">
                <div className="doc-group">
                  <div className="doc-group-header">
                    <span className="doc-group-title">Receipts</span>
                  </div>
                  <DocumentGroup
                    containerId="documents-receipts"
                    rows={receipts}
                    emptyText="No payment receipts posted yet."
                    actionLabel="View Receipt"
                    onView={viewDocument}
                  />
                </div>

                <div className="doc-group">
                  <div className="doc-group-header">
                    <span className="doc-group-title">Discharge Summary</span>
                  </div>
                  <DocumentGroup
                    containerId="documents-discharge"
                    rows={discharge}
                    emptyText="No discharge summaries available."
                    actionLabel="View Summary"
                    onView={viewDocument}
                  />
                </div>

                <div className="doc-group">
                  <div className="doc-group-header">
                    <span className="doc-group-title">EOD Bills</span>
                  </div>
                  <DocumentGroup
                    containerId="documents-eod"
                    rows={eod}
                    emptyText="No EOD bills available."
                    actionLabel="View Bill"
                    onView={viewDocument}
                  />
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <AppointmentsModal
        open={openModal === 'appointments' || openModal === 'visits'}
        view={openModal === 'visits' ? 'visits' : 'appointments'}
        onClose={() => setOpenModal(null)}
        appointments={appointments}
        visits={visits}
        onBookNew={() => {
          setOpenModal(null);
          navigate('/Patient/patient-book-appointment.html');
        }}
      />
      <BillSummaryModal
        open={openModal === 'bills'}
        onClose={() => setOpenModal(null)}
        bills={bills}
        onOpenBill={(bill) => {
          setOpenModal(null);
          navigate('/Patient/patient-billing.html?bill=' + encodeURIComponent(bill.id));
        }}
        onGoToBilling={() => {
          setOpenModal(null);
          navigate('/Patient/patient-billing.html');
        }}
      />
    </>
  );
}
