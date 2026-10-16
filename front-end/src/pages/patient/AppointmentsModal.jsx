'use strict';

import DialogShell from '../../components/layout/DialogShell.jsx';
import AppointmentRows from './AppointmentRows.jsx';
import VisitItems from './VisitItems.jsx';

/**
 * The dashboard's encounter-history modal, in one of two views:
 *
 *  - view="appointments"  every booked appointment, with "+ Book New"
 *  - view="visits"        the full visit history (formerly VisitsModal.jsx)
 *
 * Both rendered the same dash-modal shell around a list of past doctor
 * encounters, so they share it here.
 */
const TITLES = {
  appointments: 'All Appointments',
  visits: 'Full Visit History',
};

export default function AppointmentsModal({ open, view = 'appointments', onClose, appointments, visits, onBookNew }) {
  if (!open) return null;

  return (
    <DialogShell
      open
      onClose={onClose}
      title={TITLES[view]}
      subtitle={view === 'visits' ? 'Complete clinical visit and outpatient consultation log.' : 'All scheduled and completed consultations.'}
      footer={
        view === 'appointments' ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="modal-book-btn" type="button" id="modal-book-new" onClick={onBookNew}>
              + Book New Appointment
            </button>
          </div>
        ) : null
      }
    >
      {view === 'visits' ? (
        <div className="visit-list modal-visit-list">
          <VisitItems
            visits={visits}
            emptyMessage="No visit history recorded yet."
            departmentFontSize="12px"
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Department / Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <AppointmentRows appointments={appointments} emptyMessage="No appointments found." />
            </tbody>
          </table>
        </div>
      )}
    </DialogShell>
  );
}
