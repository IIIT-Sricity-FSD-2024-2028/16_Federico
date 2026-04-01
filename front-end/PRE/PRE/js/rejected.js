let requests = getPreRequests();

function renderRejected() {
  const table = document.getElementById("rejectedTable");
  if (!table) return;

  requests = getPreRequests();
  table.innerHTML = "";

  let rejectedList = requests.filter((r) => r.status === "Rejected");

  if (rejectedList.length === 0) {
    table.innerHTML = `<tr><td colspan="9">No Rejected Requests</td></tr>`;
    return;
  }

  rejectedList.forEach((r) => {
    table.innerHTML += `
      <tr>
        <td>${r.patientId || "-"}</td>
        <td>${r.age || "-"}</td>
        <td>${r.gender || "-"}</td>
        <td>${r.name || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.appointmentDate || "-"}</td>
        <td>${r.bookedDate || "-"}</td>
        <td>${r.rejectReason || "-"}</td>
        <td>${r.status || "-"}</td>
      </tr>
    `;
  });
}

document.addEventListener("DOMContentLoaded", renderRejected);
bindSharedStateRefresh(renderRejected);
window.addEventListener("storage", renderRejected);
