let joinedRequests = [];

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

async function loadPending() {
  const [preRequests, patients, doctors] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.doctors.list(),
  ]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
  joinedRequests = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById).filter(
    (r) => r.status === 'PENDING',
  );
  return doctors;
}

async function renderTable() {
  const table = document.getElementById('requestTable');
  if (!table) return;

  await loadPending();

  if (joinedRequests.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Pending Requests</td></tr>`;
    return;
  }

  table.innerHTML = joinedRequests
    .map(
      (r) => `
      <tr>
        <td>${PREHelpers.escapeHtml(r.patientUhid)}</td>
        <td>${PREHelpers.escapeHtml(r.patientAge)}</td>
        <td>${PREHelpers.escapeHtml(r.patientGender)}</td>
        <td>${PREHelpers.escapeHtml(r.patientName)}</td>
        <td>${PREHelpers.escapeHtml(r.department)}</td>
        <td>${PREHelpers.escapeHtml(r.doctorName)}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.requested_date))}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(r.created_at))}</td>
        <td>${PREHelpers.escapeHtml(PREHelpers.to12Hour(r.requested_time) || '-')}</td>
        <td>${PREHelpers.statusLabel(r.status)}</td>
        <td>
          <button class="btn approve" onclick="openApprove(${r.pre_request_id})">Approve</button>
          <button class="btn suggest" onclick="openSuggest(${r.pre_request_id})">Suggest</button>
          <button class="btn reject" onclick="reject(${r.pre_request_id})">Reject</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

async function buildDoctorSelectOptions(department, selectedDoctorId) {
  const doctors = await window.ApiClient.doctors.list();
  const sorted = PREHelpers.sortDoctorsForDepartment(doctors, department);
  if (sorted.length === 0) return '<option value="">No doctors available</option>';
  return [
    '<option value="">Select doctor</option>',
    ...sorted.map(
      (d) => `<option value="${d.doctor_id}" ${d.doctor_id === selectedDoctorId ? 'selected' : ''}>${PREHelpers.escapeHtml(d.name)} - ${PREHelpers.escapeHtml(d.specialization)}</option>`,
    ),
  ].join('');
}

async function openApprove(id) {
  const request = joinedRequests.find((r) => r.pre_request_id === id);
  const doctorOptions = await buildDoctorSelectOptions(request?.department, request?.doctor_id);

  const popup = document.createElement('div');
  popup.className = 'approve-popup';
  popup.id = 'approvePopup';
  popup.innerHTML = `
    <div class="approve-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-approve">Approval</span>
        <h2>Approve Appointment</h2>
        <p>Assign a doctor. Leave time empty to keep the patient's requested slot.</p>
      </div>
      <div class="popup-form-layout">
        <div class="popup-summary-row">
          <span class="popup-summary-pill">${PREHelpers.escapeHtml(request?.patientName || 'Patient')}</span>
          <span class="popup-summary-pill">${PREHelpers.escapeHtml(request?.department || 'General')}</span>
        </div>
        <div class="form-group">
          <label for="doctorSelect">Doctor</label>
          <select id="doctorSelect" class="custom-select popup-input">${doctorOptions}</select>
        </div>
        <div class="form-group">
          <label for="appointTime">Appointment Time</label>
          <input type="time" id="appointTime" class="popup-input" value="${PREHelpers.to24Hour(request?.requested_time)}">
          <small class="popup-helper">Optional. Leave blank to keep the requested time.</small>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmApprove(${id})">Submit</button>
        <button onclick="closePopup('approvePopup')">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

function closePopup(id) {
  document.getElementById(id)?.remove();
}

async function confirmApprove(id) {
  const doctorId = document.getElementById('doctorSelect').value;
  const time = document.getElementById('appointTime').value;
  if (!doctorId) return showSuccess('Select a doctor');

  try {
    const fieldPatch = { doctor_id: Number(doctorId) };
    if (time) fieldPatch.requested_time = PREHelpers.to12Hour(time);
    await window.ApiClient.preRequests.update(id, fieldPatch);
    await window.ApiClient.preRequests.update(id, { status: 'APPROVED' });
    closePopup('approvePopup');
    showSuccess('Approved');
    renderTable();
  } catch (err) {
    showSuccess(err.message || 'Could not approve this request');
  }
}

async function reject(id) {
  const popup = document.createElement('div');
  popup.className = 'reject-popup';
  popup.id = 'rejectPopup';
  popup.innerHTML = `
    <div class="reject-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-reject">Reject</span>
        <h2>Reject Request</h2>
        <p>Add a clear reason so the patient sees why.</p>
      </div>
      <div class="popup-form-layout">
        <div class="form-group">
          <label for="rejectReason">Reason</label>
          <textarea id="rejectReason" class="popup-textarea" placeholder="Enter reason..." rows="4"></textarea>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmReject(${id})">Submit</button>
        <button onclick="closePopup('rejectPopup')">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

async function confirmReject(id) {
  const reason = document.getElementById('rejectReason').value.trim();
  if (!reason) return showSuccess('Enter reason');

  try {
    await window.ApiClient.preRequests.update(id, { status: 'REJECTED', reject_reason: reason });
    closePopup('rejectPopup');
    showSuccess('Rejected successfully');
    renderTable();
  } catch (err) {
    showSuccess(err.message || 'Could not reject this request');
  }
}

async function openSuggest(id) {
  const request = joinedRequests.find((r) => r.pre_request_id === id);
  const doctorOptions = await buildDoctorSelectOptions(request?.department, request?.doctor_id);

  const popup = document.createElement('div');
  popup.className = 'suggest-popup';
  popup.id = 'suggestPopup';
  popup.innerHTML = `
    <div class="suggest-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-suggest">Reschedule</span>
        <h2>Suggest New Slot</h2>
      </div>
      <div class="popup-form-layout">
        <div class="popup-summary-row">
          <span class="popup-summary-pill">${PREHelpers.escapeHtml(request?.patientName || 'Patient')}</span>
          <span class="popup-summary-pill">Current: ${PREHelpers.escapeHtml(PREHelpers.to12Hour(request?.requested_time) || 'Not set')}</span>
        </div>
        <div class="form-group">
          <label for="doctorSelect">Doctor</label>
          <select id="doctorSelect" class="custom-select popup-input">${doctorOptions}</select>
        </div>
        <div class="popup-grid-two">
          <div class="form-group">
            <label for="newDate">New Date</label>
            <input type="date" id="newDate" class="popup-input" value="${request?.requested_date || ''}" min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="appointTime">New Time</label>
            <input type="time" id="appointTime" class="popup-input" value="${PREHelpers.to24Hour(request?.requested_time)}">
          </div>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmSuggest(${id})">Save</button>
        <button onclick="closePopup('suggestPopup')">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

async function confirmSuggest(id) {
  const request = joinedRequests.find((r) => r.pre_request_id === id);
  const newDate = document.getElementById('newDate').value;
  const time = document.getElementById('appointTime').value;
  const doctorId = document.getElementById('doctorSelect').value;

  if (!newDate || !doctorId) return showSuccess('Fill all required fields');

  try {
    const fieldPatch = { requested_date: newDate, doctor_id: Number(doctorId) };
    if (time) fieldPatch.requested_time = PREHelpers.to12Hour(time);
    await window.ApiClient.preRequests.update(id, fieldPatch);
    if (request?.status === 'PENDING') {
      await window.ApiClient.preRequests.update(id, { status: 'APPROVED' });
    }
    closePopup('suggestPopup');
    showSuccess('Rescheduled successfully');
    renderTable();
  } catch (err) {
    showSuccess(err.message || 'Could not reschedule this request');
  }
}

document.addEventListener('DOMContentLoaded', renderTable);
