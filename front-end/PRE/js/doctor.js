'use strict';

/**
 * PRE/js/doctor.js — Doctor Availability & Roster Management.
 * Real-time schedule tracking and appointment routing.
 */

let allDoctorRoster = [];

async function loadDoctorRosterData() {
  const [doctors, availabilities] = await Promise.all([
    window.ApiClient.doctors.list().catch(() => []),
    window.ApiClient.doctors.availabilityAll().catch(() => []),
  ]);

  const availabilityByDoctor = {};
  (availabilities || []).forEach((a) => {
    if (!availabilityByDoctor[a.doctor_id]) availabilityByDoctor[a.doctor_id] = a;
  });

  allDoctorRoster = (doctors || []).map((d) => {
    const avail = availabilityByDoctor[d.doctor_id] || null;
    const rawStatus = (avail?.status || 'Available').trim();
    let normalizedStatus = 'Available';
    if (/surgery|busy/i.test(rawStatus)) {
      normalizedStatus = 'In Surgery';
    } else if (/unavail|leave|off/i.test(rawStatus)) {
      normalizedStatus = 'Unavailable';
    }

    const startTimeFormatted = avail?.start_time ? PREHelpers.to12Hour(avail.start_time) : '09:00 AM';
    const endTimeFormatted = avail?.end_time ? PREHelpers.to12Hour(avail.end_time) : '05:00 PM';
    const dutyHours = `${startTimeFormatted} – ${endTimeFormatted}`;
    const days = avail?.days || avail?.available_days || 'Mon – Sat';

    return {
      ...d,
      availability: avail,
      status: normalizedStatus,
      rawStatus,
      dutyHours,
      days,
    };
  });

  populateSpecializationDropdown(allDoctorRoster);
  return allDoctorRoster;
}

function updateDoctorKPIs(roster) {
  const total = roster.length;
  const available = roster.filter((d) => d.status === 'Available').length;
  const unavailable = roster.filter((d) => d.status !== 'Available').length;

  const kpiTotal = document.getElementById('kpi-total-doctors');
  const kpiAvail = document.getElementById('kpi-available-doctors');
  const kpiUnavail = document.getElementById('kpi-unavailable-doctors');

  if (kpiTotal) kpiTotal.innerText = `${total} Doctors`;
  if (kpiAvail) kpiAvail.innerText = `${available} Available`;
  if (kpiUnavail) kpiUnavail.innerText = `${unavailable} Engaged`;
}

function populateSpecializationDropdown(roster) {
  const select = document.getElementById('filterSpecialization');
  if (!select || select.options.length > 1) return;

  const specs = Array.from(new Set(roster.map((d) => d.specialization).filter(Boolean))).sort();
  specs.forEach((spec) => {
    const opt = document.createElement('option');
    opt.value = spec;
    opt.textContent = spec;
    select.appendChild(opt);
  });
}

async function renderDoctors() {
  const table = document.getElementById('doctorTable');
  if (!table) return;

  try {
    await loadDoctorRosterData();
  } catch (err) {
    table.innerHTML = `<tr><td colspan="6" style="color:var(--status-error);">Could not load doctor roster: ${PREHelpers.escapeHtml(err.message)}</td></tr>`;
    return;
  }

  updateDoctorKPIs(allDoctorRoster);

  const query = (document.getElementById('doctorSearchInput')?.value || '').trim().toLowerCase();
  const specFilter = (document.getElementById('filterSpecialization')?.value || '').trim();
  const statusFilter = (document.getElementById('filterStatus')?.value || '').trim();

  const filtered = allDoctorRoster.filter((d) => {
    if (specFilter && d.specialization !== specFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (!query) return true;

    const matchName = (d.name || '').toLowerCase().includes(query);
    const matchId = String(d.doctor_id || '').toLowerCase().includes(query);
    const matchSpec = (d.specialization || '').toLowerCase().includes(query);
    const matchPhone = (d.phone || '').toLowerCase().includes(query);
    return matchName || matchId || matchSpec || matchPhone;
  });

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--color-muted-fg);">No matching doctors found</td></tr>`;
    return;
  }

  table.innerHTML = filtered
    .map((d) => {
      let statusBadge = `<span class="status confirmed" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-size:11px; padding:3px 8px; border-radius:12px;">Available</span>`;
      if (d.status === 'In Surgery') {
        statusBadge = `<span class="status pending" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:3px 8px; border-radius:12px;">In Surgery</span>`;
      } else if (d.status === 'Unavailable') {
        statusBadge = `<span class="status pending" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; font-size:11px; padding:3px 8px; border-radius:12px;">Off-Duty</span>`;
      }

      const formattedDoctorName = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;

      return `
        <tr>
          <td style="text-align:left; padding:12px 16px;">
            <strong>DOC-${PREHelpers.escapeHtml(String(d.doctor_id).padStart(3, '0'))}</strong>
          </td>
          <td style="text-align:left; padding:12px 16px;">
            <strong>${PREHelpers.escapeHtml(formattedDoctorName)}</strong>
            ${d.phone ? `<div style="font-size:11px; color:var(--color-muted-fg); margin-top:2px;">${PREHelpers.escapeHtml(d.phone)}</div>` : ''}
          </td>
          <td style="text-align:left; padding:12px 16px;">
            <span style="font-weight:600; color:var(--color-fg);">${PREHelpers.escapeHtml(d.specialization || 'General')}</span>
          </td>
          <td style="text-align:center; padding:12px 14px;">${PREHelpers.escapeHtml(d.days)}</td>
          <td style="text-align:center; padding:12px 14px;">
            <div>${PREHelpers.escapeHtml(d.dutyHours)}</div>
          </td>
          <td style="text-align:center; padding:12px 14px;">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderDoctors();

  const searchInput = document.getElementById('doctorSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderDoctors());
  }

  const specSelect = document.getElementById('filterSpecialization');
  if (specSelect) {
    specSelect.addEventListener('change', () => renderDoctors());
  }

  const statusSelect = document.getElementById('filterStatus');
  if (statusSelect) {
    statusSelect.addEventListener('change', () => renderDoctors());
  }
});

