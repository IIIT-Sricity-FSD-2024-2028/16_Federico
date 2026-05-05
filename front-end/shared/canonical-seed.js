(function () {
  if (!window.IDGenerator) {
    window.IDGenerator = {
      counters: {},
      nextId: function (namespace) {
        var scope = String(namespace || "id");
        if (!this.counters[scope]) this.counters[scope] = 1000;
        this.counters[scope] += 1;
        return scope + "-" + this.counters[scope];
      }
    };
  }

  var ROOT_STATE_KEY = "HospitalAppState";
  var MOCK_ID_MIGRATION_MAP = {
    "UHID-882100": "FED-2026-882100",
    "UHID-882105": "FED-2026-882105",
    "UHID-882110": "FED-2026-882110",
    "UHID-882120": "FED-2026-882120",
    "UHID-882135": "FED-2026-882135",
    "UHID-882140": "FED-2026-882140",
    "POL-UHID-882110": "POL-FED-2026-882110"
  };

  function ts(value) {
    return new Date(value).getTime();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function replaceMockId(value) {
    return Object.prototype.hasOwnProperty.call(MOCK_ID_MIGRATION_MAP, value)
      ? MOCK_ID_MIGRATION_MAP[value]
      : value;
  }

  function migrateValue(value) {
    if (Array.isArray(value)) {
      return value.map(migrateValue);
    }

    if (value && typeof value === "object") {
      return Object.keys(value).reduce(function (acc, key) {
        var nextKey = replaceMockId(key);
        acc[nextKey] = migrateValue(value[key]);
        return acc;
      }, {});
    }

    if (typeof value === "string") {
      return replaceMockId(value);
    }

    return value;
  }

  function migrateStoredJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return;

      var parsed = JSON.parse(raw);
      var migrated = migrateValue(parsed);
      localStorage.setItem(key, JSON.stringify(migrated));
    } catch (error) {
      console.warn("[CanonicalSeed] Could not migrate storage key:", key, error);
    }
  }

  migrateStoredJson(ROOT_STATE_KEY);

  function consolidateLegacyStateToRoot() {
    try {
      var sharedRaw = localStorage.getItem("hospitalFinanceAppState");
      var authRaw = localStorage.getItem("patientAuthAccounts");
      var rootRaw = localStorage.getItem(ROOT_STATE_KEY);

      var shared = sharedRaw ? migrateValue(JSON.parse(sharedRaw)) : {};
      var accounts = authRaw ? migrateValue(JSON.parse(authRaw)) : [];
      var root = rootRaw ? migrateValue(JSON.parse(rootRaw)) : {};

      if (!root || typeof root !== "object") root = {};
      if (!root.patientAuthAccounts && Array.isArray(accounts)) {
        root.patientAuthAccounts = accounts;
      }

      var merged = Object.assign({}, shared, root);
      if (!Array.isArray(merged.patientAuthAccounts)) {
        merged.patientAuthAccounts = Array.isArray(accounts) ? accounts : [];
      }

      localStorage.setItem(ROOT_STATE_KEY, JSON.stringify(merged));

      // Clean up legacy standalone keys now that data is safely merged
      if (sharedRaw) localStorage.removeItem("hospitalFinanceAppState");
      if (authRaw)   localStorage.removeItem("patientAuthAccounts");
    } catch (error) {
      console.warn("[CanonicalSeed] Could not consolidate legacy state:", error);
    }
  }

  consolidateLegacyStateToRoot();

  function createBeds(prefix, count, occupiedCount, availableCount) {
    return Array.from({ length: count }, function (_, index) {
      var bedNumber = index + 1;
      var status = bedNumber <= occupiedCount
        ? "occupied"
        : bedNumber <= (occupiedCount + availableCount)
          ? "available"
           : "maintenance";

      return {
        number: prefix + "-" + String.fromCharCode(65 + Math.floor(index / 4)) + ((bedNumber % 4) + 1),
        status: status,
        patient: status === "occupied" ? ("Patient " + bedNumber) : undefined
      };
    });
  }

  function buildSharedStateSeed() {
    // DATA SCHEMA v2 — consistent with Federico_DataSchema.md
    return {
      stateVersion: "2.0.0",
      stats: {
        revenue: 284500,
        activeIPD: 6,
        pendingClaims: 24,
        failedPayments: 5,
        homRequests: 7
      },
      doctors: [
        { id: "D101", name: "Dr Qasim", specialization: "Cardiology", start: "9:00 AM", end: "1:00 PM", status: "Available" },
        { id: "D102", name: "Dr Kammran", specialization: "Orthopedics", start: "2:00 PM", end: "7:00 PM", status: "Available" },
        { id: "D103", name: "Dr Hamiz", specialization: "Neurology", start: "11:00 AM", end: "4:00 PM", status: "Available" },
        { id: "D104", name: "Dr Sachin", specialization: "Dermatology", start: "10:00 AM", end: "3:00 PM", status: "Available" }
      ],
      wards: [
        {
          name: "ICU Ward",
          total: 10,
          occupied: 8,
          available: 1,
          maintenance: 1,
          beds: [
            { number: "ICU-01", status: "occupied", patient: "Mohammed Kamran" },
            { number: "ICU-02", status: "occupied", patient: "Amit Kumar" },
            { number: "ICU-03", status: "occupied", patient: "Priya Shah" },
            { number: "ICU-04", status: "occupied", patient: "Sunita D." },
            { number: "ICU-05", status: "available" },
            { number: "ICU-06", status: "occupied", patient: "Kiran P." },
            { number: "ICU-07", status: "occupied", patient: "Meena S." },
            { number: "ICU-08", status: "occupied", patient: "Rajesh K." },
            { number: "ICU-09", status: "maintenance" },
            { number: "ICU-10", status: "occupied", patient: "Anjali M." }
          ]
        },
        { name: "General Ward", total: 20, occupied: 16, available: 2, maintenance: 2, beds: createBeds("GEN", 20, 16, 2) },
        { name: "Surgical Ward", total: 12, occupied: 9, available: 2, maintenance: 1, beds: createBeds("SUR", 12, 9, 2) },
        { name: "Pediatric Ward", total: 8, occupied: 5, available: 2, maintenance: 1, beds: createBeds("PED", 8, 5, 2) },
        { name: "Emergency Ward", total: 12, occupied: 11, available: 1, maintenance: 0, beds: createBeds("EMR", 12, 11, 1) },
        { name: "Maternity Ward", total: 10, occupied: 7, available: 2, maintenance: 1, beds: createBeds("MAT", 10, 7, 2) }
      ],
      inventoryItems: [
        { item_id: 1, name: "Admission Kit", category: "Consumable", stock: 45, reorderLevel: 20, unit: "kit", unitCost: 850 },
        { item_id: 2, name: "IV Cannula (18G)", category: "Consumable", stock: 12, reorderLevel: 50, unit: "piece", unitCost: 45 },
        { item_id: 3, name: "Linen Set (Single)", category: "Consumable", stock: 8, reorderLevel: 30, unit: "set", unitCost: 320 },
        { item_id: 4, name: "Oxygen Cylinder", category: "Equipment", stock: 22, reorderLevel: 10, unit: "cylinder", unitCost: 1200 },
        { item_id: 5, name: "Patient Gown", category: "Consumable", stock: 65, reorderLevel: 40, unit: "piece", unitCost: 180 },
        { item_id: 6, name: "Wheelchair", category: "Equipment", stock: 4, reorderLevel: 6, unit: "unit", unitCost: 8500 },
        { item_id: 7, name: "Syringe 5ml", category: "Consumable", stock: 180, reorderLevel: 90, unit: "piece", unitCost: 8 },
        { item_id: 8, name: "Paracetamol 500mg", category: "Medicine", stock: 520, reorderLevel: 250, unit: "tablet", unitCost: 2 }
      ],
      activityLog: [
        { id: 1, type: "success", text: "Bed ICU-05 assigned to Mohammed Kamran (FED-2026-882105)", time: "5 min ago" },
        { id: 2, type: "info", text: "Admission request approved for Sunita Sharma", time: "22 min ago" },
        { id: 3, type: "warning", text: "Inventory alert: IV Cannula stock below threshold", time: "1h ago" },
        { id: 4, type: "success", text: "EOD bill published for Qasim Sheikh", time: "2h ago" },
        { id: 5, type: "error", text: "Emergency admission FED-2026-9005 requires ICU support", time: "2h 10m ago" }
      ],
      patientDirectory: [
        { id: "FED-2026-9001", name: "Arun Mehta", age: "54", gender: "Male", phone: "9876543210", address: "Banjara Hills" },
        { id: "FED-2026-9002", name: "Sunita Sharma", age: "43", gender: "Female", phone: "9123456780", address: "Secunderabad" },
        { id: "FED-2026-9003", name: "Rajan Pillai", age: "52", gender: "Male", phone: "9012345678", address: "Madhapur" },
        { id: "FED-2026-9004", name: "Divya Nair", age: "36", gender: "Female", phone: "9345678901", address: "Jubilee Hills" },
        { id: "FED-2026-9005", name: "Mohammed Ali", age: "38", gender: "Male", phone: "9988776655", address: "Kukatpally" },
        { id: "FED-2026-8904", name: "Lakshmi Devi", age: "45", gender: "Female", phone: "9090909090", address: "Ameerpet" },
        { id: "FED-2026-882100", name: "Qasim Sheikh", age: "58", gender: "Male", phone: "9001100110", address: "Gachibowli, Hyderabad" },
        { id: "FED-2026-882105", name: "Mohammed Kamran", age: "42", gender: "Male", phone: "9002200220", address: "Tolichowki, Hyderabad" },
        { id: "FED-2026-882110", name: "Ayaan Khan", age: "24", gender: "Male", phone: "9812345678", address: "12-A, Sector 4, Hyderabad, Telangana - 500001" },
        { id: "FED-2026-882120", name: "Sarah Williams", age: "31", gender: "Female", phone: "9003300330", address: "Hitech City, Hyderabad" },
        { id: "FED-2026-882135", name: "Ananya Iyer", age: "29", gender: "Female", phone: "9004400440", address: "Miyapur, Hyderabad" },
        { id: "FED-2026-882140", name: "Vikram Malhotra", age: "47", gender: "Male", phone: "9005500550", address: "Begumpet, Hyderabad" }
      ],
      patientProfiles: {
        "FED-2026-9001": {
          id: "USR-101",
          name: "Arun Mehta",
          firstName: "Arun",
          initials: "AM",
          uhid: "FED-2026-9001",
          age: 54,
          gender: "Male",
          bloodGroup: "O+",
          phone: "9876543210",
          email: "arun.mehta@example.com",
          address: "Banjara Hills",
          dob: "10/02/1972",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-9002": {
          id: "USR-102",
          name: "Sunita Sharma",
          firstName: "Sunita",
          initials: "SS",
          uhid: "FED-2026-9002",
          age: 43,
          gender: "Female",
          bloodGroup: "A+",
          phone: "9123456780",
          email: "sunita.sharma@example.com",
          address: "Secunderabad",
          dob: "11/09/1982",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-9003": {
          id: "USR-103",
          name: "Rajan Pillai",
          firstName: "Rajan",
          initials: "RP",
          uhid: "FED-2026-9003",
          age: 52,
          gender: "Male",
          bloodGroup: "AB+",
          phone: "9012345678",
          email: "rajan.pillai@example.com",
          address: "Madhapur",
          dob: "14/06/1974",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-9004": {
          id: "USR-104",
          name: "Divya Nair",
          firstName: "Divya",
          initials: "DN",
          uhid: "FED-2026-9004",
          age: 36,
          gender: "Female",
          bloodGroup: "B+",
          phone: "9345678901",
          email: "divya.nair@example.com",
          address: "Jubilee Hills",
          dob: "20/03/1990",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-9005": {
          id: "USR-105",
          name: "Mohammed Ali",
          firstName: "Mohammed",
          initials: "MA",
          uhid: "FED-2026-9005",
          age: 38,
          gender: "Male",
          bloodGroup: "O-",
          phone: "9988776655",
          email: "mohammed.ali@example.com",
          address: "Kukatpally",
          dob: "03/12/1988",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-8904": {
          id: "USR-106",
          name: "Lakshmi Devi",
          firstName: "Lakshmi",
          initials: "LD",
          uhid: "FED-2026-8904",
          age: 45,
          gender: "Female",
          bloodGroup: "A-",
          phone: "9090909090",
          email: "lakshmi.devi@example.com",
          address: "Ameerpet",
          dob: "28/08/1981",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-882100": {
          id: "USR-201",
          name: "Qasim Sheikh",
          firstName: "Qasim",
          initials: "QS",
          uhid: "FED-2026-882100",
          age: 58,
          gender: "Male",
          bloodGroup: "B+",
          phone: "9001100110",
          email: "qasim.sheikh@example.com",
          address: "Gachibowli, Hyderabad",
          dob: "12/01/1968",
          insurance: { verified: true, provider: "Star Health", policyNumber: "POL-FED-2026-882100", memberId: "MEM-701", coverage: 1500, validFrom: "01/01/2026", validTo: "31/12/2026", coverageType: "Individual" }
        },
        "FED-2026-882105": {
          id: "USR-202",
          name: "Mohammed Kamran",
          firstName: "Mohammed",
          initials: "MK",
          uhid: "FED-2026-882105",
          age: 42,
          gender: "Male",
          bloodGroup: "A+",
          phone: "9002200220",
          email: "mohammed.kamran@example.com",
          address: "Tolichowki, Hyderabad",
          dob: "21/07/1984",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        },
        "FED-2026-882110": {
          id: "USR-001",
          name: "Ayaan Khan",
          firstName: "Ayaan",
          initials: "AK",
          uhid: "FED-2026-882110",
          age: 24,
          gender: "Male",
          bloodGroup: "B+",
          phone: "9812345678",
          email: "ayaan.khan@gmail.com",
          address: "12-A, Sector 4, Hyderabad, Telangana - 500001",
          dob: "05/03/2007",
          insurance: { verified: true, provider: "HDFC Ergo", policyNumber: "POL-FED-2026-882110", memberId: "MEM-703", coverage: 5000, validFrom: "01/04/2025", validTo: "31/03/2027", coverageType: "Individual" }
        },
        "FED-2026-882120": {
          id: "USR-204",
          name: "Sarah Williams",
          firstName: "Sarah",
          initials: "SW",
          uhid: "FED-2026-882120",
          age: 31,
          gender: "Female",
          bloodGroup: "O+",
          phone: "9003300330",
          email: "sarah.williams@example.com",
          address: "Hitech City, Hyderabad",
          dob: "02/10/1995",
          insurance: { verified: true, provider: "ICICI Lombard", policyNumber: "POL-FED-2026-882120", memberId: "MEM-704", coverage: 10000, validFrom: "01/02/2026", validTo: "31/01/2027", coverageType: "Family" }
        },
        "FED-2026-882135": {
          id: "USR-205",
          name: "Ananya Iyer",
          firstName: "Ananya",
          initials: "AI",
          uhid: "FED-2026-882135",
          age: 29,
          gender: "Female",
          bloodGroup: "AB-",
          phone: "9004400440",
          email: "ananya.iyer@example.com",
          address: "Miyapur, Hyderabad",
          dob: "18/04/1997",
          insurance: { verified: true, provider: "Reliance Gen", policyNumber: "POL-FED-2026-882135", memberId: "MEM-705", coverage: 25000, validFrom: "01/01/2026", validTo: "31/12/2026", coverageType: "Corporate" }
        },
        "FED-2026-882140": {
          id: "USR-206",
          name: "Vikram Malhotra",
          firstName: "Vikram",
          initials: "VM",
          uhid: "FED-2026-882140",
          age: 47,
          gender: "Male",
          bloodGroup: "O+",
          phone: "9005500550",
          email: "vikram.malhotra@example.com",
          address: "Begumpet, Hyderabad",
          dob: "09/11/1979",
          insurance: { verified: false, provider: "N/A", policyNumber: "", memberId: "", coverage: 0, validFrom: "", validTo: "", coverageType: "Individual" }
        }
      },
      preRequests: [
        {
          id: "PRE-DEMO-1001",
          appointmentId: "PRE-APT-DEMO-1001",
          patientId: "FED-2026-9001",
          name: "Arun Mehta",
          age: "54",
          gender: "Male",
          phone: "9876543210",
          address: "Banjara Hills",
          department: "Cardiology",
          doctor: "",
          appointmentDate: "2026-04-05",
          bookedDate: "01/04/2026",
          appointmentTime: "",
          visitType: "Admit",
          status: "Pending",
          patientStatus: "Pending",
          homStatus: "Awaiting HOM",
          bedNumber: "",
          rejectReason: "",
          patientDetails: "Male, 54, Cardiology",
          wardType: "Cardiac Care Ward",
          source: "PRE",
          decided_at: 0,
          updated_at: ts("2026-04-01T10:00:00+05:30")
        },
        {
          id: "PRE-DEMO-1002",
          appointmentId: "PRE-APT-DEMO-1002",
          patientId: "FED-2026-9002",
          name: "Sunita Sharma",
          age: "43",
          gender: "Female",
          phone: "9123456780",
          address: "Secunderabad",
          department: "Surgery",
          doctor: "Dr Kammran",
          appointmentDate: "2026-04-04",
          bookedDate: "01/04/2026",
          appointmentTime: "11:30",
          visitType: "Admit",
          status: "Approved",
          patientStatus: "Approved",
          homStatus: "Bed request sent",
          bedNumber: "",
          rejectReason: "",
          patientDetails: "Female, 43, Surgery",
          wardType: "Surgical Ward",
          source: "PRE",
          decided_at: ts("2026-04-01T11:20:00+05:30"),
          updated_at: ts("2026-04-01T11:30:00+05:30")
        },
        {
          id: "PRE-DEMO-1003",
          appointmentId: "PRE-APT-DEMO-1003",
          patientId: "FED-2026-9005",
          name: "Mohammed Ali",
          age: "38",
          gender: "Male",
          phone: "9988776655",
          address: "Kukatpally",
          department: "ICU",
          doctor: "Dr Hamiz",
          appointmentDate: "2026-04-03",
          bookedDate: "31/03/2026",
          appointmentTime: "09:00",
          visitType: "Emergency",
          status: "Emergency",
          patientStatus: "Emergency",
          homStatus: "Bed request sent",
          bedNumber: "ER-07",
          rejectReason: "",
          patientDetails: "Male, 38, ICU",
          wardType: "ICU Ward",
          source: "PRE",
          decided_at: ts("2026-04-01T12:50:00+05:30"),
          updated_at: ts("2026-04-01T13:00:00+05:30")
        },
        {
          id: "PRE-DEMO-1004",
          appointmentId: "PRE-APT-DEMO-1004",
          patientId: "FED-2026-9003",
          name: "Rajan Pillai",
          age: "52",
          gender: "Male",
          phone: "9012345678",
          address: "Madhapur",
          department: "General Medicine",
          doctor: "Dr Qasim",
          appointmentDate: "2026-04-02",
          bookedDate: "31/03/2026",
          appointmentTime: "14:00",
          visitType: "Admit",
          status: "Admitted",
          patientStatus: "Admitted",
          homStatus: "Bed confirmed",
          bedNumber: "IP-12",
          rejectReason: "",
          patientDetails: "Male, 52, General Medicine",
          wardType: "General Ward",
          source: "PRE",
          decided_at: ts("2026-04-01T09:25:00+05:30"),
          updated_at: ts("2026-04-01T09:30:00+05:30")
        },
        {
          id: "PRE-DEMO-1005",
          appointmentId: "PRE-APT-DEMO-1005",
          patientId: "FED-2026-8904",
          name: "Lakshmi Devi",
          age: "45",
          gender: "Female",
          phone: "9090909090",
          address: "Ameerpet",
          department: "Orthopedics",
          doctor: "Dr Sachin",
          appointmentDate: "2026-04-01",
          bookedDate: "30/03/2026",
          appointmentTime: "16:15",
          visitType: "Consultation",
          status: "Discharge",
          patientStatus: "Discharge",
          homStatus: "Awaiting HOM",
          bedNumber: "IP-04",
          rejectReason: "",
          patientDetails: "Female, 45, Orthopedics",
          wardType: "Surgical Ward",
          source: "PRE",
          decided_at: ts("2026-04-01T16:25:00+05:30"),
          updated_at: ts("2026-04-01T16:30:00+05:30")
        },
        {
          id: "PRE-DEMO-1006",
          appointmentId: "PRE-APT-DEMO-1006",
          patientId: "FED-2026-9004",
          name: "Divya Nair",
          age: "36",
          gender: "Female",
          phone: "9345678901",
          address: "Jubilee Hills",
          department: "Pediatrics",
          doctor: "",
          appointmentDate: "2026-04-06",
          bookedDate: "01/04/2026",
          appointmentTime: "",
          visitType: "Consultation",
          status: "Rejected",
          patientStatus: "Rejected",
          homStatus: "Awaiting HOM",
          bedNumber: "",
          rejectReason: "Doctor unavailable for requested slot",
          patientDetails: "Female, 36, Pediatrics",
          wardType: "Pediatric Ward",
          source: "PRE",
          decided_at: ts("2026-04-01T12:10:00+05:30"),
          updated_at: ts("2026-04-01T12:15:00+05:30")
        }
      ],
      pendingAdmissions: [
        { id: 1, patient: "Arun Mehta", patient_id: "FED-2026-9001", uhid: "FED-2026-9001", dept: "Cardiology", requestedBy: "PRE-Rekha", priority: "Urgent", time: "2h 15m", pre_request_id: "PRE-DEMO-1001", preferredWard: "Cardiac Care Ward", status: "Pending", patientDetails: "Male, 54, Cardiology", updatedAt: ts("2026-04-01T10:00:00+05:30") },
        { id: 2, patient: "Sunita Sharma", patient_id: "FED-2026-9002", uhid: "FED-2026-9002", dept: "Surgery", requestedBy: "PRE-Anil", priority: "High", time: "45m", pre_request_id: "PRE-DEMO-1002", preferredWard: "Surgical Ward", status: "Pending", patientDetails: "Female, 43, Surgery", updatedAt: ts("2026-04-01T11:30:00+05:30") },
        { id: 3, patient: "Rajan Pillai", patient_id: "FED-2026-9003", uhid: "FED-2026-9003", dept: "General Medicine", requestedBy: "PRE-Meena", priority: "Normal", time: "1h 30m", pre_request_id: "PRE-DEMO-1004", preferredWard: "General Ward", status: "Pending", patientDetails: "Male, 52, General Medicine", updatedAt: ts("2026-04-01T09:30:00+05:30") },
        { id: 4, patient: "Divya Nair", patient_id: "FED-2026-9004", uhid: "FED-2026-9004", dept: "Pediatrics", requestedBy: "PRE-Rekha", priority: "High", time: "30m", pre_request_id: "PRE-DEMO-1006", preferredWard: "Pediatric Ward", status: "Pending", patientDetails: "Female, 36, Pediatrics", updatedAt: ts("2026-04-01T12:15:00+05:30") },
        { id: 5, patient: "Mohammed Ali", patient_id: "FED-2026-9005", uhid: "FED-2026-9005", dept: "ICU", requestedBy: "PRE-Sanjay", priority: "Critical", time: "10m", pre_request_id: "PRE-DEMO-1003", preferredWard: "ICU Ward", status: "Pending", patientDetails: "Male, 38, ICU", updatedAt: ts("2026-04-01T13:00:00+05:30") }
      ],
      patients: [
        { id: 701, uhid: "FED-2026-882100", name: "Qasim Sheikh", age: "58M", dept: "General Medicine", bed: "G-102", physician: "Dr. Sharma", admitted: "2026-03-29", days: 3, status: "Admitted", statusVariant: "info" },
        { id: 702, uhid: "FED-2026-882105", name: "Mohammed Kamran", age: "42M", dept: "ICU", bed: "ICU-05", physician: "Dr. Varma", admitted: "2026-03-28", days: 4, status: "Critical", statusVariant: "error" },
        { id: 703, uhid: "FED-2026-882110", name: "Ayaan Khan", age: "24M", dept: "Neurology", bed: "B-201", physician: "Dr. Reddy", admitted: "2026-03-30", days: 2, status: "Pending Discharge", statusVariant: "warning" },
        { id: 704, uhid: "FED-2026-882120", name: "Sarah Williams", age: "31F", dept: "Pediatrics", bed: "P-501", physician: "Dr. Kapoor", admitted: "2026-03-31", days: 1, status: "Admitted", statusVariant: "info" },
        { id: 705, uhid: "FED-2026-882135", name: "Ananya Iyer", age: "29F", dept: "Cardiology", bed: "C-302", physician: "Dr. Nair", admitted: "2026-03-27", days: 5, status: "Admitted", statusVariant: "info" },
        { id: 706, uhid: "FED-2026-882140", name: "Vikram Malhotra", age: "47M", dept: "Pulmonology", bed: "G-108", physician: "Dr. Sharma", admitted: "2026-03-31", days: 1, status: "Admitted", statusVariant: "info" }
      ],
      admissions: {
        701: { admission_id: 701, ledger_id: 801, patient_name: "Qasim Sheikh", uhid: "FED-2026-882100", ward_no: "G-102", doctor_assigned: "Dr. Sharma", coverage: 1500, insurance_provider: "Star Health", last_published_ts: ts("2026-03-29T18:00:00+05:30"), admitted_at: ts("2026-03-29T09:00:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false },
        702: { admission_id: 702, ledger_id: 802, patient_name: "Mohammed Kamran", uhid: "FED-2026-882105", ward_no: "ICU-05", doctor_assigned: "Dr. Varma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: ts("2026-03-28T11:00:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false },
        703: { admission_id: 703, ledger_id: 803, patient_name: "Ayaan Khan", uhid: "FED-2026-882110", ward_no: "B-201", doctor_assigned: "Dr. Reddy", coverage: 5000, insurance_provider: "HDFC Ergo", last_published_ts: ts("2026-03-30T18:00:00+05:30"), admitted_at: ts("2026-03-30T14:00:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false },
        704: { admission_id: 704, ledger_id: 804, patient_name: "Sarah Williams", uhid: "FED-2026-882120", ward_no: "P-501", doctor_assigned: "Dr. Kapoor", coverage: 10000, insurance_provider: "ICICI Lombard", last_published_ts: 0, admitted_at: ts("2026-03-31T10:00:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false },
        705: { admission_id: 705, ledger_id: 805, patient_name: "Ananya Iyer", uhid: "FED-2026-882135", ward_no: "C-302", doctor_assigned: "Dr. Nair", coverage: 25000, insurance_provider: "Reliance Gen", last_published_ts: 0, admitted_at: ts("2026-03-27T08:30:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false },
        706: { admission_id: 706, ledger_id: 806, patient_name: "Vikram Malhotra", uhid: "FED-2026-882140", ward_no: "G-108", doctor_assigned: "Dr. Sharma", coverage: 0, insurance_provider: "N/A", last_published_ts: 0, admitted_at: ts("2026-03-31T15:00:00+05:30"), discharged: false, discharge_requested: false, discharge_packet_sent: false, receipt_sent_to_hom: false }
      },
      ledgers: {
        801: [
          { entry_id: 1, service_name: "Consultation", qty: 1, price: 500, tax: 0, ts: ts("2026-03-29T10:15:00+05:30") },
          { entry_id: 2, service_name: "General Ward", qty: 2, price: 3000, tax: 300, ts: ts("2026-03-29T18:00:00+05:30") },
          { entry_id: 101, service_name: "Pharmacy: Paracetamol", qty: 10, price: 5, tax: 2, ts: ts("2026-03-29T20:30:00+05:30") }
        ],
        802: [
          { entry_id: 3, service_name: "ICU Charges", qty: 3, price: 8000, tax: 1200, ts: ts("2026-03-28T12:00:00+05:30") },
          { entry_id: 4, service_name: "Ventilator Support", qty: 1, price: 5000, tax: 900, ts: ts("2026-03-29T09:40:00+05:30") },
          { entry_id: 102, service_name: "Oxygen Cylinder", qty: 2, price: 1500, tax: 150, ts: ts("2026-03-29T19:00:00+05:30") }
        ],
        803: [
          { entry_id: 5, service_name: "Emergency Room", qty: 1, price: 2000, tax: 100, ts: ts("2026-03-30T15:15:00+05:30") },
          { entry_id: 6, service_name: "IV Fluids", qty: 3, price: 450, tax: 20, ts: ts("2026-03-30T18:20:00+05:30") }
        ],
        804: [
          { entry_id: 105, service_name: "Private Suite", qty: 1, price: 12000, tax: 1200, ts: ts("2026-03-31T13:10:00+05:30") },
          { entry_id: 106, service_name: "Dietary Services", qty: 1, price: 800, tax: 40, ts: ts("2026-03-31T18:40:00+05:30") }
        ],
        805: [
          { entry_id: 107, service_name: "Cardiac Monitoring", qty: 1, price: 4500, tax: 450, ts: ts("2026-03-27T11:20:00+05:30") },
          { entry_id: 108, service_name: "ECG Test", qty: 1, price: 1200, tax: 60, ts: ts("2026-03-28T09:05:00+05:30") }
        ],
        806: [
          { entry_id: 109, service_name: "Nebulization", qty: 4, price: 300, tax: 15, ts: ts("2026-03-31T19:30:00+05:30") }
        ]
      },
      faLedgerRequests: [
        { id: "FA-LDG-701-1711969200000", admission_id: 701, uhid: "FED-2026-882100", patient_name: "Qasim Sheikh", ward_no: "G-102", department: "General Medicine", requested_by: "HOM", requested_at: ts("2026-04-01T09:10:00+05:30"), status: "PENDING" },
        { id: "FA-LDG-703-1711976400000", admission_id: 703, uhid: "FED-2026-882110", patient_name: "Ayaan Khan", ward_no: "B-201", department: "Neurology", requested_by: "HOM", requested_at: ts("2026-04-01T11:10:00+05:30"), status: "PENDING" }
      ],
      serviceRequests: [
        { id: 10, patient_id: 701, uhid: "FED-2026-882100", appt_id: "APT-8821", patient_name: "Qasim Sheikh", service: "X-Ray Chest", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T09:00:00+05:30"), source: "HOM" },
        { id: 11, patient_id: 703, uhid: "FED-2026-882110", appt_id: "APT-8825", patient_name: "Ayaan Khan", service: "MRI Brain", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T11:00:00+05:30"), source: "HOM" },
        { id: 12, patient_id: 704, uhid: "FED-2026-882120", appt_id: "APT-8840", patient_name: "Sarah Williams", service: "ECG", service_count: 1, status: "PENDING", created_at: ts("2026-04-01T13:00:00+05:30"), source: "HOM" }
      ],
      billingRecords: [
        { id: 701, patient: "Qasim Sheikh", uhid: "FED-2026-882100", dept: "General Medicine", bed: "G-102", dailyRate: 3000, days: 3, supplyCharges: 1600, total: 10600, status: "Active", statusVariant: "info" },
        { id: 702, patient: "Mohammed Kamran", uhid: "FED-2026-882105", dept: "ICU", bed: "ICU-05", dailyRate: 8500, days: 4, supplyCharges: 4200, total: 38200, status: "Active", statusVariant: "error" },
        { id: 703, patient: "Ayaan Khan", uhid: "FED-2026-882110", dept: "Neurology", bed: "B-201", dailyRate: 3500, days: 2, supplyCharges: 1600, total: 8600, status: "Discharge Pending", statusVariant: "warning" },
        { id: 704, patient: "Sarah Williams", uhid: "FED-2026-882120", dept: "Pediatrics", bed: "P-501", dailyRate: 5500, days: 1, supplyCharges: 900, total: 6400, status: "Active", statusVariant: "info" },
        { id: 705, patient: "Ananya Iyer", uhid: "FED-2026-882135", dept: "Cardiology", bed: "C-302", dailyRate: 6200, days: 5, supplyCharges: 5000, total: 36000, status: "Active", statusVariant: "info" },
        { id: 706, patient: "Vikram Malhotra", uhid: "FED-2026-882140", dept: "Pulmonology", bed: "G-108", dailyRate: 2800, days: 1, supplyCharges: 650, total: 3450, status: "Active", statusVariant: "info" }
      ],
      dispatchQueue: [],
      paymentConfirmations: [],
      receipts: [
        { id: 901, patient: "Qasim Sheikh", uhid: "FED-2026-882100", amount: 3100, gross: 4600, coverage: 1500, insurance: "Star Health", mode: "UPI", status: "Paid", ts: ts("2026-02-15T12:00:00+05:30") },
        { id: 903, patient: "Sarah Williams", uhid: "FED-2026-882120", amount: 12000, gross: 22000, coverage: 10000, insurance: "ICICI Lombard", mode: "CARD", status: "Paid", ts: ts("2026-03-12T15:30:00+05:30") }
      ],
      publishedBills: [
        { bill_id: "EOD-1711800000", patient: "Qasim Sheikh", patient_id: 701, amount: 6500, link: "#", ts: ts("2026-03-29T18:00:00+05:30") },
        { bill_id: "EOD-1711810000", patient: "Ayaan Khan", patient_id: 703, amount: 2100, link: "#", ts: ts("2026-03-30T18:00:00+05:30") }
      ],
      bedRequests: [
        { id: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", wardType: "General Ward", patientDetails: "Male, 52, General Medicine", status: "Pending", updatedAt: "01/04/2026 09:30:00" }
      ],
      bedAllocations: [
        { id: "ALLOC-DEMO-1", requestId: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", wardType: "General Ward", patientDetails: "Male, 52, General Medicine", bed: "IP-12", status: "Allocated" }
      ],
      emergencyNotifications: [
        { id: "EMG-DEMO-1", patientId: "FED-2026-9005", bed: "ER-07", status: "Emergency", sentAt: "01/04/2026 10:00" }
      ],
      currentPatientId: 701,
      appointments: []
    };
  }

  function buildPatientFallbackSeed() {
    return {
      patient: clone(buildSharedStateSeed().patientProfiles["FED-2026-882110"]),
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

