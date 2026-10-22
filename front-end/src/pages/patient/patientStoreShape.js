'use strict';

import { computePatientShare } from '../../lib/insurance.js';

/**
 * Pure data transformation helpers to convert backend models into
 * the view models consumed across the patient portal pages.
 */

export function formatDDMMYYYY(value) {
  if (!value || value === '--' || value === '—') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date(String(value).replace(/-/g, '/'));
    if (!Number.isNaN(fallback.getTime())) {
      const dd = String(fallback.getDate()).padStart(2, '0');
      const mm = String(fallback.getMonth() + 1).padStart(2, '0');
      const yyyy = fallback.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return String(value);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatShortDate(value) {
  return formatDDMMYYYY(value);
}

export function formatFullDate(value) {
  return formatDDMMYYYY(value);
}

export function formatINR(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
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

export function parseTimeToMinutes(timeStr) {
  if (!timeStr || timeStr === '--') return 0;
  const clean = String(timeStr).trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timePart = clean.replace(/[AP]M/g, '').trim();
  const parts = timePart.split(':');
  if (parts.length < 2) return 0;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (Number.isNaN(h)) return 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
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

export function buildProfile(patient = {}, user = {}, insurance = null) {
  const firstName =
    patient.firstName ||
    patient.first_name ||
    (patient.name ? patient.name.split(/\s+/)[0] : '') ||
    'Patient';
  const lastName =
    patient.lastName ||
    patient.last_name ||
    (patient.name ? patient.name.split(/\s+/).slice(1).join(' ') : '');
  const fullName =
    [firstName, lastName].filter((s) => s && s !== 'Patient').join(' ') || patient.name || firstName;
  const initials = ([firstName[0], lastName[0]].filter(Boolean).join('') || 'P').toUpperCase();

  const hasPolicy = Boolean(
    insurance &&
      (insurance.policy_number || insurance.provider_name) &&
      insurance.provider_name !== 'Self Pay',
  );

  const ins = {
    hasInsurance: hasPolicy,
    verified: Boolean(insurance && insurance.coverage_limit),
    provider: insurance?.provider_name || 'Self Pay',
    policyNumber: insurance?.policy_number || '',
    memberId: insurance?.member_id || '',
    coverage: Number(insurance?.coverage_limit || 0),
    copayPercentage: Number(insurance?.copay_percentage || 0),
    validFrom: insurance?.valid_from || '',
    validTo: insurance?.valid_to || insurance?.valid_till || '',
    coverageType: insurance?.coverage_type || 'Self',
    cardFrontUrl: insurance?.card_front_url || '',
    cardBackUrl: insurance?.card_back_url || '',
  };

  return {
    id: patient.patient_id,
    patientId: patient.patient_id,
    name: fullName,
    firstName,
    lastName,
    initials,
    uhid: patient.uhid || (patient.patient_id ? `FED-${patient.patient_id}` : 'UHID-882100'),
    hospitalName: user.hospitalName || user.orgName || 'City General Hospital',
    orgName: user.orgName || 'Federico Hospital',
    supportPhone: user.phone || '+91 1800-456-7890',
    age: computeAge(patient.dob),
    gender: patient.gender && patient.gender !== 'Unknown' ? patient.gender : '',
    bloodGroup: patient.blood_group && patient.blood_group !== 'NA' ? patient.blood_group : '',
    phone: patient.phone || user.phone || '',
    altPhone: patient.alternate_phone || patient.emergency_contact_phone || '',
    emergencyContactPhone: patient.emergency_contact_phone || '',
    email: patient.email || user.email || '',
    address: patient.address || '',
    dob: patient.dob || '',
    insurance: ins,
    insuranceRaw: insurance || null,
  };
}

function formatAppointmentDate(date, fallback) {
  if (!date && !fallback) return '—';
  const val = date || fallback;
  return formatShortDate(String(val).includes('T') ? val : `${val}T00:00:00`);
}

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
      displayDate: formatAppointmentDate(date, apt.created_at),
      time: formatTimeString(time),
      department: apt.department || (doctor ? (doctor.department || doctor.specialization) : 'General Medicine'),
      type: apt.visit_type || 'Consultation',
      status,
      rawStatus: apt.status,
      doctorName: doctor ? doctor.name : apt.doctor_name || '',
      rejectReason: '',
      homStatus: 'Confirmed Appointment',
      source: 'Hospital',
      note: apt.note || '',
      document_urls: Array.isArray(apt.document_urls) ? apt.document_urls : [],
    });
    seenMap.add('APT-' + apt.appointment_id);
  });

  preRequests.forEach((pr) => {
    if (pr.appointment_id && seenMap.has('APT-' + pr.appointment_id)) {
      const existing = items.find((i) => i.id === 'APT-' + pr.appointment_id);
      if (existing) {
        if (pr.reject_reason) existing.rejectReason = pr.reject_reason;
        if (pr.hom_status) existing.homStatus = pr.hom_status;
        if (pr.note) existing.note = pr.note;
        if (Array.isArray(pr.document_urls) && pr.document_urls.length) {
          existing.document_urls = pr.document_urls;
        }
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
      displayDate: formatAppointmentDate(date, pr.created_at),
      time: formatTimeString(pr.requested_time || '10:00 AM'),
      department: pr.department || (doctor ? doctor.specialization : 'General Medicine'),
      type: pr.visit_type || 'Consultation',
      status: mapPreRequestStatus(pr.status),
      rawStatus: pr.status,
      doctorName: doctor ? doctor.name : '',
      rejectReason: pr.reject_reason || '',
      homStatus: pr.hom_status || '',
      source: 'Patient',
      note: pr.note || '',
      document_urls: Array.isArray(pr.document_urls) ? pr.document_urls : [],
    });
  });

  return items.sort((a, b) => {
    const lDate = a.date || '9999-99-99';
    const rDate = b.date || '9999-99-99';
    const dateComp = lDate.localeCompare(rDate);
    if (dateComp !== 0) return dateComp;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });
}

export function buildVisits(bundles = [], bedsById = {}, preRequests = []) {
  const bundleList = Array.isArray(bundles) ? bundles : [];
  const bById = bedsById || {};
  const fromAdmissions = bundleList
    .filter((b) => b && b.admission)
    .map(({ admission }) => {
      const bed = bById[admission.bed_id];
      const dateValue = admission.admit_time || Date.now();
      return {
        id: 'ADM-' + admission.admission_id,
        date: formatFullDate(dateValue),
        isoDate: toIsoDate(dateValue),
        department: bed ? (bed.ward_name || bed.bed_number) : 'Inpatient',
        description:
          'Admission' + (bed ? ' (' + bed.bed_number + ')' : '') +
          (admission.status === 'DISCHARGED' ? ' — Discharged' : ' — Active'),
      };
    });

  const prList = Array.isArray(preRequests) ? preRequests : [];
  const fromPreRequests = prList
    .filter(
      (pr) =>
        pr &&
        (['ADMITTED', 'DISCHARGE_REQUESTED', 'CRITICAL'].includes(String(pr.status || '').toUpperCase()) ||
          pr.visit_type === 'Critical'),
    )
    .map((pr) => ({
      id: 'PRE-' + pr.pre_request_id,
      date: formatFullDate(pr.decided_at || pr.created_at || Date.now()),
      isoDate: toIsoDate(pr.decided_at || pr.created_at || Date.now()),
      department: pr.department || 'Critical Care',
      description:
        pr.visit_type === 'Critical'
          ? 'Critical Care (' + (pr.department || 'Critical Care') + ') — ' + (pr.status === 'ADMITTED' ? 'In Care' : 'Triage Active')
          : ((pr.department || 'General') + ' ' + (pr.visit_type || '')).trim(),
    }));

  return [...fromAdmissions, ...fromPreRequests].sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''));
}

export function buildBillsAndDocuments(bundles = [], servicesById = {}, receipts = [], dischargeSummaries = [], insurancePolicy = null) {
  const bills = [];
  const receiptDocs = [];
  const dischargeDocs = [];
  const eodDocs = [];
  const docIndex = {};

  const bList = Array.isArray(bundles) ? bundles : [];
  const sById = servicesById || {};
  const rList = Array.isArray(receipts) ? receipts : [];
  const dList = Array.isArray(dischargeSummaries) ? dischargeSummaries : [];

  bList.forEach(({ admission, ledger, entries }) => {
    if (!ledger || !admission) return;
    if (!['DISPATCHED', 'PAID'].includes(ledger.status)) return;

    const safeEntries = Array.isArray(entries) ? entries : [];
    const total = safeEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const serviceNames = safeEntries.map((e) => (sById[e.service_id] || {}).service_name).filter(Boolean);
    const share = computePatientShare(total, insurancePolicy, serviceNames);

    const createdAt = new Date(ledger.dispatched_at || ledger.created_at || Date.now()).getTime() || Date.now();
    const dueAt = createdAt + 7 * 24 * 60 * 60 * 1000;
    const isPaid = ledger.status === 'PAID';
    const hasDischarge = dList.some((s) => s && s.admission_id === admission.admission_id);

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
      isInterim: !hasDischarge,
      billType: hasDischarge ? 'Final Invoice' : 'Interim Statement',
      items: safeEntries.map((e) => ({
        name: (sById[e.service_id] || {}).service_name || 'Service',
        qty: e.quantity,
        unitPrice: e.unit_price,
        total: e.amount,
      })),
    });

    docIndex['EOD_BILL:' + ledger.ledger_id] = {
      patient_name: null,
      gross: total,
      gross_amount: total,
      coverage: share.coveredAmount,
      insurance_deduction: share.coveredAmount,
      amount: share.patientShare,
      mode: null,
      status: ledger.status,
      ts: createdAt,
      sourceId: ledger.ledger_id,
      patient_id: admission.patient_id,
    };
    eodDocs.push({
      id: 'EOD-' + ledger.ledger_id,
      section: 'EOD Bills',
      type: 'EOD_BILL',
      title: 'EOD Statement #' + ledger.ledger_id,
      reference: 'patient-billing.html',
      createdAt,
      amount: share.patientShare,
      sourceType: 'EOD_BILL',
      sourceId: ledger.ledger_id,
    });
  });

  rList.forEach((r) => {
    if (!r) return;
    const ts = new Date(r.generated_at || r.created_at || Date.now()).getTime() || Date.now();
    if (r.receipt_id != null) {
      docIndex['RECEIPT:' + r.receipt_id] = {
        gross: r.amount,
        gross_amount: r.amount,
        coverage: 0,
        insurance_deduction: 0,
        amount: r.amount,
        mode: r.payment_mode,
        payment_mode: r.payment_mode,
        status: 'PAID',
        ts,
        sourceId: r.receipt_id,
        patient_id: r.patient_id,
      };
      receiptDocs.push({
        id: 'RECEIPT-' + r.receipt_id,
        section: 'Receipts',
        type: 'RECEIPT',
        title: 'Receipt #' + r.receipt_id,
        reference: 'patient-billing.html',
        createdAt: ts,
        amount: r.amount,
        sourceType: 'RECEIPT',
        sourceId: r.receipt_id,
      });
    }
  });

  dList.forEach((summary) => {
    if (!summary) return;
    const gross =
      Number(summary.gross_amount) ||
      (Number(summary.final_amount) || 0) + (Number(summary.insurance_deduction) || 0);
    const coverage = Number(summary.insurance_deduction) || 0;
    const amount = Number(summary.final_amount) || gross - coverage;
    const ts = new Date(summary.generated_at || summary.created_at || Date.now()).getTime() || Date.now();

    if (summary.summary_id != null) {
      docIndex['DISCHARGE_SUMMARY:' + summary.summary_id] = {
        gross,
        gross_amount: gross,
        coverage,
        insurance_deduction: coverage,
        amount,
        mode: null,
        status: 'AVAILABLE',
        ts,
        sourceId: summary.summary_id,
        patient_id: summary.patient_id,
      };
      dischargeDocs.push({
        id: 'DISCHARGE-' + summary.summary_id,
        section: 'Discharge Summary',
        type: 'DISCHARGE_SUMMARY',
        title: 'Discharge Summary',
        reference: 'patient-billing.html',
        createdAt: ts,
        amount,
        sourceType: 'DISCHARGE_SUMMARY',
        sourceId: summary.summary_id,
      });
    }
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

const NOTIFICATION_MAP = {
  REJECTED: (pr) => ({
    title: 'Request rejected by PRE',
    message: pr.reject_reason
      ? `Your ${pr.department || 'appointment'} request was rejected. Reason: ${pr.reject_reason}`
      : `Your ${pr.department || 'appointment'} request was rejected.`,
    variant: 'danger',
  }),
  APPROVED: (pr) => ({
    title: 'Request approved by PRE',
    message: `Your ${pr.department || 'appointment'} request has been approved.`,
    variant: 'success',
  }),
  ADMITTED: (pr) => ({
    title: 'You have been admitted',
    message: `Admission confirmed for ${pr.department || 'your visit'}.`,
    variant: 'success',
  }),
  CRITICAL: () => ({
    title: 'Critical care intake logged',
    message: 'Our team has logged a critical care admission for you.',
    variant: 'warning',
  }),
};

export function buildNotifications(preRequests = []) {
  const prList = Array.isArray(preRequests) ? preRequests : [];
  return prList
    .filter((pr) => pr && NOTIFICATION_MAP[String(pr.status || '').toUpperCase()])
    .map((pr) => {
      const statusKey = String(pr.status || '').toUpperCase();
      const meta = NOTIFICATION_MAP[statusKey](pr);
      const timeVal = pr.updated_at || pr.created_at || Date.now();
      return {
        id: pr.pre_request_id,
        ...meta,
        status: pr.status,
        createdAt: new Date(timeVal).getTime() || Date.now(),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function indexBy(arr = [], key) {
  const out = {};
  for (const item of arr) {
    if (item && item[key] !== undefined) {
      out[item[key]] = item;
    }
  }
  return out;
}

export function buildPatientDocuments(source = {}, _session = {}) {
  const bundles = Array.isArray(source.bundles) ? source.bundles : [];
  const preRequests = Array.isArray(source.preRequests) ? source.preRequests : [];
  const rawAppointments = Array.isArray(source.appointments) ? source.appointments : [];
  const bedsById = indexBy(source.beds || [], 'bed_id');
  const doctorsById = indexBy(source.doctors || [], 'doctor_id');
  const insurance = source.insurance || null;

  // 1. Discharge Clearance Summaries
  const allDischarge = [
    ...(source.dischargeSummaries || []),
    ...bundles.map((b) => b?.dischargeSummary).filter(Boolean),
  ];
  const seenSummaryIds = new Set();
  const dischargeSummaries = [];
  allDischarge.forEach((ds) => {
    if (!ds || !ds.summary_id || seenSummaryIds.has(ds.summary_id)) return;
    seenSummaryIds.add(ds.summary_id);

    const admission = bundles.find((b) => b?.admission?.admission_id === ds.admission_id)?.admission || null;
    const bed = admission && bedsById[admission.bed_id] ? bedsById[admission.bed_id] : null;
    const ts = new Date(ds.generated_at || ds.created_at || Date.now()).getTime() || Date.now();

    dischargeSummaries.push({
      id: 'DISCHARGE-' + ds.summary_id,
      summaryId: ds.summary_id,
      admissionId: ds.admission_id,
      type: 'DISCHARGE_SUMMARY',
      title: 'Discharge Clearance #' + ds.summary_id,
      department: bed?.ward_name || 'Inpatient Ward',
      date: formatShortDate(ts),
      createdAt: ts,
      notes: ds.discharge_notes || 'Patient treated and stabilized; fit for discharge.',
      grossAmount: Number(ds.gross_amount || 0),
      insuranceDeduction: Number(ds.insurance_deduction || 0),
      finalAmount: Number(ds.final_amount || 0),
      wardName: bed?.ward_name || 'General Ward',
      bedNumber: bed?.bed_number || 'Bed ' + (admission?.bed_id || '-'),
      admitDate: admission?.admit_time ? formatShortDate(admission.admit_time) : '—',
      dischargeDate: formatShortDate(ts),
      status: 'Clearance Issued',
      badgeClass: 'badge-discharge',
    });
  });

  // 2. Uploaded Records (Patient-Uploaded files during appointment booking in PRE)
  const uploadedRecords = [];
  const seenUrls = new Set();
  const allSources = [...preRequests, ...rawAppointments];

  allSources.forEach((item) => {
    const urls = Array.isArray(item.document_urls) ? item.document_urls : [];
    const dept = item.department || 'General Medicine';
    const rawDate = item.created_at || item.requested_date || item.scheduled_datetime || Date.now();
    const ts = new Date(rawDate).getTime() || Date.now();

    urls.forEach((url) => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);

      let cleanName = 'Uploaded Document';
      try {
        const parts = String(url).split('/');
        const last = parts[parts.length - 1];
        cleanName = decodeURIComponent(last.split('?')[0]) || 'Uploaded Document';
      } catch {
        cleanName = 'Uploaded Document #' + (uploadedRecords.length + 1);
      }

      uploadedRecords.push({
        id: 'UPLOAD-' + (uploadedRecords.length + 1),
        type: 'UPLOADED_RECORD',
        title: cleanName,
        fileUrl: url,
        department: dept,
        date: formatShortDate(ts),
        createdAt: ts,
        status: 'Patient Upload',
        badgeClass: 'badge-uploaded',
      });
    });
  });

  // 3. Inpatient Admission Certificates
  const admissionCertificates = [];
  bundles.forEach(({ admission }) => {
    if (!admission || !admission.admission_id) return;
    const bed = bedsById[admission.bed_id] || null;
    const admitTs = new Date(admission.admit_time || Date.now()).getTime() || Date.now();
    const isDischarged = admission.status === 'DISCHARGED';

    admissionCertificates.push({
      id: 'ADM-CERT-' + admission.admission_id,
      admissionId: admission.admission_id,
      type: 'ADMISSION_CERTIFICATE',
      title: 'Admission Certificate #' + admission.admission_id,
      department: bed?.ward_name || 'Inpatient Care',
      date: formatShortDate(admitTs),
      createdAt: admitTs,
      wardName: bed?.ward_name || 'General Ward',
      bedNumber: bed?.bed_number || 'Bed ' + admission.bed_id,
      admitDate: formatShortDate(admission.admit_time),
      dischargeDate: admission.discharge_time
        ? formatShortDate(admission.discharge_time)
        : isDischarged
          ? 'Discharged'
          : 'Active Stay',
      status: isDischarged ? 'Stay Completed' : 'Currently Admitted',
      badgeClass: 'badge-admission',
      rawStatus: admission.status,
    });
  });

  // 4. Outpatient Consultation / Appointment Slips
  const appointmentSlips = [];
  rawAppointments.forEach((apt) => {
    if (!apt || !apt.appointment_id) return;
    const docId = apt.doctor_id || (apt.availability ? apt.availability.doctor_id : null);
    const doctor = docId ? doctorsById[docId] : null;
    const rawDate = apt.scheduled_datetime || apt.appointment_date || apt.created_at || Date.now();
    const ts = new Date(rawDate).getTime() || Date.now();

    appointmentSlips.push({
      id: 'APT-SLIP-' + apt.appointment_id,
      appointmentId: apt.appointment_id,
      type: 'APPOINTMENT_SLIP',
      title: 'Consultation Slip #' + apt.appointment_id,
      department: apt.department || (doctor ? doctor.specialization : 'General Medicine'),
      date: formatShortDate(ts),
      createdAt: ts,
      doctorName: doctor ? doctor.name : apt.doctor_name || 'Duty Doctor',
      scheduledDate: formatAppointmentDate(
        apt.scheduled_datetime ? String(apt.scheduled_datetime).split('T')[0] : apt.appointment_date,
        apt.created_at,
      ),
      scheduledTime: formatTimeString(
        apt.scheduled_datetime
          ? String(apt.scheduled_datetime).split('T')[1]
          : apt.appointment_time || '10:00 AM',
      ),
      visitType: apt.visit_type || 'Consultation',
      notes: apt.note || '',
      status: 'Confirmed Consultation',
      badgeClass: 'badge-appointment',
    });
  });

  // 5. Insurance Cards
  const insuranceCards = [];
  if (insurance && (insurance.provider_name || insurance.policy_number)) {
    const ts = new Date(insurance.created_at || Date.now()).getTime() || Date.now();
    const isSelfPay = insurance.provider_name === 'Self Pay' || !insurance.policy_number;

    insuranceCards.push({
      id: 'INS-CARD-' + (insurance.insurance_id || '1'),
      type: 'INSURANCE_CARD',
      title: (insurance.provider_name || 'Health Insurance') + ' e-Card',
      department: 'Health Insurance',
      date: formatShortDate(insurance.valid_from || ts),
      createdAt: ts,
      provider: insurance.provider_name || 'Self Pay',
      policyNumber: insurance.policy_number || 'N/A',
      memberId: insurance.member_id || 'N/A',
      coverage: Number(insurance.coverage_limit || 0),
      copayPercentage: Number(insurance.copay_percentage || 0),
      validTo: insurance.valid_to || insurance.valid_till || 'N/A',
      cardFrontUrl: insurance.card_front_url || null,
      cardBackUrl: insurance.card_back_url || null,
      status: isSelfPay ? 'Self Pay' : 'Verified Policy',
      badgeClass: 'badge-insurance',
    });
  }

  // Combined All Documents List
  const all = [
    ...dischargeSummaries,
    ...uploadedRecords,
    ...admissionCertificates,
    ...appointmentSlips,
    ...insuranceCards,
  ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return {
    all,
    discharge: dischargeSummaries.sort((a, b) => b.createdAt - a.createdAt),
    uploaded: uploadedRecords.sort((a, b) => b.createdAt - a.createdAt),
    admissions: admissionCertificates.sort((a, b) => b.createdAt - a.createdAt),
    appointments: appointmentSlips.sort((a, b) => b.createdAt - a.createdAt),
    insurance: insuranceCards,
  };
}

export function shapePatientStoreData(source, session) {
  const src = source || {};
  const insurance = src.insurance || null;
  const bundles = src.bundles || [];
  const preRequests = src.preRequests || [];
  const doctorsById = indexBy(src.doctors || [], 'doctor_id');
  const bedsById = indexBy(src.beds || [], 'bed_id');
  const servicesById = indexBy(src.services || [], 'service_id');
  const allDischargeSummaries = [
    ...(src.dischargeSummaries || []),
    ...bundles.map((b) => b?.dischargeSummary).filter(Boolean),
  ];
  const seenSummaryIds = new Set();
  const dischargeSummaries = allDischargeSummaries.filter((ds) => {
    if (!ds || !ds.summary_id) return Boolean(ds);
    if (seenSummaryIds.has(ds.summary_id)) return false;
    seenSummaryIds.add(ds.summary_id);
    return true;
  });

  const { bills, documents, billingSections, docIndex } = buildBillsAndDocuments(
    bundles,
    servicesById,
    src.receipts || [],
    dischargeSummaries,
    insurance,
  );

  const patientDocuments = buildPatientDocuments(src, session);
  const specialties = src.specialties || session?.tenant?.specialties || [];

  return {
    patient: buildProfile(
      src.patient || {},
      {
        email: session?.email,
        orgName: session?.orgName || session?.tenant?.name,
        hospitalName: session?.tenant?.name || session?.orgName,
        ...(src.user || {}),
      },
      insurance,
    ),
    appointments: buildAppointments(preRequests, doctorsById, src.appointments || []),
    visits: buildVisits(bundles, bedsById, preRequests),
    bills,
    documents,
    patientDocuments,
    billingSections,
    docIndex,
    notifications: buildNotifications(preRequests),
    specialties,
    raw: {
      bundles,
      preRequests,
      doctorsById,
      bedsById,
      servicesById,
      insurance,
      appointments: src.appointments || [],
      specialties,
    },
  };
}
