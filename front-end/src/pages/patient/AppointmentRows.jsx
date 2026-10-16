'use strict';

import { StatusBadge, DoctorLine } from './patientDashboardHelpers.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/**
 * The appointments <tbody> is rendered twice with the same markup: once in the
 * dashboard's "Upcoming Appointments" panel (upcoming only) and once in the
 * All Appointments modal (everything). Only the empty-state copy differs.
 */
export default function AppointmentRows({ appointments, emptyMessage }) {
  if (appointments.length === 0) {
    return <EmptyState asTableRow colSpan={4} title={emptyMessage} />;
  }

  return appointments.map((a) => (
    <tr key={a.id}>
      <td>
        <strong>{a.displayDate}</strong>
      </td>
      <td>{a.time}</td>
      <td>
        <strong>{a.department}</strong>
        <DoctorLine doctorName={a.doctorName} />
      </td>
      <td>
        <StatusBadge status={a.status} />
      </td>
    </tr>
  ));
}

