function navigate(hash, patientId = null) {
    if (window.Permissions && !Permissions.enforceRoute(hash)) return;
    if (patientId) AppState.currentPatientId = patientId;
    saveState();
    location.hash = hash;
    if (typeof window.render === 'function') window.render();
}

window.onhashchange = function () {
    if (typeof window.render === 'function') window.render();
};
