const AppState = window.CanonicalHospitalSeed?.buildFinanceStateSeed?.() || {
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
        { id: 10, patient_id: 701, uhid: "UHID-882100", appt_id: "APT-8821", patient_name: "Qasim Sheikh", service: "X-Ray Chest", service_count: 1, status: "PENDING" },
        { id: 11, patient_id: 703, uhid: "UHID-882110", appt_id: "APT-8825", patient_name: "Hamiz Ahmed", service: "MRI Brain", service_count: 1, status: "PENDING" },
        { id: 12, patient_id: 704, uhid: "UHID-882120", appt_id: "APT-8840", patient_name: "Sarah Williams", service: "ECG", service_count: 1, status: "PENDING" }
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
    currentPatientId: 701
};

