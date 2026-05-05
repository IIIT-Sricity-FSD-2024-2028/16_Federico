/**
 * shared/api-client.js
 * Bridge between Frontend (localStorage) and Backend (NestJS API).
 *
 * Strategy:
 *  - On load   → MERGE backend state into localStorage (backend wins for most keys,
 *                but local arrays like preRequests are union-merged so nothing is lost)
 *  - On change → push to backend only when state actually changes (event-driven)
 *  - No polling interval → zero unnecessary requests when user is idle
 */

(function () {
  var API_BASE_URL = "http://localhost:3000";
  var ROOT_STORAGE_KEY = "HospitalAppState";

  // Track last pushed state hash to avoid duplicate POSTs
  var _lastPushedHash = null;

  function _hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  /**
   * Merge two arrays by unique id/appointmentId — local wins over remote for the same id.
   */
  function _mergeArrays(localArr, remoteArr) {
    if (!Array.isArray(remoteArr)) return Array.isArray(localArr) ? localArr : [];
    if (!Array.isArray(localArr)) return remoteArr;

    var seen = new Set();
    var merged = [];

    // Local items take priority
    localArr.forEach(function(item) {
      var key = item.id || item.appointmentId || item.entry_id || item.admission_id || JSON.stringify(item);
      seen.add(String(key));
      merged.push(item);
    });

    // Add remote items not already present locally
    remoteArr.forEach(function(item) {
      var key = item.id || item.appointmentId || item.entry_id || item.admission_id || JSON.stringify(item);
      if (!seen.has(String(key))) {
        merged.push(item);
      }
    });

    return merged;
  }

  /**
   * Merge backend state into local state.
   * Arrays are union-merged (local + remote, no duplicates).
   * Scalar values default to remote.
   * Objects are shallow-merged (local wins).
   */
  function _mergeStates(localState, remoteState) {
    if (!remoteState || typeof remoteState !== "object") return localState;
    if (!localState || typeof localState !== "object") return remoteState;

    var result = Object.assign({}, remoteState);

    var arrayKeys = [
      "preRequests", "pendingAdmissions", "patients", "dispatchQueue",
      "paymentConfirmations", "receipts", "publishedBills", "faLedgerRequests",
      "serviceRequests", "billingRecords", "bedRequests", "bedAllocations",
      "emergencyNotifications", "appointments", "activityLog", "doctors",
      "inventoryItems", "patientDirectory", "patientAuthAccounts"
    ];

    arrayKeys.forEach(function(key) {
      result[key] = _mergeArrays(localState[key], remoteState[key]);
    });

    // Merge object maps (admissions, ledgers, patientProfiles) — local wins per key
    ["admissions", "ledgers", "patientProfiles"].forEach(function(key) {
      if (localState[key] && typeof localState[key] === "object") {
        result[key] = Object.assign({}, remoteState[key] || {}, localState[key]);
      }
    });

    return result;
  }

  // --- ADAPTER LAYER (Relational <-> Denormalized) ---
  function transformLocalToRelational(local) {
    var rel = {
      stateVersion: local.stateVersion || "3.0.0",
      roles: [{ role_id: 1, role_name: 'ADMIN' }, { role_id: 2, role_name: 'SUPER_USER' }],
      users: [],
      patients: [],
      patientInsurances: [],
      patientInsuranceDocuments: [],
      doctors: [],
      doctorAvailabilities: [],
      appointments: [],
      wards: [],
      beds: [],
      admissions: [],
      dischargeSummaries: [],
      services: [],
      ledgers: [],
      ledgerEntries: [],
      insurances: [],
      payments: [],
      inventoryItems: [],
      purchaseRequests: [],
      patientAuthAccounts: local.patientAuthAccounts || []
    };

    // 1. Patients
    (local.patientDirectory || []).forEach(p => {
      rel.patients.push({
        user_id: 101, // Mock default
        patient_id: p.id && String(p.id).includes('FED-') ? parseInt(String(p.id).split('-').pop()) : 201,
        uhid: p.id || p.uhid || "UHID-000",
        name: p.name || "Unknown",
        phone: p.phone || "0000000000",
        dob: "1970-01-01", // Approximation from age not possible without full date
        gender: p.gender || "Unknown",
        address: p.address || ""
      });
    });

    // 2. Doctors
    (local.doctors || []).forEach((d, i) => {
      rel.doctors.push({
        doctor_id: i + 401,
        name: d.name,
        specialization: d.specialization || "General",
        phone: "0000000000",
        email: "doc@hosp.com"
      });
      rel.doctorAvailabilities.push({
        availability_id: i + 501,
        doctor_id: i + 401,
        available_date: new Date().toISOString().split('T')[0],
        start_time: d.start || "09:00:00",
        end_time: d.end || "17:00:00",
        status: d.status || "Available"
      });
    });

    // 3. Appointments
    (local.preRequests || []).forEach((pr, i) => {
      rel.appointments.push({
        appointment_id: parseInt(String(pr.appointmentId || pr.id).replace(/\D/g, '') || (i + 601).toString()),
        patient_id: 201,
        availability_id: 501,
        scheduled_datetime: new Date().toISOString(),
        visit_type: "OPD",
        status: pr.status === "Approved" ? "CONFIRMED" : "PENDING",
        created_by: 101
      });
    });

    // 4. Admissions, Beds & Ledgers
    Object.values(local.admissions || {}).forEach((adm, i) => {
      // Create Ward/Bed mock mapping
      if (!rel.wards.find(w => w.ward_name === "General Ward")) {
        rel.wards.push({ ward_id: 1, ward_name: "General Ward", total_beds: 10, description: "Main" });
      }
      var bedId = i + 11;
      rel.beds.push({ bed_id: bedId, ward_id: 1, bed_number: adm.ward_no || `G-${bedId}`, status: adm.discharged ? "AVAILABLE" : "OCCUPIED" });

      rel.admissions.push({
        admission_id: adm.admission_id || (i + 701),
        appointment_id: 601,
        patient_id: 201,
        bed_id: bedId,
        status: adm.discharged ? "DISCHARGED" : "ADMITTED",
        admit_time: new Date().toISOString()
      });

      rel.ledgers.push({
        ledger_id: adm.ledger_id || (i + 801),
        admission_id: adm.admission_id || (i + 701),
        status: adm.discharged ? "CLOSED" : "OPEN"
      });
    });

    // 5. Ledger Entries & Services
    Object.keys(local.ledgers || {}).forEach(ledger_id => {
      (local.ledgers[ledger_id] || []).forEach((entry, i) => {
        // Ensure service exists
        if (!rel.services.find(s => s.service_name === entry.service_name)) {
          rel.services.push({ service_id: rel.services.length + 1, service_name: entry.service_name, base_cost: entry.price });
        }
        rel.ledgerEntries.push({
          entry_id: entry.entry_id || (i + 1),
          ledger_id: parseInt(ledger_id),
          service_id: rel.services.find(s => s.service_name === entry.service_name)?.service_id || 1,
          quantity: entry.qty || 1,
          unit_price: entry.price || 0,
          amount: (entry.qty || 1) * (entry.price || 0)
        });
      });
    });

    // 6. Payments
    (local.receipts || []).forEach((r, i) => {
      rel.payments.push({
        payment_id: r.id || (i + 901),
        ledger_id: r.ledger_id || 801,
        amount_paid: r.amount || 0,
        payment_mode: r.mode || "UPI"
      });
    });

    // 7. Inventory
    (local.inventoryItems || []).forEach(inv => {
      rel.inventoryItems.push({
        item_id: inv.item_id,
        item_name: inv.name,
        category: inv.category,
        stock_quantity: inv.stock,
        reorder_level: inv.reorderLevel || 10
      });
    });

    return rel;
  }

  function transformRelationalToLocal(rel) {
    // Because UI components (HOM, FA) rely strictly on local cache structures and union merging 
    // prevents data destruction, we only map back critical arrays to keep the payload alive.
    // For a complete full-stack migration, the frontend controllers would be rewritten.
    var loc = {
      patientAuthAccounts: rel.patientAuthAccounts || [],
      patients: [],
      doctors: [],
      preRequests: [],
      admissions: {},
      ledgers: {},
      receipts: [],
      inventoryItems: [],
      patientDirectory: []
    };

    (rel.patients || []).forEach(p => {
      loc.patientDirectory.push({ id: p.uhid, name: p.name, gender: p.gender, phone: p.phone, address: p.address, age: "30" });
    });

    (rel.doctors || []).forEach(d => {
      var avail = (rel.doctorAvailabilities || []).find(a => a.doctor_id === d.doctor_id) || {};
      loc.doctors.push({ id: `D${d.doctor_id}`, name: d.name, specialization: d.specialization, start: avail.start_time, end: avail.end_time, status: avail.status });
    });

    return loc;
  }

  async function fetchFullState() {
    try {
      var response = await fetch(API_BASE_URL + "/data/full-state", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var relationalState = await response.json();
      return transformRelationalToLocal(relationalState);
    } catch (err) {
      console.warn("[APIClient] GET failed:", err.message);
      return null;
    }
  }

  async function pushFullState(state) {
    try {
      var relationalPayload = transformLocalToRelational(state || {});
      var payload = JSON.stringify(relationalPayload);
      var hash = _hash(payload);

      // Skip if state hasn't changed since last push
      if (hash === _lastPushedHash) return null;
      _lastPushedHash = hash;

      var response = await fetch(API_BASE_URL + "/data/full-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (err) {
      console.warn("[APIClient] POST failed:", err.message);
      return null;
    }
  }

  /**
   * On page load:
   * 1. Read what's already in localStorage (could have fresh local data)
   * 2. Fetch backend state
   * 3. Merge them (union arrays, local wins on conflicts)
   * 4. Write merged result back to localStorage and push to backend
   */
  async function initializeSync() {
    try {
      var localRaw = localStorage.getItem(ROOT_STORAGE_KEY);
      var localState = localRaw ? JSON.parse(localRaw) : {};

      var remoteState = await fetchFullState();

      if (remoteState && Object.keys(remoteState).length > 0) {
        var merged = _mergeStates(localState, remoteState);
        var mergedPayload = JSON.stringify(merged);
        localStorage.setItem(ROOT_STORAGE_KEY, mergedPayload);

        // Seed the hash so the next push is only sent if something actually changed
        _lastPushedHash = _hash(mergedPayload);

        window.dispatchEvent(new Event("sharedStateUpdated"));
        console.log("[APIClient] ✅ State merged from backend on load.");
      }
    } catch (err) {
      console.warn("[APIClient] Init sync failed:", err.message);
    }
  }

  window.APIClient = {
    fetchFullState: fetchFullState,
    pushFullState: pushFullState,
    initializeSync: initializeSync
  };

  // Auto-initialize only once per page
  if (!window.APIClientInitialized) {
    window.APIClientInitialized = true;
    initializeSync();
  }
})();
