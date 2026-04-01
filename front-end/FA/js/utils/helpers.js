// js/utils/helpers.js

function getPatientData(ledgerId, mode = 'ALL') {
    if (!ledgerId) {
        return { entries: [], total: 0 };
    }
    const p = Object.values(AppState.admissions).find(a => a.ledger_id === ledgerId);
    if (!p) {
        return { entries: [], total: 0 };
    }
    const entries = AppState.ledgers[ledgerId] || [];
    const filtered = (mode === 'NEW') ? entries.filter(e => e.ts > p.last_published_ts) : entries;

    return {
        entries: filtered,
        total: filtered.reduce((sum, e) => sum + (e.qty * e.price) + e.tax, 0)
    };
}

function getLiveStats() {
    const admissionsArr = Object.values(AppState.admissions);
    const revenue = Object.values(AppState.ledgers).flat().reduce((sum, e) => sum + (e.qty * e.price) + e.tax, 0);
    const activeIPD = admissionsArr.filter(a => !a.discharged).length;
    const pendingHOM = AppState.serviceRequests.filter(r => r.status === 'PENDING').length;
    const failedPayments = AppState.stats.failedPayments;

    return { revenue, activeIPD, pendingHOM, failedPayments };
}

function getDisplayPatientId(record) {
    return record?.patient_id || record?.patientId || record?.patient_identifier || record?.uhid || record?.admission_id || 'N/A';
}

function getPatientRouteId(record) {
    return record?.patient_id || record?.patientId || record?.uhid || record?.admission_id || 'N/A';
}
