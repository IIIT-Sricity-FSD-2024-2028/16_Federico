const SHARED_STORAGE_KEY = "hospitalFinanceAppState";
const FALLBACK_DB_PATH = "./data/patient.db.json";
const CANONICAL_PATIENT_FALLBACK = window.CanonicalHospitalSeed?.buildPatientFallbackSeed?.() || null;

const AppStore = {
    patient: null,
    appointments: [],
    visits: [],
    bills: [],
    documents: [],
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
        const raw = localStorage.getItem(SHARED_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[PatientStore] Could not read shared state:", error);
        return {};
    }
}

function saveSharedState(state) {
    localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("sharedStateUpdated"));
}

function ensureSharedShape(state) {
    const next = state && typeof state === "object" ? state : {};
    if (!Array.isArray(next.preRequests)) next.preRequests = [];
    if (!Array.isArray(next.dispatchQueue)) next.dispatchQueue = [];
    if (!Array.isArray(next.receipts)) next.receipts = [];
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

function getSelectedAdmission(sharedData, fallbackData) {
    const admissions = Object.values(sharedData?.admissions || {});
    if (admissions.length === 0) return null;

    const requestedId = Number(sessionStorage.getItem("patientAdmissionId"));
    if (requestedId && sharedData.admissions?.[requestedId]) return sharedData.admissions[requestedId];

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

function mapRequestStatus(status) {
    if (status === "Approved") return "Confirmed";
    if (status === "Rejected" || status === "Cancelled") return "Cancelled";
    if (status === "Rescheduled") return "Scheduled";
    return status || "Pending";
}

function deriveAppointments(sharedData, fallbackAppointments, patient) {
    const appointments = new Map();

    (fallbackAppointments || []).forEach((appointment) => {
        appointments.set(appointment.id, { ...appointment });
    });

    (sharedData.preRequests || [])
        .filter((request) => request.patientId === patient.uhid || request.uhid === patient.uhid || request.name === patient.name)
        .forEach((request) => {
            const existing = appointments.get(request.appointmentId) || {};
            const date = request.appointmentDate || existing.date || "";
            appointments.set(request.appointmentId, {
                id: request.appointmentId,
                date,
                displayDate: date ? formatShortDate(`${date}T00:00:00`) : existing.displayDate || "--",
                time: request.appointmentTime || existing.time || "--",
                department: request.department || existing.department || "General",
                type: request.visitType || existing.type || "Consultation",
                status: mapRequestStatus(request.status),
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

function deriveBillsFromSharedState(sharedData, admission) {
    if (!admission) return [];

    const queue = (sharedData.dispatchQueue || []).filter((item) =>
        item.patient_id === admission.admission_id && item.status === "SENT"
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

function deriveDocumentsFromSharedState(sharedData, admission) {
    if (!admission) return [];

    return (sharedData.dispatchQueue || [])
        .filter((item) => item.patient_id === admission.admission_id && item.status === "SENT")
        .map((item) => ({
            id: `DOC-${item.id}`,
            type: item.type,
            title: item.type === "DISCHARGE_SUMMARY"
                ? "Discharge Summary"
                : item.type === "PAYMENT_LINK"
                    ? `Payment Link (${item.payment_mode || "N/A"})`
                    : item.type === "FINAL_RECEIPT"
                        ? "Final Receipt"
                        : "Billing Link",
            reference: item.discharge_summary_link || item.receipt_link || item.payment_link || item.billing_link || item.link || "",
            createdAt: item.created_at || Date.now(),
            amount: Number(item.amount || 0)
        }))
        .sort((left, right) => right.createdAt - left.createdAt);
}

function deriveNotificationsFromSharedState(sharedData, patient, appointments) {
    const appointmentIds = new Set((appointments || []).map((item) => item.id));

    return (sharedData.preRequests || [])
        .filter((item) => item.patientId === patient.uhid || (item.appointmentId && appointmentIds.has(item.appointmentId)))
        .filter((item) => ["Approved", "Rejected", "Rescheduled"].includes(item.status))
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
                title = "Appointment rescheduled by PRE";
                message = `PRE moved your ${item.department || "appointment"} to ${item.appointmentDate || "a new date"} at ${item.appointmentTime || "the updated time"}.`;
                variant = "warning";
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
    const admission = getSelectedAdmission(shared, fallback);
    const savedProfile = admission ? shared.patientProfiles?.[admission.uhid] : null;
    const patient = derivePatientProfile(admission, fallback.patient, savedProfile);

    AppStore.patient = patient;
    AppStore.appointments = deriveAppointments(shared, fallback.appointments || [], patient);
    AppStore.visits = fallback.visits || [];
    AppStore.slots = fallback.slots || [];
    AppStore.bills = deriveBillsFromSharedState(shared, admission);
    AppStore.documents = deriveDocumentsFromSharedState(shared, admission);
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

    if (CANONICAL_PATIENT_FALLBACK) {
        AppStore._fallbackData = CANONICAL_PATIENT_FALLBACK;
    }

    try {
        if (!AppStore._fallbackData) {
            const response = await fetch(FALLBACK_DB_PATH);
            if (response.ok) AppStore._fallbackData = await response.json();
        }
    } catch (error) {
        console.warn("[PatientStore] Fallback DB unavailable:", error);
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
    return AppStore.bills.find((bill) => bill.id === id) || null;
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
        .filter((appointment) => appointment.date >= today && appointment.status !== "Cancelled")
        .sort((left, right) => left.date.localeCompare(right.date));
}

function addAppointment(data) {
    if (!AppStore.patient) return null;

    const shared = ensureSharedShape(readSharedState());
    const now = Date.now();
    const appointmentId = `APT-${Date.now()}`;
    shared.preRequests.unshift({
        id: `PRE-${now + 1}`,
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
        visitType: data.type || "Consultation",
        source: "Patient",
        bedNumber: "",
        rejectReason: "",
        patientStatus: "",
        homStatus: "",
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
        request.status = "Cancelled";
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

function getNotifications() {
    return [...AppStore.notifications];
}

window.addEventListener("storage", (event) => {
    if (event.key && event.key !== SHARED_STORAGE_KEY) return;
    refreshStoreFromState(readSharedState(), AppStore._fallbackData);
    notifyPatientStoreUpdated();
});

initPatientStore();
