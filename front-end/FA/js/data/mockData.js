// FA/js/data/mockData.js
// Declares AppState using canonical-seed as the data source.
// canonical-seed.js MUST be loaded before this file.

const AppState = (function () {
    const seed = window.CanonicalHospitalSeed?.buildSharedStateSeed?.() || {};

    return {
        stats: {
            revenue: 0,
            activeIPD: 0,
            pendingHOM: 0,
            failedPayments: 0,
            pendingClaims: 0
        },
        admissions:           seed.admissions            || {},
        ledgers:              seed.ledgers               || {},
        patients:             seed.patients              || [],
        preRequests:          seed.preRequests           || [],
        serviceRequests:      seed.serviceRequests       || [],
        faLedgerRequests:     seed.faLedgerRequests      || [],
        dispatchQueue:        seed.dispatchQueue         || [],
        paymentConfirmations: seed.paymentConfirmations  || [],
        receipts:             seed.receipts              || [],
        publishedBills:       seed.publishedBills        || [],
        billingRecords:       seed.billingRecords        || [],
        currentPatientId:     seed.currentPatientId      || null
    };
})();
