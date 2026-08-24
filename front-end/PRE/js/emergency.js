'use strict';

async function renderEmergencyRecords() {
  const table = document.getElementById('admittedTable');
  if (!table) return;

  const [preRequests, patients, doctors, beds] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.doctors.list(),
    window.ApiClient.wards.beds(),
  ]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
  const bedsById = {};
  beds.forEach((b) => (bedsById[b.bed_id] = b));

  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);
  // Both the "still awaiting a bed" (EMERGENCY) and "bed already
  // assigned" (ADMITTED, visit_type Emergency) states show here — the
  // discharge action only applies once a bed is actually assigned.
  const emergency = joined.filter(
    (r) => r.visit_type === 'Emergency' && (r.status === 'EMERGENCY' || r.status === 'ADMITTED'),
  );

  if (emergency.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Emergency Patients Found</td></tr>`;
    return;
  }

  table.innerHTML = emergency
    .map((r) => {
      const bed = bedsById[r.bed_id];
      const canDischarge = r.status === 'ADMITTED';
      return `
      <tr>
        <td>${PREHelpers.escapeHtml(r.patientUhid)}</td>
        <td>${PREHelpers.escapeHtml(r.patientName)}</td>
        <td>${PREHelpers.escapeHtml(r.patientAge)}</td>
        <td>${PREHelpers.escapeHtml(r.patientGender)}</td>
        <td>${PREHelpers.escapeHtml(r.department)}</td>
        <td>${PREHelpers.escapeHtml(r.doctorName)}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date))}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.to12Hour(r.requested_time) || '-')}</td>
        <td>Emergency</td>
        <td>${PREHelpers.escapeHtml(bed ? bed.bed_number : 'Awaiting bed')}</td>
        <td>
          ${
            canDischarge
              ? `<button class="discharge-btn" onclick="dischargePatient(${r.pre_request_id})">Discharge request</button>`
              : `<span>Awaiting HOM bed allocation</span>`
          }
        </td>
      </tr>
    `;
    })
    .join('');
}

async function dischargePatient(id) {
  try {
    await window.ApiClient.preRequests.update(id, { status: 'DISCHARGE_REQUESTED' });
    UIFeedback.toast('Patient sent to Discharge Request', 'success');
    renderEmergencyRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not request discharge', 'error');
  }
}

document.addEventListener('DOMContentLoaded', renderEmergencyRecords);
