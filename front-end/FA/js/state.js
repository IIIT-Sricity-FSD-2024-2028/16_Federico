// js/state.js

const LEGACY_STORAGE_KEY = 'hospitalFinanceAppState';
const ROOT_STORAGE_KEY = 'HospitalAppState';

function useSharedState(){ return localStorage.getItem('USE_SHARED_STATE') === 'true'; }
function resolveStorageKey(){ return ROOT_STORAGE_KEY; }
function readStateFromAdapter() {
    if (window.FAStorage && typeof window.FAStorage.getState === 'function') return window.FAStorage.getState();
    const raw = localStorage.getItem(resolveStorageKey());
    return raw ? JSON.parse(raw) : null;
}
function writeStateFromAdapter(state) {
    if (window.FAStorage && typeof window.FAStorage.setState === 'function') {
        window.FAStorage.setState(state);
        return;
    }
    const payload = JSON.stringify(state);
    localStorage.setItem(ROOT_STORAGE_KEY, payload);
}

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
    if (!Array.isArray(AppState.paymentConfirmations)) AppState.paymentConfirmations = [];
    if (!Array.isArray(AppState.billingRecords)) AppState.billingRecords = [];

    if (!AppState.currentPatientId) {
        const firstAdmissionId = Object.keys(AppState.admissions)[0];
        AppState.currentPatientId = firstAdmissionId ? Number(firstAdmissionId) : 701;
    }
}

function saveState() {
    try {
        ensureFinanceStateShape();
        writeStateFromAdapter(AppState);
    } catch (e) {
        console.warn('Could not save state to localStorage:', e);
    }
}

function loadState() {
    try {
        const parsed = readStateFromAdapter();
        if (parsed) {
            Object.assign(AppState, mergeState(AppState, parsed));
        }
        ensureFinanceStateShape();
        // Trigger UI refresh if router is available
        if (window.Router && typeof window.Router.refresh === 'function') {
            window.Router.refresh();
        }
    } catch (e) {
        console.warn('Could not load state from localStorage, using defaults:', e);
        ensureFinanceStateShape();
    }
}

// Global listeners for sync events
window.addEventListener('storage', loadState);
window.addEventListener('sharedStateUpdated', loadState);



