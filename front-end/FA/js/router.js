'use strict';

function parseHashRoute() {
    const rawHash = location.hash || (window.Permissions ? Permissions.getDefaultRoute() : '#/dashboard');
    const parts = rawHash.split('/');
    const mainRoute = parts.slice(0, 2).join('/');
    const param = parts[2] ? Number(parts[2].split('?')[0]) : null;
    
    if (param) {
        window.currentAdmissionId = param;
    }
    return { rawHash, mainRoute, param };
}

function navigate(hash, admissionId = null) {
    if (window.Permissions && !Permissions.enforceRoute(hash)) return;
    
    let targetHash = hash;
    if (admissionId) {
        window.currentAdmissionId = Number(admissionId);
        if (!targetHash.includes('/' + admissionId)) {
            targetHash = `${hash}/${admissionId}`;
        }
    }
    
    location.hash = targetHash;
    if (typeof window.render === 'function') window.render();
}

window.parseHashRoute = parseHashRoute;
window.navigate = navigate;

window.addEventListener('hashchange', function () {
    parseHashRoute();
    if (typeof window.render === 'function') window.render();
});
