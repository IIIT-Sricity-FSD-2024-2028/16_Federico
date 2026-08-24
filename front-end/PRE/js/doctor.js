'use strict';

async function renderDoctors() {
  const table = document.getElementById('doctorTable');
  if (!table) return;

  let doctors = [];
  let availabilities = [];
  try {
    [doctors, availabilities] = await Promise.all([
      window.ApiClient.doctors.list(),
      window.ApiClient.doctors.availabilityAll(),
    ]);
  } catch (err) {
    table.innerHTML = `<tr><td colspan="6">Could not load doctors: ${PREHelpers.escapeHtml(err.message)}</td></tr>`;
    return;
  }

  if (doctors.length === 0) {
    table.innerHTML = `<tr><td colspan="6">No Doctors Available</td></tr>`;
    return;
  }

  const availabilityByDoctor = {};
  availabilities.forEach((a) => {
    if (!availabilityByDoctor[a.doctor_id]) availabilityByDoctor[a.doctor_id] = a;
  });

  table.innerHTML = doctors
    .map((d) => {
      const avail = availabilityByDoctor[d.doctor_id];
      return `
      <tr>
        <td>${PREHelpers.escapeHtml(d.doctor_id)}</td>
        <td>${PREHelpers.escapeHtml(d.name)}</td>
        <td>${PREHelpers.escapeHtml(d.specialization)}</td>
        <td>${PREHelpers.escapeHtml(avail?.start_time || '-')}</td>
        <td>${PREHelpers.escapeHtml(avail?.end_time || '-')}</td>
        <td>${PREHelpers.escapeHtml(avail?.status || 'Unavailable')}</td>
      </tr>
    `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', renderDoctors);
