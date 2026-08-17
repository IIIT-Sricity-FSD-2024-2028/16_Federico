function navigate(hash, admissionId = null) {
    if (window.Permissions && !Permissions.enforceRoute(hash)) return;
    if (admissionId) window.currentAdmissionId = admissionId;
    location.hash = hash;
    if (typeof window.render === 'function') window.render();
}

window.onhashchange = function () {
    if (typeof window.render === 'function') window.render();
};
