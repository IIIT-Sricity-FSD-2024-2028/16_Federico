(function () {
  const STORAGE_KEY = "hospitalFinanceAppState";
  const MAX_EVENTS = 18;
  let previousState = null;
  let events = [];

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function toObjectById(list) {
    const map = {};
    (Array.isArray(list) ? list : []).forEach((item) => {
      if (!item) return;
      const id = item.id ?? item.bill_id ?? item.admission_id ?? item.patient_id;
      if (id === undefined || id === null) return;
      map[String(id)] = item;
    });
    return map;
  }

  function pushEvent(text) {
    events.unshift({ ts: Date.now(), text });
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);
  }

  function diffAndTrack(prev, next) {
    const prevDispatch = toObjectById(prev.dispatchQueue);
    const nextDispatch = toObjectById(next.dispatchQueue);
    Object.keys(nextDispatch).forEach((id) => {
      const before = prevDispatch[id];
      const after = nextDispatch[id];
      if (!before) {
        pushEvent(`Dispatch created: ${after.type || "ITEM"} [${after.status || "NA"}]`);
        return;
      }
      if (before.status !== after.status) {
        pushEvent(`Dispatch ${id}: ${before.status || "NA"} -> ${after.status || "NA"}`);
      }
    });

    const prevConfirm = toObjectById(prev.paymentConfirmations);
    const nextConfirm = toObjectById(next.paymentConfirmations);
    Object.keys(nextConfirm).forEach((id) => {
      const before = prevConfirm[id];
      const after = nextConfirm[id];
      if (!before) {
        pushEvent(`Payment confirmation created: ${id} [${after.status || "NA"}]`);
        return;
      }
      if (before.status !== after.status) {
        pushEvent(`Payment confirmation ${id}: ${before.status || "NA"} -> ${after.status || "NA"}`);
      }
    });

    const prevAdmissions = prev.admissions && typeof prev.admissions === "object" ? prev.admissions : {};
    const nextAdmissions = next.admissions && typeof next.admissions === "object" ? next.admissions : {};
    Object.keys(nextAdmissions).forEach((id) => {
      const before = prevAdmissions[id] || {};
      const after = nextAdmissions[id] || {};
      if (before.discharge_requested !== after.discharge_requested) {
        pushEvent(`Admission ${id}: discharge_requested ${Boolean(before.discharge_requested)} -> ${Boolean(after.discharge_requested)}`);
      }
      if (before.discharged !== after.discharged) {
        pushEvent(`Admission ${id}: discharged ${Boolean(before.discharged)} -> ${Boolean(after.discharged)}`);
      }
    });
  }

  function countByStatus(list, status) {
    return (Array.isArray(list) ? list : []).filter((item) => item && item.status === status).length;
  }

  function ensureRoot() {
    let root = document.getElementById("qa-debug-state-panel");
    if (root) return root;

    root = document.createElement("aside");
    root.id = "qa-debug-state-panel";
    root.style.position = "fixed";
    root.style.right = "12px";
    root.style.bottom = "12px";
    root.style.width = "360px";
    root.style.maxHeight = "70vh";
    root.style.overflow = "hidden";
    root.style.background = "#0f172a";
    root.style.color = "#e2e8f0";
    root.style.border = "1px solid #334155";
    root.style.borderRadius = "10px";
    root.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    root.style.fontSize = "12px";
    root.style.zIndex = "99999";

    root.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #334155;">
        <strong>QA State Panel</strong>
        <div style="display:flex; gap:6px;">
          <button id="qa-debug-refresh" style="background:#1d4ed8; color:#fff; border:0; border-radius:6px; padding:4px 8px; cursor:pointer;">Refresh</button>
          <button id="qa-debug-toggle" style="background:#334155; color:#fff; border:0; border-radius:6px; padding:4px 8px; cursor:pointer;">Hide</button>
        </div>
      </div>
      <div id="qa-debug-body" style="padding:10px 12px; max-height:calc(70vh - 44px); overflow:auto;">
        <div id="qa-debug-metrics"></div>
        <div style="margin-top:10px; border-top:1px solid #334155; padding-top:8px;">
          <div style="font-weight:700; margin-bottom:6px;">Transitions</div>
          <div id="qa-debug-events"></div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    root.querySelector("#qa-debug-refresh").addEventListener("click", render);
    root.querySelector("#qa-debug-toggle").addEventListener("click", () => {
      const body = root.querySelector("#qa-debug-body");
      const button = root.querySelector("#qa-debug-toggle");
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none";
      button.textContent = hidden ? "Hide" : "Show";
    });

    return root;
  }

  function render() {
    const root = ensureRoot();
    const state = readState();

    if (previousState) diffAndTrack(previousState, state);
    previousState = JSON.parse(JSON.stringify(state || {}));

    const metrics = root.querySelector("#qa-debug-metrics");
    const eventsEl = root.querySelector("#qa-debug-events");

    const pendingAdmissions = (state.pendingAdmissions || []).length;
    const ledgerPending = (state.faLedgerRequests || []).filter((item) => item.status !== "COMPLETED").length;
    const dispatchQueued = countByStatus(state.dispatchQueue, "QUEUED");
    const dispatchSent = countByStatus(state.dispatchQueue, "SENT");
    const pendingReceipt = countByStatus(state.paymentConfirmations, "PENDING_RECEIPT");
    const receiptsCount = (state.receipts || []).length;
    const dischargedCount = Object.values(state.admissions || {}).filter((item) => item && item.discharged).length;

    metrics.innerHTML = `
      <div>pendingAdmissions: <strong>${pendingAdmissions}</strong></div>
      <div>faLedgerRequests (open): <strong>${ledgerPending}</strong></div>
      <div>dispatchQueue QUEUED/SENT: <strong>${dispatchQueued}/${dispatchSent}</strong></div>
      <div>paymentConfirmations PENDING_RECEIPT: <strong>${pendingReceipt}</strong></div>
      <div>receipts: <strong>${receiptsCount}</strong></div>
      <div>admissions discharged: <strong>${dischargedCount}</strong></div>
    `;

    if (events.length === 0) {
      eventsEl.innerHTML = `<div style="color:#94a3b8;">No transitions captured yet.</div>`;
      return;
    }

    eventsEl.innerHTML = events.map((event) => {
      const ts = new Date(event.ts).toLocaleTimeString();
      return `<div style="padding:3px 0; border-bottom:1px dotted #334155;"><span style="color:#94a3b8;">${ts}</span> ${event.text}</div>`;
    }).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    render();
  });
  window.addEventListener("sharedStateUpdated", render);
  window.addEventListener("storeUpdated", render);
})();
