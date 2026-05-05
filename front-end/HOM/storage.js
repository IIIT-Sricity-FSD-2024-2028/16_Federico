/**
 * storage.js
 * Central State Management for Federico Hospital HOM
 * Handles localStorage initialization and global data mutations.
 * Seed data is sourced exclusively from shared/canonical-seed.js
 */

window.Store = (function () {
  const LEGACY_STORAGE_KEY = "hospitalFinanceAppState";
  const ROOT_STORAGE_KEY = "HospitalAppState";
  const STORAGE_KEY = ROOT_STORAGE_KEY;

  // ==========================================
  // 1. INITIAL SEED DATA — from canonical-seed.js only
  // ==========================================
  const initialData = window.CanonicalHospitalSeed?.buildSharedStateSeed?.();

  if (!initialData) {
    console.error(
      "[Store] canonical-seed.js not loaded or buildSharedStateSeed() missing. Store cannot initialize.",
    );
  }

  // ==========================================
  // 2. INTERNAL UTILITIES
  // ==========================================

  function nextGeneratedId(namespace) {
    if (window.IDGenerator && typeof window.IDGenerator.nextId === "function") return window.IDGenerator.nextId(namespace);
    return `${namespace}-fallback`;
  }

  function nextNumericId(namespace) {
    const raw = String(nextGeneratedId(namespace));
    const value = Number(raw.split("-").pop());
    return Number.isFinite(value) ? value : Math.floor(Math.random() * 900000) + 1000;
  }

  function deepMerge(defaults, saved) {
    if (Array.isArray(defaults))
      return Array.isArray(saved) ? saved : defaults.slice();
    if (!defaults || typeof defaults !== "object")
      return saved === undefined ? defaults : saved;

    const output = { ...defaults };
    const source = saved && typeof saved === "object" ? saved : {};

    Object.keys(source).forEach((key) => {
      const defaultValue = defaults[key];
      const savedValue = source[key];

      if (Array.isArray(defaultValue))
        output[key] = Array.isArray(savedValue)
          ? savedValue
          : defaultValue.slice();
      else if (defaultValue && typeof defaultValue === "object")
        output[key] = deepMerge(defaultValue, savedValue);
      else output[key] = savedValue;
    });

    return output;
  }

  function normalizeLegacyPatients(data) {
    if (!data || !Array.isArray(data.patients)) return data;
    data.patients = data.patients.map((p) => {
      if (typeof p.age === "number") {
        p.age =
          String(p.age) + (p.gender ? p.gender.charAt(0).toUpperCase() : "");
      }
      return p;
    });
    return data;
  }

  function initStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const hydrated = normalizeLegacyPatients(
      saved
        ? deepMerge(initialData, JSON.parse(saved))
        : deepMerge(initialData, {}),
    );

    if (!Array.isArray(hydrated.dispatchQueue)) hydrated.dispatchQueue = [];
    if (!Array.isArray(hydrated.paymentConfirmations))
      hydrated.paymentConfirmations = [];
    if (!Array.isArray(hydrated.faLedgerRequests))
      hydrated.faLedgerRequests = [];
    if (!Array.isArray(hydrated.serviceRequests)) hydrated.serviceRequests = [];
    if (!Array.isArray(hydrated.receipts)) hydrated.receipts = [];
    if (!Array.isArray(hydrated.publishedBills)) hydrated.publishedBills = [];

    const hydratedPayload = JSON.stringify(hydrated);
    localStorage.setItem(ROOT_STORAGE_KEY, hydratedPayload);
  }

  function getData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeLegacyPatients(
      saved
        ? deepMerge(initialData, JSON.parse(saved))
        : deepMerge(initialData, {}),
    );
  }

  function saveData(dataObj) {
    const payload = JSON.stringify(dataObj);
    localStorage.setItem(ROOT_STORAGE_KEY, payload);
    window.dispatchEvent(new Event("storeUpdated"));
    window.dispatchEvent(new Event("sharedStateUpdated"));
    
    // Immediate push to backend for real-time sync
    if (window.APIClient) {
      window.APIClient.pushFullState(dataObj);
    }
  }

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    window.dispatchEvent(new Event("storeUpdated"));
  });

  // ==========================================
  // 3. INTERNAL HELPERS
  // ==========================================

  function queueLedgerRequest(data, admission, requestedBy = "HOM") {
    if (!Array.isArray(data.faLedgerRequests)) data.faLedgerRequests = [];
    const alreadyQueued = data.faLedgerRequests.some(
      (item) =>
        item.admission_id === admission.admission_id &&
        item.status !== window.FinanceStates.COMPLETED,
    );
    if (alreadyQueued) return;

    data.faLedgerRequests.unshift({
      id: nextGeneratedId("fa-ledger-request"),
      admission_id: admission.admission_id,
      uhid: admission.uhid,
      patient_name: admission.patient_name,
      ward_no: admission.ward_no,
      department: admission.doctor_assigned || "General",
      requested_by: requestedBy,
      requested_at: Date.now(),
      status: window.FinanceStates.PENDING,
    });
  }

  function _assignBedInPlace(data, bedNumber, patientName) {
    for (let ward of data.wards) {
      const bed = ward.beds.find((b) => b.number === bedNumber);
      if (bed) {
        const oldStatus = bed.status;
        ward[oldStatus] = Math.max(0, (ward[oldStatus] || 0) - 1);
        ward.occupied = (ward.occupied || 0) + 1;
        bed.status = "occupied";
        // Normalize: store uhid if PatientResolver can resolve patientName as one.
        if (window.PatientResolver) {
          const profile = window.PatientResolver.getProfile(patientName, data);
          bed.patient = (profile && profile.uhid) ? profile.uhid : patientName;
        } else {
          bed.patient = patientName;
        }
        return true;
      }
    }
    return false;
  }

  function _extractAgeFromAdmission(data, admission, preRequest) {
    if (preRequest && preRequest.age) return preRequest.age;
    const directoryEntry = (data.patientDirectory || []).find(
      (p) => p.uhid === admission.uhid || p.id === admission.uhid,
    );
    if (directoryEntry && directoryEntry.age) return directoryEntry.age;
    const profileEntry = (data.patientProfiles || {})[admission.uhid];
    if (profileEntry && profileEntry.age) return profileEntry.age;
    return "Unknown";
  }

  function _extractGenderFromAdmission(data, admission, preRequest) {
    if (preRequest && preRequest.gender) return preRequest.gender;
    const directoryEntry = (data.patientDirectory || []).find(
      (p) => p.uhid === admission.uhid || p.id === admission.uhid,
    );
    if (directoryEntry && directoryEntry.gender) return directoryEntry.gender;
    const profileEntry = (data.patientProfiles || {})[admission.uhid];
    if (profileEntry && profileEntry.gender) return profileEntry.gender;
    return "";
  }

  function _extractPhysicianFromAdmission(data, admission, preRequest) {
    if (preRequest && preRequest.doctor) return preRequest.doctor;
    const directoryEntry = (data.patientDirectory || []).find(
      (p) => p.uhid === admission.uhid || p.id === admission.uhid,
    );
    if (directoryEntry && directoryEntry.physician)
      return directoryEntry.physician;
    return "";
  }

  function ensureDischargeBillingEntry(data, uhid) {
    const preRequest = (data.preRequests || []).find(
      (item) => item.patientId === uhid || item.uhid === uhid,
    );
    let admission = Object.values(data.admissions || {}).find(
      (item) => item.uhid === uhid,
    );
    let patient = (data.patients || []).find((item) => item.uhid === uhid);

    if (!admission && !preRequest) return null;

    if (!admission) {
      const nextAdmissionId = nextNumericId("ADM");
      const nextLedgerId = nextNumericId("LDG");
      const bedNumber = preRequest?.bedNumber || "Billing Summary";
      const admissionTs =
        preRequest?.updated_at || preRequest?.created_at || Date.now();

      admission = {
        admission_id: nextAdmissionId,
        ledger_id: nextLedgerId,
        patient_name: preRequest?.name || patient?.name || uhid,
        uhid,
        ward_no: bedNumber,
        doctor_assigned:
          preRequest?.doctor ||
          patient?.physician ||
          preRequest?.department ||
          "Assigned Doctor",
        coverage: 0,
        insurance_provider: "N/A",
        last_published_ts: 0,
        admitted_at: admissionTs,
        discharged: false,
        discharge_requested: false,
        discharge_packet_sent: false,
        receipt_sent_to_hom: false,
      };

      data.admissions[nextAdmissionId] = admission;
      if (!data.ledgers[nextLedgerId]) data.ledgers[nextLedgerId] = [];
      data.currentPatientId = nextAdmissionId;
    }

    if (!admission.ledger_id) {
      const nextLedgerId = nextNumericId("LDG");
      admission.ledger_id = nextLedgerId;
    }

    if (!data.ledgers[admission.ledger_id]) {
      data.ledgers[admission.ledger_id] = [];
    }

    if (!patient && preRequest) {
      patient = {
        id: admission.admission_id,
        uhid,
        name: preRequest.name || uhid,
        age: `${preRequest.age || "Unknown"}${preRequest.gender ? ` ${preRequest.gender}` : ""}`.trim(),
        dept: preRequest.department || "General",
        bed: preRequest.bedNumber || admission.ward_no || "Billing Summary",
        physician: preRequest.doctor || "Assigned Doctor",
        admitted: new Date(admission.admitted_at || Date.now())
          .toISOString()
          .split("T")[0],
        days: 0,
        status: "Admitted",
        statusVariant: "info",
      };
      data.patients.push(patient);
    }

    const hasBillingShadow = (data.billingRecords || []).some(
      (item) => item.uhid === uhid,
    );
    if (!hasBillingShadow) {
      data.billingRecords.push({
        id: admission.admission_id,
        patient: admission.patient_name,
        uhid,
        dept: admission.doctor_assigned || preRequest?.department || "General",
        bed: admission.ward_no || preRequest?.bedNumber || "Billing Summary",
        dailyRate: 0,
        days: Math.max(
          1,
          Math.ceil(
            (Date.now() - (admission.admitted_at || Date.now())) /
              (24 * 60 * 60 * 1000),
          ),
        ),
        supplyCharges: 0,
        total: 0,
        status: "Active",
        statusVariant: "info",
      });
    }

    return { admission, patient, preRequest };
  }

  // ==========================================
  // 4. GLOBAL MUTATION FUNCTIONS
  // ==========================================

  function logActivity(type, text) {
    const data = getData();
    const newLog = { id: nextGeneratedId("activity"), type, text, time: "Just now" };
    data.activityLog.unshift(newLog);
    if (data.activityLog.length > 10) data.activityLog.pop();
    saveData(data);
  }

  function updateBedStatus(bedNumber, newStatus, patientName = null) {
    const data = getData();
    let bedFound = false;

    for (let ward of data.wards) {
      const bed = ward.beds.find((b) => b.number === bedNumber);
      if (bed) {
        ward[bed.status]--;
        ward[newStatus]++;
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

  function dischargePatient(uhid) {
    return requestDischargeBilling(uhid);
  }

  function logInventoryUsage(uhid, itemId, quantity) {
    const data = getData();
    const item = data.inventoryItems.find(
      (i) => i.id === itemId || i.item_id === itemId,
    );
    const ledger = data.billingRecords.find((b) => b.uhid === uhid);

    if (!item) return console.error("Item not found");
    if (!ledger)
      return console.error("Patient Ledger not found for UHID: " + uhid);

    item.stock -= quantity;
    item.usedThisMonth = Number(item.usedThisMonth || 0) + quantity;

    const threshold = Number(item.reorderLevel ?? item.minThreshold ?? 0);
    if (item.stock <= threshold) {
      item.status = "Low Stock";
      item.statusVariant = "error";
      logActivity(
        "warning",
        `Inventory Alert: ${item.name} stock fell below threshold`,
      );
    }

    const totalCost = item.unitCost * quantity;
    ledger.supplyCharges += totalCost;
    ledger.total += totalCost;

    logActivity(
      "info",
      `Logged ${quantity}x ${item.name} to patient ${ledger.patient}`,
    );
    saveData(data);
  }

  function assignBed(admissionId, bedNumber) {
    const data = getData();
    const admissionIdx = data.pendingAdmissions.findIndex(
      (a) => a.id === admissionId,
    );
    if (admissionIdx === -1) return;

    const admission = data.pendingAdmissions[admissionIdx];
    const preRequest = (data.preRequests || []).find(
      (item) =>
        item.id === admission.pre_request_id ||
        item.patientId === admission.uhid,
    );

    _assignBedInPlace(data, bedNumber, admission.patient);

    const patientAge = _extractAgeFromAdmission(data, admission, preRequest);
    const patientGender = _extractGenderFromAdmission(
      data,
      admission,
      preRequest,
    );
    const patientPhysician = _extractPhysicianFromAdmission(
      data,
      admission,
      preRequest,
    );

    const newAdmissionId = nextNumericId("admission");

    data.patients.push({
      id: newAdmissionId,
      uhid: admission.uhid,
      name: admission.patient,
      age: `${patientAge || "Unknown"}${patientGender ? ` ${patientGender}` : ""}`.trim(),
      dept: admission.dept,
      bed: bedNumber,
      physician: patientPhysician || "Assigned Doctor",
      admitted: new Date().toISOString().split("T")[0],
      days: 0,
      status: "Admitted",
      statusVariant: "info",
    });

    data.admissions[newAdmissionId] = {
      admission_id: newAdmissionId,
      ledger_id: null,
      patient_name: admission.patient,
      uhid: admission.uhid,
      ward_no: bedNumber,
      doctor_assigned: patientPhysician || `Dr. ${admission.dept}`,
      coverage: 0,
      insurance_provider: "To Be Updated",
      last_published_ts: 0,
      admitted_at: Date.now(),
      discharged: false,
      discharge_requested: false,
      discharge_packet_sent: false,
      receipt_sent_to_hom: false,
    };
    data.currentPatientId = newAdmissionId;
    queueLedgerRequest(data, data.admissions[newAdmissionId], "HOM");

    if (!Array.isArray(data.bedAllocations)) data.bedAllocations = [];
    data.bedAllocations.unshift({
      id: nextGeneratedId("allocation"),
      requestId: admission.pre_request_id || `PRE-${admission.uhid}`,
      name: admission.patient,
      patientId: admission.uhid,
      wardType: admission.preferredWard || "General Ward",
      patientDetails:
        admission.patientDetails || `${admission.dept || "General"} patient`,
      bed: bedNumber,
      status: "Approved by HOM",
      updatedAt: Date.now(),
    });

    if (preRequest) {
      preRequest.visitType = preRequest.visitType || "Admit";
      preRequest.status =
        preRequest.visitType === "Emergency" ? "Emergency" : "Admitted";
      preRequest.patientStatus =
        preRequest.visitType === "Emergency" ? "Emergency" : "Admitted";
      preRequest.homStatus = "Bed approved by HOM";
      preRequest.bedNumber = bedNumber;
      preRequest.updated_at = Date.now();
    }

    data.pendingAdmissions.splice(admissionIdx, 1);
    logActivity(
      "success",
      `Bed ${bedNumber} assigned to ${admission.patient} (${admission.uhid}); FA ledger request queued`,
    );
    saveData(data);
  }

  function createLedgerForAdmission(admissionId) {
    const data = getData();
    const admission = data.admissions?.[admissionId];
    if (!admission) return false;

    if (!admission.ledger_id || !data.ledgers[admission.ledger_id]) {
      const nextLedgerId = nextNumericId("LDG");
      admission.ledger_id = nextLedgerId;
      data.ledgers[nextLedgerId] = [];
    }

    const existingBilling = (data.billingRecords || []).find(
      (item) => item.uhid === admission.uhid,
    );
    if (!existingBilling) {
      data.billingRecords.push({
        id: admission.admission_id,
        patient: admission.patient_name,
        uhid: admission.uhid,
        dept: admission.doctor_assigned || "General",
        bed: admission.ward_no,
        dailyRate: 3000,
        days: 0,
        supplyCharges: 0,
        total: 0,
        status: admission.discharge_requested ? "Pending Discharge" : "Active",
        statusVariant: admission.discharge_requested ? "warning" : "info",
      });
    }

    (data.faLedgerRequests || []).forEach((request) => {
      if (
        request.admission_id === admissionId &&
        request.status !== window.FinanceStates.COMPLETED
      ) {
        request.status = window.FinanceStates.COMPLETED;
        request.completed_at = Date.now();
      }
    });

    saveData(data);
    return true;
  }

  function requestDischargeBilling(uhid) {
    const data = getData();
    const context = ensureDischargeBillingEntry(data, uhid);
    const admission =
      context?.admission ||
      Object.values(data.admissions || {}).find((item) => item.uhid === uhid);
    const patient =
      context?.patient || data.patients.find((item) => item.uhid === uhid);
    const ledger = data.billingRecords.find((item) => item.uhid === uhid);
    const preRequest =
      context?.preRequest ||
      (data.preRequests || []).find(
        (item) => item.patientId === uhid || item.uhid === uhid,
      );

    if (admission) {
      admission.discharge_requested = true;
      if (admission.ward_no) _freeBedInPlace(data, admission.ward_no);
    }
    if (patient) {
      patient.status = "Pending Discharge";
      patient.statusVariant = "warning";
    }
    if (ledger) {
      ledger.status = "Pending Discharge";
      ledger.statusVariant = "warning";
    }
    if (preRequest) {
      preRequest.visitType =
        preRequest.visitType ||
        (preRequest.status === "Emergency" ||
        preRequest.patientStatus === "Emergency"
          ? "Emergency"
          : "Admit");
      preRequest.patientStatus = "Discharge Pending";
      preRequest.status = "Discharge";
      preRequest.homStatus = "Sent to FA";
      preRequest.updated_at = Date.now();
    }

    if (admission || patient || ledger || preRequest) {
      logActivity(
        "warning",
        `Discharge billing requested from FA for patient ${uhid}`,
      );
      saveData(data);
      return true;
    }
    return false;
  }

  function prepareDischargeBilling(uhid) {
    const data = getData();
    const context = ensureDischargeBillingEntry(data, uhid);
    if (!context) return false;

    const { admission, patient, preRequest } = context;
    const ledger = (data.billingRecords || []).find(
      (item) => item.uhid === uhid,
    );

    if (admission) {
      admission.discharged = false;
      admission.discharge_requested = false;
    }
    if (patient) {
      patient.status = "Admitted";
      patient.statusVariant = "info";
      if (!patient.bed || patient.bed === "Bed freed")
        patient.bed =
          admission?.ward_no || preRequest?.bedNumber || "Billing Summary";
    }
    if (ledger) {
      ledger.status = "Active";
      ledger.statusVariant = "info";
      ledger.bed = admission?.ward_no || ledger.bed;
    }
    if (preRequest) {
      preRequest.homStatus = "Billing Summary Ready";
      preRequest.updated_at = Date.now();
    }

    logActivity(
      "info",
      `Billing summary prepared for discharge workflow for patient ${uhid}`,
    );
    saveData(data);
    return true;
  }

  function getPreDischargeRows() {
    const data = getData();
    const resolvePreVisitType = (item) => {
      if (["Emergency", "Admit"].includes(item?.visitType))
        return item.visitType;
      if (item?.status === "Emergency" || item?.patientStatus === "Emergency")
        return "Emergency";
      if (
        [
          "Admitted",
          "Discharge",
          "Discharge Pending",
          "Approved Discharge",
        ].includes(item?.status) ||
        ["Admitted", "Discharge Pending", "Approved Discharge"].includes(
          item?.patientStatus,
        )
      )
        return "Admit";
      return "";
    };

    return (data.preRequests || [])
      .filter((item) =>
        ["Emergency", "Admit"].includes(resolvePreVisitType(item)),
      )
      .filter(
        (item) =>
          item.patientStatus === "Discharge Pending" ||
          item.status === "Discharge" ||
          item.patientStatus === "Approved Discharge" ||
          item.status === "Approved Discharge",
      )
      .map((item) => ({
        patientId: item.patientId,
        name: item.name,
        department: item.department,
        doctor: item.doctor,
        patientStatus:
          item.patientStatus ||
          (item.status === "Discharge" ? "Discharge Pending" : item.status),
        homStatus: item.homStatus || "Awaiting HOM",
        canSendToFA:
          (item.patientStatus === "Discharge Pending" ||
            item.status === "Discharge") &&
          !["Billing Summary Ready", "Sent to FA", "Confirmed by HOM"].includes(
            item.homStatus,
          ),
        canConfirmToPRE:
          (item.patientStatus === "Discharge Pending" ||
            item.status === "Discharge") &&
          item.homStatus !== "Confirmed by HOM",
      }));
  }

  function confirmDischargeBackToPRE(uhid) {
    const data = getData();
    const preRequest = (data.preRequests || []).find(
      (item) => item.patientId === uhid || item.uhid === uhid,
    );
    if (!preRequest) return false;

    const context = ensureDischargeBillingEntry(data, uhid);
    const admission =
      context?.admission ||
      Object.values(data.admissions || {}).find((item) => item.uhid === uhid);
    const patient =
      context?.patient ||
      (data.patients || []).find((item) => item.uhid === uhid);
    const ledger = (data.billingRecords || []).find(
      (item) => item.uhid === uhid,
    );

    preRequest.patientStatus = "Approved Discharge";
    preRequest.status = "Approved Discharge";
    preRequest.homStatus = "Confirmed by HOM and sent to FA";
    preRequest.updated_at = Date.now();

    if (admission) {
      admission.discharge_requested = true;
      admission.discharged = false;
      admission.discharge_packet_sent = false;
    }
    if (patient) {
      patient.status = "Pending Discharge";
      patient.statusVariant = "warning";
      patient.bed =
        patient.bed && patient.bed !== "Bed freed"
          ? patient.bed
          : admission?.ward_no || preRequest.bedNumber || "Billing Summary";
    }
    if (ledger) {
      ledger.status = "Pending Discharge";
      ledger.statusVariant = "warning";
    }

    logActivity(
      "success",
      `Discharge confirmed for ${uhid}; PRE and FA notified`,
    );
    saveData(data);
    return true;
  }

  function createServiceRequest(patientId, service, qty = 1) {
    const data = getData();
    const admission = data.admissions?.[patientId];
    if (!admission) return false;

    const newId =
      Math.max(0, ...(data.serviceRequests || []).map((r) => r.id || 0)) + 1;
    (data.serviceRequests || (data.serviceRequests = [])).unshift({
      id: newId,
      patient_id: patientId,
      uhid: admission.uhid,
      appt_id: nextGeneratedId("appointment"),
      patient_name: admission.patient_name,
      service,
      service_count: qty,
      status: window.FinanceStates.PENDING,
      created_at: Date.now(),
      source: "HOM",
    });

    // ── Inventory decrement ──
    const inventoryItem = (data.inventoryItems || []).find(
      (item) =>
        (item.name || "").toLowerCase() === (service || "").toLowerCase()
    );
    if (inventoryItem) {
      const useQty      = Number(qty) || 1;
      const prevStock   = Number(inventoryItem.stock) || 0;
      inventoryItem.stock = Math.max(0, prevStock - useQty);
      inventoryItem.usedThisMonth = Number(inventoryItem.usedThisMonth || 0) + useQty;

      const reorderLevel = Number(
        inventoryItem.reorderLevel ?? inventoryItem.reorder_level ?? inventoryItem.minThreshold ?? 0
      );
      if (inventoryItem.stock <= reorderLevel) {
        inventoryItem.status        = "Low Stock";
        inventoryItem.statusVariant = "error";
        if (!Array.isArray(data.activityLog)) data.activityLog = [];
        data.activityLog.unshift({
          id:   Date.now(),
          type: "warning",
          text: `Low stock: ${inventoryItem.name} is at ${inventoryItem.stock} units (reorder at ${reorderLevel})`,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        });
        if (data.activityLog.length > 20) data.activityLog.length = 20;
      }
    }

    // ── FA ledger notification ──
    if (!Array.isArray(data.faLedgerRequests)) data.faLedgerRequests = [];
    const alreadyHasServiceRequest = data.faLedgerRequests.some(
      (r) =>
        r.type === "SERVICE_CHARGE" &&
        r.admission_id === patientId &&
        r.service === service &&
        !window.FinanceStates.isTerminal(r.status)
    );
    if (!alreadyHasServiceRequest) {
      data.faLedgerRequests.unshift({
        id:           `SVC-${Date.now()}`,
        type:         "SERVICE_CHARGE",
        admission_id: patientId,
        uhid:         admission.uhid,
        patient_name: admission.patient_name,
        ward_no:      admission.ward_no,
        service,
        qty:          Number(qty) || 1,
        requested_by: "HOM",
        requested_at: Date.now(),
        status:       window.FinanceStates.PENDING,
      });
    }

    logActivity(
      "info",
      `Service request created: ${service} for ${admission.patient_name}`,
    );
    saveData(data);
    return true;
  }

  function dispatchToPatient(dispatchId) {
    const data = getData();
    const item = (data.dispatchQueue || []).find((d) => d.id === dispatchId);
    if (!item) return false;

    item.status = "SENT";
    item.sent_at = Date.now();
    logActivity("success", `Bill dispatched to patient ${item.patient_name}`);
    saveData(data);
    return true;
  }

  function notifyFAPaymentConfirmed(dispatchId) {
    const data = getData();
    const item = (data.dispatchQueue || []).find((d) => d.id === dispatchId);
    if (!item) return false;

    const confirmationId = nextGeneratedId("payment-confirmation");
    (data.paymentConfirmations || (data.paymentConfirmations = [])).unshift({
      id: confirmationId,
      patient_id: item.patient_id,
      admission_id: item.admission_id || item.patient_id,
      patient_name: item.patient_name,
      uhid: item.uhid,
      amount: item.amount,
      payment_mode: item.payment_mode || "CASH",
      confirmed_by: "HOM",
      confirmed_at: Date.now(),
      status: window.FinanceStates.PENDING_RECEIPT,
    });

    item.payment_confirmed = true;
    item.payment_confirmed_at = Date.now();
    item.payment_confirmation_id = confirmationId;

    logActivity(
      "success",
      `Payment confirmed by HOM for ${item.patient_name}; FA notified to generate receipt`,
    );
    saveData(data);
    return true;
  }

  function _freeBedInPlace(data, bedNumber) {
    for (let ward of data.wards) {
      const bed = ward.beds.find((b) => b.number === bedNumber);
      if (bed && bed.status === "occupied") {
        ward.occupied = Math.max(0, (ward.occupied || 0) - 1);
        ward.available = (ward.available || 0) + 1;
        bed.status = "available";
        delete bed.patient;
        return true;
      }
    }
    return false;
  }

  function confirmPaymentFromHOM(admissionId, amount, method) {
    const data = getData();
    (data.paymentConfirmations || (data.paymentConfirmations = [])).push({
      id: nextGeneratedId("payment-confirmation"),
      admission_id: admissionId,
      uhid: data.admissions[admissionId]?.uhid,
      patient_name: data.admissions[admissionId]?.patient_name,
      amount: amount,
      payment_mode: method,
      status: window.FinanceStates.PENDING_RECEIPT,
      confirmed_at: Date.now(),
      confirmed_by: "HOM",
    });
    saveData(data);
  }

  function getServiceCatalog() {
    return [
      "X-Ray Chest",
      "MRI Brain",
      "ECG",
      "Blood Test Panel",
      "CT Scan",
      "Physiotherapy Session",
      "Ultrasound Abdomen",
      "Surgery Theater Charges",
      "Anesthesia Admin",
      "ICU Ventilator Support",
      "Dialysis Session",
      "Specialist Consultation",
      "Nursing Care Charges"
    ];
  }

  function getBillingRows() {
    const data = getData();
    return Object.values(data.admissions || {}).map((admission) => {
      const hasLedger = Boolean(
        admission.ledger_id && data.ledgers[admission.ledger_id],
      );
      if (!hasLedger) {
        return {
          id: admission.admission_id,
          patient: (window.PatientResolver ? window.PatientResolver.getName(admission.uhid, data) : null) || admission.patient_name,
          uhid: admission.uhid,
          dept: admission.doctor_assigned || "General",
          bed: admission.ward_no,
          dailyRate: 0,
          days: Math.max(
            1,
            Math.ceil(
              (Date.now() - (admission.admitted_at || Date.now())) /
                (24 * 60 * 60 * 1000),
            ),
          ),
          supplyCharges: 0,
          total: 0,
          status: "Awaiting FA Ledger",
          statusVariant: "warning",
          entries: [],
        };
      }

      const entries = data.ledgers[admission.ledger_id] || [];
      const total = entries.reduce(
        (sum, entry) => sum + entry.qty * entry.price + entry.tax,
        0,
      );
      const supplyCharges = entries
        .filter((e) => String(e.service_name || "").includes("Inventory"))
        .reduce((sum, e) => sum + e.qty * e.price + e.tax, 0);
      const days = Math.max(
        1,
        Math.ceil(
          (Date.now() - (admission.admitted_at || Date.now())) /
            (24 * 60 * 60 * 1000),
        ),
      );
      const dailyRate =
        days > 0
          ? Math.max(0, Math.round((total - supplyCharges) / days))
          : total;
      const isCritical = String(admission.ward_no || "")
        .toUpperCase()
        .includes("ICU");
      const status = admission.discharged
        ? "Finalized"
        : admission.discharge_requested
          ? "Pending Discharge"
          : isCritical
            ? "Active Critical"
            : "Active";
      const statusVariant = admission.discharged
        ? "neutral"
        : admission.discharge_requested
          ? "warning"
          : isCritical
            ? "error"
            : "info";

      return {
        id: admission.admission_id,
        patient: (window.PatientResolver ? window.PatientResolver.getName(admission.uhid, data) : null) || admission.patient_name,
        uhid: admission.uhid,
        dept: admission.doctor_assigned || "General",
        bed: admission.ward_no,
        dailyRate,
        days,
        supplyCharges,
        total,
        status,
        statusVariant,
        entries,
      };
    });
  }

  // Auto-initialize on load
  initStorage();

  return {
    get: getData,
    save: saveData,
    reset: () => {
      localStorage.removeItem(ROOT_STORAGE_KEY);
      initStorage();
    },
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
    notifyFAPaymentConfirmed,
    confirmPaymentFromHOM,
    getServiceCatalog,
    getBillingRows,
  };
})();




