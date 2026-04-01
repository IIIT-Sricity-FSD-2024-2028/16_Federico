let doctors = getSharedDoctors();

// Render Table
function renderDoctors() {
  doctors = getSharedDoctors();
  const table = document.getElementById("doctorTable");
  table.innerHTML = "";

  if (doctors.length === 0) {
    table.innerHTML = `<tr><td colspan="6">No Doctors Available</td></tr>`;
    return;
  }

  doctors.forEach((d) => {
    table.innerHTML += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.specialization}</td>
        <td>${d.start}</td>
        <td>${d.end}</td>
        <td>${d.status}</td>
      </tr>
    `;
  });
}

// Save (optional but important for future CRUD)
function saveDoctors() {
  saveSharedDoctors(doctors);
}

// Load
renderDoctors();
bindSharedStateRefresh(renderDoctors);
