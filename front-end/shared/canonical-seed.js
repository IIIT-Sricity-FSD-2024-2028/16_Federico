(function () {
  function ts(value) {
    return new Date(value).getTime();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createBeds(prefix, count, occupiedCount, availableCount) {
    return Array.from({ length: count }, function (_, index) {
      var bedNumber = index + 1;
      var status = bedNumber <= occupiedCount
        ? "occupied"
        : bedNumber <= (occupiedCount + availableCount)
          ? "available"
          : "reserved";

      return {
        number: prefix + "-" + String.fromCharCode(65 + Math.floor(index / 4)) + ((bedNumber % 4) + 1),
        status: status,
        patient: status === "occupied" ? ("Patient " + bedNumber) : undefined
      };
    });
  }

  function buildSharedStateSeed() {
    return {
      stats: {
        revenue: 284500,
        activeIPD: 8,
        pendingClaims: 24,
        failedPayments: 5,
        homRequests: 7
      },
      admissions: {
        701: { admission_id: 701, ledger_id: 801, patient_name: "Qasim Sheikh", uhid: "UHID-882100", ward_no: "G-102", doctor_assigned: "Dr. Sharma", coverage: 1500, insurance_provider: "Star Health", last_published_ts: 1711800000000, admitted_at: ts("2026-03-29T09:00:00+05:30"), discharged: false },
        702: { admission_id: 702, ledger_id: 802, patient_name: "Mohammed Kamran", uhid: "UHID-882105", ward_no: "ICU-05", doctor_assigned: "Dr. Varma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: ts("2026-03-28T11:00:00+05:30"), discharged: false },
        703: { admission_id: 703, ledger_id: 803, patient_name: "Hamiz Ahmed", uhid: "UHID-882110", ward_no: "B-201", doctor_assigned: "Dr. Reddy", coverage: 5000, insurance_provider: "HDFC Ergo", last_published_ts: 0, admitted_at: ts("2026-03-30T14:00:00+05:30"), discharged: false },
        704: { admission_id: 704, ledger_id: 804, patient_name: "Sarah Williams", uhid: "UHID-882120", ward_no: "P-501", doctor_assigned: "Dr. Kapoor", coverage: 10000, insurance_provider: "ICICI Lombard", last_published_ts: 0, admitted_at: ts("2026-03-31T10:00:00+05:30"), discharged: false },
        705: { admission_id: 705, ledger_id: 805, patient_name: "Ananya Iyer", uhid: "UHID-882135", ward_no: "C-302", doctor_assigned: "Dr. Nair", coverage: 25000, insurance_provider: "Reliance Gen", last_published_ts: 0, admitted_at: ts("2026-03-27T08:30:00+05:30"), discharged: false },
        706: { admission_id: 706, ledger_id: 806, patient_name: "Vikram Malhotra", uhid: "UHID-882140", ward_no: "G-108", doctor_assigned: "Dr. Sharma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: ts("2026-03-31T15:00:00+05:30"), discharged: false }
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
        { id: 10, patient_id: 701, uhid: "UHID-882100", appt_id: "APT-8821", patient_name: "Qasim Sheikh", service: "X-Ray Chest", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T09:00:00+05:30"), source: "HOM" },
        { id: 11, patient_id: 703, uhid: "UHID-882110", appt_id: "APT-8825", patient_name: "Hamiz Ahmed", service: "MRI Brain", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T11:00:00+05:30"), source: "HOM" },
        { id: 12, patient_id: 704, uhid: "UHID-882120", appt_id: "APT-8840", patient_name: "Sarah Williams", service: "ECG", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T13:00:00+05:30"), source: "HOM" }
      ],
      receipts: [
        { id: 901, patient: "Qasim Sheikh", uhid: "UHID-882100", amount: 3100, gross: 4600, coverage: 1500, insurance: "Star Health", mode: "UPI", status: "Paid", ts: ts("2026-02-15T12:00:00+05:30") },
        { id: 903, patient: "Sarah Williams", uhid: "UHID-882120", amount: 12000, gross: 22000, coverage: 10000, insurance: "ICICI Lombard", mode: "CARD", status: "Paid", ts: ts("2026-03-12T15:30:00+05:30") }
      ],
      publishedBills: [
        { bill_id: "EOD-1711800000", patient: "Qasim Sheikh", patient_id: 701, amount: 6500, link: "#", ts: ts("2026-03-29T18:00:00+05:30") },
        { bill_id: "EOD-1711810000", patient: "Hamiz Ahmed", patient_id: 703, amount: 2100, link: "#", ts: ts("2026-03-30T18:00:00+05:30") }
      ],
      dispatchQueue: [],
      faLedgerRequests: [],
      currentPatientId: 701,
      doctors: [
        { id: "D101", name: "Dr Qasim", specialization: "Cardiology", start: "9:00 AM", end: "1:00 PM", status: "Available" },
        { id: "D102", name: "Dr Kammran", specialization: "Orthopedics", start: "2:00 PM", end: "7:00 PM", status: "Available" },
        { id: "D103", name: "Dr Hamiz", specialization: "Neurology", start: "11:00 AM", end: "4:00 PM", status: "Not Available" },
        { id: "D104", name: "Dr Sachin", specialization: "Dermatology", start: "10:00 AM", end: "3:00 PM", status: "Available" }
      ],
      preRequests: [
        { id: "PRE-DEMO-1001", appointmentId: "PRE-APT-DEMO-1001", patientId: "FED-2026-9001", name: "Arun Mehta", age: "54", gender: "Male", phone: "9876543210", address: "Banjara Hills", department: "Cardiology", doctor: "", appointmentDate: "2026-04-05", bookedDate: "01/04/2026", appointmentTime: "", status: "Pending", visitType: "Admit", bedNumber: "", rejectReason: "", patientStatus: "", homStatus: "", source: "PRE" },
        { id: "PRE-DEMO-1002", appointmentId: "PRE-APT-DEMO-1002", patientId: "FED-2026-9002", name: "Sunita Sharma", age: "43", gender: "Female", phone: "9123456780", address: "Secunderabad", department: "Surgery", doctor: "Dr Kammran", appointmentDate: "2026-04-04", bookedDate: "01/04/2026", appointmentTime: "11:30", status: "Approved", visitType: "Admit", bedNumber: "", rejectReason: "", patientStatus: "Approved", homStatus: "", source: "PRE" },
        { id: "PRE-DEMO-1003", appointmentId: "PRE-APT-DEMO-1003", patientId: "FED-2026-9005", name: "Mohammed Ali", age: "38", gender: "Male", phone: "9988776655", address: "Kukatpally", department: "ICU", doctor: "Dr Hamiz", appointmentDate: "2026-04-03", bookedDate: "31/03/2026", appointmentTime: "09:00", status: "Emergency", visitType: "Emergency", bedNumber: "ER-07", rejectReason: "", patientStatus: "Emergency", homStatus: "HOM notified", source: "PRE" },
        { id: "PRE-DEMO-1004", appointmentId: "PRE-APT-DEMO-1004", patientId: "FED-2026-9003", name: "Rajan Pillai", age: "52", gender: "Male", phone: "9012345678", address: "Madhapur", department: "General Medicine", doctor: "Dr Qasim", appointmentDate: "2026-04-02", bookedDate: "31/03/2026", appointmentTime: "14:00", status: "Admitted", visitType: "Admit", bedNumber: "IP-12", rejectReason: "", patientStatus: "Admitted", homStatus: "Bed confirmed", patientDetails: "Male, 52, General Medicine", wardType: "General Ward", source: "PRE" },
        { id: "PRE-DEMO-1005", appointmentId: "PRE-APT-DEMO-1005", patientId: "FED-2026-8904", name: "Lakshmi Devi", age: "45", gender: "Female", phone: "9090909090", address: "Ameerpet", department: "Orthopedics", doctor: "Dr Sachin", appointmentDate: "2026-04-01", bookedDate: "30/03/2026", appointmentTime: "16:15", status: "Discharge", visitType: "Consultation", bedNumber: "IP-04", rejectReason: "", patientStatus: "Discharge Pending", homStatus: "Awaiting HOM", source: "PRE" },
        { id: "PRE-DEMO-1006", appointmentId: "PRE-APT-DEMO-1006", patientId: "FED-2026-9004", name: "Divya Nair", age: "36", gender: "Female", phone: "9345678901", address: "Jubilee Hills", department: "Pediatrics", doctor: "", appointmentDate: "2026-04-06", bookedDate: "01/04/2026", appointmentTime: "", status: "Rejected", visitType: "", bedNumber: "", rejectReason: "Doctor unavailable for requested slot", patientStatus: "", homStatus: "", source: "PRE" },
        { id: "PRE-DEMO-1007", appointmentId: "PRE-APT-DEMO-1007", patientId: "UHID-882110", name: "Hamiz Ahmed", age: "19", gender: "Male", phone: "9812345678", address: "12-A, Sector 4, Hyderabad, Telangana - 500001", department: "Neurology", doctor: "Dr. Reddy", appointmentDate: "2026-04-07", bookedDate: "01/04/2026", appointmentTime: "11:00", status: "Approved", visitType: "Consultation", bedNumber: "", rejectReason: "", patientStatus: "", homStatus: "", source: "Patient" }
      ],
      pendingAdmissions: [
        { id: 1, patient: "Arun Mehta", patient_id: "FED-2026-9001", uhid: "FED-2026-9001", dept: "Cardiology", requestedBy: "PRE-Rekha", priority: "Urgent", time: "2h 15m", pre_request_id: "PRE-DEMO-1001", preferredWard: "Cardiac Care Ward", status: "Pending", patientDetails: "Male, 54, Cardiology", updatedAt: ts("2026-04-01T10:00:00+05:30") },
        { id: 2, patient: "Sunita Sharma", patient_id: "FED-2026-9002", uhid: "FED-2026-9002", dept: "Surgery", requestedBy: "PRE-Anil", priority: "High", time: "45m", pre_request_id: "PRE-DEMO-1002", preferredWard: "Surgical Ward", status: "Pending", patientDetails: "Female, 43, Surgery", updatedAt: ts("2026-04-01T11:30:00+05:30") },
        { id: 3, patient: "Rajan Pillai", patient_id: "FED-2026-9003", uhid: "FED-2026-9003", dept: "General Medicine", requestedBy: "PRE-Meena", priority: "Normal", time: "1h 30m", pre_request_id: "PRE-DEMO-1004", preferredWard: "General Ward", status: "Pending", patientDetails: "Male, 52, General Medicine", updatedAt: ts("2026-04-01T09:30:00+05:30") },
        { id: 4, patient: "Divya Nair", patient_id: "FED-2026-9004", uhid: "FED-2026-9004", dept: "Pediatrics", requestedBy: "PRE-Rekha", priority: "High", time: "30m", pre_request_id: "PRE-DEMO-1006", preferredWard: "Pediatric Ward", status: "Pending", patientDetails: "Female, 36, Pediatrics", updatedAt: ts("2026-04-01T12:15:00+05:30") },
        { id: 5, patient: "Mohammed Ali", patient_id: "FED-2026-9005", uhid: "FED-2026-9005", dept: "ICU", requestedBy: "PRE-Sanjay", priority: "Critical", time: "10m", pre_request_id: "PRE-DEMO-1003", preferredWard: "ICU Ward", status: "Pending", patientDetails: "Male, 38, ICU", updatedAt: ts("2026-04-01T13:00:00+05:30") }
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
      patientDirectory: [
        { id: "FED-2026-9001", name: "Arun Mehta", age: "54", gender: "Male", phone: "9876543210", address: "Banjara Hills" },
        { id: "FED-2026-9002", name: "Sunita Sharma", age: "43", gender: "Female", phone: "9123456780", address: "Secunderabad" },
        { id: "FED-2026-9003", name: "Rajan Pillai", age: "52", gender: "Male", phone: "9012345678", address: "Madhapur" },
        { id: "FED-2026-9004", name: "Divya Nair", age: "36", gender: "Female", phone: "9345678901", address: "Jubilee Hills" },
        { id: "FED-2026-9005", name: "Mohammed Ali", age: "38", gender: "Male", phone: "9988776655", address: "Kukatpally" },
        { id: "FED-2026-8904", name: "Lakshmi Devi", age: "45", gender: "Female", phone: "9090909090", address: "Ameerpet" },
        { id: "UHID-882110", name: "Hamiz Ahmed", age: "19", gender: "Male", phone: "9812345678", address: "12-A, Sector 4, Hyderabad, Telangana - 500001" }
      ],
      patientProfiles: {
        "FED-2026-9001": { uhid: "FED-2026-9001", name: "Arun Mehta", age: "54", gender: "Male", phone: "9876543210", address: "Banjara Hills" },
        "FED-2026-9002": { uhid: "FED-2026-9002", name: "Sunita Sharma", age: "43", gender: "Female", phone: "9123456780", address: "Secunderabad" },
        "FED-2026-9003": { uhid: "FED-2026-9003", name: "Rajan Pillai", age: "52", gender: "Male", phone: "9012345678", address: "Madhapur" },
        "FED-2026-9004": { uhid: "FED-2026-9004", name: "Divya Nair", age: "36", gender: "Female", phone: "9345678901", address: "Jubilee Hills" },
        "FED-2026-9005": { uhid: "FED-2026-9005", name: "Mohammed Ali", age: "38", gender: "Male", phone: "9988776655", address: "Kukatpally" },
        "FED-2026-8904": { uhid: "FED-2026-8904", name: "Lakshmi Devi", age: "45", gender: "Female", phone: "9090909090", address: "Ameerpet" },
        "UHID-882110": {
          id: "USR-001",
          name: "Hamiz Ahmed",
          firstName: "Hamiz",
          initials: "HA",
          uhid: "UHID-882110",
          age: 19,
          gender: "Male",
          bloodGroup: "B+",
          phone: "9812345678",
          email: "hamiz.ahmed@gmail.com",
          address: "12-A, Sector 4, Hyderabad, Telangana - 500001",
          dob: "05/03/2007",
          insurance: {
            verified: true,
            provider: "HDFC Ergo",
            policyNumber: "POL-UHID-882110",
            memberId: "MEM-703",
            coverage: 5000,
            validFrom: "01/04/2025",
            validTo: "31/03/2027",
            coverageType: "Individual"
          }
        }
      },
      bedRequests: [
        { id: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", wardType: "General Ward", patientDetails: "Male, 52, General Medicine", status: "Pending", updatedAt: "01/04/2026 09:30:00" }
      ],
      bedAllocations: [
        { id: "ALLOC-DEMO-1", requestId: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", wardType: "General Ward", patientDetails: "Male, 52, General Medicine", bed: "IP-12", status: "Allocated" }
      ],
      emergencyNotifications: [
        { id: "EMG-DEMO-1", patientId: "FED-2026-9005", bed: "ER-07", status: "Emergency", sentAt: "01/04/2026 10:00" }
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
        { id: 4, type: "success", text: "Patient FED-2026-8908 discharged and Maternity-A freed", time: "2h ago" },
        { id: 5, type: "error", text: "Emergency admission FED-2026-9005 requires ICU support", time: "2h 10m ago" }
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
        { name: "General Ward", total: 20, occupied: 16, available: 2, reserved: 2, beds: createBeds("GEN", 20, 16, 2) },
        { name: "Surgical Ward", total: 12, occupied: 9, available: 2, reserved: 1, beds: createBeds("SUR", 12, 9, 2) },
        { name: "Pediatric Ward", total: 8, occupied: 5, available: 2, reserved: 1, beds: createBeds("PED", 8, 5, 2) },
        { name: "Emergency Ward", total: 12, occupied: 11, available: 1, reserved: 0, beds: createBeds("EMR", 12, 11, 1) },
        { name: "Maternity Ward", total: 10, occupied: 7, available: 2, reserved: 1, beds: createBeds("MAT", 10, 7, 2) }
      ]
    };
  }

  function buildPatientFallbackSeed() {
    return {
      patient: clone(buildSharedStateSeed().patientProfiles["UHID-882110"]),
      appointments: [],
      visits: [
        { id: "VIS-001", description: "Cardiology Consultation", date: "Mar 2, 2026", isoDate: "2026-03-02", department: "Cardiology" },
        { id: "VIS-002", description: "Blood Test Diagnostics", date: "Feb 20, 2026", isoDate: "2026-02-20", department: "Diagnostics" },
        { id: "VIS-003", description: "General Check-up", date: "Jan 15, 2026", isoDate: "2026-01-15", department: "General" },
        { id: "VIS-004", description: "Neurology Consultation", date: "Dec 10, 2025", isoDate: "2025-12-10", department: "Neurology" },
        { id: "VIS-005", description: "Orthopedics Follow-up", date: "Nov 28, 2025", isoDate: "2025-11-28", department: "Orthopedics" }
      ],
      slots: [
        { id: "SLT-001", time: "9:00 AM", period: "morning", status: "available" },
        { id: "SLT-002", time: "9:30 AM", period: "morning", status: "available" },
        { id: "SLT-003", time: "10:00 AM", period: "morning", status: "booked" },
        { id: "SLT-004", time: "10:30 AM", period: "morning", status: "limited" },
        { id: "SLT-005", time: "11:00 AM", period: "morning", status: "available" },
        { id: "SLT-006", time: "11:30 AM", period: "morning", status: "booked" },
        { id: "SLT-007", time: "12:00 PM", period: "morning", status: "available" },
        { id: "SLT-008", time: "12:30 PM", period: "morning", status: "limited" },
        { id: "SLT-009", time: "2:00 PM", period: "afternoon", status: "available" },
        { id: "SLT-010", time: "2:30 PM", period: "afternoon", status: "booked" },
        { id: "SLT-011", time: "3:00 PM", period: "afternoon", status: "available" },
        { id: "SLT-012", time: "3:30 PM", period: "afternoon", status: "limited" }
      ]
    };
  }

  window.CanonicalHospitalSeed = {
    buildSharedStateSeed: buildSharedStateSeed,
    buildFinanceStateSeed: buildSharedStateSeed,
    buildPatientFallbackSeed: buildPatientFallbackSeed
  };
})();
