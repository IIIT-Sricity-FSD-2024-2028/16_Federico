'use strict';

import { computePatientShare } from '../../lib/insurance.js';

/**
 * The pure shaping half of Patient/js/patient-store.js, ported unchanged.
 *
 * These functions turn the backend's portal-summary payload into the view
 * model every Patient page reads. Keeping them pure means the context below is
 * just fetch + state.
 */

export function formatShortDate(value) {
  if (!value || value === '--') return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date(String(value).replace(/-/g, '/'));
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimeString(value) {
  if (!value || value === '--') return '--';
  const raw = String(value).trim();
  if (raw.includes('AM') || raw.includes('PM')) return raw;
  const parts = raw.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1].slice(0, 2);
    if (!Number.isNaN(h)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return String(hr).padStart(2, '0') + ':' + m + ' ' + ampm;
    }
  }
  return raw;
}

export function formatFullDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toIsoDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

export function computeAge(dob) {
  if (!dob) return 'Unknown';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'Unknown';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(age, 0);
}

function mapPreRequestStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'APPROVED' || s === 'CONFIRMED') return 'Confirmed';
  if (s === 'SCHEDULED') return 'Scheduled';
  if (['CONSULTATION_DONE', 'ADMITTED', 'DISCHARGE_APPROVED', 'DISCHARGED', 'COMPLETED'].includes(s)) return 'Completed';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'Cancelled';
  return 'Pending';
}

/**
 * DEFECT D4 lives here, preserved: the returned insurance object has no
 * `hasInsurance` key, yet patient-billing.js guards its banner on
 * `ins.hasInsurance`. The insurance banner therefore never leaves its
 * "Self Pay" branch, even for an insured patient. Constraint 1 keeps it.
 */
export function buildProfile(patient, user, insurance) {
  const nameParts = (patient.name || '').split(' ').filter(Boolean);
  const hasPolicy = Boolean(
    insurance &&
      (insurance.policy_number || insurance.provider_name) &&
      insurance.provider_name !== 'Self Pay',
  );
  const ins = insurance
    ? {
        hasInsurance: hasPolicy,
        verified: Boolean(insurance.coverage_limit),
        provider: insurance.provider_name || 'Self Pay',
        policyNumber: insurance.policy_number || '',
        memberId: insurance.member_id || '',
        coverage: Number(insurance.coverage_limit || 0),
        copayPercentage: Number(insurance.copay_percentage || 0),
        validFrom: insurance.valid_from || '',
        validTo: insurance.valid_to || '',
        coverageType: insurance.coverage_type || 'Self',
        cardFrontUrl: insurance.card_front_url || '',
        cardBackUrl: insurance.card_back_url || '',
      }
    : {
        hasInsurance: false,
        verified: false,
        provider: 'Self Pay',
        policyNumber: '',
        memberId: '',
        coverage: 0,
        copayPercentage: 0,
        validFrom: '',
        validTo: '',
        coverageType: 'Self',
        cardFrontUrl: '',
        cardBackUrl: '',
      };

  return {
    id: patient.patient_id,
    patientId: patient.patient_id,
    name: patient.name,
    firstName: nameParts[0] || patient.name || 'Patient',
    initials: (nameParts.map((p) => p[0]).join('').slice(0, 2) || 'P').toUpperCase(),
    uhid: patient.uhid || (patient.patient_id ? `FED-${patient.patient_id}` : 'UHID-882100'),
    hospitalName: (user && (user.hospitalName || user.orgName)) || 'City General Hospital',
    orgName: (user && user.orgName) || 'Federico Hospital',
    supportPhone: (user && user.phone) || '+91 1800-456-7890',
    age: computeAge(patient.dob),
    gender: patient.gender || 'Unknown',
    bloodGroup: patient.blood_group || 'NA',
    phone: patient.phone || '',
    altPhone: patient.alternate_phone || '',
    email: (user && user.email) || '',
    address: patient.address || '',
    dob: patient.dob || '',
    insurance: ins,
    insuranceRaw: insurance || null,
  };
}

/**
 * Merges confirmed appointments with intake pre-requests, de-duplicating on
 * appointment id so a pre-request that produced an appointment enriches that
 * row rather than adding a second one.
 *
 * DEFECT D5 is preserved by omission: no `doctorId` is emitted, which is why
 * the booking page's per-doctor slot filter never narrows anything.
 */
export function buildAppointments(preRequests = [], doctorsById = {}, rawAppointments = []) {
  const items = [];
  const seenMap = new Set();

  rawAppointments.forEach((apt) => {
    let date = '';
    let time = '--';
    if (apt.scheduled_datetime) {
      const parts = String(apt.scheduled_datetime).split('T');
      date = parts[0] || '';
      time = parts[1] ? parts[1].slice(0, 5) : '--';
    } else if (apt.appointment_date) {
      date = apt.appointment_date;
      time = apt.appointment_time || '--';
    } else if (apt.created_at) {
      date = String(apt.created_at).split('T')[0] || '';
    }

    const docId = apt.doctor_id || (apt.availability ? apt.availability.doctor_id : null);
    const doctor = docId ? doctorsById[docId] : null;
    const statusStr = String(apt.status || 'CONFIRMED').toUpperCase();
    let status = 'Confirmed';
    if (statusStr === 'SCHEDULED') status = 'Scheduled';
    else if (statusStr === 'COMPLETED') status = 'Completed';
    else if (statusStr === 'CANCELLED') status = 'Cancelled';
    else if (statusStr === 'PENDING') status = 'Pending';

    items.push({
      id: 'APT-' + apt.appointment_id,
      appointmentId: apt.appointment_id,
      doctorId: docId,
      date,
      displayDate: formatShortDate(date ? date + 'T00:00:00' : apt.created_at),
      time: formatTimeString(time),
      department: apt.department || (doctor ? doctor.specialization : 'General Medicine'),
      type: apt.visit_type || 'Consultation',
      status,
      rawStatus: apt.status,
      doctorName: doctor ? doctor.name : apt.doctor_name || '',
      rejectReason: '',
      homStatus: 'Confirmed Appointment',
      source: 'Hospital',
    });
    seenMap.add('APT-' + apt.appointment_id);
  });

  preRequests.forEach((pr) => {
    if (pr.appointment_id && seenMap.has('APT-' + pr.appointment_id)) {
      const existing = items.find((i) => i.id === 'APT-' + pr.appointment_id);
      if (existing) {
        if (pr.reject_reason) existing.rejectReason = pr.reject_reason;
        if (pr.hom_status) existing.homStatus = pr.hom_status;
        if (!existing.doctorName && pr.doctor_id && doctorsById[pr.doctor_id]) {
          existing.doctorName = doctorsById[pr.doctor_id].name;
        }
        if (!existing.doctorId && pr.doctor_id) {
          existing.doctorId = pr.doctor_id;
        }
      }
      return;
    }

    const date = pr.requested_date || (pr.created_at ? pr.created_at.split('T')[0] : '');
    const doctor = pr.doctor_id ? doctorsById[pr.doctor_id] : null;

    items.push({
      id: 'PRE-' + pr.pre_request_id,
      preRequestId: pr.pre_request_id,
      appointmentId: pr.appointment_id || null,
      doctorId: pr.doctor_id || null,
      date,
      displayDate: formatShortDate(date ? date + 'T00:00:00' : pr.created_at),
      time: formatTimeString(pr.requested_time || '10:00 AM'),
      department: pr.department || (doctor ? doctor.specialization : 'General Medicine'),
      type: pr.visit_type || 'Consultation',
      status: mapPreRequestStatus(pr.status),
      rawStatus: pr.status,
      doctorName: doctor ? doctor.name : '',
      rejectReason: pr.reject_reason || '',
      homStatus: pr.hom_status || '',
      source: 'Patient',
    });
  });

  return items.sort((a, b) => {
    const l = (a.date || '9999-99-99') + ' ' + (a.time || '99:99');
    const r = (b.date || '9999-99-99') + ' ' + (b.time || '99:99');
    return l.localeCompare(r);
  });
}

export function buildVisits(bundles, bedsById, preRequests) {
  const fromAdmissions = bundles.map(({ admission }) => {
    const bed = bedsById[admission.bed_id];
    const dateValue = admission.admit_time || Date.now();
    return {
      id: 'ADM-' + admission.admission_id,
      date: formatFullDate(dateValue),
      isoDate: toIsoDate(dateValue),
      department: bed ? bed.bed_number : 'Inpatient',
      description:
        'Admission' + (bed ? ' (' + bed.bed_number + ')' : '') +
        (admission.status === 'DISCHARGED' ? ' — Discharged' : ' — Active'),
    };
  });

  const fromPreRequests = preRequests
    .filter(
      (pr) =>
        ['ADMITTED', 'DISCHARGE_REQUESTED', 'CRITICAL'].includes(String(pr.status || '').toUpperCase()) ||
        pr.visit_type === 'Critical',
    )
    .map((pr) => ({
      id: 'PRE-' + pr.pre_request_id,
      date: formatFullDate(pr.decided_at || pr.created_at),
      isoDate: toIsoDate(pr.decided_at || pr.created_at),
      department: pr.department || 'Critical Care',
      description:
        pr.visit_type === 'Critical'
          ? 'Critical Care (' + (pr.department || 'Critical Care') + ') — ' + (pr.status === 'ADMITTED' ? 'In Care' : 'Triage Active')
          : ((pr.department || 'General') + ' ' + (pr.visit_type || '')).trim(),
    }));

  return [...fromAdmissions, ...fromPreRequests].sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''));
}

/**
 * Bills, receipts, discharge summaries and EOD statements.
 *
 * The visibility rule is load-bearing: a patient must never see a live OPEN
 * ledger the ward is still adding charges to. Only DISPATCHED or PAID ledgers
 * become bills.
 */
export function buildBillsAndDocuments(bundles, servicesById, receipts, dischargeSummaries, insurancePolicy) {
  const bills = [];
  const receiptDocs = [];
  const dischargeDocs = [];
  const eodDocs = [];
  const docIndex = {};

  bundles.forEach(({ admission, ledger, entries }) => {
    if (!ledger) return;
    if (!['DISPATCHED', 'PAID'].includes(ledger.status)) return;

    const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const serviceNames = entries.map((e) => (servicesById[e.service_id] || {}).service_name).filter(Boolean);
    const share = computePatientShare(total, insurancePolicy, serviceNames);

    const createdAt = new Date(ledger.dispatched_at || ledger.created_at).getTime();
    const dueAt = createdAt + 7 * 24 * 60 * 60 * 1000;
    const isPaid = ledger.status === 'PAID';
    const hasDischarge = dischargeSummaries.some((s) => s && s.admission_id === admission.admission_id);

    bills.push({
      id: 'LEDGER-' + ledger.ledger_id,
      billNo: '#' + ledger.ledger_id,
      date: formatFullDate(createdAt),
      department: 'Finance',
      description: 'Admission #' + admission.admission_id + ' billing',
      total,
      insuranceCovered: share.coveredAmount,
      youPay: share.patientShare,
      dueDate: formatFullDate(dueAt),
      dueDateISO: toIsoDate(dueAt),
      status: isPaid ? 'paid' : 'pending',
      disputed: false,
      ledgerId: ledger.ledger_id,
      admissionId: admission.admission_id,
      hasDischargeSummary: hasDischarge,
      items: entries.map((e) => ({
        name: (servicesById[e.service_id] || {}).service_name || 'Service',
        qty: e.quantity,
        unitPrice: e.unit_price,
        total: e.amount,
      })),
    });

    docIndex['EOD_BILL:' + ledger.ledger_id] = {
      patient_name: null, gross: total, coverage: share.coveredAmount,
      amount: share.patientShare, mode: null, status: ledger.status, ts: createdAt,
    };
    eodDocs.push({
      id: 'EOD-' + ledger.ledger_id, section: 'EOD Bills', type: 'EOD_BILL',
      title: 'EOD Statement #' + ledger.ledger_id, reference: 'patient-billing.html',
      createdAt, amount: share.patientShare, sourceType: 'EOD_BILL', sourceId: ledger.ledger_id,
    });
  });

  receipts.forEach((r) => {
    docIndex['RECEIPT:' + r.receipt_id] = {
      gross: r.amount, gross_amount: r.amount, coverage: 0, insurance_deduction: 0, amount: r.amount, mode: r.payment_mode, payment_mode: r.payment_mode,
      status: 'PAID', ts: new Date(r.generated_at).getTime(),
    };
    receiptDocs.push({
      id: 'RECEIPT-' + r.receipt_id, section: 'Receipts', type: 'RECEIPT',
      title: 'Receipt #' + r.receipt_id, reference: 'patient-billing.html',
      createdAt: new Date(r.generated_at).getTime(), amount: r.amount,
      sourceType: 'RECEIPT', sourceId: r.receipt_id,
    });
  });

  dischargeSummaries.forEach((summary) => {
    if (!summary) return;
    docIndex['DISCHARGE_SUMMARY:' + summary.summary_id] = {
      gross: summary.final_amount, coverage: 0, amount: summary.final_amount,
      mode: null, status: 'AVAILABLE', ts: new Date(summary.generated_at).getTime(),
    };
    dischargeDocs.push({
      id: 'DISCHARGE-' + summary.summary_id, section: 'Discharge Summary', type: 'DISCHARGE_SUMMARY',
      title: 'Discharge Summary', reference: 'patient-billing.html',
      createdAt: new Date(summary.generated_at).getTime(), amount: summary.final_amount,
      sourceType: 'DISCHARGE_SUMMARY', sourceId: summary.summary_id,
    });
  });

  const documents = [...receiptDocs, ...dischargeDocs, ...eodDocs].sort((a, b) => b.createdAt - a.createdAt);
  const billingSections = {
    receipts: receiptDocs.sort((a, b) => b.createdAt - a.createdAt),
    discharge: dischargeDocs.sort((a, b) => b.createdAt - a.createdAt),
    eod: eodDocs.sort((a, b) => b.createdAt - a.createdAt),
  };

  return {
    bills: bills.sort((a, b) => b.dueDateISO.localeCompare(a.dueDateISO)),
    documents,
    billingSections,
    docIndex,
  };
}

export function buildNotifications(preRequests) {
  return preRequests
    .filter((pr) => ['APPROVED', 'REJECTED', 'ADMITTED', 'CRITICAL'].includes(String(pr.status || '').toUpperCase()))
    .map((pr) => {
      let title = 'Pre-registration update';
      let message = (pr.department || 'General') + ' request status: ' + pr.status + '.';
      let variant = 'info';

      if (pr.status === 'REJECTED') {
        title = 'Request rejected by PRE';
        message = pr.reject_reason
          ? 'Your ' + (pr.department || 'appointment') + ' request was rejected. Reason: ' + pr.reject_reason
          : 'Your ' + (pr.department || 'appointment') + ' request was rejected.';
        variant = 'danger';
      } else if (pr.status === 'APPROVED') {
        title = 'Request approved by PRE';
        message = 'Your ' + (pr.department || 'appointment') + ' request has been approved.';
        variant = 'success';
      } else if (pr.status === 'ADMITTED') {
        title = 'You have been admitted';
        message = 'Admission confirmed for ' + (pr.department || 'your visit') + '.';
        variant = 'success';
      } else if (pr.status === 'CRITICAL') {
        title = 'Critical care intake logged';
        message = 'Our team has logged a critical care admission for you.';
        variant = 'warning';
      }

      return { id: pr.pre_request_id, title, message, status: pr.status, variant, createdAt: new Date(pr.updated_at).getTime() };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function indexBy(arr, key) {
  const out = {};
  (arr || []).forEach((item) => {
    out[item[key]] = item;
  });
  return out;
}

