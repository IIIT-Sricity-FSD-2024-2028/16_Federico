const LEGACY_STORAGE_KEY = "hospitalFinanceAppState";
const ROOT_STORAGE_KEY = "HospitalAppState";
const SHARED_STORAGE_KEY = ROOT_STORAGE_KEY;
const FALLBACK_DB_PATH = "";
const CANONICAL_PATIENT_FALLBACK = window.CanonicalHospitalSeed?.buildPatientFallbackSeed?.() || null;

function nextGeneratedId(namespace) {
    if (window.IDGenerator && typeof window.IDGenerator.nextId === "function") return window.IDGenerator.nextId(namespace);
    return `${namespace}-fallback`;
}

const AppStore = {
    patient: null,
    appointments: [],
    visits: [],
    bills: [],
    documents: [],
    billingSections: { receipts: [], discharge: [], eod: [] },
    notifications: [],
    slots: [],
    loaded: false,
    _callbacks: [],
    _fallbackData: null
};

function notifyPatientStoreUpdated() {
    window.dispatchEvent(new Event("patientStoreUpdated"));
}

function readSharedState() {
    try {
        if (window.PatientStateAdapter && typeof window.PatientStateAdapter.getState === "function") {
            return window.PatientStateAdapter.getState();
        }
        const raw = localStorage.getItem(SHARED_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[PatientStore] Could not read shared state:", error);
        return {};
    }
}

function saveSharedState(state) {
    if (window.PatientStateAdapter && typeof window.PatientStateAdapter.setState === "function") {
        window.PatientStateAdapter.setState(state);
    } else {
        const payload = JSON.stringify(state);
        localStorage.setItem(ROOT_STORAGE_KEY, payload);
    }
    // Push to backend so other modules (PRE, HOM) see the update immediately
    if (window.APIClient && typeof window.APIClient.pushFullState === "function") {
        window.APIClient.pushFullState(state);
    }
    window.dispatchEvent(new Event("sharedStateUpdated"));
}

function ensureSharedShape(state) {
    const next = state && typeof state === "object" ? state : {};
    if (!Array.isArray(next.preRequests)) next.preRequests = [];
    if (!Array.isArray(next.dispatchQueue)) next.dispatchQueue = [];
    if (!Array.isArray(next.receipts)) next.receipts = [];
    if (!Array.isArray(next.paymentConfirmations)) next.paymentConfirmations = [];
    if (!Array.isArray(next.publishedBills)) next.publishedBills = [];
    if (!next.patientProfiles || typeof next.patientProfiles !== "object") next.patientProfiles = {};
    return next;
}

function flushCallbacks() {
    const callbacks = AppStore._callbacks.slice();
    AppStore._callbacks = [];
    callbacks.forEach((fn) => fn());
}

function onStoreReady(fn) {
    if (AppStore.loaded) {
        fn();
        return;
    }
    AppStore._callbacks.push(fn);
}

function formatShortDate(value) {
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatFullDate(value) {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function toIsoDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
}

function hasMeaningfulValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeAppointmentTime(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/am|pm/i.test(raw)) return raw;

    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return raw;

    let hours = Number(match[1]);
    const minutes = match[2];
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${meridiem}`;
}

function normalizeVisitType(request, existingType = "") {
    return request.visitType || request.type || existingType || "";
}

function getSelectedAdmission(sharedData, fallbackData, standaloneProfile) {
    const admissions = Object.values(sharedData?.admissions || {});
    if (admissions.length === 0) return null;

    const requestedUhid = sessionStorage.getItem("patientUhid");
    if (requestedUhid) {
        const matchedAdmission = admissions.find((item) => item.uhid === requestedUhid);
        return matchedAdmission || null;
    }

    const requestedId = Number(sessionStorage.getItem("patientAdmissionId"));
    if (requestedId && sharedData.admissions?.[requestedId]) return sharedData.admissions[requestedId];

    if (standaloneProfile?.uhid) {
        const matchedAdmission = admissions.find((item) => item.uhid === standaloneProfile.uhid);
        if (matchedAdmission) return matchedAdmission;
        return null;
    }

    if (sharedData.currentPatientId && sharedData.admissions?.[sharedData.currentPatientId]) {
        return sharedData.admissions[sharedData.currentPatientId];
    }

    const fallbackName = fallbackData?.patient?.name;
    if (fallbackName) {
        const matched = admissions.find((item) => item.patient_name === fallbackName);
        if (matched) return matched;
    }

    return admissions[0];
}

function getAuthenticatedStandaloneProfile(sharedData) {
    const profiles = Object.values(sharedData?.patientProfiles || {});
    if (profiles.length === 0) return null;

    const requestedUhid = sessionStorage.getItem("patientUhid");
    if (requestedUhid && sharedData?.patientProfiles?.[requestedUhid]) {
        return sharedData.patientProfiles[requestedUhid];
    }

    const authEmail = String(sessionStorage.getItem("authEmail") || "").trim().toLowerCase();
    const authName = String(sessionStorage.getItem("authDisplayName") || "").trim().toLowerCase();

    return profiles.find((profile) => {
        const profileEmail = String(profile?.email || "").trim().toLowerCase();
        const profileName = String(profile?.name || "").trim().toLowerCase();
        return (authEmail && profileEmail === authEmail) || (authName && profileName === authName);
    }) || null;
}

function derivePatientProfile(admission, fallbackPatient, savedProfile) {
    const baseName = admission?.patient_name || fallbackPatient?.name || "Patient";
    const fallbackInsurance = fallbackPatient?.insurance || {};
    const storedInsurance = savedProfile?.insurance || {};
    const nameParts = baseName.split(" ").filter(Boolean);

    return {
        id: savedProfile?.id || (admission ? `ADM-${admission.admission_id}` : fallbackPatient?.id || "PATIENT-1"),
        name: savedProfile?.name || baseName,
        firstName: savedProfile?.firstName || nameParts[0] || baseName,
        initials: savedProfile?.initials || nameParts.map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        uhid: savedProfile?.uhid || admission?.uhid || fallbackPatient?.uhid || "NA",
        age: savedProfile?.age ?? fallbackPatient?.age ?? 32,
        gender: savedProfile?.gender || fallbackPatient?.gender || "Unknown",
        bloodGroup: savedProfile?.bloodGroup || fallbackPatient?.bloodGroup || "NA",
        phone: savedProfile?.phone || fallbackPatient?.phone || "+91 90000 00000",
        altPhone: savedProfile?.altPhone || fallbackPatient?.altPhone || "",
        email: savedProfile?.email || fallbackPatient?.email || "",
        address: savedProfile?.address || fallbackPatient?.address || "",
        dob: savedProfile?.dob || fallbackPatient?.dob || "",
        insurance: {
            verified: savedProfile?.insurance?.verified ?? true,
            provider: storedInsurance.provider || admission?.insurance_provider || fallbackInsurance.provider || "Self Pay",
            policyNumber: storedInsurance.policyNumber || fallbackInsurance.policyNumber || `POL-${admission?.uhid || "NA"}`,
            memberId: storedInsurance.memberId || fallbackInsurance.memberId || `MEM-${admission?.admission_id || "0000"}`,
            coverage: Number(storedInsurance.coverage ?? admission?.coverage ?? fallbackInsurance.coverage ?? 0),
            validFrom: storedInsurance.validFrom || fallbackInsurance.validFrom || "01/04/2025",
            validTo: storedInsurance.validTo || fallbackInsurance.validTo || "31/03/2027",
            coverageType: storedInsurance.coverageType || fallbackInsurance.coverageType || "Corporate"
        }
    };
}

function mapRequestStatus(status, patientStatus = "") {
    if (patientStatus === "Completed" || patientStatus === "Discharged" || status === "Completed" || status === "Discharged" || status === "Approved Discharge") {
        return "Completed";
    }
    if (status === "Approved" || status === "Rescheduled" || status === "Pending") return "Pending";
    if (status === "Rejected" || status === "Cancelled") return "Cancelled";
    return status || "Pending";
}

function deriveAppointments(sharedData, fallbackAppointments, patient) {
    const appointments = new Map();

    (sharedData.preRequests || [])
        .filter((request) => request.patientId === patient.uhid || request.uhid === patient.uhid || request.name === patient.name)
        .forEach((request) => {
            const existing = appointments.get(request.appointmentId) || {};
            const date = request.appointmentDate || existing.date || "";
            const time = normalizeAppointmentTime(request.appointmentTime || request.time || existing.time || "");
            appointments.set(request.appointmentId, {
                id: request.appointmentId,
                date,
                displayDate: date ? formatShortDate(`${date}T00:00:00`) : existing.displayDate || "--",
                time: time || "--",
                department: request.department || existing.department || "General",
                type: normalizeVisitType(request, existing.type),
                status: mapRequestStatus(request.status, request.patientStatus),
                doctorName: request.doctor || existing.doctorName || "",
                source: request.source || existing.source || "Patient"
            });
        });

    return [...appointments.values()].sort((left, right) => {
        const leftKey = `${left.date || ""} ${left.time || ""}`;
        const rightKey = `${right.date || ""} ${right.time || ""}`;
        return leftKey.localeCompare(rightKey);
    });
}

function deriveVisitsFromSharedState(sharedData, fallbackVisits, patient) {
    const visitMap = new Map();

    (sharedData.preRequests || [])
        .filter((request) => request.name === patient.name || request.patientId === patient.uhid || request.uhid === patient.uhid)
        .filter((request) => ["Completed", "Discharged", "Approved Discharge"].includes(request.status) || ["Completed", "Discharged", "Approved Discharge"].includes(request.patientStatus))
        .forEach((request) => {
            const visitType = normalizeVisitType(request, "Consultation");
            const department = request.department || "General";
            const effectiveStatus = request.patientStatus || request.status || "Completed";
            const dateValue = request.appointmentDate ? `${request.appointmentDate}T00:00:00` : request.updated_at || request.decided_at || request.created_at || Date.now();
            const isoDate = toIsoDate(dateValue);
            const visit = {
                id: request.id || `PRE-${isoDate}-${department}-${visitType}`,
                date: formatFullDate(dateValue),
                isoDate,
                department,
                description: `${department} ${visitType}${effectiveStatus === "Discharged" || effectiveStatus === "Approved Discharge" ? " - Discharged" : ""}`
            };

            visitMap.set(visit.id, visit);
        });

    Object.values(sharedData.admissions || {})
        .filter((admission) => admission.patient_name === patient.name)
        .filter((admission) => admission.discharged || admission.discharge_requested || admission.discharge_packet_sent)
        .forEach((admission) => {
            const dateValue = admission.discharged_at || admission.receipt_sent_to_hom_at || admission.discharge_packet_sent_at || admission.admitted_at || Date.now();
            const isoDate = toIsoDate(dateValue);
            const visit = {
                id: `ADM-${admission.admission_id}`,
                date: formatFullDate(dateValue),
                isoDate,
                department: admission.doctor_assigned || "General",
                description: `Admission ${admission.ward_no || "Ward"}${admission.discharged ? " - Discharged" : " - Active"}`
            };
            visitMap.set(visit.id, visit);
        });

    return [...visitMap.values()].sort((left, right) => (right.isoDate || "").localeCompare(left.isoDate || ""));
}

function deriveBillsFromSharedState(sharedData, admission) {
    if (!admission) return [];

    const queue = (sharedData.dispatchQueue || []).filter((item) =>
        (String(item.patient_id || item.admission_id) === String(admission.admission_id) || String(item.uhid) === String(admission.uhid)) && item.status === "SENT"
    );
    const receipts = (sharedData.receipts || []).filter((item) => item.uhid === admission.uhid);
    const matchedReceiptIds = new Set();

    const queueBills = queue.map((item) => {
        const linkedReceipt = item.receipt_id ? receipts.find((receipt) => receipt.id === item.receipt_id) : null;
        const createdAt = item.created_at || Date.now();
        const dueAt = createdAt + (7 * 24 * 60 * 60 * 1000);

        if (linkedReceipt) matchedReceiptIds.add(linkedReceipt.id);

        return {
            id: `DISPATCH-${item.id}`,
            billNo: `#${item.bill_id || `${item.type}-${item.id}`}`,
            date: formatFullDate(createdAt),
            department: item.type === "DISCHARGE_SUMMARY" ? "Discharge Desk" : "Finance",
            description: item.type === "DISCHARGE_SUMMARY" ? "Discharge Summary & Final Bill" : "EOD Live Ledger Update",
            total: Number(item.gross || item.amount || 0),
            insuranceCovered: Number(item.insurance_deduction || 0),
            youPay: Number(item.amount || 0),
            dueDate: formatFullDate(dueAt),
            dueDateISO: new Date(dueAt).toISOString().split("T")[0],
            status: linkedReceipt ? "paid" : "pending",
            disputed: false,
            items: [
                {
                    name: item.type === "DISCHARGE_SUMMARY" ? "Final Billing Packet" : "Ledger Update",
                    qty: 1,
                    unitPrice: Number(item.amount || 0),
                    total: Number(item.amount || 0)
                }
            ]
        };
    });

    const receiptBills = receipts
        .filter((receipt) => !matchedReceiptIds.has(receipt.id))
        .map((receipt) => ({
            id: `RECEIPT-${receipt.id}`,
            billNo: `#PAY-${receipt.id}`,
            date: formatFullDate(receipt.ts || Date.now()),
            department: "Finance",
            description: `Payment Receipt (${receipt.mode})`,
            total: Number(receipt.gross || receipt.amount || 0),
            insuranceCovered: Number(receipt.coverage || 0),
            youPay: Number(receipt.amount || 0),
            dueDate: formatFullDate(receipt.ts || Date.now()),
            dueDateISO: new Date(receipt.ts || Date.now()).toISOString().split("T")[0],
            status: "paid",
            disputed: false,
            items: [
                {
                    name: `Receipt ${receipt.mode}`,
                    qty: 1,
                    unitPrice: Number(receipt.amount || 0),
                    total: Number(receipt.amount || 0)
                }
            ]
        }));

    return [...queueBills, ...receiptBills].sort((left, right) => right.dueDateISO.localeCompare(left.dueDateISO));
}

function matchesPatient(item, admission) {
    if (!admission) return false;
    const itemPatientId = String(item.patient_id || item.admission_id || "").trim();
    const itemUhid = String(item.uhid || "").trim();
    const itemPatientName = String(item.patient_name || item.patient || "").trim().toLowerCase();
    
    const admissionId = String(admission.admission_id || "").trim();
    const admissionUhid = String(admission.uhid || "").trim();
    const admissionName = String(admission.patient_name || "").trim().toLowerCase();

    return (
        (itemPatientId && admissionId && itemPatientId === admissionId) ||
        (itemUhid && admissionUhid && itemUhid === admissionUhid) ||
        (itemPatientName && admissionName && itemPatientName === admissionName)
    );
}

function deriveDocumentsFromSharedState(sharedData, admission) {
    if (!admission) return [];

    const receipts = (sharedData.paymentConfirmations || [])
        .filter((item) =>
            item.status === "RECEIPT_SENT" && matchesPatient(item, admission)
        )
        .map((item) => ({
            id: `DOC-RECEIPT-${item.id}`,
            section: "Receipts",
            type: "RECEIPT",
            title: `Receipt ${item.id}`,
            reference: item.receipt_link || `federico://receipts/${item.receipt_id || ""}`,
            createdAt: item.receipt_sent_at || item.confirmed_at || Date.now(),
            amount: Number(item.amount || 0)
        }));

    const dischargeSummaries = (sharedData.dispatchQueue || [])
        .filter((item) => matchesPatient(item, admission) && item.type === "DISCHARGE_SUMMARY" && item.status === "SENT")
        .map((item) => ({
            id: `DOC-DISCHARGE-${item.id}`,
            section: "Discharge Summary",
            type: item.type,
            title: "Discharge Summary",
            reference: item.discharge_summary_link || item.link || "",
            createdAt: item.sent_at || item.created_at || Date.now(),
            amount: Number(item.amount || 0)
        }));

    const eodBills = (sharedData.dispatchQueue || [])
        .filter((item) => matchesPatient(item, admission) && item.type === "EOD_BILL" && item.status === "SENT")
        .map((item) => ({
            id: `DOC-EOD-${item.id}`,
            section: "EOD Bills",
            type: item.type,
            title: item.bill_id || `EOD Bill ${item.id}`,
            reference: item.billing_link || item.link || "",
            createdAt: item.sent_at || item.created_at || Date.now(),
            amount: Number(item.amount || 0)
        }));

    return [...receipts, ...dischargeSummaries, ...eodBills].sort((left, right) => right.createdAt - left.createdAt);
}

function deriveBillingSections(sharedData, admission) {
    if (!admission) return { receipts: [], discharge: [], eod: [] };

    const receiptsFromConfirmations = (sharedData.paymentConfirmations || [])
        .filter((item) =>
            item.status === "RECEIPT_SENT" && matchesPatient(item, admission)
        )
        .map((item) => ({
            id: `RECEIPT-${item.id}`,
            type: "RECEIPT",
            title: `Receipt ${item.id}`,
            amount: Number(item.amount || 0),
            createdAt: item.receipt_sent_at || item.confirmed_at || Date.now(),
            reference: item.receipt_link || `federico://receipts/${item.receipt_id || ""}`,
            sourceType: "PAYMENT_CONFIRMATION",
            sourceId: item.id
        }));

    const paymentLinks = (sharedData.dispatchQueue || [])
        .filter((item) => matchesPatient(item, admission) && item.type === "PAYMENT_LINK" && !item.payment_confirmed && item.status === "SENT")
        .map((item) => ({
            id: `PAYLINK-${item.id}`,
            type: "PAYMENT_LINK",
            title: `Payment Link (${item.payment_mode || "N/A"})`,
            amount: Number(item.amount || 0),
            createdAt: item.sent_at || item.created_at || Date.now(),
            paymentLink: item.payment_link || item.billing_link || item.link || "",
            dispatchId: item.id,
            admissionId: item.admission_id || item.patient_id || admission.admission_id,
            sourceType: "DISPATCH",
            sourceId: item.id
        }));

    const paidPaymentLinks = (sharedData.dispatchQueue || [])
        .filter((item) => matchesPatient(item, admission) && item.type === "PAYMENT_LINK" && item.payment_confirmed)
        .map((item) => ({
            id: `PAYDONE-${item.id}`,
            type: "PAYMENT_CONFIRMED",
            title: `Payment Confirmed (${item.payment_mode || "N/A"})`,
            amount: Number(item.amount || 0),
            createdAt: item.payment_confirmed_at || item.sent_at || item.created_at || Date.now(),
            reference: item.payment_link || item.billing_link || item.link || "",
            sourceType: "DISPATCH",
            sourceId: item.id
        }));

    const discharge = (sharedData.dispatchQueue || [])
        .filter((item) => matchesPatient(item, admission) && item.type === "DISCHARGE_SUMMARY" && item.status === "SENT")
        .map((item) => ({
            id: `DISCHARGE-${item.id}`,
            type: "DISCHARGE_SUMMARY",
            title: "Discharge Summary",
            amount: Number(item.amount || item.gross || 0),
            createdAt: item.sent_at || item.created_at || Date.now(),
            reference: item.discharge_summary_link || item.link || "",
            sourceType: "DISPATCH",
            sourceId: item.id
        }));

    const eod = (sharedData.publishedBills || [])
        .filter((item) => matchesPatient(item, admission))
        .map((item) => ({
            id: `EOD-${item.bill_id || item.id || nextGeneratedId("eod")}`,
            type: "EOD_BILL",
            title: item.bill_id || "EOD Bill",
            amount: Number(item.amount || 0),
            createdAt: item.ts || item.created_at || Date.now(),
            reference: item.link || "",
            sourceType: "PUBLISHED_BILL",
            sourceId: item.bill_id || item.id || ""
        }));

    return {
        receipts: [...receiptsFromConfirmations, ...paidPaymentLinks, ...paymentLinks].sort((a, b) => b.createdAt - a.createdAt),
        discharge: discharge.sort((a, b) => b.createdAt - a.createdAt),
        eod: eod.sort((a, b) => b.createdAt - a.createdAt)
    };
}

function deriveNotificationsFromSharedState(sharedData, patient, appointments) {
    const appointmentIds = new Set((appointments || []).map((item) => item.id));

    return (sharedData.preRequests || [])
        .filter((item) => item.patientId === patient.uhid || (item.appointmentId && appointmentIds.has(item.appointmentId)))
        .filter((item) => ["Approved", "Rejected", "Rescheduled", "Cancelled"].includes(item.status))
        .map((item) => {
            let title = "Appointment update";
            let message = `${item.department || "General"} request was updated by PRE.`;
            let variant = "info";

            if (item.status === "Rejected") {
                title = "Request rejected by PRE";
                message = item.rejectReason
                    ? `PRE rejected your ${item.department || "appointment"} request. Reason: ${item.rejectReason}`
                    : `PRE rejected your ${item.department || "appointment"} request.`;
                variant = "danger";
            } else if (item.status === "Rescheduled") {
                const fromDate = item.previousAppointmentDate || item.oldAppointmentDate || item.fromDate || "";
                const fromTime = item.previousAppointmentTime || item.oldAppointmentTime || item.fromTime || "";
                title = "Appointment rescheduled by PRE";
                message = `PRE moved your ${item.department || "appointment"}${fromDate || fromTime ? ` from ${fromDate || "previous date"} ${fromTime || ""}` : ""} to ${item.appointmentDate || "a new date"} ${item.appointmentTime ? `at ${item.appointmentTime}` : ""}.`;
                variant = "warning";
            } else if (item.status === "Cancelled") {
                title = "Appointment cancelled by PRE";
                message = `PRE cancelled your ${item.department || "appointment"} scheduled for ${item.appointmentDate || "the selected date"} ${item.appointmentTime ? `at ${item.appointmentTime}` : ""}.`;
                variant = "danger";
            } else if (item.status === "Approved") {
                title = "Appointment approved by PRE";
                message = `PRE approved your ${item.department || "appointment"}${item.appointmentTime ? ` for ${item.appointmentTime}` : ""}.`;
                variant = "success";
            }

            return {
                id: item.id,
                title,
                message,
                status: item.status,
                variant,
                createdAt: item.updated_at || item.decided_at || Date.now()
            };
        })
        .sort((left, right) => right.createdAt - left.createdAt);
}

function refreshStoreFromState(sharedData, fallbackData) {
    const shared = ensureSharedShape(sharedData);
    const fallback = fallbackData || AppStore._fallbackData || {};
    const standaloneProfile = getAuthenticatedStandaloneProfile(shared);
    const admission = getSelectedAdmission(shared, fallback, standaloneProfile);
    const savedProfile = admission
        ? (shared.patientProfiles?.[admission.uhid] || standaloneProfile)
        : standaloneProfile;
    const patient = derivePatientProfile(admission, fallback.patient, savedProfile);

    AppStore.patient = patient;
    AppStore.appointments = deriveAppointments(shared, fallback.appointments || [], patient);
    AppStore.visits = deriveVisitsFromSharedState(shared, fallback.visits || [], patient);
    AppStore.slots = fallback.slots || [];
    AppStore.bills = deriveBillsFromSharedState(shared, admission);
    AppStore.documents = deriveDocumentsFromSharedState(shared, admission);
    AppStore.billingSections = deriveBillingSections(shared, admission);
    AppStore.notifications = deriveNotificationsFromSharedState(shared, patient, AppStore.appointments);
}

function persistPatientProfile() {
    if (!AppStore.patient?.uhid) return;

    const shared = ensureSharedShape(readSharedState());
    shared.patientProfiles[AppStore.patient.uhid] = {
        ...shared.patientProfiles[AppStore.patient.uhid],
        ...AppStore.patient,
        insurance: {
            ...(shared.patientProfiles[AppStore.patient.uhid]?.insurance || {}),
            ...(AppStore.patient.insurance || {})
        }
    };
    saveSharedState(shared);
}

async function initPatientStore() {
    if (!localStorage.getItem(SHARED_STORAGE_KEY) && window.CanonicalHospitalSeed?.buildSharedStateSeed) {
        saveSharedState(window.CanonicalHospitalSeed.buildSharedStateSeed());
    }

    AppStore._fallbackData = CANONICAL_PATIENT_FALLBACK;

    if (FALLBACK_DB_PATH) {
        try {
            const response = await fetch(FALLBACK_DB_PATH, { cache: "no-store" });
            if (response.ok) AppStore._fallbackData = await response.json();
        } catch (error) {
            console.warn("[PatientStore] Fallback DB unavailable:", error);
        }
    }

    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    AppStore.loaded = true;
    flushCallbacks();
    notifyPatientStoreUpdated();
}

function saveToStorage() {
    persistPatientProfile();
    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    notifyPatientStoreUpdated();
}

function getBills() {
    return [...AppStore.bills];
}

function getBillById(id) {
    const normalizedId = String(id || "").trim().replace(/^#/, "");
    if (!normalizedId) return null;

    return AppStore.bills.find((bill) => {
        const billId = String(bill.id || "").trim().replace(/^#/, "");
        const billNo = String(bill.billNo || "").trim().replace(/^#/, "");
        return billId === normalizedId || billNo === normalizedId;
    }) || null;
}

function disputeBill(id) {
    const bill = AppStore.bills.find((item) => item.id === id);
    if (!bill) return false;
    bill.disputed = true;
    return true;
}

function getTotalOutstanding() {
    return AppStore.bills
        .filter((bill) => bill.status !== "paid")
        .reduce((sum, bill) => sum + bill.youPay, 0);
}

function getTotalPaidThisYear() {
    const year = new Date().getFullYear().toString();
    return AppStore.bills
        .filter((bill) => bill.status === "paid" && bill.dueDateISO.startsWith(year))
        .reduce((sum, bill) => sum + bill.youPay, 0);
}

function getTotalInsuranceCovered() {
    return AppStore.bills.reduce((sum, bill) => sum + bill.insuranceCovered, 0);
}

function getNextDueBill() {
    return AppStore.bills
        .filter((bill) => bill.status !== "paid")
        .sort((left, right) => left.dueDateISO.localeCompare(right.dueDateISO))[0] || null;
}

function getAllAppointments() {
    return [...AppStore.appointments];
}

function getUpcomingAppointments() {
    const today = new Date().toISOString().split("T")[0];
    return AppStore.appointments
        .filter((appointment) =>
            appointment.date >= today &&
            !["Cancelled", "Completed", "Discharged"].includes(appointment.status)
        )
        .sort((left, right) => left.date.localeCompare(right.date));
}

function addAppointment(data) {
    if (!AppStore.patient) return null;

    const shared = ensureSharedShape(readSharedState());
    const now = Date.now();
    const appointmentId = nextGeneratedId("pre-appointment");
    shared.preRequests.unshift({
        id: nextGeneratedId("pre-request"),
        appointmentId,
        patientId: AppStore.patient.uhid,
        uhid: AppStore.patient.uhid,
        name: AppStore.patient.name,
        age: AppStore.patient.age,
        gender: AppStore.patient.gender,
        phone: AppStore.patient.phone,
        address: AppStore.patient.address,
        appointmentDate: data.date,
        bookedDate: new Date().toLocaleDateString("en-IN"),
        appointmentTime: data.time,
        department: data.department,
        doctor: data.doctorName || "",
        status: "Pending",
        visitType: ["Admit", "Emergency", "Consultation"].includes(data.type) ? data.type : "Consultation",
        source: "PRE",
        bedNumber: "",
        rejectReason: "",
        patientStatus: "Pending",
        homStatus: "Awaiting HOM",
        patientDetails: `${AppStore.patient.gender || ""}, ${AppStore.patient.age || ""}, ${data.department || "General"}`.replace(/^,\s*|,\s*$/g, ""),
        wardType: "General Ward",
        decided_at: 0,
        created_at: now,
        booked_at: now,
        updated_at: now
    });
    saveSharedState(shared);
    refreshStoreFromState(shared, AppStore._fallbackData);
    notifyPatientStoreUpdated();
    return appointmentId;
}

function cancelAppointment(id) {
    const shared = ensureSharedShape(readSharedState());
    const request = shared.preRequests.find((item) => item.appointmentId === id);

    if (request) {
        request.status = "Rejected";
        request.patientStatus = "Rejected";
        request.rejectReason = "Cancelled by patient";
        request.updated_at = Date.now();
        saveSharedState(shared);
        refreshStoreFromState(shared, AppStore._fallbackData);
        notifyPatientStoreUpdated();
        return true;
    }

    const appointment = AppStore.appointments.find((item) => item.id === id);
    if (!appointment) return false;

    appointment.status = "Cancelled";
    notifyPatientStoreUpdated();
    return true;
}

function getProfile() {
    return AppStore.patient;
}

function updateProfile(fields) {
    if (!AppStore.patient) return false;
    AppStore.patient = { ...AppStore.patient, ...fields };
    persistPatientProfile();
    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    notifyPatientStoreUpdated();
    return true;
}

function updateInsurance(fields) {
    if (!AppStore.patient) return false;
    AppStore.patient.insurance = { ...AppStore.patient.insurance, ...fields };
    persistPatientProfile();
    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    notifyPatientStoreUpdated();
    return true;
}

function getVisits() {
    return [...AppStore.visits];
}

function getSlots() {
    return [...AppStore.slots];
}

function getDocuments() {
    return [...AppStore.documents];
}

function getBillingSections() {
    return {
        receipts: [...(AppStore.billingSections?.receipts || [])],
        discharge: [...(AppStore.billingSections?.discharge || [])],
        eod: [...(AppStore.billingSections?.eod || [])]
    };
}

function getNotifications() {
    return [...AppStore.notifications];
}

function confirmPatientPayment(dispatchId) {
    if (!dispatchId) return false;
    const shared = ensureSharedShape(readSharedState());
    const dispatchItem = (shared.dispatchQueue || []).find((item) => String(item.id) === String(dispatchId));
    if (!dispatchItem) return false;

    const now = Date.now();
    const admissionId = dispatchItem.admission_id || dispatchItem.patient_id;
    const amount = Number(dispatchItem.amount || 0);
    dispatchItem.payment_confirmed = true;
    dispatchItem.payment_confirmed_at = now;
    dispatchItem.status = "PAYMENT_CONFIRMED";

    if (window.Store && typeof window.Store.confirmPaymentFromHOM === "function" && admissionId) {
        window.Store.confirmPaymentFromHOM(admissionId, amount, "UPI");
    }

    if (!Array.isArray(shared.paymentConfirmations)) shared.paymentConfirmations = [];
    const alreadyExists = shared.paymentConfirmations.some(
        (item) => String(item.dispatch_id || "") === String(dispatchId) && item.status !== "RECEIPT_SENT"
    );
    if (!alreadyExists) {
        shared.paymentConfirmations.unshift({
            id: nextGeneratedId("payment-confirmation"),
            dispatch_id: dispatchItem.id,
            patient_id: dispatchItem.patient_id,
            admission_id: dispatchItem.admission_id || dispatchItem.patient_id,
            patient_name: dispatchItem.patient_name,
            uhid: dispatchItem.uhid,
            amount: dispatchItem.amount,
            payment_mode: "UPI",
            confirmed_by: "PATIENT",
            confirmed_at: now,
            status: "PENDING_RECEIPT"
        });
    }

    saveSharedState(shared);
    refreshStoreFromState(shared, AppStore._fallbackData);
    notifyPatientStoreUpdated();
    return true;
}

function getBillingDocumentByRef(sourceType, sourceId) {
    if (!sourceType || sourceId === undefined || sourceId === null) return null;
    const shared = ensureSharedShape(readSharedState());
    const sourceKey = String(sourceType).trim().toUpperCase();
    const idKey = String(sourceId).trim();

    if (sourceKey === "DISPATCH") {
        return (shared.dispatchQueue || []).find((item) => String(item.id) === idKey) || null;
    }
    if (sourceKey === "PAYMENT_CONFIRMATION") {
        return (shared.paymentConfirmations || []).find((item) => String(item.id) === idKey) || null;
    }
    if (sourceKey === "PUBLISHED_BILL") {
        return (shared.publishedBills || []).find((item) =>
            String(item.bill_id || item.id || "") === idKey
        ) || null;
    }
    if (sourceKey === "RECEIPT") {
        return (shared.receipts || []).find((item) => String(item.id) === idKey) || null;
    }
    return null;
}

window.addEventListener("storage", (event) => {
    if (event.key && event.key !== SHARED_STORAGE_KEY) return;
    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    notifyPatientStoreUpdated();
});

initPatientStore();




