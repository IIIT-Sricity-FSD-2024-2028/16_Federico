let requests = getPreRequests();

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getDoctorsForDepartment(department, selectedDoctor = '') {
  const doctors = getSharedDoctors();
  const selectedName = normalizeText(selectedDoctor);
  const availableDoctors = doctors.filter((doctor) => normalizeText(doctor.status) === 'available');
  const departmentKey = normalizeText(department);

  const matchingDoctors = availableDoctors.filter((doctor) => {
    const specialization = normalizeText(doctor.specialization);
    return specialization && departmentKey && (specialization.includes(departmentKey) || departmentKey.includes(specialization));
  });

  const nonMatchingDoctors = availableDoctors.filter((doctor) => {
    return !matchingDoctors.some((match) => match.id === doctor.id);
  });

  let filtered = [...matchingDoctors, ...nonMatchingDoctors];

  if (selectedName) {
    const selected = doctors.find((doctor) => normalizeText(doctor.name) === selectedName);
    if (selected && !filtered.some((doctor) => doctor.id === selected.id)) filtered.unshift(selected);
  }

  return filtered;
}

function buildDoctorSelectOptions(department, selectedDoctor = '') {
  const doctors = getDoctorsForDepartment(department, selectedDoctor);
  if (doctors.length === 0) return '<option value="">No doctors available</option>';

  return [
    '<option value="">Select doctor</option>',
    ...doctors.map((doctor) => `
      <option value="${doctor.name}" ${doctor.name === selectedDoctor ? 'selected' : ''}>
        ${doctor.name} - ${doctor.specialization} (${doctor.start} to ${doctor.end})
      </option>
    `)
  ].join('');
}

function isStoredDoctorAvailable(name) {
  const doctor = getSharedDoctors().find((item) => normalizeText(item.name) === normalizeText(name));
  return Boolean(doctor && normalizeText(doctor.status) === 'available');
}

function showSuccess(msg) {
  let el = document.getElementById('successMsg');
  let popup = document.getElementById('successPopup');

  if (el && popup) {
    el.innerText = msg;
    popup.style.display = 'flex';
  }
}

function closeSuccess() {
  let popup = document.getElementById('successPopup');
  if (popup) popup.style.display = 'none';
}

function renderTable() {
  requests = getPreRequests();
  const table = document.getElementById('requestTable');
  if (!table) return;

  table.innerHTML = '';
  const pending = requests.filter((request) => request.status === 'Pending');

  if (pending.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Pending Requests</td></tr>`;
    return;
  }

  pending.forEach((request) => {
    const index = requests.findIndex((item) => item === request);

    table.innerHTML += `
      <tr>
        <td>${request.patientId || '-'}</td>
        <td>${request.age || '-'}</td>
        <td>${request.gender || '-'}</td>
        <td>${request.name || '-'}</td>
        <td>${request.department || '-'}</td>
        <td>${request.doctor || '-'}</td>
        <td>${request.appointmentDate || '-'}</td>
        <td>${request.bookedDate || '-'}</td>
        <td>${request.appointmentTime || '-'}</td>
        <td>${request.status}</td>
        <td>
          <button class="btn approve" onclick="openApprove(${index})">Approve</button>
          <button class="btn suggest" onclick="openSuggest(${index})">Suggest</button>
          <button class="btn reject" onclick="reject(${index})">Reject</button>
        </td>
      </tr>
    `;
  });
}

function openApprove(index) {
  const request = requests[index];
  let popup = document.createElement('div');
  popup.className = 'approve-popup';
  popup.id = 'approvePopup';

  popup.innerHTML = `
    <div class="approve-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-approve">Approval</span>
        <h2>Approve Appointment</h2>
        <p>Assign an available doctor from shared PRE data. Leave time empty to keep the patient's booked slot.</p>
      </div>
      <div class="popup-form-layout">
        <div class="popup-summary-row">
          <span class="popup-summary-pill">${request?.name || 'Patient'}</span>
          <span class="popup-summary-pill">${request?.department || 'General'}</span>
          <span class="popup-summary-pill">${request?.appointmentDate || 'No date'}</span>
        </div>
        <div class="form-group">
          <label for="doctorName">Doctor</label>
          <select id="doctorName" class="custom-select popup-input">
            ${buildDoctorSelectOptions(request?.department, request?.doctor || '')}
          </select>
        </div>
        <div class="form-group">
          <label for="appointTime">Appointment Time</label>
          <input type="time" id="appointTime" class="popup-input" value="${request?.appointmentTime || ''}">
          <small class="popup-helper">Optional. If left blank, the booked time remains unchanged.</small>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmApprove(${index})">Submit</button>
        <button onclick="closeApprove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function confirmApprove(index) {
  let doctor = document.getElementById('doctorName').value.trim();
  let time = document.getElementById('appointTime').value;
  let finalTime = time || requests[index].appointmentTime || '';

  if (!doctor) {
    showSuccess('Select doctor');
    return;
  }
  if (!isStoredDoctorAvailable(doctor)) {
    showSuccess('Select an available doctor from the list');
    return;
  }
  if (!finalTime) {
    showSuccess('Select time only if you want to change it, otherwise keep the patient booked time.');
    return;
  }

  requests[index].doctor = doctor;
  requests[index].appointmentTime = finalTime;
  requests[index].status = 'Approved';
  requests[index].decided_at = Date.now();
  requests[index].updated_at = requests[index].decided_at;
  syncRequestToPatientAppointment(requests[index]);

  saveData();
  closeApprove();
  showSuccess('Approved');
}

function closeApprove() {
  let popup = document.getElementById('approvePopup');
  if (popup) popup.remove();
}

function reject(index) {
  let popup = document.createElement('div');
  popup.className = 'reject-popup';
  popup.id = 'rejectPopup';

  popup.innerHTML = `
    <div class="reject-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-reject">Reject</span>
        <h2>Reject Request</h2>
        <p>Add a clear reason so the patient and PRE flow stay aligned.</p>
      </div>
      <div class="popup-form-layout">
        <div class="popup-summary-row">
          <span class="popup-summary-pill">${requests[index]?.name || 'Patient'}</span>
          <span class="popup-summary-pill">${requests[index]?.department || 'General'}</span>
        </div>
        <div class="form-group">
          <label for="rejectReason">Reason</label>
          <textarea id="rejectReason" class="popup-textarea" placeholder="Enter reason..." rows="4"></textarea>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmReject(${index})">Submit</button>
        <button onclick="closeReject()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function closeReject() {
  let popup = document.getElementById('rejectPopup');
  if (popup) popup.remove();
}

function confirmReject(index) {
  let reason = document.getElementById('rejectReason').value.trim();

  if (!reason) {
    showSuccess('Enter reason');
    return;
  }

  requests[index].status = 'Rejected';
  requests[index].rejectReason = reason;
  requests[index].decided_at = Date.now();
  requests[index].updated_at = requests[index].decided_at;
  syncRequestToPatientAppointment(requests[index]);

  saveData();
  closeReject();
  showSuccess('Rejected successfully');
}

function openSuggest(index) {
  const request = requests[index];
  let popup = document.createElement('div');
  popup.className = 'suggest-popup';
  popup.id = 'suggestPopup';

  popup.innerHTML = `
    <div class="suggest-box">
      <div class="popup-header-block">
        <span class="popup-kicker popup-kicker-suggest">Reschedule</span>
        <h2>Suggest New Slot</h2>
        <p>Pick a doctor from shared availability and only change the time if PRE wants a different slot.</p>
      </div>
      <div class="popup-form-layout">
        <div class="popup-summary-row">
          <span class="popup-summary-pill">${request?.name || 'Patient'}</span>
          <span class="popup-summary-pill">${request?.department || 'General'}</span>
          <span class="popup-summary-pill">Current: ${request?.appointmentTime || 'Not set'}</span>
        </div>
        <div class="form-group">
          <label for="doctorName">Doctor</label>
          <select id="doctorName" class="custom-select popup-input">
            ${buildDoctorSelectOptions(request?.department, request?.doctor || '')}
          </select>
        </div>
        <div class="popup-grid-two">
          <div class="form-group">
            <label for="newDate">New Date</label>
            <input type="date" id="newDate" class="popup-input" value="${request?.appointmentDate || ''}">
          </div>
          <div class="form-group">
            <label for="appointTime">New Time</label>
            <input type="time" id="appointTime" class="popup-input" value="${request?.appointmentTime || ''}">
            <small class="popup-helper">Optional. Leave blank to keep the current time.</small>
          </div>
        </div>
      </div>
      <div class="popup-buttons">
        <button onclick="confirmSuggest(${index})">Save</button>
        <button onclick="closeSuggest()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const dateInput = document.getElementById('newDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
}

function confirmSuggest(index) {
  let newDate = document.getElementById('newDate').value;
  let newTime = document.getElementById('appointTime').value;
  let doctor = document.getElementById('doctorName').value.trim();
  let finalTime = newTime || requests[index].appointmentTime || '';

  if (!newDate || !doctor) {
    showSuccess('Fill all required fields');
    return;
  }
  if (!isStoredDoctorAvailable(doctor)) {
    showSuccess('Select an available doctor from the list');
    return;
  }
  if (!finalTime) {
    showSuccess('Select time only if you want to change it, otherwise keep the existing appointment time.');
    return;
  }

  requests[index].appointmentDate = newDate;
  requests[index].appointmentTime = finalTime;
  requests[index].doctor = doctor;
  requests[index].status = 'Rescheduled';
  requests[index].decided_at = Date.now();
  requests[index].updated_at = requests[index].decided_at;
  syncRequestToPatientAppointment(requests[index]);

  saveData();
  closeSuggest();
  showSuccess('Rescheduled successfully');
}

function closeSuggest() {
  let popup = document.getElementById('suggestPopup');
  if (popup) popup.remove();
}

function saveData() {
  savePreRequests(requests);
  renderTable();
}

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
});

bindSharedStateRefresh(() => {
  requests = getPreRequests();
  renderTable();
});
