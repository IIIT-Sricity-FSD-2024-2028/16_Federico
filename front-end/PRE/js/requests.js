let requests = getPreRequests();

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function toTimeInputValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'AM') {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function toDisplayAppointmentTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/am|pm/i.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw;

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

function toMinutesSinceMidnight(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return (hours * 60) + minutes;
  }

  match = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  if (meridiem === 'AM') {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return (hours * 60) + minutes;
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

function getDoctorByName(name) {
  return getSharedDoctors().find((item) => normalizeText(item.name) === normalizeText(name)) || null;
}

function isDoctorAvailableAtTime(doctorName, appointmentTime) {
  const doctor = getDoctorByName(doctorName);
  if (!doctor) return false;

  const appointmentMinutes = toMinutesSinceMidnight(appointmentTime);
  const startMinutes = toMinutesSinceMidnight(doctor.start);
  const endMinutes = toMinutesSinceMidnight(doctor.end);

  if (appointmentMinutes === null || startMinutes === null || endMinutes === null) return false;
  return appointmentMinutes >= startMinutes && appointmentMinutes <= endMinutes;
}

function setPopupValidationState(message = '', isInvalid = false) {
  const messageEl = document.getElementById('popupValidationMessage');
  const submitButton = document.getElementById('popupSubmitButton');
  const doctorInput = document.getElementById('doctorName');
  const timeInput = document.getElementById('appointTime');

  if (messageEl) {
    messageEl.textContent = message;
    messageEl.classList.toggle('is-invalid', Boolean(isInvalid && message));
    messageEl.classList.toggle('is-valid', Boolean(!isInvalid && message));
  }

  if (doctorInput) doctorInput.classList.toggle('input-invalid', Boolean(isInvalid));
  if (timeInput) timeInput.classList.toggle('input-invalid', Boolean(isInvalid));
  if (submitButton) submitButton.disabled = Boolean(isInvalid);
}

function updatePopupAvailabilityFeedback(fallbackTime = '') {
  const doctor = document.getElementById('doctorName')?.value.trim() || '';
  const timeValue = document.getElementById('appointTime')?.value || '';
  const doctorDetails = getDoctorByName(doctor);
  const finalTime = toDisplayAppointmentTime(timeValue || fallbackTime || '');

  if (!doctor) {
    setPopupValidationState('');
    return true;
  }

  if (!doctorDetails || !isStoredDoctorAvailable(doctor)) {
    setPopupValidationState('Select an available doctor from the list', true);
    return false;
  }

  if (!finalTime) {
    setPopupValidationState(`Doctor available from ${doctorDetails.start} to ${doctorDetails.end}`);
    return true;
  }

  if (!isDoctorAvailableAtTime(doctor, finalTime)) {
    setPopupValidationState('Doctor not available at this time', true);
    return false;
  }

  setPopupValidationState(`Doctor available from ${doctorDetails.start} to ${doctorDetails.end}`);
  return true;
}

function bindPopupAvailabilityValidation(fallbackTime = '') {
  const doctorInput = document.getElementById('doctorName');
  const timeInput = document.getElementById('appointTime');
  if (!doctorInput || !timeInput) return;

  const handler = () => updatePopupAvailabilityFeedback(fallbackTime);
  doctorInput.addEventListener('change', handler);
  timeInput.addEventListener('input', handler);
  handler();
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
          <input type="time" id="appointTime" class="popup-input" value="${toTimeInputValue(request?.appointmentTime)}">
          <small class="popup-helper">Optional. If left blank, the booked time remains unchanged.</small>
        </div>
        <div id="popupValidationMessage" class="popup-validation-message" aria-live="polite"></div>
      </div>
      <div class="popup-buttons">
        <button id="popupSubmitButton" onclick="confirmApprove(${index})">Submit</button>
        <button onclick="closeApprove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  bindPopupAvailabilityValidation(request?.appointmentTime || '');
}

function confirmApprove(index) {
  let doctor = document.getElementById('doctorName').value.trim();
  let time = document.getElementById('appointTime').value;
  let finalTime = toDisplayAppointmentTime(time || requests[index].appointmentTime || '');

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
  if (!updatePopupAvailabilityFeedback(requests[index].appointmentTime || '')) {
    return;
  }

  requests[index].doctor = doctor;
  requests[index].appointmentTime = finalTime;
  requests[index].status = 'Approved';
  requests[index].patientStatus = 'Approved';
  requests[index].visitType = requests[index].visitType || "";
  requests[index].decided_at = Date.now();
  requests[index].updated_at = requests[index].decided_at;

  const visitType = String(requests[index].visitType || '').trim().toLowerCase();
  const shouldSendToHom = visitType === 'admit' || visitType === 'emergency';
  if (shouldSendToHom) {
    const inferredWard = requests[index].preferredWard || requests[index].wardType || "";
    requests[index].homStatus = "Bed request sent";
    sendPreRequestToHOM(
      requests[index],
      inferredWard,
      visitType === "emergency" ? "Critical" : "High",
    );
  }

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
  requests[index].patientStatus = 'Rejected';
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
            <input type="time" id="appointTime" class="popup-input" value="${toTimeInputValue(request?.appointmentTime)}">
            <small class="popup-helper">Optional. Leave blank to keep the current time.</small>
          </div>
        </div>
        <div id="popupValidationMessage" class="popup-validation-message" aria-live="polite"></div>
      </div>
      <div class="popup-buttons">
        <button id="popupSubmitButton" onclick="confirmSuggest(${index})">Save</button>
        <button onclick="closeSuggest()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const dateInput = document.getElementById('newDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
  bindPopupAvailabilityValidation(request?.appointmentTime || '');
}

function confirmSuggest(index) {
  let newDate = document.getElementById('newDate').value;
  let newTime = document.getElementById('appointTime').value;
  let doctor = document.getElementById('doctorName').value.trim();
  let finalTime = toDisplayAppointmentTime(newTime || requests[index].appointmentTime || '');

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
  if (!updatePopupAvailabilityFeedback(requests[index].appointmentTime || '')) {
    return;
  }

  requests[index].appointmentDate = newDate;
  requests[index].appointmentTime = finalTime;
  requests[index].doctor = doctor;
  requests[index].status = 'Approved';
  requests[index].patientStatus = 'Approved';
  requests[index].visitType = requests[index].visitType || 'Consultation';
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
