/**
 * storage.js
 * Central State Management for Federico Hospital HOM
 * Handles localStorage initialization and global data mutations.
 */

window.Store = (function () {
  const STORAGE_KEY = 'hospitalFinanceAppState';

  // ==========================================
  // 1. INITIAL SEED DATA (Zero Simplification)
  // ==========================================
  const initialData = window.CanonicalHospitalSeed?.buildSharedStateSeed?.() || {
    stats: {
      revenue: 284500,
      activeIPD: 8,
      pendingClaims: 24,
      failedPayments: 5,
      homRequests: 7
    },

    admissions: {
      701: { admission_id: 701, ledger_id: 801, patient_name: "Qasim Sheikh", uhid: "UHID-882100", ward_no: "G-102", doctor_assigned: "Dr. Sharma", coverage: 1500, insurance_provider: "Star Health", last_published_ts: 1711800000000, admitted_at: Date.now() - (3 * 24 * 60 * 60 * 1000), discharged: false },
      702: { admission_id: 702, ledger_id: 802, patient_name: "Mohammed Kamran", uhid: "UHID-882105", ward_no: "ICU-05", doctor_assigned: "Dr. Varma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: Date.now() - (4 * 24 * 60 * 60 * 1000), discharged: false },
      703: { admission_id: 703, ledger_id: 803, patient_name: "Hamiz Ahmed", uhid: "UHID-882110", ward_no: "B-201", doctor_assigned: "Dr. Reddy", coverage: 5000, insurance_provider: "HDFC Ergo", last_published_ts: 0, admitted_at: Date.now() - (2 * 24 * 60 * 60 * 1000), discharged: false },
      704: { admission_id: 704, ledger_id: 804, patient_name: "Sarah Williams", uhid: "UHID-882120", ward_no: "P-501", doctor_assigned: "Dr. Kapoor", coverage: 10000, insurance_provider: "ICICI Lombard", last_published_ts: 0, admitted_at: Date.now() - (24 * 60 * 60 * 1000), discharged: false },
      705: { admission_id: 705, ledger_id: 805, patient_name: "Ananya Iyer", uhid: "UHID-882135", ward_no: "C-302", doctor_assigned: "Dr. Nair", coverage: 25000, insurance_provider: "Reliance Gen", last_published_ts: 0, admitted_at: Date.now() - (5 * 24 * 60 * 60 * 1000), discharged: false },
      706: { admission_id: 706, ledger_id: 806, patient_name: "Vikram Malhotra", uhid: "UHID-882140", ward_no: "G-108", doctor_assigned: "Dr. Sharma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: Date.now() - (24 * 60 * 60 * 1000), discharged: false }
    },

    ledgers: {
      801: [
        { entry_id: 1, service_name: "Consultation", qty: 1, price: 500, tax: 0, ts: 1711800000000 },
        { entry_id: 2, service_name: "General Ward", qty: 2, price: 3000, tax: 300, ts: 1711810000000 },
        { entry_id: 101, service_name: "Pharmacy: Paracetamol", qty: 10, price: 5, tax: 2, ts: 1711820000000 }
      ],
      802: [
        { entry_id: 3, service_name: "ICU Charges", qty: 3, price: 8000, tax: 1200, ts: 1711800000000 },
        { entry_id: 4, service_name: "Ventilator Support", qty: 1, price: 5000, tax: 900, ts: 1711820000000 },
        { entry_id: 102, service_name: "Oxygen Cylinder", qty: 2, price: 1500, tax: 150, ts: 1711830000000 }
      ],
      803: [
        { entry_id: 5, service_name: "Emergency Room", qty: 1, price: 2000, tax: 100, ts: 1711800000000 },
        { entry_id: 6, service_name: "IV Fluids", qty: 3, price: 450, tax: 20, ts: 1711840000000 }
      ],
      804: [
        { entry_id: 105, service_name: "Private Suite", qty: 1, price: 12000, tax: 1200, ts: 1711850000000 },
        { entry_id: 106, service_name: "Dietary Services", qty: 1, price: 800, tax: 40, ts: 1711860000000 }
      ],
      805: [
        { entry_id: 107, service_name: "Cardiac Monitoring", qty: 1, price: 4500, tax: 450, ts: 1711870000000 },
        { entry_id: 108, service_name: "ECG Test", qty: 1, price: 1200, tax: 60, ts: 1711880000000 }
      ],
      806: [
        { entry_id: 109, service_name: "Nebulization", qty: 4, price: 300, tax: 15, ts: 1711890000000 }
      ]
    },

    serviceRequests: [
      { id: 10, patient_id: 701, uhid: "UHID-882100", appt_id: "APT-8821", patient_name: "Qasim Sheikh", service: "X-Ray Chest", service_count: 1, status: "PENDING", created_at: Date.now() - (6 * 60 * 60 * 1000), source: "HOM" },
      { id: 11, patient_id: 703, uhid: "UHID-882110", appt_id: "APT-8825", patient_name: "Hamiz Ahmed", service: "MRI Brain", service_count: 1, status: "PENDING", created_at: Date.now() - (4 * 60 * 60 * 1000), source: "HOM" },
      { id: 12, patient_id: 704, uhid: "UHID-882120", appt_id: "APT-8840", patient_name: "Sarah Williams", service: "ECG", service_count: 1, status: "PENDING", created_at: Date.now() - (2 * 60 * 60 * 1000), source: "HOM" }
    ],

    receipts: [
      { id: 901, patient: "Qasim Sheikh", uhid: "UHID-882100", amount: 3100, gross: 4600, coverage: 1500, insurance: "Star Health", mode: "UPI", status: "Paid", ts: Date.now() - (45 * 24 * 60 * 60 * 1000) },
      { id: 903, patient: "Sarah Williams", uhid: "UHID-882120", amount: 12000, gross: 22000, coverage: 10000, insurance: "ICICI Lombard", mode: "CARD", status: "Paid", ts: Date.now() - (20 * 24 * 60 * 60 * 1000) }
    ],

    publishedBills: [
      { bill_id: "EOD-1711800000", patient: "Qasim Sheikh", patient_id: 701, amount: 6500, link: "#", ts: Date.now() - (3 * 24 * 60 * 60 * 1000) },
      { bill_id: "EOD-1711810000", patient: "Hamiz Ahmed", patient_id: 703, amount: 2100, link: "#", ts: Date.now() - (2 * 24 * 60 * 60 * 1000) }
    ],

    dispatchQueue: [],
    faLedgerRequests: [],
    currentPatientId: 701,

    pendingAdmissions: [
      { id: 1, patient: "Arun Mehta", uhid: "FED-2026-9001", dept: "Cardiology", requestedBy: "PRE-Rekha", priority: "Urgent", time: "2h 15m" },
      { id: 2, patient: "Sunita Sharma", uhid: "FED-2026-9002", dept: "Surgery", requestedBy: "PRE-Anil", priority: "High", time: "45m" },
      { id: 3, patient: "Rajan Pillai", uhid: "FED-2026-9003", dept: "General", requestedBy: "PRE-Meena", priority: "Normal", time: "1h 30m" },
      { id: 4, patient: "Divya Nair", uhid: "FED-2026-9004", dept: "Pediatrics", requestedBy: "PRE-Rekha", priority: "High", time: "30m" },
      { id: 5, patient: "Mohammed Ali", uhid: "FED-2026-9005", dept: "ICU", requestedBy: "PRE-Sanjay", priority: "Critical", time: "10m" }
    ],

    patients: [
      { id: 1, uhid: "FED-2026-8901", name: "Rajesh Kumar", age: "58M", dept: "Cardiology", bed: "CCU-04", physician: "Dr. Arjun Sharma", admitted: "2026-03-05", days: 3, status: "Admitted", statusVariant: "info" },
      { id: 2, uhid: "FED-2026-8902", name: "Anjali Singh", age: "34F", dept: "Surgery", bed: "Surgical-B2", physician: "Dr. Priya Patel", admitted: "2026-03-06", days: 2, status: "Admitted", statusVariant: "info" },
      { id: 3, uhid: "FED-2026-8903", name: "Mohammed Idris", age: "7M", dept: "Pediatrics", bed: "Peds-C1", physician: "Dr. Rahul Mehta", admitted: "2026-03-07", days: 1, status: "Admitted", statusVariant: "info" },
      { id: 4, uhid: "FED-2026-8904", name: "Lakshmi Devi", age: "65F", dept: "Orthopedics", bed: "Ortho-A3", physician: "Dr. Sunita Rao", admitted: "2026-03-03", days: 5, status: "Pending Discharge", statusVariant: "warning" },
      { id: 5, uhid: "FED-2026-8905", name: "Ravi Teja", age: "42M", dept: "Emergency", bed: "ICU-01", physician: "Dr. Vikram Singh", admitted: "2026-03-08", days: 0, status: "Critical", statusVariant: "error" },
      { id: 6, uhid: "FED-2026-8906", name: "Fatima Begum", age: "51F", dept: "Neurology", bed: "Neuro-B2", physician: "Dr. Anita Desai", admitted: "2026-03-04", days: 4, status: "Admitted", statusVariant: "info" },
      { id: 7, uhid: "FED-2026-8907", name: "Suresh Nair", age: "67M", dept: "Oncology", bed: "Onco-A1", physician: "Dr. Kiran Kumar", admitted: "2026-03-01", days: 7, status: "Admitted", statusVariant: "info" },
      { id: 8, uhid: "FED-2026-8908", name: "Preethi Iyer", age: "28F", dept: "Gynecology", bed: "Bed freed", physician: "Dr. Meera Joshi", admitted: "2026-03-07", days: 1, status: "Discharged", statusVariant: "neutral" }
    ],

    billingRecords: [
      { id: 1, patient: "Rajesh Kumar", uhid: "FED-2026-8901", dept: "Cardiology", bed: "CCU-04", dailyRate: 4500, days: 3, supplyCharges: 2400, total: 15900, status: "Active", statusVariant: "info" },
      { id: 2, patient: "Anjali Singh", uhid: "FED-2026-8902", dept: "Surgery", bed: "Surgical-B2", dailyRate: 3200, days: 2, supplyCharges: 1800, total: 8200, status: "Active", statusVariant: "info" },
      { id: 3, patient: "Lakshmi Devi", uhid: "FED-2026-8904", dept: "Orthopedics", bed: "Ortho-A3", dailyRate: 3800, days: 5, supplyCharges: 4200, total: 23200, status: "Pending Discharge", statusVariant: "warning" },
      { id: 4, patient: "Ravi Teja", uhid: "FED-2026-8905", dept: "Emergency/ICU", bed: "ICU-01", dailyRate: 8500, days: 0, supplyCharges: 6800, total: 6800, status: "Active Critical", statusVariant: "error" },
      { id: 5, patient: "Preethi Iyer", uhid: "FED-2026-8908", dept: "Gynecology", bed: "Discharged", dailyRate: 2800, days: 1, supplyCharges: 1200, total: 4000, status: "Finalized", statusVariant: "neutral" },
      { id: 6, patient: "Fatima Begum", uhid: "FED-2026-8906", dept: "Neurology", bed: "Neuro-B2", dailyRate: 4200, days: 4, supplyCharges: 3100, total: 19900, status: "Active", statusVariant: "info" },
      { id: 7, patient: "Suresh Nair", uhid: "FED-2026-8907", dept: "Oncology", bed: "Onco-A1", dailyRate: 5500, days: 7, supplyCharges: 8400, total: 46900, status: "Active", statusVariant: "info" },
      { id: 8, patient: "Mohammed Idris", uhid: "FED-2026-8903", dept: "Pediatrics", bed: "Peds-C1", dailyRate: 2500, days: 1, supplyCharges: 800, total: 3300, status: "Active", statusVariant: "info" }
    ],

    inventoryItems: [
      { id: 1, name: "Admission Kit", category: "Bedding & Linen", stock: 45, minThreshold: 20, unitCost: 850, usedThisMonth: 28, status: "Adequate", statusVariant: "success" },
      { id: 2, name: "IV Cannula (18G)", category: "Medical Supplies", stock: 12, minThreshold: 50, unitCost: 45, usedThisMonth: 168, status: "Low Stock", statusVariant: "error" },
      { id: 3, name: "Linen Set (Single)", category: "Bedding & Linen", stock: 8, minThreshold: 30, unitCost: 320, usedThisMonth: 92, status: "Critical", statusVariant: "error" },
      { id: 4, name: "Oxygen Cylinder", category: "Equipment", stock: 22, minThreshold: 10, unitCost: 1200, usedThisMonth: 14, status: "Adequate", statusVariant: "success" },
      { id: 5, name: "Patient Gown", category: "Clothing", stock: 65, minThreshold: 40, unitCost: 180, usedThisMonth: 44, status: "Adequate", statusVariant: "success" },
      { id: 6, name: "Wheelchair", category: "Equipment", stock: 4, minThreshold: 6, unitCost: 8500, usedThisMonth: 12, status: "Low Stock", statusVariant: "warning" },
      { id: 7, name: "Bedside Table", category: "Furniture", stock: 18, minThreshold: 15, unitCost: 2200, usedThisMonth: 3, status: "Adequate", statusVariant: "success" },
      { id: 8, name: "Disinfectant (5L)", category: "Sanitation", stock: 6, minThreshold: 20, unitCost: 380, usedThisMonth: 28, status: "Critical", statusVariant: "error" }
    ],

    pendingOrders: [
      { id: "PO-2026-001", item: "IV Cannulas (500 units)", date: "Mar 6", status: "Pending" },
      { id: "PO-2026-002", item: "Linen Sets (100 units)", date: "Mar 7", status: "Approved" },
      { id: "PO-2026-003", item: "Disinfectant (50 units)", date: "Mar 8", status: "Pending" }
    ],

    activityLog: [
      { id: 1, type: "success", text: "Bed ICU-04 assigned to Ravi Teja (FED-2026-8905)", time: "5 min ago" },
      { id: 2, type: "info", text: "Admission request approved for Sunita Sharma", time: "22 min ago" },
      { id: 3, type: "warning", text: "Inventory alert: IV Cannula stock below threshold", time: "1h ago" },
      { id: 4, type: "success", text: "Patient FED-2026-8908 discharged — Maternity-A freed", time: "2h ago" },
      { id: 5, type: "error", text: "Emergency admission FED-2026-9005 — ICU required", time: "2h 10m ago" }
    ],

    wards: [
      {
        name: "ICU Ward", total: 10, occupied: 8, available: 1, reserved: 1,
        beds: [
          { number: "ICU-01", status: "occupied", patient: "Ravi Teja" },
          { number: "ICU-02", status: "occupied", patient: "Amit Kumar" },
          { number: "ICU-03", status: "occupied", patient: "Priya Shah" },
          { number: "ICU-04", status: "occupied", patient: "Sunita D." },
          { number: "ICU-05", status: "available" },
          { number: "ICU-06", status: "occupied", patient: "Kiran P." },
          { number: "ICU-07", status: "occupied", patient: "Meena S." },
          { number: "ICU-08", status: "occupied", patient: "Rajesh K." },
          { number: "ICU-09", status: "reserved" },
          { number: "ICU-10", status: "occupied", patient: "Anjali M." }
        ]
      },
      // Simplified generator for other wards based on original React code logic
      ...generateWards()
    ]
  };

  // Helper to accurately generate the remaining wards from original source
  function generateWards() {
    const createBeds = (prefix, count, occupiedCount, availableCount) => {
      return Array.from({ length: count }, (_, i) => {
        const num = i + 1;
        const status = num <= occupiedCount ? "occupied" : num <= (occupiedCount + availableCount) ? "available" : "reserved";
        return {
          number: `${prefix}-${String.fromCharCode(65 + Math.floor(i / 4))}${(num % 4) + 1}`,
          status: status,
          patient: status === "occupied" ? `Patient ${num}` : undefined
        };
      });
    };
    return [
      { name: "General Ward", total: 20, occupied: 16, available: 2, reserved: 2, beds: createBeds("GEN", 20, 16, 2) },
      { name: "Surgical Ward", total: 12, occupied: 9, available: 2, reserved: 1, beds: createBeds("SUR", 12, 9, 2) },
      { name: "Pediatric Ward", total: 8, occupied: 5, available: 2, reserved: 1, beds: createBeds("PED", 8, 5, 2) },
      { name: "Emergency Ward", total: 12, occupied: 11, available: 1, reserved: 0, beds: createBeds("EMR", 12, 11, 1) },
      { name: "Maternity Ward", total: 10, occupied: 7, available: 2, reserved: 1, beds: createBeds("MAT", 10, 7, 2) }
    ];
  }


  // ==========================================
  // 2. CORE STORAGE METHODS
  // ==========================================

  function deepMerge(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults.slice();
    if (!defaults || typeof defaults !== 'object') return saved === undefined ? defaults : saved;

    const output = { ...defaults };
    const source = saved && typeof saved === 'object' ? saved : {};

    Object.keys(source).forEach((key) => {
      const defaultValue = defaults[key];
      const savedValue = source[key];

      if (Array.isArray(defaultValue)) output[key] = Array.isArray(savedValue) ? savedValue : defaultValue.slice();
      else if (defaultValue && typeof defaultValue === 'object') output[key] = deepMerge(defaultValue, savedValue);
      else output[key] = savedValue;
    });

    return output;
  }

  function normalizeLegacyPatients(dataObj) {
    const admissions = dataObj.admissions || {};
    const ledgers = dataObj.ledgers || {};
    const patients = dataObj.patients || [];
    const billingRecords = dataObj.billingRecords || [];

    let nextAdmissionId = Math.max(700, ...Object.keys(admissions).map((key) => Number(key) || 0)) + 1;
    let nextLedgerId = Math.max(800, ...Object.keys(ledgers).map((key) => Number(key) || 0)) + 1;

    patients.forEach((patient) => {
      const alreadyExists = Object.values(admissions).some((admission) => admission.uhid === patient.uhid);
      if (alreadyExists) return;

      const billing = billingRecords.find((record) => record.uhid === patient.uhid);
      const admissionId = nextAdmissionId++;
      const ledgerId = nextLedgerId++;
      const roomCharge = billing ? Math.max(0, billing.dailyRate * billing.days) : 0;
      const supplyCharge = billing ? Math.max(0, billing.supplyCharges || 0) : 0;
      const admissionTs = patient.admitted ? new Date(patient.admitted).getTime() : Date.now();
      const dischargeRequested = patient.status === 'Pending Discharge';
      const discharged = patient.status === 'Discharged';

      admissions[admissionId] = {
        admission_id: admissionId,
        ledger_id: ledgerId,
        patient_name: patient.name,
        uhid: patient.uhid,
        ward_no: patient.bed,
        doctor_assigned: patient.physician || 'Assigned Doctor',
        coverage: 0,
        insurance_provider: 'N/A',
        last_published_ts: 0,
        admitted_at: Number.isNaN(admissionTs) ? Date.now() : admissionTs,
        discharged,
        discharge_requested: dischargeRequested
      };

      ledgers[ledgerId] = [];
      if (roomCharge > 0) {
        ledgers[ledgerId].push({
          entry_id: Date.now() + admissionId,
          service_name: `${patient.dept || 'Ward'} Bed Charges`,
          qty: Math.max(1, billing?.days || patient.days || 1),
          price: billing?.dailyRate || Math.round(roomCharge / Math.max(1, billing?.days || patient.days || 1)),
          tax: 0,
          ts: Number.isNaN(admissionTs) ? Date.now() : admissionTs,
          source: 'HOM_LEGACY_SYNC'
        });
      }

      if (supplyCharge > 0) {
        ledgers[ledgerId].push({
          entry_id: Date.now() + ledgerId,
          service_name: 'Inventory & Pharmacy Charges',
          qty: 1,
          price: supplyCharge,
          tax: 0,
          ts: (Number.isNaN(admissionTs) ? Date.now() : admissionTs) + 1,
          source: 'HOM_LEGACY_SYNC'
        });
      }
    });

    dataObj.admissions = admissions;
    dataObj.ledgers = ledgers;
    if (!Array.isArray(dataObj.faLedgerRequests)) dataObj.faLedgerRequests = [];
    Object.values(admissions).forEach((admission) => {
      const hasLedger = Boolean(admission.ledger_id && ledgers[admission.ledger_id]);
      if (hasLedger || admission.discharged) return;

      const exists = dataObj.faLedgerRequests.some((item) => item.admission_id === admission.admission_id && item.status !== 'COMPLETED');
      if (exists) return;

      dataObj.faLedgerRequests.unshift({
        id: `FA-LDG-${admission.admission_id}`,
        admission_id: admission.admission_id,
        uhid: admission.uhid,
        patient_name: admission.patient_name,
        ward_no: admission.ward_no,
        department: admission.doctor_assigned || 'General',
        requested_by: 'SYSTEM',
        requested_at: Date.now(),
        status: 'PENDING'
      });
    });
    return dataObj;
  }

  function initStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const hydrated = normalizeLegacyPatients(saved ? deepMerge(initialData, JSON.parse(saved)) : deepMerge(initialData, {}));

    if (!Array.isArray(hydrated.dispatchQueue)) hydrated.dispatchQueue = [];
    if (!Array.isArray(hydrated.faLedgerRequests)) hydrated.faLedgerRequests = [];
    if (!Array.isArray(hydrated.serviceRequests)) hydrated.serviceRequests = [];
    if (!Array.isArray(hydrated.receipts)) hydrated.receipts = [];
    if (!Array.isArray(hydrated.publishedBills)) hydrated.publishedBills = [];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
  }

  function getData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeLegacyPatients(saved ? deepMerge(initialData, JSON.parse(saved)) : deepMerge(initialData, {}));
  }

  function saveData(dataObj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataObj));
    window.dispatchEvent(new Event('storeUpdated'));
  }

  window.addEventListener('storage', (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    window.dispatchEvent(new Event('storeUpdated'));
  });

  function queueLedgerRequest(data, admission, requestedBy = 'HOM') {
    if (!Array.isArray(data.faLedgerRequests)) data.faLedgerRequests = [];
    const alreadyQueued = data.faLedgerRequests.some((item) =>
      item.admission_id === admission.admission_id && item.status !== 'COMPLETED'
    );
    if (alreadyQueued) return;

    data.faLedgerRequests.unshift({
      id: `FA-LDG-${admission.admission_id}-${Date.now()}`,
      admission_id: admission.admission_id,
      uhid: admission.uhid,
      patient_name: admission.patient_name,
      ward_no: admission.ward_no,
      department: admission.doctor_assigned || 'General',
      requested_by: requestedBy,
      requested_at: Date.now(),
      status: 'PENDING'
    });
  }

  function createLedgerForAdmission(admissionId) {
    const data = getData();
    const admission = data.admissions?.[admissionId];
    if (!admission) return false;

    if (!admission.ledger_id || !data.ledgers[admission.ledger_id]) {
      const nextLedgerId = Math.max(800, ...Object.keys(data.ledgers || {}).map((key) => Number(key) || 0)) + 1;
      admission.ledger_id = nextLedgerId;
      data.ledgers[nextLedgerId] = [];
    }

    const existingBilling = (data.billingRecords || []).find((item) => item.uhid === admission.uhid);
    if (!existingBilling) {
      data.billingRecords.push({
        id: Date.now(),
        patient: admission.patient_name,
        uhid: admission.uhid,
        dept: admission.doctor_assigned || 'General',
        bed: admission.ward_no,
        dailyRate: 3000,
        days: 0,
        supplyCharges: 0,
        total: 0,
        status: admission.discharge_requested ? 'Pending Discharge' : 'Active',
        statusVariant: admission.discharge_requested ? 'warning' : 'info'
      });
    }

    (data.faLedgerRequests || []).forEach((request) => {
      if (request.admission_id === admissionId && request.status !== 'COMPLETED') {
        request.status = 'COMPLETED';
        request.completed_at = Date.now();
      }
    });

    saveData(data);
    return true;
  }

  // ==========================================
  // 3. GLOBAL MUTATION FUNCTIONS
  // ==========================================

  /**
   * Appends an event to the activity log
   */
  function logActivity(type, text) {
    const data = getData();
    const newLog = {
      id: Date.now(),
      type: type,
      text: text,
      time: "Just now"
    };
    data.activityLog.unshift(newLog);
    if(data.activityLog.length > 10) data.activityLog.pop(); // keep last 10
    saveData(data);
  }

  /**
   * Updates bed status and recalculates ward totals
   */
  function updateBedStatus(bedNumber, newStatus, patientName = null) {
    const data = getData();
    let bedFound = false;

    for (let ward of data.wards) {
      const bed = ward.beds.find(b => b.number === bedNumber);
      if (bed) {
        // Adjust ward counters
        ward[bed.status]--;
        ward[newStatus]++;
        
        // Update bed
        bed.status = newStatus;
        if (patientName) bed.patient = patientName;
        else delete bed.patient;
        
        bedFound = true;
        break;
      }
    }

    if (bedFound) saveData(data);
    return bedFound;
  }

  /**
   * Discharges a patient, frees their bed, and finalizes billing
   */
  function dischargePatient(uhid) {
    return requestDischargeBilling(uhid);
  }

  /**
   * Logs inventory usage and cascades cost to patient ledger
   */
  function logInventoryUsage(uhid, itemId, quantity) {
    const data = getData();
    
    const item = data.inventoryItems.find(i => i.id === itemId);
    const ledger = data.billingRecords.find(b => b.uhid === uhid);

    if (!item) return console.error("Item not found");
    if (!ledger) return console.error("Patient Ledger not found for UHID: " + uhid);

    // 1. Update Inventory Stock
    item.stock -= quantity;
    item.usedThisMonth += quantity;
    
    if (item.stock <= item.minThreshold) {
      item.status = "Low Stock";
      item.statusVariant = "error";
      logActivity('warning', `Inventory Alert: ${item.name} stock fell below threshold`);
    }

    // 2. Cascade Cost to Patient Ledger
    const totalCost = item.unitCost * quantity;
    ledger.supplyCharges += totalCost;
    ledger.total += totalCost;

    logActivity('info', `Logged ${quantity}x ${item.name} to patient ${ledger.patient}`);
    saveData(data);
  }

  /**
   * Approves admission request, converts to patient, assigns bed
   */
  function assignBed(admissionId, bedNumber) {
    const data = getData();
    
    const admissionIdx = data.pendingAdmissions.findIndex(a => a.id === admissionId);
    if (admissionIdx > -1) {
      const admission = data.pendingAdmissions[admissionIdx];
      
      // Update Bed
      updateBedStatus(bedNumber, "occupied", admission.patient);

      // Create new active patient record
      data.patients.push({
        id: Date.now(),
        uhid: admission.uhid,
        name: admission.patient,
        age: "Unknown", // Would normally come from DB
        dept: admission.dept,
        bed: bedNumber,
        physician: "Assigned Doctor",
        admitted: new Date().toISOString().split('T')[0],
        days: 0,
        status: "Admitted",
        statusVariant: "info"
      });

      const newAdmissionId = Date.now();
      data.admissions[newAdmissionId] = {
        admission_id: newAdmissionId,
        ledger_id: null,
        patient_name: admission.patient,
        uhid: admission.uhid,
        ward_no: bedNumber,
        doctor_assigned: `Dr. ${admission.dept}`,
        coverage: 0,
        insurance_provider: 'To Be Updated',
        last_published_ts: 0,
        admitted_at: Date.now(),
        discharged: false,
        discharge_requested: false
      };
      data.currentPatientId = newAdmissionId;
      queueLedgerRequest(data, data.admissions[newAdmissionId], 'HOM');

      // Remove from pending
      data.pendingAdmissions.splice(admissionIdx, 1);
      
      logActivity('success', `Bed ${bedNumber} assigned to ${admission.patient} (${admission.uhid}); FA ledger request queued`);
      saveData(data);
    }
  }

  function requestDischargeBilling(uhid) {
    const data = getData();
    const admission = Object.values(data.admissions || {}).find(item => item.uhid === uhid);
    const patient = data.patients.find(item => item.uhid === uhid);
    const ledger = data.billingRecords.find(item => item.uhid === uhid);
    const preRequest = (data.preRequests || []).find(item => item.patientId === uhid);

    if (admission) admission.discharge_requested = true;
    if (patient) {
      patient.status = 'Pending Discharge';
      patient.statusVariant = 'warning';
    }
    if (ledger) {
      ledger.status = 'Pending Discharge';
      ledger.statusVariant = 'warning';
    }
    if (preRequest) preRequest.homStatus = 'Sent to FA';

    if (admission || patient || ledger) {
      logActivity('warning', `Discharge billing requested from FA for patient ${uhid}`);
      saveData(data);
      return true;
    }

    return false;
  }

  function getPreDischargeRows() {
    const data = getData();
    return (data.preRequests || [])
      .filter(item => item.patientStatus === 'Discharge Pending' || item.patientStatus === 'Approved Discharge')
      .map(item => ({
        patientId: item.patientId,
        name: item.name,
        department: item.department,
        doctor: item.doctor,
        patientStatus: item.patientStatus,
        homStatus: item.homStatus || 'Awaiting HOM',
        canSendToFA: item.patientStatus === 'Discharge Pending' && item.homStatus !== 'Sent to FA',
        canConfirmToPRE: item.patientStatus === 'Discharge Pending'
      }));
  }

  function confirmDischargeBackToPRE(uhid) {
    const data = getData();
    const preRequest = (data.preRequests || []).find(item => item.patientId === uhid);
    if (!preRequest) return false;

    const docs = (data.dispatchQueue || []).filter(item =>
      item.uhid === uhid && ['DISCHARGE_SUMMARY', 'PAYMENT_LINK', 'FINAL_RECEIPT'].includes(item.type)
    );
    const hasRequiredDocs = ['DISCHARGE_SUMMARY', 'PAYMENT_LINK', 'FINAL_RECEIPT']
      .every(type => docs.some(item => item.type === type));

    if (!hasRequiredDocs) return false;

    preRequest.patientStatus = 'Approved Discharge';
    preRequest.homStatus = 'Confirmed by HOM';
    logActivity('success', `Discharge completion confirmed back to PRE for ${uhid}`);
    saveData(data);
    return true;
  }

  function createServiceRequest(patientId, service, quantity) {
    const data = getData();
    const admission = data.admissions[patientId];
    if (!admission) return false;

    data.serviceRequests.unshift({
      id: Date.now(),
      patient_id: patientId,
      uhid: admission.uhid,
      appt_id: `APT-${String(Date.now()).slice(-4)}`,
      patient_name: admission.patient_name,
      service: service,
      service_count: Number(quantity) || 1,
      status: 'PENDING',
      created_at: Date.now(),
      source: 'HOM'
    });

    logActivity('info', `HOM raised ${service} for ${admission.patient_name}`);
    saveData(data);
    return true;
  }

  function dispatchToPatient(dispatchId) {
    const data = getData();
    const item = (data.dispatchQueue || []).find((entry) => entry.id === dispatchId);
    if (!item) return false;

    item.status = 'SENT';
    item.dispatched_at = Date.now();
    item.dispatched_by = 'HOM';

    logActivity('success', `${item.type === 'EOD_BILL' ? 'EOD link' : 'Discharge packet'} sent to ${item.patient_name}`);
    saveData(data);
    return true;
  }

  function getServiceCatalog() {
    return [
      'X-Ray Chest',
      'MRI Brain',
      'ECG',
      'Blood Test Panel',
      'CT Scan',
      'Physiotherapy Session'
    ];
  }

  function getBillingRows() {
    const data = getData();

    return Object.values(data.admissions || {}).map((admission) => {
      const hasLedger = Boolean(admission.ledger_id && data.ledgers[admission.ledger_id]);
      if (!hasLedger) {
        return {
          id: admission.admission_id,
          patient: admission.patient_name,
          uhid: admission.uhid,
          dept: admission.doctor_assigned || 'General',
          bed: admission.ward_no,
          dailyRate: 0,
          days: Math.max(1, Math.ceil((Date.now() - (admission.admitted_at || Date.now())) / (24 * 60 * 60 * 1000))),
          supplyCharges: 0,
          total: 0,
          status: 'Awaiting FA Ledger',
          statusVariant: 'warning',
          entries: []
        };
      }

      const entries = data.ledgers[admission.ledger_id] || [];
      const total = entries.reduce((sum, entry) => sum + (entry.qty * entry.price) + entry.tax, 0);
      const supplyCharges = entries
        .filter((entry) => String(entry.service_name || '').includes('Inventory'))
        .reduce((sum, entry) => sum + (entry.qty * entry.price) + entry.tax, 0);
      const days = Math.max(1, Math.ceil((Date.now() - (admission.admitted_at || Date.now())) / (24 * 60 * 60 * 1000)));
      const dailyRate = days > 0 ? Math.max(0, Math.round((total - supplyCharges) / days)) : total;
      const isCritical = String(admission.ward_no || '').toUpperCase().includes('ICU');
      const status = admission.discharged ? 'Finalized' : admission.discharge_requested ? 'Pending Discharge' : isCritical ? 'Active Critical' : 'Active';
      const statusVariant = admission.discharged ? 'neutral' : admission.discharge_requested ? 'warning' : isCritical ? 'error' : 'info';

      return {
        id: admission.admission_id,
        patient: admission.patient_name,
        uhid: admission.uhid,
        dept: admission.doctor_assigned || 'General',
        bed: admission.ward_no,
        dailyRate,
        days,
        supplyCharges,
        total,
        status,
        statusVariant,
        entries
      };
    });
  }

  // Auto-initialize on load
  initStorage();

  return {
    get: getData,
    save: saveData,
    reset: () => { localStorage.removeItem(STORAGE_KEY); initStorage(); },
    updateBedStatus,
    dischargePatient,
    logInventoryUsage,
    assignBed,
    logActivity,
    requestDischargeBilling,
    getPreDischargeRows,
    confirmDischargeBackToPRE,
    createServiceRequest,
    dispatchToPatient,
    getServiceCatalog,
    getBillingRows,
    createLedgerForAdmission
  };
})();
