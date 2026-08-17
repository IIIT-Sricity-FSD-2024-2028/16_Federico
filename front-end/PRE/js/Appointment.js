let appointmentPatientCatalog = [];
let appointmentPickerOpen = false;
let selectedAppointmentPatient = null;

// ── ERROR / SUCCESS HELPERS ─────────────────────────────
function showError(msg) {
  document.getElementById('errorMsg').innerText = msg;
}
function showPopupError(msg) {
  document.getElementById('popupError').innerText = msg;
}
function clearError() {
  document.getElementById('errorMsg').innerText = '';
}
function clearPopupError() {
  document.getElementById('popupError').innerText = '';
}
function showSuccess(msg) {
  document.getElementById('successMsg').innerText = msg;
  document.getElementById('successPopup').style.display = 'flex';
}
function closeSuccess() {
  document.getElementById('successPopup').style.display = 'none';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── VALIDATION ───────────────────────────────────────────
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}
function isValidAge(age) {
  return /^[1-9]\d*$/.test(String(age || '').trim());
}
function isValidPatientName(name) {
  return /^[A-Za-z\s.'-]+$/.test(String(name || '').trim());
}
function sanitizePatientName(value) {
  return String(value || '').replace(/[^A-Za-z\s.'-]/g, '');
}
function sanitizeAge(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function handleNameInput(inputId, errorRenderer, clearRenderer) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const original = input.value;
    const sanitized = sanitizePatientName(original);
    if (original !== sanitized) {
      input.value = sanitized;
      errorRenderer('Name should contain letters only');
      return;
    }
    if (!input.value.trim()) return clearRenderer();
    if (!isValidPatientName(input.value)) return errorRenderer('Name should contain letters only');
    clearRenderer();
  });
}

function handleAgeInput(inputId, errorRenderer, clearRenderer) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const original = input.value;
    const sanitized = sanitizeAge(original);
    if (original !== sanitized) {
      input.value = sanitized;
      errorRenderer('Age only number');
      return;
    }
    if (!input.value.trim()) return clearRenderer();
    if (!isValidAge(input.value)) return errorRenderer('Enter age as a positive integer only');
    clearRenderer();
  });
}

// ── REAL PATIENT CATALOG (backend-backed) ───────────────
async function loadPatientCatalog() {
  appointmentPatientCatalog = await window.ApiClient.patients.list();
  return appointmentPatientCatalog;
}

function toPickerShape(patient) {
  return {
    patientId: patient.uhid,
    realId: patient.patient_id,
    name: patient.name,
    age: PREHelpers.formatAge(patient.dob),
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
  };
}

function getAppointmentPickerElements() {
  return {
    picker: document.getElementById('appointmentPatientPicker'),
    dropdown: document.getElementById('appointmentPatientDropdown'),
    patientIdInput: document.getElementById('patientId'),
  };
}

function setAppointmentPickerVisibility(isVisible) {
  const { picker, dropdown } = getAppointmentPickerElements();
  if (!picker || !dropdown) return;
  appointmentPickerOpen = isVisible;
  dropdown.hidden = !isVisible;
  picker.classList.toggle('is-open', isVisible);
}

function fillPatientForm(pickerPatient) {
  selectedAppointmentPatient = pickerPatient;
  document.getElementById('patientId').value = pickerPatient.patientId || '';
  document.getElementById('patientName').value = pickerPatient.name || '';
  document.getElementById('age').value = pickerPatient.age || '';
  document.getElementById('gender').value = pickerPatient.gender || '';
  document.getElementById('phone').value = pickerPatient.phone || '';
  document.getElementById('address').value = pickerPatient.address || '';
}

function renderAppointmentPatientDropdown(query = '') {
  const { dropdown } = getAppointmentPickerElements();
  if (!dropdown) return;

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const matches = appointmentPatientCatalog
    .map(toPickerShape)
    .filter((p) => {
      if (!normalizedQuery) return true;
      return [p.patientId, p.name, p.phone].join(' ').toLowerCase().includes(normalizedQuery);
    });

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="appointment-picker-empty">
        <strong>No matching patients</strong>
        <span>Register a new patient below if this is their first visit.</span>
      </div>
    `;
    setAppointmentPickerVisibility(true);
    return;
  }

  dropdown.innerHTML = matches
    .map(
      (p) => `
    <button type="button" class="appointment-picker-option" data-patient-id="${escapeHtml(p.patientId)}">
      <div class="appointment-picker-row">
        <strong>${escapeHtml(p.patientId)}</strong>
      </div>
      <div class="appointment-picker-row appointment-picker-meta">
        <span>${escapeHtml(p.name)}</span>
        <span>${escapeHtml(p.phone || 'No phone')}</span>
      </div>
    </button>
  `,
    )
    .join('');

  dropdown.querySelectorAll('.appointment-picker-option').forEach((button) => {
    button.addEventListener('click', () => {
      const patient = matches.find((p) => p.patientId === button.dataset.patientId);
      if (!patient) return;
      fillPatientForm(patient);
      setAppointmentPickerVisibility(false);
      clearError();
    });
  });

  setAppointmentPickerVisibility(true);
}

function bindAppointmentPatientPicker() {
  const { picker, patientIdInput } = getAppointmentPickerElements();
  if (!picker || !patientIdInput) return;

  patientIdInput.addEventListener('focus', () => renderAppointmentPatientDropdown(patientIdInput.value));
  patientIdInput.addEventListener('click', () => renderAppointmentPatientDropdown(patientIdInput.value));
  patientIdInput.addEventListener('input', () => {
    if (selectedAppointmentPatient && patientIdInput.value.trim() !== selectedAppointmentPatient.patientId) {
      selectedAppointmentPatient = null;
    }
    renderAppointmentPatientDropdown(patientIdInput.value);
  });
  patientIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setAppointmentPickerVisibility(false);
  });
  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target)) setAppointmentPickerVisibility(false);
  });
}

function bindAppointmentFormFieldBehavior() {
  const nonPickerFieldIds = [
    'searchPhone', 'patientName', 'age', 'gender', 'phone', 'appointmentDate', 'department', 'address',
    'newName', 'newAge', 'newGender', 'newPhone', 'newAddress',
  ];
  nonPickerFieldIds.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.addEventListener('focus', () => setAppointmentPickerVisibility(false));
    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') field.setAttribute('autocomplete', 'off');
  });
}

// ── SEARCH BY PHONE ──────────────────────────────────────
async function searchPatient() {
  clearError();
  const phone = document.getElementById('searchPhone').value.trim();
  if (!isValidPhone(phone)) return showError('Enter valid 10 digit phone');

  await loadPatientCatalog();
  const found = appointmentPatientCatalog.find((p) => (p.phone || '').replace(/\D/g, '').endsWith(phone));

  if (found) {
    fillPatientForm(toPickerShape(found));
    setAppointmentPickerVisibility(false);
    openSearchResultPopup(toPickerShape(found));
  } else {
    showError('Patient not found');
  }
}

function openPatientPopup() {
  clearPopupError();
  document.getElementById('patientPopup').style.display = 'flex';
}
function closePatientPopup() {
  document.getElementById('patientPopup').style.display = 'none';
}
function openSearchResultPopup(patient) {
  const popup = document.getElementById('searchResultPopup');
  document.getElementById('searchResultPatientId').innerText = patient.patientId || '-';
  document.getElementById('searchResultPatientName').innerText = patient.name || '-';
  if (popup) popup.style.display = 'flex';
}
function closeSearchResultPopup() {
  const popup = document.getElementById('searchResultPopup');
  if (popup) popup.style.display = 'none';
}

// ── REGISTER NEW PATIENT (real backend record) ──────────
async function registerPatient() {
  clearPopupError();

  const name = document.getElementById('newName').value.trim();
  const age = document.getElementById('newAge').value.trim();
  const gender = document.getElementById('newGender').value;
  const phone = document.getElementById('newPhone').value.trim();
  const address = document.getElementById('newAddress').value.trim();

  if (!name || !age || !gender || !phone || !address) return showPopupError('Please fill all required fields');
  if (!isValidPatientName(name)) return showPopupError('Name should contain letters only');
  if (!isValidAge(age)) return showPopupError('Enter age as a positive integer only');
  if (!isValidPhone(phone)) return showPopupError('Phone must be 10 digits');

  // The quick-register form only collects age (not a full DOB) — approximate
  // a DOB from it since the backend's patient record requires one.
  const birthYear = new Date().getFullYear() - Number(age);
  const approximateDob = `${birthYear}-01-01`;

  try {
    const patient = await window.ApiClient.patients.create({
      name,
      dob: approximateDob,
      gender,
      phone,
      address,
    });

    appointmentPatientCatalog.push(patient);
    fillPatientForm(toPickerShape(patient));

    document.getElementById('newName').value = '';
    document.getElementById('newAge').value = '';
    document.getElementById('newGender').value = '';
    document.getElementById('newPhone').value = '';
    document.getElementById('newAddress').value = '';

    closePatientPopup();
    showSuccess(`Patient created successfully — UHID ${patient.uhid}`);
  } catch (err) {
    showPopupError(err.message || 'Could not register patient');
  }
}

// ── CREATE PRE-REQUEST (the actual "appointment" record) ─
async function createAppointment() {
  clearError();

  if (!selectedAppointmentPatient) {
    showError('Select an existing patient or register a new one first');
    return;
  }

  const appointmentDate = document.getElementById('appointmentDate').value;
  const department = document.getElementById('department').value;
  const visitType = document.getElementById('visitType')?.value || 'Consultation';

  if (!appointmentDate || !department) {
    showError('Please fill all required fields');
    return;
  }

  try {
    const result = await window.ApiClient.preRequests.create({
      patient_id: selectedAppointmentPatient.realId,
      department,
      visit_type: visitType,
      requested_date: appointmentDate,
    });

    showSuccess('Appointment created successfully — reference #' + result.pre_request_id);

    document.getElementById('patientId').value = '';
    document.getElementById('patientName').value = '';
    document.getElementById('age').value = '';
    document.getElementById('gender').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('address').value = '';
    document.getElementById('appointmentDate').value = '';
    document.getElementById('department').value = '';
    const visitTypeField = document.getElementById('visitType');
    if (visitTypeField) visitTypeField.value = 'Consultation';
    selectedAppointmentPatient = null;
    setAppointmentPickerVisibility(false);
  } catch (err) {
    showError(err.message || 'Could not create appointment');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const appointmentDateInput = document.getElementById('appointmentDate');
  const ageInput = document.getElementById('age');
  const newAgeInput = document.getElementById('newAge');
  if (appointmentDateInput) appointmentDateInput.min = new Date().toISOString().split('T')[0];
  if (ageInput) {
    ageInput.min = '1';
    ageInput.step = '1';
  }
  if (newAgeInput) {
    newAgeInput.min = '1';
    newAgeInput.step = '1';
  }

  handleNameInput('patientName', showError, clearError);
  handleNameInput('newName', showPopupError, clearPopupError);
  handleAgeInput('age', showError, clearError);
  handleAgeInput('newAge', showPopupError, clearPopupError);

  bindAppointmentPatientPicker();
  bindAppointmentFormFieldBehavior();
  await loadPatientCatalog();
});
