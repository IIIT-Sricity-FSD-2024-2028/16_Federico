/**
 * patient-flow.js
 * Handles data fetching, UI rendering, filtering, export, and discharge validation.
 */

document.addEventListener("DOMContentLoaded", () => {
    try {
        const currentData = window.Store.get();
        if (!currentData || !currentData.patients) window.Store.reset();
    } catch (e) {
        console.error("Storage Check Failed:", e);
    }

    bindControls();
    renderPage();
    window.addEventListener('storeUpdated', renderPage);
});

let currentSelectedPatient = null;
let currentSelectedLedger = null;
let patientFlowFilters = {
    search: '',
    department: '',
    status: '',
    dateRange: ''
};

function bindControls() {
    const searchIds = ['patient-flow-search', 'patient-flow-filter-search'];
    searchIds.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', (event) => {
            patientFlowFilters.search = event.target.value.trim().toLowerCase();
            syncSearchInputs(event.target.value);
            renderPage();
        });
    });

    ['patient-flow-department', 'patient-flow-status', 'patient-flow-date-range'].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener('change', () => {
            patientFlowFilters.department = document.getElementById('patient-flow-department').value;
            patientFlowFilters.status = document.getElementById('patient-flow-status').value;
            patientFlowFilters.dateRange = document.getElementById('patient-flow-date-range').value;
            renderPage();
        });
    });

    const clearButton = document.getElementById('patient-flow-clear');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            patientFlowFilters = { search: '', department: '', status: '', dateRange: '' };
            syncSearchInputs('');
            document.getElementById('patient-flow-department').value = '';
            document.getElementById('patient-flow-status').value = '';
            document.getElementById('patient-flow-date-range').value = '';
            renderPage();
        });
    }

    const exportButton = document.getElementById('patient-flow-export');
    if (exportButton) exportButton.addEventListener('click', exportPatientFlow);
}

function syncSearchInputs(value) {
    ['patient-flow-search', 'patient-flow-filter-search'].forEach((id) => {
        const input = document.getElementById(id);
        if (input && input.value !== value) input.value = value;
    });
}

function setDischargeError(message) {
    const element = document.getElementById('discharge-form-error');
    if (!element) return;
    element.textContent = message || '';
    element.style.display = message ? 'block' : 'none';
}

function renderPage() {
    const data = window.Store.get() || {};
    populateDepartmentFilter(data);
    renderPatientsTable(data);
}

function populateDepartmentFilter(data) {
    const select = document.getElementById('patient-flow-department');
    if (!select) return;

    const currentValue = patientFlowFilters.department;
    const departments = [...new Set((data.patients || []).map((patient) => patient.dept).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All Departments</option>' + departments.map((dept) => `<option value="${dept}">${dept}</option>`).join('');
    select.value = currentValue;
}

function matchesDateRange(patient) {
    if (!patientFlowFilters.dateRange) return true;
    const admittedDate = new Date(patient.admitted);
    if (Number.isNaN(admittedDate.getTime())) return false;

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - admittedDate.getTime()) / (24 * 60 * 60 * 1000));

    switch (patientFlowFilters.dateRange) {
        case 'today': return diffDays === 0;
        case 'last3': return diffDays <= 3;
        case 'last7': return diffDays <= 7;
        case 'older': return diffDays > 7;
        default: return true;
    }
}

function getFilteredPatients(data) {
    return (data.patients || []).filter((patient) => {
        if (patientFlowFilters.department && patient.dept !== patientFlowFilters.department) return false;
        if (patientFlowFilters.status && patient.status !== patientFlowFilters.status) return false;
        if (!matchesDateRange(patient)) return false;
        if (!patientFlowFilters.search) return true;

        const haystack = [
            patient.uhid,
            patient.name,
            patient.dept,
            patient.bed,
            patient.physician,
            patient.status
        ].join(' ').toLowerCase();
        return haystack.includes(patientFlowFilters.search);
    });
}

function renderPatientsTable(data) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;

    const patients = getFilteredPatients(data);
    if (!patients.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 24px; text-align: center; color: var(--text-secondary);">No patients match the selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = patients.map((patient, index) => {
        let actionButtons = `<button class="btn btn-secondary btn-sm" onclick="openPatientDetail('${patient.uhid}')">View</button>`;

        if (patient.status === 'Admitted') {
            actionButtons += `<button class="btn btn-outline btn-sm" onclick="openDischargeModal('${patient.uhid}')">Discharge</button>`;
        } else if (patient.status === 'Pending Discharge') {
            actionButtons += `<button class="btn btn-primary btn-sm" style="background: var(--primary); color: white;" onclick="openDischargeModal('${patient.uhid}')">Approve Discharge</button>`;
        } else if (patient.status === 'Critical') {
            actionButtons += `<button class="btn btn-outline btn-sm" onclick="window.location.href='screen-02-bed-management.html'">Transfer</button>`;
        } else if (patient.status === 'Discharged') {
            actionButtons += `<button class="btn btn-outline btn-sm" onclick="openBillingFromUhid('${patient.uhid}')">View Receipt</button>`;
        }

        return `
            <tr style="cursor: default;">
                <td style="color: var(--text-secondary); font-weight: 500;">${patient.uhid}</td>
                <td>
                    <div style="font-weight: 500; color: var(--text-primary);">${patient.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${patient.age}</div>
                </td>
                <td style="color: var(--text-secondary);">${patient.dept}</td>
                <td style="color: var(--text-secondary);">${patient.bed}</td>
                <td style="color: var(--text-secondary);">${patient.physician}</td>
                <td style="color: var(--text-secondary);">${patient.admitted}</td>
                <td style="color: var(--text-secondary);">${patient.days} days</td>
                <td>${window.UI.Badge({ variant: patient.statusVariant, children: patient.status })}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
    currentSelectedPatient = null;
    currentSelectedLedger = null;
    setDischargeError('');
}
window.closeModals = closeModals;

window.switchTab = function (tabId) {
    document.querySelectorAll('.modal-tab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
};

window.openPatientDetail = function (uhid) {
    const data = window.Store.get() || {};
    currentSelectedPatient = (data.patients || []).find((patient) => patient.uhid === uhid) || null;
    currentSelectedLedger = (data.billingRecords || []).find((record) => record.uhid === uhid) || null;
    if (!currentSelectedPatient) return;

    const patient = currentSelectedPatient;
    const billing = currentSelectedLedger || { dailyRate: 3000, supplyCharges: 0 };
    const initials = patient.name.split(' ').map((name) => name[0]).join('');

    document.getElementById('pd-avatar').innerText = initials;
    document.getElementById('pd-name').innerText = patient.name;
    document.getElementById('pd-uhid').innerText = patient.uhid;
    document.getElementById('pd-dept').innerText = patient.dept;
    document.getElementById('pd-status-badge').innerHTML = window.UI.Badge({ variant: patient.statusVariant, children: patient.status });
    document.getElementById('pd-age').innerText = patient.age;
    document.getElementById('pd-admitted').innerText = patient.admitted;
    document.getElementById('pd-days').innerText = `${patient.days} days`;
    document.getElementById('pd-dept-detail').innerText = patient.dept;
    document.getElementById('pd-bed').innerText = patient.bed;
    document.getElementById('pd-physician').innerText = patient.physician;
    document.getElementById('pd-bed-info').innerText = patient.bed;
    document.getElementById('pd-rate').innerText = `Rs ${billing.dailyRate.toLocaleString()} / day`;
    document.getElementById('pd-room-total').innerText = `Rs ${(billing.dailyRate * patient.days).toLocaleString()}`;
    document.getElementById('pd-supply-total').innerText = `Rs ${billing.supplyCharges.toLocaleString()}`;
    document.getElementById('btn-pd-discharge').style.display = patient.status === 'Discharged' ? 'none' : 'block';

    switchTab('overview');
    document.getElementById('modal-patient-detail').classList.add('active');
};

window.openDischargeFromDetail = function () {
    if (!currentSelectedPatient) return;
    const uhid = currentSelectedPatient.uhid;
    closeModals();
    openDischargeModal(uhid);
};

window.openDischargeModal = function (uhid) {
    const data = window.Store.get() || {};
    currentSelectedPatient = (data.patients || []).find((patient) => patient.uhid === uhid) || null;
    currentSelectedLedger = (data.billingRecords || []).find((record) => record.uhid === uhid) || null;
    if (!currentSelectedPatient) return;

    const patient = currentSelectedPatient;
    const billing = currentSelectedLedger || { dailyRate: 3000, supplyCharges: 0 };
    const roomCost = billing.dailyRate * patient.days;
    const totalCost = roomCost + billing.supplyCharges;

    document.getElementById('discharge-title').innerText = `Initiate Discharge - ${patient.name}`;
    document.getElementById('d-patient').innerText = patient.name;
    document.getElementById('d-uhid').innerText = patient.uhid;
    document.getElementById('d-bed').innerText = patient.bed;
    document.getElementById('d-days').innerText = `${patient.days} days`;
    document.getElementById('d-room-label').innerText = `Room Charges (${patient.days} days)`;
    document.getElementById('d-room-cost').innerText = `Rs ${roomCost.toLocaleString()}`;
    document.getElementById('d-supply-cost').innerText = `Rs ${billing.supplyCharges.toLocaleString()}`;
    document.getElementById('d-total-cost').innerText = `Rs ${totalCost.toLocaleString()}`;
    document.getElementById('discharge-type').value = '';
    document.getElementById('discharge-notes').value = '';
    setDischargeError('');
    document.getElementById('modal-initiate-discharge').classList.add('active');
};

window.confirmDischarge = function () {
    if (!currentSelectedPatient) return;

    const dischargeType = document.getElementById('discharge-type').value;
    const dischargeNotes = document.getElementById('discharge-notes').value.trim();

    if (!dischargeType) {
        setDischargeError('Select a discharge type before confirming discharge.');
        return;
    }
    if (dischargeNotes.length > 400) {
        setDischargeError('Discharge notes can be at most 400 characters.');
        return;
    }
    if ((dischargeType.includes('Transfer') || dischargeType.includes('LAMA')) && dischargeNotes.length < 10) {
        setDischargeError('Add at least 10 characters of notes for transfer or LAMA discharges.');
        return;
    }

    setDischargeError('');
    window.Store.dischargePatient(currentSelectedPatient.uhid);
    closeModals();
};

function exportPatientFlow() {
    const data = window.Store.get() || {};
    const rows = getFilteredPatients(data);
    if (!rows.length) {
        alert('There are no patient flow rows to export for the current filters.');
        return;
    }

    const csv = [
        ['UHID', 'Patient', 'Department', 'Bed', 'Physician', 'Admitted', 'Days Stay', 'Status'].join(','),
        ...rows.map((patient) => [patient.uhid, patient.name, patient.dept, patient.bed, patient.physician, patient.admitted, patient.days, patient.status].map(csvEscape).join(','))
    ].join('\n');

    downloadCsv('hom-patient-flow.csv', csv);
}

function csvEscape(value) {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

window.openBillingFromDetail = function () {
    if (!currentSelectedPatient) return;
    openBillingFromUhid(currentSelectedPatient.uhid);
};

window.openBillingFromUhid = function (uhid) {
    const target = `screen-05-billing.html?uhid=${encodeURIComponent(uhid)}`;
    window.location.href = target;
};
