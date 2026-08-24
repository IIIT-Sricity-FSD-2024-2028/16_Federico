'use strict';

async function renderRejected() {
  const table = document.getElementById('rejectedTable');
  if (!table) return;

  const [preRequests, patients] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
  ]);
  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, {});
  const rejectedList = joined.filter((r) => r.status === 'REJECTED');

  if (rejectedList.length === 0) {
    table.innerHTML = `<tr><td colspan="9">No Rejected Requests</td></tr>`;
    return;
  }

  table.innerHTML = rejectedList
    .map(
      (r) => `
      <tr>
        <td>${PREHelpers.escapeHtml(r.patientUhid)}</td>
        <td>${PREHelpers.escapeHtml(r.patientAge)}</td>
        <td>${PREHelpers.escapeHtml(r.patientGender)}</td>
        <td>${PREHelpers.escapeHtml(r.patientName)}</td>
        <td>${PREHelpers.escapeHtml(r.department)}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date))}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.created_at))}</td>
        <td>${PREHelpers.escapeHtml(r.reject_reason || '-')}</td>
        <td>${PREHelpers.statusLabel(r.status)}</td>
      </tr>
    `,
    )
    .join('');
}

document.addEventListener('DOMContentLoaded', renderRejected);
