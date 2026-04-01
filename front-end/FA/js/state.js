// js/state.js

const STORAGE_KEY = 'hospitalFinanceAppState';

function mergeState(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults.slice();
    if (!defaults || typeof defaults !== 'object') return saved === undefined ? defaults : saved;

    const output = { ...defaults };
    const source = saved && typeof saved === 'object' ? saved : {};

    Object.keys(source).forEach(key => {
        const defaultValue = defaults[key];
        const savedValue = source[key];

        if (Array.isArray(defaultValue)) output[key] = Array.isArray(savedValue) ? savedValue : defaultValue.slice();
        else if (defaultValue && typeof defaultValue === 'object') output[key] = mergeState(defaultValue, savedValue);
        else output[key] = savedValue;
    });

    return output;
}

function ensureFinanceStateShape() {
    if (!AppState.stats || typeof AppState.stats !== 'object') AppState.stats = {};
    if (!AppState.admissions || typeof AppState.admissions !== 'object') AppState.admissions = {};
    if (!AppState.ledgers || typeof AppState.ledgers !== 'object') AppState.ledgers = {};
    if (!Array.isArray(AppState.serviceRequests)) AppState.serviceRequests = [];
    if (!Array.isArray(AppState.receipts)) AppState.receipts = [];
    if (!Array.isArray(AppState.publishedBills)) AppState.publishedBills = [];
    if (!Array.isArray(AppState.dispatchQueue)) AppState.dispatchQueue = [];
    if (!Array.isArray(AppState.faLedgerRequests)) AppState.faLedgerRequests = [];
    if (!Array.isArray(AppState.billingRecords)) AppState.billingRecords = [];

    if (!AppState.currentPatientId) {
        const firstAdmissionId = Object.keys(AppState.admissions)[0];
        AppState.currentPatientId = firstAdmissionId ? Number(firstAdmissionId) : 701;
    }
}

function saveState() {
    try {
        ensureFinanceStateShape();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
    } catch (e) {
        console.warn('Could not save state to localStorage:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(AppState, mergeState(AppState, parsed));
        }
        ensureFinanceStateShape();
    } catch (e) {
        console.warn('Could not load state from localStorage, using defaults:', e);
        ensureFinanceStateShape();
    }
}
