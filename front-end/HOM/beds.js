/**
 * beds.js
 * Logic for the Bed Management grid, filtering, and assignment modals.
 */

document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  renderPage();
  window.addEventListener('storeUpdated', renderPage);
});

let activeTab = 'all';
let activeFilter = 'all';
let selectedAvailableBed = null;
let currentDetailBed = null;
let currentDetailPatient = null;
let bedSearchQuery = '';
let assignPatientQuery = '';
let selectedAssignPatient = null;
let assignPatientOptions = [];

const tabs = [
  { id: 'all', label: 'All Beds', wardMatch: 'all' },
  { id: 'icu', label: 'ICU', wardMatch: 'ICU Ward' },
  { id: 'general', label: 'General Ward', wardMatch: 'General Ward' },
  { id: 'surgical', label: 'Surgical', wardMatch: 'Surgical Ward' },
  { id: 'pediatric', label: 'Pediatric', wardMatch: 'Pediatric Ward' },
  { id: 'emergency', label: 'Emergency', wardMatch: 'Emergency Ward' }
];

const filters = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'occupied', label: 'Occupied' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'maintenance', label: 'Maintenance' }
];

function bindControls() {
  const searchInput = document.getElementById('bed-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      bedSearchQuery = event.target.value.trim().toLowerCase();
      renderPage();
    });
  }

  const assignSearchInput = document.getElementById('assign-patient-search');
  if (assignSearchInput) {
    assignSearchInput.addEventListener('focus', () => {
      renderAssignPatientOptions();
      toggleAssignPatientDropdown(true);
    });
  }

  document.addEventListener('click', (event) => {
    const picker = document.getElementById('assign-patient-picker');
    if (!picker || picker.contains(event.target)) return;
    toggleAssignPatientDropdown(false);
  });
}

function setAssignError(message) {
  const element = document.getElementById('assign-bed-error');
  if (!element) return;
  element.textContent = message || '';
  element.style.display = message ? 'block' : 'none';
}

function setAssignHint(message) {
  const element = document.getElementById('assign-patient-hint');
  if (!element) return;
  element.textContent = message || '';
}

function renderPage() {
  const data = window.Store.get() || {};
  renderFilters();
  renderStats(data);
  renderWards(data);
  if (document.getElementById('modal-assign-bed')?.classList.contains('active')) {
    renderAvailableBeds(selectedAvailableBed);
    renderAssignPatientOptions();
  }
}

function toggleAssignPatientDropdown(show) {
  const dropdown = document.getElementById('assign-patient-dropdown');
  if (!dropdown) return;
  dropdown.style.display = show ? 'block' : 'none';
}

function getPatientCandidates() {
  const data = window.Store.get() || {};
  const byUhid = new Map();

  (data.pendingAdmissions || []).forEach((admission) => {
    byUhid.set(admission.uhid, {
      key: `pending-${admission.id}`,
      type: 'pending',
      assignable: true,
      admissionId: admission.id,
      patient: admission.patient,
      uhid: admission.uhid,
      dept: admission.dept,
      status: 'Pending Admission',
      meta: `Requested by ${admission.requestedBy || 'PRE'} • ${admission.priority || 'Normal'}`
    });
  });

  (data.patients || []).forEach((patient) => {
    if (byUhid.has(patient.uhid)) return;
    const isDischarged = patient.status === 'Discharged' || patient.bed === 'Bed freed';
    byUhid.set(patient.uhid, {
      key: `patient-${patient.uhid}`,
      type: 'patient',
      assignable: false,
      admissionId: null,
      patient: patient.name,
      uhid: patient.uhid,
      dept: patient.dept,
      status: isDischarged ? 'Already Discharged' : `${patient.status} • ${patient.bed}`,
      meta: isDischarged ? 'Not assignable here. Create/approve a new admission first.' : 'Already assigned to a bed.'
    });
  });

  return Array.from(byUhid.values()).sort((left, right) => {
    if (left.assignable !== right.assignable) return left.assignable ? -1 : 1;
    return left.patient.localeCompare(right.patient);
  });
}

function getFilteredPatientCandidates() {
  const query = assignPatientQuery.trim().toLowerCase();
  const candidates = getPatientCandidates();
  if (!query) return candidates;

  return candidates.filter((candidate) => {
    const haystack = [candidate.patient, candidate.uhid, candidate.dept, candidate.status, candidate.meta].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderAssignPatientOptions() {
  const dropdown = document.getElementById('assign-patient-dropdown');
  if (!dropdown) return;

  assignPatientOptions = getFilteredPatientCandidates();
  if (selectedAssignPatient && !assignPatientOptions.some((candidate) => candidate.key === selectedAssignPatient.key)) {
    selectedAssignPatient = null;
  }
  if (!assignPatientOptions.length) {
    dropdown.innerHTML = '<div style="padding: 12px 14px; font-size: 13px; color: var(--text-secondary);">No patients match this search.</div>';
    return;
  }

  dropdown.innerHTML = assignPatientOptions.map((candidate) => `
    <button
      type="button"
      onclick="selectAssignPatient('${candidate.key}')"
      ${candidate.assignable ? '' : 'disabled'}
      style="width: 100%; padding: 12px 14px; border: none; border-bottom: 1px solid var(--border); background: ${selectedAssignPatient?.key === candidate.key ? 'var(--primary-light)' : '#fff'}; text-align: left; cursor: ${candidate.assignable ? 'pointer' : 'not-allowed'}; opacity: ${candidate.assignable ? '1' : '0.7'};"
    >
      <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
        <div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${candidate.patient}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${candidate.uhid} • ${candidate.dept}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${candidate.meta}</div>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: ${candidate.assignable ? 'var(--primary)' : 'var(--text-secondary)'};">${candidate.status}</div>
      </div>
    </button>
  `).join('');
}

function renderFilters() {
  const tabContainer = document.getElementById('ward-tabs');
  if (tabContainer) {
    tabContainer.innerHTML = tabs.map((tab) => `
      <button class="tab-btn ${activeTab === tab.id ? 'active' : ''}" onclick="setActiveTab('${tab.id}')">
        ${tab.label}
      </button>
    `).join('');
  }

  const pillContainer = document.getElementById('status-filters');
  if (pillContainer) {
    pillContainer.innerHTML = filters.map((filter) => `
      <button class="pill-btn ${activeFilter === filter.id ? 'active' : ''}" onclick="setActiveFilter('${filter.id}')">
        ${filter.label}
      </button>
    `).join('');
  }
}

function getPatientIndex(data) {
  return (data.patients || []).reduce((accumulator, patient) => {
    accumulator[patient.bed] = patient;
    return accumulator;
  }, {});
}

function bedMatchesSearch(bed, linkedPatient) {
  if (!bedSearchQuery) return true;
  const haystack = [
    bed.number,
    bed.patient || '',
    linkedPatient?.uhid || '',
    linkedPatient?.name || '',
    linkedPatient?.dept || ''
  ].join(' ').toLowerCase();
  return haystack.includes(bedSearchQuery);
}

function setActiveTab(id) { activeTab = id; renderPage(); }
function setActiveFilter(id) { activeFilter = id; renderPage(); }
window.setActiveTab = setActiveTab;
window.setActiveFilter = setActiveFilter;

function renderStats(data) {
  let total = 0;
  let available = 0;
  let occupied = 0;
  let maintenance = 0;

  (data.wards || []).forEach((ward) => {
    total += ward.total;
    available += ward.available;
    occupied += ward.occupied;
    maintenance += ward.beds.filter((bed) => bed.status === 'maintenance').length;
  });

  document.getElementById('stats-container').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Beds</div><div class="stat-value" style="color: var(--text-primary);">${total}</div></div>
    <div class="stat-card"><div class="stat-label">Available</div><div class="stat-value" style="color: var(--success);">${available}</div></div>
    <div class="stat-card"><div class="stat-label">Occupied</div><div class="stat-value" style="color: var(--warning);">${occupied}</div></div>
    <div class="stat-card"><div class="stat-label">Maintenance</div><div class="stat-value" style="color: var(--text-secondary);">${maintenance}</div></div>
  `;
}

function getBedStyle(status) {
  switch (status) {
    case 'available': return { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Available' };
    case 'occupied': return { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Occupied' };
    case 'reserved': return { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', label: 'Reserved' };
    case 'maintenance': return { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', label: 'Maintenance' };
    default: return { bg: '#ffffff', border: '#E2E8F0', text: '#1E293B', label: 'Unknown' };
  }
}

function renderWards(data) {
  const container = document.getElementById('wards-container');
  if (!container) return;

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const patientIndex = getPatientIndex(data);
  let html = '';

  (data.wards || []).forEach((ward) => {
    if (activeTabConfig.wardMatch !== 'all' && ward.name !== activeTabConfig.wardMatch) return;

    const bedsToRender = ward.beds.filter((bed) => {
      if (activeFilter !== 'all' && bed.status !== activeFilter) return false;
      return bedMatchesSearch(bed, patientIndex[bed.number]);
    });

    if (!bedsToRender.length) return;

    html += `
      <div class="ward-section">
        <div class="ward-header">
          <div>
            <h2 class="h2" style="font-size: 18px;">${ward.name}</h2>
            <p class="body-text" style="font-size: 14px; margin-top: 4px;">
              ${ward.total} beds | ${ward.occupied} Occupied | ${ward.available} Available | ${ward.reserved} Reserved
            </p>
          </div>
          <button class="btn btn-outline btn-sm" style="border:none; color: var(--primary);">View Ward Details</button>
        </div>
        <div class="bed-grid">
    `;

    bedsToRender.forEach((bed) => {
      const style = getBedStyle(bed.status);
      const linkedPatient = patientIndex[bed.number];
      const subtitle = linkedPatient ? `${linkedPatient.name} (${linkedPatient.uhid})` : (bed.patient || style.label);
      const onClickAction = bed.status === 'available' ? `openAssignModal('${bed.number}')` : `openDetailModal('${bed.number}')`;

      html += `
        <button class="bed-card" style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text};" onclick="${onClickAction}">
          <div class="bed-card-title">${bed.number}</div>
          <div class="bed-card-subtitle">${subtitle}</div>
        </button>
      `;
    });

    html += '</div></div>';
  });

  container.innerHTML = html || `<div class="ward-section"><p style="margin: 0; color: var(--text-secondary);">No beds match the current filters.</p></div>`;
}

function getAvailableBeds() {
  const data = window.Store.get() || {};
  const availableBeds = [];
  (data.wards || []).forEach((ward) => {
    ward.beds.filter((bed) => bed.status === 'available').forEach((bed) => {
      availableBeds.push({ number: bed.number, ward: ward.name });
    });
  });
  return availableBeds;
}

function getMatchingPendingAdmission(query) {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();
  const data = window.Store.get() || {};
  return (data.pendingAdmissions || []).find((admission) => {
    const haystack = [admission.uhid, admission.patient, admission.dept].join(' ').toLowerCase();
    return haystack.includes(normalized);
  }) || null;
}

function getMatchingActivePatient(query) {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();
  const data = window.Store.get() || {};
  return (data.patients || []).find((patient) => {
    const haystack = [patient.uhid, patient.name, patient.bed].join(' ').toLowerCase();
    return haystack.includes(normalized) && patient.status !== 'Discharged';
  }) || null;
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
  selectedAvailableBed = null;
  currentDetailBed = null;
  currentDetailPatient = null;
  selectedAssignPatient = null;
  assignPatientQuery = '';
  const assignInput = document.getElementById('assign-patient-search');
  if (assignInput) assignInput.value = '';
  toggleAssignPatientDropdown(false);
  setAssignError('');
  setAssignHint('');
}
window.closeModals = closeModals;

function renderAvailableBeds(preselectedBed) {
  const beds = getAvailableBeds();
  const container = document.getElementById('modal-available-beds');
  if (!container) return;

  if (preselectedBed && !beds.some((bed) => bed.number === preselectedBed)) {
    selectedAvailableBed = null;
  }

  container.innerHTML = beds.map((bed) => `
    <button class="modal-bed-btn" onclick="selectAvailableBed('${bed.number}')" id="modal-bed-${bed.number}" style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); background: white; text-align: left; cursor: pointer; transition: all 0.2s;">
      <div style="font-weight: 600; font-size: 14px;">${bed.number}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${bed.ward}</div>
    </button>
  `).join('') || '<p style="grid-column: 1 / -1; color: var(--text-secondary); margin: 0;">No available beds found.</p>';

  if (preselectedBed) selectAvailableBed(preselectedBed);
}

function openAssignModal(preselectedBed = null) {
  assignPatientQuery = '';
  selectedAssignPatient = null;
  const input = document.getElementById('assign-patient-search');
  if (input) input.value = '';
  renderAvailableBeds(preselectedBed);
  renderAssignPatientOptions();
  toggleAssignPatientDropdown(true);
  setAssignHint('Select a patient from the live list below. Pending admissions are assignable.');
  setAssignError('');
  document.getElementById('modal-assign-bed').classList.add('active');
}
window.openAssignModal = openAssignModal;

window.handleAssignPatientSearch = function (value) {
  assignPatientQuery = value.trim();
  selectedAssignPatient = null;
  setAssignError('');
  renderAssignPatientOptions();
  toggleAssignPatientDropdown(true);

  const pendingAdmission = getMatchingPendingAdmission(assignPatientQuery);
  const activePatient = getMatchingActivePatient(assignPatientQuery);

  if (!assignPatientQuery) {
    setAssignHint('Showing all patients. Pending admissions are assignable.');
    return;
  }
  if (pendingAdmission) {
    setAssignHint(`Pending admission matched: ${pendingAdmission.patient} (${pendingAdmission.uhid})`);
    return;
  }
  if (activePatient) {
    setAssignHint(`${activePatient.name} is already occupying ${activePatient.bed}.`);
    return;
  }

  if (assignPatientQuery.length < 3) {
    setAssignHint('Enter at least 3 characters to search for a patient.');
  } else {
    setAssignHint('No pending admission matched. A manual allocation will use the typed patient name only.');
  }
};

window.selectAssignPatient = function (candidateKey) {
  const candidate = assignPatientOptions.find((item) => item.key === candidateKey);
  if (!candidate) return;

  selectedAssignPatient = candidate;
  assignPatientQuery = candidate.uhid;

  const input = document.getElementById('assign-patient-search');
  if (input) input.value = `${candidate.patient} (${candidate.uhid})`;

  if (candidate.assignable) {
    setAssignHint(`Selected ${candidate.patient} (${candidate.uhid}) for admission.`);
    setAssignError('');
  } else {
    setAssignHint(candidate.meta);
    setAssignError(`${candidate.patient} cannot be assigned from this form right now.`);
  }

  renderAssignPatientOptions();
  toggleAssignPatientDropdown(candidate.assignable ? false : true);
};

window.selectAvailableBed = function (bedNumber) {
  selectedAvailableBed = bedNumber;
  document.querySelectorAll('.modal-bed-btn').forEach((button) => {
    button.style.borderColor = 'var(--border)';
    button.style.backgroundColor = 'white';
  });

  const selected = document.getElementById(`modal-bed-${bedNumber}`);
  if (selected) {
    selected.style.borderColor = 'var(--primary)';
    selected.style.backgroundColor = 'var(--primary-light)';
  }

  setAssignError('');
};

function confirmBedAllocation() {
  const patientInput = document.getElementById('assign-patient-search');
  const patientQuery = patientInput ? patientInput.value.trim() : '';

  if (!patientQuery) {
    setAssignError('Enter a patient UHID or name before confirming admission.');
    return;
  }
  if (patientQuery.length < 3) {
    setAssignError('Patient search must be at least 3 characters long.');
    return;
  }
  if (!selectedAvailableBed) {
    setAssignError('Select an available bed before confirming admission.');
    return;
  }

  if (selectedAssignPatient && !selectedAssignPatient.assignable) {
    setAssignError(`${selectedAssignPatient.patient} is not assignable from this form.`);
    return;
  }

  const pendingAdmission = selectedAssignPatient?.admissionId
    ? (window.Store.get().pendingAdmissions || []).find((item) => item.id === selectedAssignPatient.admissionId)
    : getMatchingPendingAdmission(patientQuery);

  const activePatient = getMatchingActivePatient(patientQuery);
  if (!pendingAdmission && activePatient) {
    setAssignError(`${activePatient.name} is already assigned to ${activePatient.bed}.`);
    return;
  }

  setAssignError('');

  if (pendingAdmission) {
    window.Store.assignBed(pendingAdmission.id, selectedAvailableBed);
    closeModals();
    return;
  }

  setAssignError('Choose a valid pending admission from the patient list before confirming admission.');
}
window.confirmBedAllocation = confirmBedAllocation;

function openDetailModal(bedNumber) {
  const data = window.Store.get() || {};
  let targetBed = null;
  let targetWardName = '';

  (data.wards || []).forEach((ward) => {
    const bed = ward.beds.find((item) => item.number === bedNumber);
    if (bed) {
      targetBed = bed;
      targetWardName = ward.name;
    }
  });

  if (!targetBed) return;
  currentDetailBed = targetBed;
  currentDetailPatient = (data.patients || []).find((patient) => patient.bed === bedNumber) || {
    uhid: 'FED-UNKNOWN',
    name: targetBed.patient || 'Unknown Patient',
    dept: 'General',
    physician: 'Assigned Doctor'
  };

  document.getElementById('detail-title').innerText = `Bed Details - ${targetBed.number}`;
  document.getElementById('detail-badge').innerHTML = window.UI.Badge({ variant: 'error', children: 'Occupied' });
  document.getElementById('detail-patient').innerText = currentDetailPatient.name;
  document.getElementById('detail-uhid').innerText = currentDetailPatient.uhid;
  document.getElementById('detail-dept').innerText = currentDetailPatient.dept;
  document.getElementById('detail-ward').innerText = targetWardName;
  document.getElementById('detail-physician').innerText = currentDetailPatient.physician;
  document.getElementById('modal-bed-detail').classList.add('active');
}
window.openDetailModal = openDetailModal;

function initiateDischargeFromModal() {
  if (!currentDetailBed) return;

  if (currentDetailPatient && currentDetailPatient.uhid !== 'FED-UNKNOWN') {
    window.Store.dischargePatient(currentDetailPatient.uhid);
  } else {
    window.Store.updateBedStatus(currentDetailBed.number, 'available', null);
    window.Store.logActivity('success', `Bed ${currentDetailBed.number} manually freed`);
  }

  closeModals();
}
window.initiateDischargeFromModal = initiateDischargeFromModal;
