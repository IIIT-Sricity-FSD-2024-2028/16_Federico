function showSuccess(msg) {
  const el = document.getElementById('successMsg');
  const popup = document.getElementById('successPopup');
  if (el && popup) {
    el.innerText = msg;
    popup.style.display = 'flex';
  }
}
function closeSuccess() {
  const popup = document.getElementById('successPopup');
  if (popup) popup.style.display = 'none';
}

async function loadJoined() {
  const [preRequests, patients, doctors] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.doctors.list(),
  ]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
  return PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);
}

async function renderApproved() {
  const table = document.getElementById('approvedTable');
  if (!table) return;

  const all = await loadJoined();
  const approved = all.filter((r) => r.status === 'APPROVED');

  if (approved.length === 0) {
    table.innerHTML = `<tr><td colspan="10">No Approved Patients</td></tr>`;
    return;
  }

  table.innerHTML = approved
    .map(
      (r) => `
      <tr>
        <td>${PREHelpers.escapeHtml(r.patientUhid)}</td>
        <td>${PREHelpers.escapeHtml(r.patientName)}</td>
        <td>${PREHelpers.escapeHtml(r.patientAge)}</td>
        <td>${PREHelpers.escapeHtml(r.patientGender)}</td>
        <td>${PREHelpers.escapeHtml(r.department)}</td>
        <td>${PREHelpers.escapeHtml(r.doctorName)}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date))}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.to12Hour(r.requested_time) || '-')}</td>
        <td>${PREHelpers.escapeHtml(r.visit_type || '')}</td>
        <td>
          <select class="custom-select" onchange="setVisitType(${r.pre_request_id}, this.value)">
            <option value="">-- Select Visit --</option>
            <option value="Emergency" ${r.visit_type === 'Emergency' ? 'selected' : ''}>Emergency</option>
            <option value="Consultation" ${r.visit_type === 'Consultation' ? 'selected' : ''}>Consultation</option>
            <option value="Admit" ${r.visit_type === 'Admit' ? 'selected' : ''}>Admit (request a bed from PRE &rarr; HOM Requests)</option>
          </select>
        </td>
      </tr>
    `,
    )
    .join('');
}

async function setVisitType(id, value) {
  try {
    await window.ApiClient.preRequests.update(id, { visit_type: value });

    if (value === 'Emergency') {
      await window.ApiClient.preRequests.update(id, { status: 'EMERGENCY' });
      showSuccess('Visit type set to Emergency — request a bed from the HOM Requests page.');
    } else if (value === 'Consultation') {
      await window.ApiClient.preRequests.update(id, { status: 'CONSULTATION_DONE' });
      showSuccess('Consultation completed and closed.');
    } else if (value === 'Admit') {
      showSuccess('Marked for admission — request a bed from the HOM Requests page.');
    }
  } catch (err) {
    showSuccess(err.message || 'Could not update visit type');
  }

  updateDashboardCounters();
  renderApproved();
}

async function updateDashboardCounters() {
  const preRequests = await window.ApiClient.preRequests.list();
  const pending = preRequests.filter((r) => r.status === 'PENDING').length;
  const rejected = preRequests.filter((r) => r.status === 'REJECTED').length;
  const admitted = preRequests.filter((r) => r.status === 'ADMITTED').length;

  const p = document.getElementById('pending');
  const r = document.getElementById('rejected');
  const a = document.getElementById('admitted');
  if (p) p.innerText = pending + ' Requests';
  if (r) r.innerText = rejected + ' Requests';
  if (a) a.innerText = admitted + ' Patients';
}

document.addEventListener('DOMContentLoaded', () => {
  renderApproved();
  updateDashboardCounters();
});
