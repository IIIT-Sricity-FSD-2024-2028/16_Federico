'use strict';

async function renderRecords() {
  const table = document.getElementById('recordTable');
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

  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById)
    .filter((r) => ['PENDING', 'DISCHARGED'].includes(r.status))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  if (joined.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Records Found</td></tr>`;
    return;
  }

  table.innerHTML = joined
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
        <td>${PREHelpers.escapeHtml(r.visit_type === 'Consultation' ? 'None' : bed ? bed.bed_number : 'None')}</td>
        <td>${PREHelpers.escapeHtml(r.visit_type || '-')}</td>
        <td>${PREHelpers.statusLabel(r.status)}</td>
      </tr>
    `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', renderRecords);
