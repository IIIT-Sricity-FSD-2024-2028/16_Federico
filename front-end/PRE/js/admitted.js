'use strict';

async function renderAdmittedRecords() {
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
  const admitted = joined.filter((r) => r.status === 'ADMITTED' && r.visit_type !== 'Emergency');

  if (admitted.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Admitted Patients Found</td></tr>`;
    return;
  }

  table.innerHTML = admitted
    .map((r) => {
      const bed = bedsById[r.bed_id];
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
        <td>Admitted</td>
        <td>${PREHelpers.escapeHtml(bed ? bed.bed_number : '-')}</td>
        <td>
          <button class="btn reject" onclick="dischargePatient(${r.pre_request_id})">Discharge request</button>
        </td>
      </tr>
    `;
    })
    .join('');
}

async function dischargePatient(id) {
  try {
    await window.ApiClient.preRequests.update(id, { status: 'DISCHARGE_REQUESTED' });
    UIFeedback.toast('Discharge request sent to HOM', 'success');
    renderAdmittedRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not request discharge', 'error');
  }
}

document.addEventListener('DOMContentLoaded', renderAdmittedRecords);
