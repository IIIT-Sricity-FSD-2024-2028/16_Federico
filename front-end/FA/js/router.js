function navigate(hash, patientId = null) {
    if (window.Permissions && !Permissions.enforceRoute(hash)) return;
    if (patientId) AppState.currentPatientId = patientId;
    saveState();
    location.hash = hash;
    render();
}

window.onhashchange = render;
