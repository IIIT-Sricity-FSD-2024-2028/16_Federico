'use strict';

async function loadJoined() {
  const [preRequests, patients, doctors] = await Promise.all([
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
  ]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
  return PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);
}

async function renderApproved() {
  const table = document.getElementById('approvedTable');
  if (!table) return;

  const all = await loadJoined();
  const approved = all.filter((r) => ['APPROVED', 'CONSULTATION_DONE', 'EMERGENCY'].includes(r.status));

  if (approved.length === 0) {
    table.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-secondary);">No Scheduled Patients Awaiting Check-in</td></tr>`;
    return;
  }

  table.innerHTML = approved
    .map((r) => {
      const isOpd = r.visit_type === 'OPD' || r.status === 'CONSULTATION_DONE';
      const isAdmit = r.visit_type === 'Admit';
      const isEmergency = r.visit_type === 'Emergency' || r.status === 'EMERGENCY';

      let statusBadge = '<span class="badge badge-neutral">Scheduled</span>';
      if (isOpd) statusBadge = '<span class="badge badge-success">OPD Checked-In</span>';
      else if (isAdmit) statusBadge = '<span class="badge badge-info">IPD Bed Requested</span>';
      else if (isEmergency) statusBadge = '<span class="badge badge-warning">Emergency</span>';

      const dropdownHtml = `
        <select class="custom-select" onchange="setVisitType(${r.pre_request_id}, this.value)" style="padding:6px 10px; font-size:12px; border-radius:6px; border:1px solid var(--color-border); background:#fff; min-width: 170px;">
          <option value="">-- Set / Change Visit --</option>
          <option value="OPD" ${isOpd ? 'selected' : ''}>Consultation (OPD)</option>
          <option value="Admit" ${isAdmit ? 'selected' : ''}>Admit (Request Bed &rarr; HOM)</option>
          <option value="Emergency" ${isEmergency ? 'selected' : ''}>Emergency Triage</option>
        </select>
      `;

      return `
        <tr>
          <td><strong>${PREHelpers.escapeHtml(r.patientUhid)}</strong></td>
          <td>${PREHelpers.escapeHtml(r.patientName)}</td>
          <td>${PREHelpers.escapeHtml(r.patientAge)}</td>
          <td>${PREHelpers.escapeHtml(r.patientGender)}</td>
          <td>${PREHelpers.escapeHtml(r.department)}</td>
          <td>${PREHelpers.escapeHtml(r.doctorName)}</td>
          <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date))}</td>
          <td>${PREHelpers.escapeHtml(PREHelpers.to12Hour(r.requested_time) || '-')}</td>
          <td>${statusBadge}</td>
          <td>${dropdownHtml}</td>
        </tr>
      `;
    })
    .join('');
}

async function setVisitType(id, value) {
  if (!value) return;
  try {
    const res = await window.ApiClient.preRequests.checkIn(id, { visit_type: value });
    if (value === 'OPD' || value === 'Consultation') {
      window.UIFeedback?.toast('Patient checked in for Outpatient Consultation. Ledger created in FA.', 'success');
    } else if (value === 'Admit') {
      window.UIFeedback?.toast('Marked for Inpatient Admission — Bed request dispatched to HOM.', 'success');
    } else if (value === 'Emergency') {
      window.UIFeedback?.toast('Marked for Emergency Triage — Bed request dispatched to HOM.', 'success');
    }
  } catch (err) {
    window.UIFeedback?.toast(err.message || 'Could not update visit type', 'error');
  }

  await updateDashboardCounters();
  await renderApproved();
}

async function checkInPatient(id, type) {
  await setVisitType(id, type);
}

async function updateDashboardCounters() {
  const preRequests = await window.ApiClient.preRequests.list().catch(() => []);
  const pending = preRequests.filter((r) => r.status === 'PENDING').length;
  const rejected = preRequests.filter((r) => r.status === 'REJECTED').length;
  const admitted = preRequests.filter((r) => r.status === 'ADMITTED').length;
  const dischargeApproved = preRequests.filter((r) => r.status === 'DISCHARGE_APPROVED' || r.status === 'DISCHARGE_REQUESTED').length;

  const p = document.getElementById('pending');
  const r = document.getElementById('rejected');
  const a = document.getElementById('admitted');
  const d = document.getElementById('discharge-count');
  if (p) p.innerText = pending + ' Requests';
  if (r) r.innerText = rejected + ' Requests';
  if (a) a.innerText = admitted + ' Patients';
  if (d) d.innerText = dischargeApproved + ' In Queue';
}

window.checkInPatient = checkInPatient;
window.setVisitType = setVisitType;

document.addEventListener('DOMContentLoaded', () => {
  renderApproved();
  updateDashboardCounters();
});
