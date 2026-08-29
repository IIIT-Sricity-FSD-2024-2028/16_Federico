'use strict';

/**
 * PRE/js/patient-records.js — Master Patient Directory & Clinical History.
 * Comprehensive Patient 360 view with real-time backend synchronization.
 */

let allPatients = [];
let insurancesByPatient = {};
let preRequestsByPatient = {};
let appointmentsByPatient = {};
let admissionsByPatient = {};
let bedsById = {};
let doctorsById = {};

async function loadPatientDirectoryData() {
  const [patients, insurances, preRequests, appointments, admissions, beds, doctors] = await Promise.all([
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.patients.insuranceAll().catch(() => []),
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.appointments.list().catch(() => []),
    window.ApiClient.admissions.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
  ]);

  doctorsById = {};
  (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));

  bedsById = {};
  (beds || []).forEach((b) => (bedsById[b.bed_id] = b));

  insurancesByPatient = {};
  (insurances || []).forEach((ins) => {
    insurancesByPatient[ins.patient_id] = ins;
  });

  preRequestsByPatient = {};
  (preRequests || []).forEach((pr) => {
    if (!preRequestsByPatient[pr.patient_id]) preRequestsByPatient[pr.patient_id] = [];
    preRequestsByPatient[pr.patient_id].push(pr);
  });

  appointmentsByPatient = {};
  (appointments || []).forEach((apt) => {
    if (!appointmentsByPatient[apt.patient_id]) appointmentsByPatient[apt.patient_id] = [];
    appointmentsByPatient[apt.patient_id].push(apt);
  });

  admissionsByPatient = {};
  (admissions || []).forEach((adm) => {
    if (!admissionsByPatient[adm.patient_id]) admissionsByPatient[adm.patient_id] = [];
    admissionsByPatient[adm.patient_id].push(adm);
  });

  allPatients = (patients || []).map((p) => {
    const pInsur = insurancesByPatient[p.patient_id] || null;
    const pApts = appointmentsByPatient[p.patient_id] || [];
    const pAdms = admissionsByPatient[p.patient_id] || [];
    const pPres = preRequestsByPatient[p.patient_id] || [];

    const activeAdm = pAdms.find((a) => a.status === 'ACTIVE' || a.status === 'ADMITTED');
    const activePre = pPres.find((pr) => pr.status === 'ADMITTED');
    const activeBedId = (activeAdm && activeAdm.bed_id) || (activePre && activePre.bed_id);
    const activeBed = activeBedId ? bedsById[activeBedId] : null;

    const totalEncounters = pApts.length + pAdms.length + pPres.length;
    const latestDept =
      (pPres[0] && pPres[0].department) ||
      (pApts[0] && pApts[0].department) ||
      (pAdms[0] && pAdms[0].department) ||
      'General Medicine';

    return {
      ...p,
      age: PREHelpers.formatAge(p.dob),
      insurance: pInsur,
      activeBed,
      isInpatient: Boolean(activeBed),
      totalEncounters,
      latestDept,
      appointments: pApts,
      admissions: pAdms,
      preRequests: pPres,
    };
  });

  return allPatients;
}

function updateKPIs(patients) {
  const total = patients.length;
  const inpatients = patients.filter((p) => p.isInpatient).length;
  const insured = patients.filter((p) => p.insurance).length;

  const kpiTotal = document.getElementById('kpi-total-patients');
  const kpiInp = document.getElementById('kpi-active-inpatients');
  const kpiIns = document.getElementById('kpi-insured-patients');

  if (kpiTotal) kpiTotal.innerText = `${total} Patients`;
  if (kpiInp) kpiInp.innerText = `${inpatients} In Beds`;
  if (kpiIns) kpiIns.innerText = `${insured} Policies`;
}

async function renderPatientDirectory() {
  const table = document.getElementById('recordTable');
  if (!table) return;

  try {
    await loadPatientDirectoryData();
  } catch (err) {
    table.innerHTML = `<tr><td colspan="9" style="color:var(--status-error);">Failed to load patient directory: ${PREHelpers.escapeHtml(err.message)}</td></tr>`;
    return;
  }

  updateKPIs(allPatients);

  const query = (document.getElementById('patientSearchInput')?.value || '').trim().toLowerCase();
  const bloodGroupFilter = (document.getElementById('filterBloodGroup')?.value || '').trim();

  const filtered = allPatients.filter((p) => {
    if (bloodGroupFilter && p.blood_group !== bloodGroupFilter) return false;
    if (!query) return true;
    const matchUhid = (p.uhid || '').toLowerCase().includes(query);
    const matchName = (p.name || '').toLowerCase().includes(query);
    const matchPhone = (p.phone || '').toLowerCase().includes(query);
    const matchAddr = (p.address || '').toLowerCase().includes(query);
    return matchUhid || matchName || matchPhone || matchAddr;
  });

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--color-muted-fg);">No matching patient records found</td></tr>`;
    return;
  }

  table.innerHTML = filtered
    .map((p) => {
      let statusBadge = `<span class="status pending" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; font-size:11px; padding:3px 8px; border-radius:12px;">Registered</span>`;
      if (p.isInpatient) {
        statusBadge = `<span class="status confirmed" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:600; font-size:11px; padding:3px 8px; border-radius:12px;">Inpatient (${PREHelpers.escapeHtml(p.activeBed ? p.activeBed.bed_number : 'Bed Assigned')})</span>`;
      } else if (p.totalEncounters > 0) {
        statusBadge = `<span class="status confirmed" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-size:11px; padding:3px 8px; border-radius:12px;">Outpatient</span>`;
      }

      let insuranceBadge = `<span style="color:var(--color-muted-fg); font-size:11px; padding:3px 8px; border:1px solid var(--md-outline-variant, #e2e8f0); border-radius:12px; background:var(--md-surface-container-low, #f8fafc);">Self Pay</span>`;
      if (p.insurance) {
        insuranceBadge = `<span class="status confirmed" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; font-weight:600; padding:3px 8px; border-radius:12px;" title="Policy #${PREHelpers.escapeHtml(p.insurance.policy_number || '')}">${PREHelpers.escapeHtml(p.insurance.provider_name || 'Insured')}</span>`;
      }

      const bloodBadge = p.blood_group
        ? `<span style="display:inline-block; padding:2px 8px; border-radius:12px; border:1px solid #fecaca; background:#fef2f2; font-weight:700; font-size:11px; color:#991b1b;">${PREHelpers.escapeHtml(p.blood_group)}</span>`
        : `<span style="color:var(--color-muted-fg); font-size:12px;">—</span>`;

      return `
        <tr>
          <td style="text-align:left; padding:12px 16px;">
            <a href="javascript:void(0)" onclick="viewPatient360(${p.patient_id})" style="font-weight:700; color:var(--md-primary, #0f766e); text-decoration:none;">
              ${PREHelpers.escapeHtml(p.uhid)}
            </a>
          </td>
          <td style="text-align:left; padding:12px 16px;">
            <strong>${PREHelpers.escapeHtml(p.name)}</strong>
            ${p.address ? `<div style="font-size:11px; color:var(--color-muted-fg); margin-top:2px;">${PREHelpers.escapeHtml(p.address)}</div>` : ''}
          </td>
          <td style="text-align:center; padding:12px 14px;">${PREHelpers.escapeHtml(p.age || '—')} / ${PREHelpers.escapeHtml(p.gender || '—')}</td>
          <td style="text-align:left; padding:12px 16px;">
            <div>${PREHelpers.escapeHtml(p.phone || '—')}</div>
            ${p.emergency_contact_phone ? `<div style="font-size:10px; color:var(--color-muted-fg); margin-top:2px;">Em: ${PREHelpers.escapeHtml(p.emergency_contact_phone)}</div>` : ''}
          </td>
          <td style="text-align:center; padding:12px 12px;">${bloodBadge}</td>
          <td style="text-align:center; padding:12px 14px;">${insuranceBadge}</td>
          <td style="text-align:left; padding:12px 16px;">
            <div>${PREHelpers.escapeHtml(p.latestDept)}</div>
            <small style="color:var(--color-muted-fg); font-size:11px;">${p.totalEncounters} Care Encounter(s)</small>
          </td>
          <td style="text-align:center; padding:12px 14px;">${statusBadge}</td>
          <td style="text-align:center; padding:12px 16px;">
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="btn approve" type="button" style="padding:6px 12px; font-size:11px; border-radius:4px;" onclick="viewPatient360(${p.patient_id})">View 360</button>
              <button class="btn green" type="button" style="padding:6px 12px; font-size:11px; border-radius:4px;" onclick="createAppointmentFor(${p.patient_id})">+ Appoint</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// ── Patient 360 Profile Dialog ────────
function viewPatient360(patientId) {
  const p = allPatients.find((item) => item.patient_id === Number(patientId));
  if (!p) return;

  const modal = document.getElementById('patientHistoryModal');
  if (!modal) return;

  document.getElementById('historyModalTitle').innerText = `${p.name} (${p.uhid})`;
  document.getElementById('historyModalSubtitle').innerText = `${p.age || 'Unknown Age'} • ${p.gender || '—'} • Registered on ${PREHelpers.formatDate(p.created_at)}`;

  document.getElementById('modalUhid').innerText = p.uhid || '--';
  document.getElementById('modalDemographics').innerText = `${p.age || '—'} / ${p.gender || '—'}`;
  document.getElementById('modalBloodGroup').innerText = p.blood_group || 'Not Recorded';
  document.getElementById('modalPhone').innerText = p.phone || '—';
  document.getElementById('modalInsurance').innerHTML = p.insurance
    ? `<span style="color:#047857; font-weight:700;">${PREHelpers.escapeHtml(p.insurance.provider_name)} (₹${(p.insurance.coverage_limit || 0).toLocaleString('en-IN')})</span>`
    : `<span style="color:var(--color-muted-fg);">Self Pay</span>`;

  // Render Encounters & Appointments Table
  const aptsContainer = document.getElementById('modalAppointmentsContainer');
  const allEncounters = [...(p.appointments || []), ...(p.preRequests || [])];
  if (allEncounters.length === 0) {
    aptsContainer.innerHTML = `<div style="padding:16px; text-align:center; color:var(--color-muted-fg); font-size:12px;">No recorded outpatient appointments.</div>`;
  } else {
    aptsContainer.innerHTML = `
      <table style="width:100%; font-size:12px; margin:0;">
        <thead>
          <tr style="background:var(--md-surface-container-high, #f8fafc);">
            <th>Date & Time</th>
            <th>Department</th>
            <th>Doctor</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${allEncounters
            .map((enc) => {
              const doc = enc.doctor_id ? doctorsById[enc.doctor_id] : null;
              return `
              <tr>
                <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(enc.requested_date || enc.appointment_date || enc.created_at))} <small>(${PREHelpers.escapeHtml(PREHelpers.to12Hour(enc.requested_time || enc.appointment_time) || '')})</small></td>
                <td>${PREHelpers.escapeHtml(enc.department || (doc ? doc.specialization : 'General'))}</td>
                <td>${PREHelpers.escapeHtml(doc ? doc.name : 'Attending Specialist')}</td>
                <td>${PREHelpers.escapeHtml(enc.visit_type || 'Consultation')}</td>
                <td>${PREHelpers.statusLabel(enc.status)}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  // Render Inpatient Stays Table
  const admsContainer = document.getElementById('modalAdmissionsContainer');
  if (!p.admissions || p.admissions.length === 0) {
    admsContainer.innerHTML = `<div style="padding:16px; text-align:center; color:var(--color-muted-fg); font-size:12px;">No recorded inpatient admissions.</div>`;
  } else {
    admsContainer.innerHTML = `
      <table style="width:100%; font-size:12px; margin:0;">
        <thead>
          <tr style="background:var(--md-surface-container-high, #f8fafc);">
            <th>Admission Date</th>
            <th>Bed Number</th>
            <th>Admission Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${p.admissions
            .map((adm) => {
              const bed = bedsById[adm.bed_id];
              return `
              <tr>
                <td>${PREHelpers.escapeHtml(PREHelpers.formatDate(adm.admit_time || adm.created_at))}</td>
                <td>${PREHelpers.escapeHtml(bed ? `${bed.bed_number} (${bed.ward_type || 'Ward'})` : 'Bed Assigned')}</td>
                <td>${PREHelpers.escapeHtml(adm.admission_type || 'Inpatient')}</td>
                <td><span class="status ${adm.status === 'ACTIVE' || adm.status === 'ADMITTED' ? 'confirmed' : 'pending'}">${PREHelpers.escapeHtml(adm.status)}</span></td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  const btnAppoint = document.getElementById('btnModalCreateAppoint');
  if (btnAppoint) {
    btnAppoint.onclick = () => {
      closePatientHistoryModal();
      createAppointmentFor(p.patient_id);
    };
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closePatientHistoryModal() {
  const modal = document.getElementById('patientHistoryModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

function createAppointmentFor(patientId) {
  window.location.href = `appointment.html?patient_id=${patientId}`;
}

// ── Register New Patient Modal ────────
function openRegisterPatientModal() {
  const modal = document.getElementById('registerPatientModal');
  if (!modal) return;

  document.getElementById('regName').value = '';
  document.getElementById('regDob').value = '';
  document.getElementById('regPhone').value = '';
  document.getElementById('regAltPhone').value = '';
  document.getElementById('regAddress').value = '';
  document.getElementById('regInsProvider').value = '';
  document.getElementById('regInsPolicyNo').value = '';
  document.getElementById('regInsLimit').value = '';
  ['regInsCardFront', 'regInsCardBack'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const st = document.getElementById('regInsUploadStatus');
  if (st) st.textContent = '';

  modal.classList.add('active');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeRegisterPatientModal() {
  const modal = document.getElementById('registerPatientModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

// Client-side validation for the walk-in registration form. Returns an
// error string, or '' when the input is valid. Kept in JS (no markup
// changes) so the existing modal is unchanged.
function validateRegisterPatient({ name, dob, gender, phone, altPhone, insProvider, insPolicyNo, insLimit }) {
  if (!name || name.length < 2) return 'Enter the patient\'s full name (at least 2 characters).';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) return 'Name may only contain letters, spaces, apostrophes and hyphens.';
  if (!gender) return 'Select the patient\'s gender.';

  if (!dob) return 'Select the patient\'s date of birth.';
  const dobDate = new Date(dob);
  if (Number.isNaN(dobDate.getTime())) return 'Enter a valid date of birth.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dobDate > today) return 'Date of birth cannot be in the future.';
  const age = (today - dobDate) / (365.25 * 24 * 60 * 60 * 1000);
  if (age > 120) return 'Date of birth is not realistic (age over 120).';

  if (!/^\d{10}$/.test(phone)) return 'Primary phone must be exactly 10 digits.';
  if (altPhone && !/^\d{10}$/.test(altPhone)) return 'Alternate phone must be exactly 10 digits.';

  if ((insProvider && !insPolicyNo) || (!insProvider && insPolicyNo)) {
    return 'Enter both the insurance provider and policy/card number, or leave both blank.';
  }
  if (insLimit && !(Number(insLimit) >= 0)) {
    return 'Insurance coverage limit must be a non-negative number.';
  }
  return '';
}

async function submitRegisterPatient() {
  const name = document.getElementById('regName')?.value.trim() || '';
  const dob = document.getElementById('regDob')?.value || '';
  const gender = document.getElementById('regGender')?.value || '';
  const bloodGroup = document.getElementById('regBloodGroup')?.value || 'O+';
  const phone = document.getElementById('regPhone')?.value.trim() || '';
  const altPhone = document.getElementById('regAltPhone')?.value.trim() || '';
  const address = document.getElementById('regAddress')?.value.trim() || '';

  const insProvider = document.getElementById('regInsProvider')?.value.trim() || '';
  const insPolicyNo = document.getElementById('regInsPolicyNo')?.value.trim() || '';
  const insLimit = document.getElementById('regInsLimit')?.value.trim() || '';
  const insType = document.getElementById('regInsType')?.value || 'Self';

  const validationError = validateRegisterPatient({
    name, dob, gender, phone, altPhone, insProvider, insPolicyNo, insLimit,
  });
  if (validationError) {
    return UIFeedback.toast(validationError, 'error');
  }

  try {
    const newPatient = await window.ApiClient.patients.create({
      name,
      dob,
      gender,
      blood_group: bloodGroup,
      phone,
      emergency_contact_phone: altPhone || null,
      // No fabricated fallback address — leave blank if not entered.
      address: address || null,
    });

    // Attach an insurance policy only if the PRE operator actually
    // entered one. No mock coverage limit is injected.
    if (insProvider && insPolicyNo) {
      // Upload the insurance card scans first (if provided), then attach
      // their URLs to the policy record.
      const frontFile = document.getElementById('regInsCardFront')?.files?.[0] || null;
      const backFile = document.getElementById('regInsCardBack')?.files?.[0] || null;
      const statusEl = document.getElementById('regInsUploadStatus');
      let cardFrontUrl = null;
      let cardBackUrl = null;
      try {
        if (frontFile) {
          if (statusEl) statusEl.textContent = 'Uploading front card image…';
          cardFrontUrl = (await window.ApiClient.uploads.document(frontFile)).url;
        }
        if (backFile) {
          if (statusEl) statusEl.textContent = 'Uploading back card image…';
          cardBackUrl = (await window.ApiClient.uploads.document(backFile)).url;
        }
        if (statusEl) statusEl.textContent = '';
      } catch (upErr) {
        if (statusEl) statusEl.textContent = '';
        UIFeedback.toast(`Insurance card image upload failed: ${upErr.message || 'unknown error'}`, 'warning');
      }

      try {
        const insPayload = {
          patient_id: newPatient.patient_id,
          provider_name: insProvider,
          policy_number: insPolicyNo,
          coverage_limit: insLimit ? Number(insLimit) : 0,
          coverage_type: insType,
        };
        if (cardFrontUrl) insPayload.card_front_url = cardFrontUrl;
        if (cardBackUrl) insPayload.card_back_url = cardBackUrl;
        await window.ApiClient.patients.createInsurance(insPayload);
      } catch (insErr) {
        UIFeedback.toast(
          `Patient registered, but the insurance policy could not be saved: ${insErr.message || 'unknown error'}`,
          'warning',
        );
      }
    }

    UIFeedback.toast(`Patient ${newPatient.name} (${newPatient.uhid}) registered successfully!`, 'success');
    closeRegisterPatientModal();
    renderPatientDirectory();
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not register patient', 'error');
  }
}

window.viewPatient360 = viewPatient360;
window.closePatientHistoryModal = closePatientHistoryModal;
window.createAppointmentFor = createAppointmentFor;
window.openRegisterPatientModal = openRegisterPatientModal;
window.closeRegisterPatientModal = closeRegisterPatientModal;
window.submitRegisterPatient = submitRegisterPatient;

document.addEventListener('DOMContentLoaded', () => {
  renderPatientDirectory();

  const searchInput = document.getElementById('patientSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderPatientDirectory());
  }

  const bloodSelect = document.getElementById('filterBloodGroup');
  if (bloodSelect) {
    bloodSelect.addEventListener('change', () => renderPatientDirectory());
  }

  // Dismiss on backdrop click
  ['registerPatientModal', 'patientHistoryModal'].forEach((id) => {
    const m = document.getElementById(id);
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) {
          m.classList.remove('active');
          m.style.display = 'none';
          document.body.classList.remove('modal-open');
        }
      });
    }
  });

  // Dismiss on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRegisterPatientModal();
      closePatientHistoryModal();
    }
  });
});

