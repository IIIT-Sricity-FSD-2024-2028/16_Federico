'use strict';

/**
 * Patient/js/patient-store.js — Patient portal state adapter.
 */

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
    _docIndex: {}
};

function notifyPatientStoreUpdated() {
    window.dispatchEvent(new Event("patientStoreUpdated"));
}

function onStoreReady(fn) {
    if (AppStore.loaded) {
        fn();
        return;
    }
    AppStore._callbacks.push(fn);
}

function flushCallbacks() {
    const callbacks = AppStore._callbacks.slice();
    AppStore._callbacks = [];
    callbacks.forEach((fn) => fn());
}

/* ── formatting helpers ─────────────────────────────────────────── */

function formatShortDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toIsoDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
}

function computeAge(dob) {
    if (!dob) return "Unknown";
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "Unknown";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
    return Math.max(age, 0);
}

function mapPreRequestStatus(status) {
    const s = String(status || "").toUpperCase();
    if (s === "ADMITTED" || s === "DISCHARGE_REQUESTED") return "Completed";
    if (s === "REJECTED") return "Cancelled";
    return "Pending";
}

/* ── shaping ─────────────────────────────────────────────────────── */

function buildProfile(patient, user, insurance) {
    const nameParts = (patient.name || "").split(" ").filter(Boolean);
    const ins = insurance
        ? {
              verified: Boolean(insurance.coverage_limit),
              provider: insurance.provider_name || "Self Pay",
              policyNumber: insurance.policy_number || "",
              memberId: insurance.member_id || "",
              coverage: Number(insurance.coverage_limit || 0),
              copayPercentage: Number(insurance.copay_percentage || 0),
              validFrom: insurance.valid_from || "",
              validTo: insurance.valid_to || "",
              coverageType: insurance.coverage_type || "Self",
          }
        : {
              verified: false,
              provider: "Self Pay",
              policyNumber: "",
              memberId: "",
              coverage: 0,
              copayPercentage: 0,
              validFrom: "",
              validTo: "",
              coverageType: "Self",
          };

    return {
        id: patient.patient_id,
        patientId: patient.patient_id,
        name: patient.name,
        firstName: nameParts[0] || patient.name || "Patient",
        initials: (nameParts.map((p) => p[0]).join("").slice(0, 2) || "P").toUpperCase(),
        uhid: patient.uhid,
        age: computeAge(patient.dob),
        gender: patient.gender || "Unknown",
        bloodGroup: patient.blood_group || "NA",
        phone: patient.phone || "",
        altPhone: patient.alternate_phone || "",
        email: (user && user.email) || "",
        address: patient.address || "",
        dob: patient.dob || "",
        insurance: ins,
        insuranceRaw: insurance || null,
    };
}

function buildAppointments(preRequests, doctorsById) {
    return preRequests
        .map((pr) => {
            const date = pr.requested_date || "";
            const doctor = pr.doctor_id ? doctorsById[pr.doctor_id] : null;
            return {
                id: pr.pre_request_id,
                date,
                displayDate: date ? formatShortDate(date + "T00:00:00") : "To be confirmed",
                time: pr.requested_time || "--",
                department: pr.department || "General",
                type: pr.visit_type || "Consultation",
                status: mapPreRequestStatus(pr.status),
                rawStatus: pr.status,
                doctorName: doctor ? doctor.name : "",
                rejectReason: pr.reject_reason || "",
                homStatus: pr.hom_status || "",
                source: "Patient",
            };
        })
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function buildVisits(bundles, bedsById, preRequests) {
    const fromAdmissions = bundles.map(({ admission }) => {
        const bed = bedsById[admission.bed_id];
        const dateValue = admission.admit_time || Date.now();
        return {
            id: `ADM-${admission.admission_id}`,
            date: formatFullDate(dateValue),
            isoDate: toIsoDate(dateValue),
            department: bed ? bed.bed_number : "Inpatient",
            description: `Admission${bed ? ` (${bed.bed_number})` : ""}${admission.status === "DISCHARGED" ? " — Discharged" : " — Active"}`,
        };
    });

    const fromPreRequests = preRequests
        .filter((pr) => ["ADMITTED", "DISCHARGE_REQUESTED"].includes(String(pr.status || "").toUpperCase()))
        .map((pr) => ({
            id: `PRE-${pr.pre_request_id}`,
            date: formatFullDate(pr.decided_at || pr.updated_at),
            isoDate: toIsoDate(pr.decided_at || pr.updated_at),
            department: pr.department || "General",
            description: `${pr.department || "General"} ${pr.visit_type || ""}`.trim(),
        }));

    const merged = [...fromAdmissions, ...fromPreRequests];
    return merged.sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
}

function buildBillsAndDocuments(bundles, servicesById, receipts, dischargeSummaries, insurancePolicy) {
    const bills = [];
    const receiptDocs = [];
    const dischargeDocs = [];
    const eodDocs = [];
    const docIndex = {};

    bundles.forEach(({ admission, ledger, entries }) => {
        if (!ledger) return;
        if (ledger.status !== "DISPATCHED" && ledger.status !== "PAID") return;

        const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const serviceNames = entries.map((e) => (servicesById[e.service_id] || {}).service_name).filter(Boolean);
        const share = window.InsuranceCalc
            ? window.InsuranceCalc.computePatientShare(total, insurancePolicy, serviceNames)
            : { coveredAmount: 0, patientShare: total };

        const createdAt = new Date(ledger.dispatched_at || ledger.created_at).getTime();
        const dueAt = createdAt + 7 * 24 * 60 * 60 * 1000;
        const isPaid = ledger.status === "PAID";

        bills.push({
            id: `LEDGER-${ledger.ledger_id}`,
            billNo: `#${ledger.ledger_id}`,
            date: formatFullDate(createdAt),
            department: "Finance",
            description: `Admission #${admission.admission_id} billing`,
            total,
            insuranceCovered: share.coveredAmount,
            youPay: share.patientShare,
            dueDate: formatFullDate(dueAt),
            dueDateISO: toIsoDate(dueAt),
            status: isPaid ? "paid" : "pending",
            disputed: false,
            ledgerId: ledger.ledger_id,
            admissionId: admission.admission_id,
            items: entries.map((e) => ({
                name: (servicesById[e.service_id] || {}).service_name || "Service",
                qty: e.quantity,
                unitPrice: e.unit_price,
                total: e.amount,
            })),
        });

        docIndex[`EOD_BILL:${ledger.ledger_id}`] = {
            patient_name: null,
            gross: total,
            coverage: share.coveredAmount,
            amount: share.patientShare,
            mode: null,
            status: ledger.status,
            ts: createdAt,
        };
        eodDocs.push({
            id: `EOD-${ledger.ledger_id}`,
            section: "EOD Bills",
            type: "EOD_BILL",
            title: `Bill #${ledger.ledger_id}`,
            reference: "patient-billing.html",
            createdAt,
            amount: share.patientShare,
            sourceType: "EOD_BILL",
            sourceId: ledger.ledger_id,
        });

        if (!isPaid) {
            receiptDocs.push({
                id: `PAYLINK-${ledger.ledger_id}`,
                section: "Receipts",
                type: "PAYMENT_LINK",
                title: `Bill #${ledger.ledger_id}`,
                createdAt,
                amount: share.patientShare,
                dispatchId: ledger.ledger_id,
                admissionId: admission.admission_id,
                sourceType: "PAYMENT_LINK",
                sourceId: ledger.ledger_id,
            });
        }
    });

    receipts.forEach((r) => {
        docIndex[`RECEIPT:${r.receipt_id}`] = {
            gross: r.amount,
            coverage: 0,
            amount: r.amount,
            mode: r.payment_mode,
            status: "PAID",
            ts: new Date(r.generated_at).getTime(),
        };
        receiptDocs.push({
            id: `RECEIPT-${r.receipt_id}`,
            section: "Receipts",
            type: "RECEIPT",
            title: `Receipt #${r.receipt_id}`,
            reference: "patient-billing.html",
            createdAt: new Date(r.generated_at).getTime(),
            amount: r.amount,
            sourceType: "RECEIPT",
            sourceId: r.receipt_id,
        });
    });

    dischargeSummaries.forEach((summary) => {
        if (!summary) return;
        docIndex[`DISCHARGE_SUMMARY:${summary.summary_id}`] = {
            gross: summary.final_amount,
            coverage: 0,
            amount: summary.final_amount,
            mode: null,
            status: "AVAILABLE",
            ts: new Date(summary.generated_at).getTime(),
        };
        dischargeDocs.push({
            id: `DISCHARGE-${summary.summary_id}`,
            section: "Discharge Summary",
            type: "DISCHARGE_SUMMARY",
            title: "Discharge Summary",
            reference: "patient-billing.html",
            createdAt: new Date(summary.generated_at).getTime(),
            amount: summary.final_amount,
            sourceType: "DISCHARGE_SUMMARY",
            sourceId: summary.summary_id,
        });
    });

    const documents = [...receiptDocs, ...dischargeDocs, ...eodDocs].sort((a, b) => b.createdAt - a.createdAt);
    const billingSections = {
        receipts: receiptDocs.sort((a, b) => b.createdAt - a.createdAt),
        discharge: dischargeDocs.sort((a, b) => b.createdAt - a.createdAt),
        eod: eodDocs.sort((a, b) => b.createdAt - a.createdAt),
    };

    return { bills: bills.sort((a, b) => b.dueDateISO.localeCompare(a.dueDateISO)), documents, billingSections, docIndex };
}

function buildNotifications(preRequests) {
    return preRequests
        .filter((pr) => ["APPROVED", "REJECTED", "ADMITTED", "EMERGENCY"].includes(String(pr.status || "").toUpperCase()))
        .map((pr) => {
            let title = "Pre-registration update";
            let message = `${pr.department || "General"} request status: ${pr.status}.`;
            let variant = "info";

            if (pr.status === "REJECTED") {
                title = "Request rejected by PRE";
                message = pr.reject_reason
                    ? `Your ${pr.department || "appointment"} request was rejected. Reason: ${pr.reject_reason}`
                    : `Your ${pr.department || "appointment"} request was rejected.`;
                variant = "danger";
            } else if (pr.status === "APPROVED") {
                title = "Request approved by PRE";
                message = `Your ${pr.department || "appointment"} request has been approved.`;
                variant = "success";
            } else if (pr.status === "ADMITTED") {
                title = "You have been admitted";
                message = `Admission confirmed for ${pr.department || "your visit"}.`;
                variant = "success";
            } else if (pr.status === "EMERGENCY") {
                title = "Emergency admission logged";
                message = "Our team has logged an emergency admission for you.";
                variant = "warning";
            }

            return { id: pr.pre_request_id, title, message, status: pr.status, variant, createdAt: new Date(pr.updated_at).getTime() };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
}

/* ── fetch + refresh ─────────────────────────────────────────────── */

function indexBy(arr, key) {
    const out = {};
    (arr || []).forEach((item) => {
        out[item[key]] = item;
    });
    return out;
}

async function refreshStore() {
    const session = window.RoleAccess.getSessionInfo();
    if (!session || !session.patientId) return;

    try {
        const summary = await window.ApiClient.patients.portalSummary(session.patientId);
        const me = { patient: summary.patient, user: { email: session.email } };
        const insurance = summary.insurance;
        const bundles = summary.bundles || [];
        const receipts = summary.receipts || [];
        const doctorsById = indexBy(summary.doctors || [], "doctor_id");
        const bedsById = indexBy(summary.beds || [], "bed_id");
        const servicesById = indexBy(summary.services || [], "service_id");
        const preRequests = summary.preRequests || [];
        const dischargeSummaries = bundles.map((b) => b.dischargeSummary).filter(Boolean);

        const profile = buildProfile(me.patient, me.user, insurance);
        const { bills, documents, billingSections, docIndex } = buildBillsAndDocuments(
            bundles,
            servicesById,
            receipts,
            dischargeSummaries,
            insurance,
        );

        AppStore.patient = profile;
        AppStore.appointments = buildAppointments(preRequests, doctorsById);
        AppStore.visits = buildVisits(bundles, bedsById, preRequests);
        AppStore.bills = bills;
        AppStore.documents = documents;
        AppStore.billingSections = billingSections;
        AppStore.notifications = buildNotifications(preRequests);
        AppStore._docIndex = docIndex;
        AppStore._raw = { bundles, preRequests, doctorsById, bedsById, servicesById, insurance };
    } catch (err) {
        console.warn("[PatientStore] Failed to load portal summary, attempting individual fetch fallback:", err);
        const [me, insuranceList, bundles, receipts, doctors, beds, services] = await Promise.all([
            window.ApiClient.auth.me().catch(() => ({ patient: null, user: null })),
            window.ApiClient.patients.insuranceForPatient(session.patientId).catch(() => []),
            window.ApiClient.billing.patient.bills(session.patientId).catch(() => []),
            window.ApiClient.billing.patient.receipts(session.patientId).catch(() => []),
            window.ApiClient.doctors.list().catch(() => []),
            window.ApiClient.wards.beds().catch(() => []),
            window.ApiClient.billing.services.list().catch(() => []),
        ]);

        const preRequests = (await window.ApiClient.preRequests.list().catch(() => [])).filter(
            (pr) => pr.patient_id === session.patientId,
        );

        const dischargeSummaries = await Promise.all(
            bundles.map(({ admission }) => window.ApiClient.billing.dischargeSummary.getByAdmission(admission.admission_id).catch(() => null)),
        );

        const doctorsById = indexBy(doctors, "doctor_id");
        const bedsById = indexBy(beds, "bed_id");
        const servicesById = indexBy(services, "service_id");
        const insurance = insuranceList && insuranceList[0];

        const profile = buildProfile(me.patient || {}, me.user || {}, insurance);
        const { bills, documents, billingSections, docIndex } = buildBillsAndDocuments(
            bundles,
            servicesById,
            receipts,
            dischargeSummaries,
            insurance,
        );

        AppStore.patient = profile;
        AppStore.appointments = buildAppointments(preRequests, doctorsById);
        AppStore.visits = buildVisits(bundles, bedsById, preRequests);
        AppStore.bills = bills;
        AppStore.documents = documents;
        AppStore.billingSections = billingSections;
        AppStore.notifications = buildNotifications(preRequests);
        AppStore._docIndex = docIndex;
        AppStore._raw = { bundles, preRequests, doctorsById, bedsById, servicesById, insurance };
    }
}

async function initPatientStore() {
    try {
        await refreshStore();
    } catch (err) {
        console.error("[PatientStore] Failed to load patient data:", err);
    }
    AppStore.loaded = true;
    flushCallbacks();
    notifyPatientStoreUpdated();
}

/* ── public getters (unchanged shapes/signatures) ───────────────── */

function getBills() {
    return [...AppStore.bills];
}

function getTotalOutstanding() {
    return AppStore.bills.filter((b) => b.status !== "paid").reduce((sum, b) => sum + b.youPay, 0);
}

function getAllAppointments() {
    return [...AppStore.appointments];
}

function getUpcomingAppointments() {
    const today = new Date().toISOString().split("T")[0];
    return AppStore.appointments
        .filter((a) => (a.date === "" || a.date >= today) && !["Cancelled", "Completed"].includes(a.status))
        .sort((left, right) => left.date.localeCompare(right.date));
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
        receipts: [...(AppStore.billingSections.receipts || [])],
        discharge: [...(AppStore.billingSections.discharge || [])],
        eod: [...(AppStore.billingSections.eod || [])],
    };
}

function getNotifications() {
    return [...AppStore.notifications];
}

function getProfile() {
    return AppStore.patient;
}

function getDoctors() {
    return AppStore._raw ? Object.values(AppStore._raw.doctorsById) : [];
}

function getBillingDocumentByRef(sourceType, sourceId) {
    return AppStore._docIndex[`${sourceType}:${sourceId}`] || null;
}

/* ── public writes (now async — callers must await) ─────────────── */

async function addAppointment(data) {
    if (!AppStore.patient) return null;
    const result = await window.ApiClient.preRequests.create({
        patient_id: AppStore.patient.patientId,
        department: data.department,
        visit_type: ["Admit", "Emergency", "Consultation"].includes(data.type) ? data.type : "Consultation",
        requested_date: data.date || undefined,
        requested_time: data.time || undefined,
    });
    await refreshStore();
    notifyPatientStoreUpdated();
    return result.pre_request_id;
}

async function cancelAppointment(id) {
    await window.ApiClient.preRequests.update(id, { status: "REJECTED", reject_reason: "Cancelled by patient" });
    await refreshStore();
    notifyPatientStoreUpdated();
    return true;
}

async function updateProfile(fields) {
    if (!AppStore.patient) return false;
    const patch = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.dob !== undefined) patch.dob = fields.dob;
    if (fields.gender !== undefined) patch.gender = fields.gender;
    if (fields.bloodGroup !== undefined) patch.blood_group = fields.bloodGroup;
    if (fields.phone !== undefined) patch.phone = fields.phone;
    if (fields.altPhone !== undefined) patch.alternate_phone = fields.altPhone;
    if (fields.address !== undefined) patch.address = fields.address;

    await window.ApiClient.patients.update(AppStore.patient.patientId, patch);
    await refreshStore();
    notifyPatientStoreUpdated();
    return true;
}

async function updateInsurance(fields) {
    if (!AppStore.patient) return false;
    await window.ApiClient.patients.createInsurance({
        patient_id: AppStore.patient.patientId,
        provider_name: fields.provider || "Self Pay",
        policy_number: fields.policyNumber || `POL-${AppStore.patient.uhid}`,
        member_id: fields.memberId || `MEM-${AppStore.patient.patientId}`,
        coverage_type: fields.coverageType || "Individual",
        valid_from: fields.validFrom || new Date().toISOString().split("T")[0],
        valid_to: fields.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        coverage_limit: fields.coverage || 0,
    });
    await refreshStore();
    notifyPatientStoreUpdated();
    return true;
}

async function payBill(bill, paymentMode) {
    if (!bill || !bill.ledgerId) return false;
    await window.ApiClient.billing.payments.create({
        ledger_id: bill.ledgerId,
        amount_paid: bill.youPay,
        payment_mode: paymentMode || "UPI",
    });
    await refreshStore();
    notifyPatientStoreUpdated();
    return true;
}

window.addEventListener("federicoSessionChanged", () => {
    if (AppStore.loaded) {
        refreshStore()
            .then(notifyPatientStoreUpdated)
            .catch((err) => console.warn("[PatientStore] Sync error on session change:", err));
    }
});

initPatientStore();
