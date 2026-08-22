async function loadJoined() {
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
  return PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById).map((r) => ({
    ...r,
    bedNumber: bedsById[r.bed_id]?.bed_number || '-',
  }));
}

function rowHtml(r, extraCell) {
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
      <td>${PREHelpers.escapeHtml(r.bedNumber)}</td>
      <td>${PREHelpers.escapeHtml(r.visit_type || '-')}</td>
      ${extraCell}
    </tr>
  `;
}

async function renderDischarge() {
  const table = document.getElementById('dischargeTable');
  if (!table) return;

  const joined = await loadJoined();
  const pending = joined.filter((r) => r.status === 'DISCHARGE_REQUESTED');

  if (pending.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Pending Requests</td></tr>`;
    return;
  }

  table.innerHTML = pending
    .map((r) => rowHtml(r, `<td style="color:orange;">${PREHelpers.escapeHtml(r.hom_status || 'Awaiting HOM')}</td>`))
    .join('');
}

async function renderApproved() {
  const table = document.getElementById('approvedDischargeTable');
  if (!table) return;

  const joined = await loadJoined();
  const approved = joined.filter((r) => r.status === 'DISCHARGE_APPROVED');

  if (approved.length === 0) {
    table.innerHTML = `<tr><td colspan="12">No Approved Requests</td></tr>`;
    return;
  }

  table.innerHTML = approved
    .map((r) =>
      rowHtml(
        r,
        `<td style="color:green;">Ready for PRE</td><td><button class="btn approve" onclick="finalApprove(${r.pre_request_id})">Approve</button></td>`,
      ),
    )
    .join('');
}

async function finalApprove(id) {
  try {
    await window.ApiClient.preRequests.update(id, { status: 'DISCHARGED' });
    UIFeedback.toast('Discharge finalized — bed released.', 'success');
    renderDischarge();
    renderApproved();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not finalize discharge', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderDischarge();
  renderApproved();
});
