'use strict';

/**
 * PRE/js/emergency.js — Emergency Triage, Bed Allocation & Discharge Management.
 * Provides real-time synchronization between PRE, HOM, and the Patient Portal.
 */

let emergencyRecords = [];
let allPatients = [];
let allDoctors = [];

async function loadEmergencyData() {
  const [preRequests, patients, doctors, beds, bedRequests] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.doctors.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.wards.bedRequests.list().catch(() => []),
  ]);

  allPatients = patients || [];
  allDoctors = doctors || [];

  const doctorsById = {};
  (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));

  const bedsById = {};
  (beds || []).forEach((b) => (bedsById[b.bed_id] = b));

  const pendingBedRequests = new Set(
    (bedRequests || []).filter((br) => br.status === 'PENDING').map((br) => br.pre_request_id),
  );

  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);

  // Ingest all active emergency pre-requests and admissions
  emergencyRecords = joined
    .filter((r) => {
      const isEmergencyType = r.visit_type === 'Emergency';
      const isEmergencyStatus = r.status === 'EMERGENCY';
      const isAdmittedEmergency = isEmergencyType && ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(r.status);
      const isPendingEmergency = isEmergencyType && ['PENDING', 'APPROVED', 'EMERGENCY'].includes(r.status);
      return isEmergencyStatus || isAdmittedEmergency || isPendingEmergency;
    })
    .map((r) => ({
      ...r,
      bed: bedsById[r.bed_id] || null,
      hasPendingBedRequest: pendingBedRequests.has(r.pre_request_id),
    }));

  return emergencyRecords;
}

function updateEmergencyKPIs(records) {
  const total = records.length;
  const awaitingBed = records.filter((r) => !r.bed_id && (r.status === 'EMERGENCY' || r.status === 'PENDING' || r.status === 'APPROVED')).length;
  const admitted = records.filter((r) => r.status === 'ADMITTED').length;
  const dischargePending = records.filter((r) => r.status === 'DISCHARGE_REQUESTED' || r.status === 'DISCHARGE_APPROVED').length;

  const totalEl = document.getElementById('total-emergency');
  const awaitingEl = document.getElementById('awaiting-bed');
  const admittedEl = document.getElementById('admitted-emergency');
  const dischargeEl = document.getElementById('discharge-emergency');

  if (totalEl) totalEl.innerText = `${total} Cases`;
  if (awaitingEl) awaitingEl.innerText = `${awaitingBed} Cases`;
  if (admittedEl) admittedEl.innerText = `${admitted} Patients`;
  if (dischargeEl) dischargeEl.innerText = `${dischargePending} In Queue`;
}

async function renderEmergencyRecords() {
  const table = document.getElementById('admittedTable');
  if (!table) return;

  try {
    await loadEmergencyData();
  } catch (err) {
    table.innerHTML = `<tr><td colspan="9" style="color:var(--status-error);">Failed to load emergency records: ${PREHelpers.escapeHtml(err.message)}</td></tr>`;
    return;
  }

  updateEmergencyKPIs(emergencyRecords);

  const query = (document.getElementById('emergencySearch')?.value || '').trim().toLowerCase();
  const filtered = emergencyRecords.filter((r) => {
    if (!query) return true;
    const matchUhid = (r.patientUhid || '').toLowerCase().includes(query);
    const matchName = (r.patientName || '').toLowerCase().includes(query);
    const matchDept = (r.department || '').toLowerCase().includes(query);
    const matchDoctor = (r.doctorName || '').toLowerCase().includes(query);
    return matchUhid || matchName || matchDept || matchDoctor;
  });

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="9">No emergency cases found</td></tr>`;
    return;
  }

  table.innerHTML = filtered
    .map((r) => {
      const isAdmitted = r.status === 'ADMITTED';
      const isDischargeRequested = r.status === 'DISCHARGE_REQUESTED';
      const isDischargeApproved = r.status === 'DISCHARGE_APPROVED';
      const isAwaitingBed = !r.bed_id && (r.status === 'EMERGENCY' || r.status === 'PENDING' || r.status === 'APPROVED');

      let statusBadge = `<span class="status pending">Emergency</span>`;
      if (isAwaitingBed) {
        statusBadge = `<span class="status overdue" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Critical Triage</span>`;
      } else if (isAdmitted) {
        statusBadge = `<span class="status confirmed">Admitted</span>`;
      } else if (isDischargeRequested) {
        statusBadge = `<span class="status pending" style="background:#fef3c7; color:#b45309;">Discharge Pending</span>`;
      } else if (isDischargeApproved) {
        statusBadge = `<span class="status confirmed" style="background:#dcfce7; color:#15803d;">Discharge Ready</span>`;
      }

      let bedDisplay = `<span style="color:var(--color-muted-fg); font-style:italic;">Awaiting Bed</span>`;
      if (r.bed) {
        bedDisplay = `<strong>${PREHelpers.escapeHtml(r.bed.bed_number)}</strong> <small style="color:var(--color-muted-fg);">(${PREHelpers.escapeHtml(r.bed.ward_type || 'ICU/Emergency')})</small>`;
      }

      let actionBtn = '';
      if (isAwaitingBed) {
        if (r.hasPendingBedRequest) {
          actionBtn = `<span style="color:var(--status-warning-fg, #b45309); font-size:12px; font-weight:600;">Bed Request Queued in HOM</span>`;
        } else {
          actionBtn = `<button class="btn green" type="button" onclick="requestHomBed(${r.pre_request_id}, '${PREHelpers.escapeHtml(r.department || 'Emergency')}', ${r.patient_id}, '${PREHelpers.escapeHtml(r.patientName || 'Patient')}')">Request Bed from HOM</button>`;
        }
      } else if (isAdmitted) {
        actionBtn = `<button class="discharge-btn" type="button" onclick="dischargePatient(${r.pre_request_id})">Discharge Request</button>`;
      } else if (isDischargeRequested) {
        actionBtn = `<span style="color:var(--color-muted-fg); font-size:12px;">Awaiting HOM Clearance</span>`;
      } else if (isDischargeApproved) {
        actionBtn = `<button class="btn approve" type="button" onclick="finalizeDischarge(${r.pre_request_id})">Finalize Release</button>`;
      }

      return `
        <tr>
          <td><strong>${PREHelpers.escapeHtml(r.patientUhid)}</strong></td>
          <td>
            <strong>${PREHelpers.escapeHtml(r.patientName)}</strong>
            ${r.note ? `<div style="font-size:11px; color:var(--color-muted-fg); max-width:200px; margin-top:2px;">"${PREHelpers.escapeHtml(r.note)}"</div>` : ''}
          </td>
          <td>${PREHelpers.escapeHtml(r.patientAge || '—')} / ${PREHelpers.escapeHtml(r.patientGender || '—')}</td>
          <td>${PREHelpers.escapeHtml(r.department || 'Emergency Medicine')}</td>
          <td>${PREHelpers.escapeHtml(r.doctorName || 'On-Duty ER Doctor')}</td>
          <td>
            ${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date || r.created_at))}
            <div style="font-size:11px; color:var(--color-muted-fg);">${PREHelpers.escapeHtml(PREHelpers.to12Hour(r.requested_time) || 'Immediate')}</div>
          </td>
          <td>${statusBadge}</td>
          <td>${bedDisplay}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    })
    .join('');
}

async function requestHomBed(preRequestId, department, patientId, patientName) {
  try {
    await window.ApiClient.wards.bedRequests.create({
      pre_request_id: preRequestId,
      patient_id: patientId,
      priority: 'CRITICAL',
      notes: `Urgent Emergency Bed Request for ${patientName} (${department})`,
    });
    UIFeedback.toast(`Emergency bed request queued for HOM triage.`, 'success');
    renderEmergencyRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not queue bed request', 'error');
  }
}

async function dischargePatient(id) {
  try {
    await window.ApiClient.preRequests.update(id, { status: 'DISCHARGE_REQUESTED' });
    UIFeedback.toast('Discharge request sent to HOM', 'success');
    renderEmergencyRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not request discharge', 'error');
  }
}

async function finalizeDischarge(id) {
  try {
    await window.ApiClient.preRequests.update(id, { status: 'DISCHARGED' });
    UIFeedback.toast('Emergency patient discharged and bed released.', 'success');
    renderEmergencyRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not finalize discharge', 'error');
  }
}

// ── Modal Handling for Walk-In Emergency Registration ────────
function openEmergencyModal() {
  const modal = document.getElementById('emergencyModal');
  if (!modal) return;

  const patientSelect = document.getElementById('emergencyPatientSelect');
  if (patientSelect) {
    patientSelect.innerHTML =
      '<option value="">-- Select Existing Patient --</option>' +
      allPatients.map((p) => `<option value="${p.patient_id}">${PREHelpers.escapeHtml(p.uhid)} - ${PREHelpers.escapeHtml(p.name)} (${p.phone || 'No phone'})</option>`).join('');
  }

  const doctorSelect = document.getElementById('emergencyDoctorSelect');
  if (doctorSelect) {
    doctorSelect.innerHTML =
      '<option value="">-- Assign Emergency Specialist (Optional) --</option>' +
      allDoctors.map((d) => `<option value="${d.doctor_id}">${PREHelpers.escapeHtml(d.name)} - ${PREHelpers.escapeHtml(d.specialization)}</option>`).join('');
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
}

function closeEmergencyModal() {
  const modal = document.getElementById('emergencyModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function toggleQuickPatientFields() {
  const fields = document.getElementById('quickPatientFields');
  const btn = document.getElementById('btnToggleNewPatient');
  if (!fields) return;

  const isHidden = fields.style.display === 'none';
  fields.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.innerText = isHidden ? '- Use Existing Patient Dropdown' : '+ Or Quick Create New Patient';
}

async function submitEmergencyRegistration() {
  let patientId = document.getElementById('emergencyPatientSelect')?.value;
  const isQuickPatient = document.getElementById('quickPatientFields')?.style.display !== 'none';

  if (isQuickPatient) {
    const name = document.getElementById('quickName')?.value.trim();
    const age = document.getElementById('quickAge')?.value.trim();
    const gender = document.getElementById('quickGender')?.value;
    const phone = document.getElementById('quickPhone')?.value.trim();

    if (!name || !age || !phone) {
      return UIFeedback.toast('Please enter patient name, age, and phone', 'error');
    }

    const birthYear = new Date().getFullYear() - Number(age);
    const approximateDob = `${birthYear}-01-01`;

    try {
      const createdPatient = await window.ApiClient.patients.create({
        name,
        dob: approximateDob,
        gender,
        phone,
        address: 'Emergency Walk-In',
      });
      patientId = createdPatient.patient_id;
      allPatients.push(createdPatient);
    } catch (err) {
      return UIFeedback.toast(err.message || 'Could not register new patient', 'error');
    }
  }

  if (!patientId) {
    return UIFeedback.toast('Please select or create a patient', 'error');
  }

  const department = document.getElementById('emergencyDeptSelect')?.value || 'Emergency Medicine';
  const doctorId = document.getElementById('emergencyDoctorSelect')?.value || null;
  const notes = document.getElementById('emergencyNotes')?.value.trim() || 'Urgent walk-in emergency';
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  try {
    const preRequest = await window.ApiClient.preRequests.create({
      patient_id: Number(patientId),
      department,
      doctor_id: doctorId ? Number(doctorId) : null,
      visit_type: 'Emergency',
      status: 'EMERGENCY',
      requested_date: today,
      requested_time: nowTime,
      note: notes,
    });

    // Auto-create urgent HOM bed request
    await window.ApiClient.wards.bedRequests.create({
      pre_request_id: preRequest.pre_request_id,
      patient_id: Number(patientId),
      priority: 'CRITICAL',
      notes: `Urgent Emergency Bed Request (${department}): ${notes}`,
    });

    UIFeedback.toast(`Emergency case #${preRequest.pre_request_id} registered and queued to HOM!`, 'success');
    closeEmergencyModal();
    renderEmergencyRecords();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not register emergency case', 'error');
  }
}

window.requestHomBed = requestHomBed;
window.dischargePatient = dischargePatient;
window.finalizeDischarge = finalizeDischarge;
window.openEmergencyModal = openEmergencyModal;
window.closeEmergencyModal = closeEmergencyModal;
window.toggleQuickPatientFields = toggleQuickPatientFields;
window.submitEmergencyRegistration = submitEmergencyRegistration;

document.addEventListener('DOMContentLoaded', () => {
  renderEmergencyRecords();

  const searchInput = document.getElementById('emergencySearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderEmergencyRecords());
  }

  const modal = document.getElementById('emergencyModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeEmergencyModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeEmergencyModal();
    }
  });
});

