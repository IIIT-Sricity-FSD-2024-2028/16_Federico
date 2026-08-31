'use strict';

/**
 * PRE/js/Appointment.js — Outpatient Appointment Booking & Scheduling.
 * Dynamically binds patient catalog, department specializations, and consulting physicians.
 */

let appointmentPatientCatalog = [];
let allDoctorsCatalog = [];
let allAvailabilitiesCatalog = [];
let appointmentPickerOpen = false;
let selectedAppointmentPatient = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── VALIDATION HELPERS ──────────────────────────────────
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(String(phone || '').trim());
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

function handleNameInput(inputId, errorRenderer) {
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
    if (!input.value.trim()) return;
    if (!isValidPatientName(input.value)) return errorRenderer('Name should contain letters only');
  });
}

function handleAgeInput(inputId, errorRenderer) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const original = input.value;
    const sanitized = sanitizeAge(original);
    if (original !== sanitized) {
      input.value = sanitized;
      errorRenderer('Age must be a valid number');
      return;
    }
    if (!input.value.trim()) return;
    if (!isValidAge(input.value)) return errorRenderer('Enter age as a positive integer only');
  });
}

// ── DATA FETCHING (Zero Hardcoded Data) ───────────────────
async function loadPatientCatalog() {
  appointmentPatientCatalog = await window.ApiClient.patients.list().catch(() => []);
  return appointmentPatientCatalog;
}

async function loadDoctorCatalog() {
  const [doctors, availabilities] = await Promise.all([
    window.ApiClient.doctors.list().catch(() => []),
    window.ApiClient.doctors.availabilityAll().catch(() => []),
  ]);
  allDoctorsCatalog = doctors || [];
  allAvailabilitiesCatalog = availabilities || [];

  window.DepartmentOptions.populateDepartmentSelect(document.getElementById('department'), allDoctorsCatalog, {
    placeholder: 'Select Department',
  });

  return allDoctorsCatalog;
}

function populateDoctorsByDepartment(selectedDept, preSelectedDoctorId = null) {
  const docSelect = document.getElementById('doctorSelect');
  if (!docSelect) return;

  docSelect.innerHTML = '<option value="">Any Available Specialist</option>';

  const availMap = {};
  allAvailabilitiesCatalog.forEach((a) => {
    if (!availMap[a.doctor_id]) availMap[a.doctor_id] = a;
  });

  const matchingDoctors = allDoctorsCatalog.filter((d) => {
    if (!selectedDept) return true;
    const target = selectedDept.toLowerCase();
    const docDept = (d.department || '').toLowerCase();
    const docSpec = (d.specialization || '').toLowerCase();
    return docDept === target || docSpec === target || docSpec.includes(target) || docDept.includes(target);
  });

  matchingDoctors.forEach((d) => {
    const avail = availMap[d.doctor_id];
    const timeHint = avail?.start_time ? ` (${PREHelpers.to12Hour(avail.start_time)} – ${PREHelpers.to12Hour(avail.end_time)})` : '';
    const opt = document.createElement('option');
    opt.value = d.doctor_id;
    opt.textContent = `${d.name.startsWith('Dr.') ? d.name : 'Dr. ' + d.name} (DOC-${String(d.doctor_id).padStart(3, '0')})${timeHint}`;
    if (preSelectedDoctorId && Number(preSelectedDoctorId) === d.doctor_id) {
      opt.selected = true;
    }
    docSelect.appendChild(opt);
  });
}

function toPickerShape(patient) {
  return {
    patientId: patient.uhid || `UHID-${patient.patient_id}`,
    realId: patient.patient_id,
    name: patient.name,
    age: PREHelpers.formatAge(patient.dob),
    gender: patient.gender || '—',
    phone: patient.phone || '—',
    address: patient.address || '—',
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

  // Update visible verification summary card
  const nameEl = document.getElementById('cardPatientName');
  const uhidEl = document.getElementById('cardPatientUhid');
  const ageGenderEl = document.getElementById('cardPatientAgeGender');
  const phoneEl = document.getElementById('cardPatientPhone');
  const addressEl = document.getElementById('cardPatientAddress');

  if (nameEl) nameEl.innerText = pickerPatient.name || 'Verified Patient';
  if (uhidEl) uhidEl.innerText = pickerPatient.patientId || 'UHID';
  if (ageGenderEl) ageGenderEl.innerText = `${pickerPatient.age || '—'} / ${pickerPatient.gender || '—'}`;
  if (phoneEl) phoneEl.innerText = pickerPatient.phone || '—';
  if (addressEl) addressEl.innerText = pickerPatient.address || '—';

  // Update input fields
  const patientIdInput = document.getElementById('patientId');
  if (patientIdInput) patientIdInput.value = `${pickerPatient.name} (${pickerPatient.patientId})`;

  const pName = document.getElementById('patientName');
  const pAge = document.getElementById('age');
  const pGender = document.getElementById('gender');
  const pPhone = document.getElementById('phone');
  const pAddress = document.getElementById('address');

  if (pName) pName.value = pickerPatient.name || '';
  if (pAge) pAge.value = String(pickerPatient.age || '').replace(/\D/g, '') || '';
  if (pGender) pGender.value = pickerPatient.gender || '';
  if (pPhone) pPhone.value = pickerPatient.phone || '';
  if (pAddress) pAddress.value = pickerPatient.address || '';
}

function clearAppointmentForm() {
  selectedAppointmentPatient = null;

  const nameEl = document.getElementById('cardPatientName');
  const uhidEl = document.getElementById('cardPatientUhid');
  const ageGenderEl = document.getElementById('cardPatientAgeGender');
  const phoneEl = document.getElementById('cardPatientPhone');
  const addressEl = document.getElementById('cardPatientAddress');

  if (nameEl) nameEl.innerText = 'No Patient Selected';
  if (uhidEl) uhidEl.innerText = '—';
  if (ageGenderEl) ageGenderEl.innerText = '—';
  if (phoneEl) phoneEl.innerText = '—';
  if (addressEl) addressEl.innerText = '—';

  const idsToClear = ['patientId', 'searchPhone', 'patientName', 'age', 'gender', 'phone', 'address', 'appointmentDate', 'appointmentReason'];
  idsToClear.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const deptEl = document.getElementById('department');
  if (deptEl) deptEl.value = '';

  const docEl = document.getElementById('doctorSelect');
  if (docEl) docEl.innerHTML = '<option value="">Any Available Specialist</option>';

  const visitEl = document.getElementById('visitType');
  if (visitEl) visitEl.value = 'Consultation';

  setAppointmentPickerVisibility(false);
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
        <strong>No matching records found</strong>
        <span>Click "+ Register Walk-In Patient" above to add a new patient profile.</span>
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
        <strong>${escapeHtml(p.name)}</strong>
        <span style="font-size:11px; color:var(--md-primary, #0f766e); font-weight:600;">${escapeHtml(p.patientId)}</span>
      </div>
      <div class="appointment-picker-row appointment-picker-meta">
        <span>${escapeHtml(p.age)} • ${escapeHtml(p.gender)}</span>
        <span>${escapeHtml(p.phone)}</span>
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

  const deptSelect = document.getElementById('department');
  if (deptSelect) {
    deptSelect.addEventListener('change', () => {
      populateDoctorsByDepartment(deptSelect.value);
    });
  }
}

// ── SEARCH BY PHONE / UHID ──────────────────────────────
async function searchPatient() {
  const rawQuery = document.getElementById('searchPhone').value.trim();
  if (!rawQuery) return UIFeedback.toast('Enter phone number or UHID to search', 'error');

  await loadPatientCatalog();
  const cleanPhone = rawQuery.replace(/\D/g, '');
  const lowerQuery = rawQuery.toLowerCase();

  const found = appointmentPatientCatalog.find((p) => {
    const matchUhid = (p.uhid || '').toLowerCase() === lowerQuery;
    const matchPhone = cleanPhone && (p.phone || '').replace(/\D/g, '').endsWith(cleanPhone);
    const matchName = (p.name || '').toLowerCase().includes(lowerQuery);
    return matchUhid || matchPhone || matchName;
  });

  if (found) {
    const shape = toPickerShape(found);
    fillPatientForm(shape);
    setAppointmentPickerVisibility(false);
    openSearchResultPopup(shape);
  } else {
    UIFeedback.toast('No verified patient found matching query', 'error');
  }
}

function openPatientPopup() {
  const popup = document.getElementById('patientPopup');
  if (popup) {
    popup.classList.add('active');
  }
}
function closePatientPopup() {
  const popup = document.getElementById('patientPopup');
  if (popup) {
    popup.classList.remove('active');
  }
}
function openSearchResultPopup(patient) {
  const popup = document.getElementById('searchResultPopup');
  const idEl = document.getElementById('searchResultPatientId');
  const nameEl = document.getElementById('searchResultPatientName');
  if (idEl) idEl.innerText = patient.patientId || '-';
  if (nameEl) nameEl.innerText = patient.name || '-';
  if (popup) {
    popup.classList.add('active');
  }
}
function closeSearchResultPopup() {
  const popup = document.getElementById('searchResultPopup');
  if (popup) {
    popup.classList.remove('active');
  }
}

// ── REGISTER NEW PATIENT (Real Backend Database Record) ─
async function registerPatient() {
  const name = document.getElementById('newName').value.trim();
  const age = document.getElementById('newAge').value.trim();
  const gender = document.getElementById('newGender').value;
  const phone = document.getElementById('newPhone').value.trim();
  const address = document.getElementById('newAddress').value.trim();

  if (!name || !age || !gender || !phone || !address) {
    return UIFeedback.toast('Please fill all required patient demographic fields', 'error');
  }
  if (!isValidPatientName(name)) return UIFeedback.toast('Name should contain letters only', 'error');
  if (!isValidAge(age)) return UIFeedback.toast('Enter age as a positive integer only', 'error');
  if (!isValidPhone(phone)) return UIFeedback.toast('Phone number must be exactly 10 digits', 'error');

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
    UIFeedback.toast(`Patient registered successfully with UHID ${patient.uhid}`, 'success');
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not register patient', 'error');
  }
}

// ── CREATE APPOINTMENT (Synced with PRE Dashboard & HOM) ──
async function createAppointment() {
  if (!selectedAppointmentPatient) {
    UIFeedback.toast('Please select a verified patient from the directory first', 'error');
    return;
  }

  const appointmentDate = document.getElementById('appointmentDate').value;
  const department = document.getElementById('department').value;
  const doctorSelectEl = document.getElementById('doctorSelect');
  const doctorId = doctorSelectEl?.value ? Number(doctorSelectEl.value) : null;
  const appointmentTime = document.getElementById('appointmentTime')?.value || '10:00 AM';
  const visitType = document.getElementById('visitType')?.value || 'Consultation';

  if (!appointmentDate || !department) {
    UIFeedback.toast('Please select appointment date and clinical department', 'error');
    return;
  }

  try {
    const result = await window.ApiClient.preRequests.create({
      patient_id: selectedAppointmentPatient.realId,
      department,
      doctor_id: doctorId,
      visit_type: visitType,
      requested_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'APPROVED',
    });

    UIFeedback.toast(`Appointment scheduled successfully (Ref #${result.pre_request_id})`, 'success');
    clearAppointmentForm();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not create appointment', 'error');
  }
}

window.searchPatient = searchPatient;
window.openPatientPopup = openPatientPopup;
window.closePatientPopup = closePatientPopup;
window.openSearchResultPopup = openSearchResultPopup;
window.closeSearchResultPopup = closeSearchResultPopup;
window.registerPatient = registerPatient;
window.createAppointment = createAppointment;
window.clearAppointmentForm = clearAppointmentForm;

document.addEventListener('DOMContentLoaded', async () => {
  const appointmentDateInput = document.getElementById('appointmentDate');
  const newAgeInput = document.getElementById('newAge');
  if (appointmentDateInput) appointmentDateInput.min = new Date().toISOString().split('T')[0];
  if (newAgeInput) {
    newAgeInput.min = '1';
    newAgeInput.step = '1';
  }

  handleNameInput('newName', (msg) => UIFeedback.toast(msg, 'error'));
  handleAgeInput('newAge', (msg) => UIFeedback.toast(msg, 'error'));

  bindAppointmentPatientPicker();
  bindAppointmentFormFieldBehavior();
  await Promise.all([loadPatientCatalog(), loadDoctorCatalog()]);

  // Handle URL query parameters for pre-selected patient and doctor
  const urlParams = new URLSearchParams(window.location.search);
  const targetPatientId = urlParams.get('patient_id');
  if (targetPatientId) {
    const matched = appointmentPatientCatalog.find((p) => p.patient_id === Number(targetPatientId));
    if (matched) {
      fillPatientForm(toPickerShape(matched));
    }
  }

  const targetDocId = urlParams.get('doctor_id');
  if (targetDocId) {
    const doc = allDoctorsCatalog.find((d) => d.doctor_id === Number(targetDocId));
    if (doc) {
      const deptSelect = document.getElementById('department');
      if (deptSelect) {
        deptSelect.value = doc.specialization;
        populateDoctorsByDepartment(doc.specialization, doc.doctor_id);
      }
    }
  }

  // Backdrop dismissal and Escape key support for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePatientPopup();
      closeSearchResultPopup();
    }
  });

  const popups = document.querySelectorAll('.popup');
  popups.forEach((popup) => {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.classList.remove('active');
      }
    });
  });
});

