'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import {
  buildProfile, buildAppointments, buildVisits, buildBillsAndDocuments, buildNotifications, indexBy,
} from './patientStoreShape.js';
import { PatientStoreContext } from './usePatientStore.js';

const EMPTY = {
  patient: null,
  appointments: [],
  visits: [],
  bills: [],
  documents: [],
  billingSections: { receipts: [], discharge: [], eod: [] },
  notifications: [],
  docIndex: {},
  raw: null,
};

/**
 * Replaces Patient/js/patient-store.js - a mutable module singleton (AppStore)
 * plus an onStoreReady callback queue and a `patientStoreUpdated` window event.
 *
 * All four Patient pages read this. The writers (addAppointment, updateProfile,
 * updateInsurance, payBill, cancelAppointment) each refresh afterwards, exactly
 * as the original did.
 */
export function PatientStoreProvider({ children }) {
  const { session } = useSession();
  const patientId = session?.patientId;

  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!patientId) return;

    let shaped;
    try {
      const summary = await api.patients.portalSummary(patientId);
      const insurance = summary.insurance;
      const bundles = summary.bundles || [];
      const preRequests = summary.preRequests || [];
      const doctorsById = indexBy(summary.doctors || [], 'doctor_id');
      const bedsById = indexBy(summary.beds || [], 'bed_id');
      const servicesById = indexBy(summary.services || [], 'service_id');
      const dischargeSummaries = bundles.map((b) => b.dischargeSummary).filter(Boolean);

      const { bills, documents, billingSections, docIndex } = buildBillsAndDocuments(
        bundles, servicesById, summary.receipts || [], dischargeSummaries, insurance,
      );

      shaped = {
        patient: buildProfile(
          summary.patient,
          {
            email: session?.email,
            orgName: session?.orgName,
            hospitalName: session?.tenant?.name || session?.orgName,
          },
          insurance,
        ),
        appointments: buildAppointments(preRequests, doctorsById, summary.appointments || []),
        visits: buildVisits(bundles, bedsById, preRequests),
        bills, documents, billingSections, docIndex,
        notifications: buildNotifications(preRequests),
        specialties: summary.specialties || session?.tenant?.specialties || [],
        raw: { bundles, preRequests, doctorsById, bedsById, servicesById, insurance, appointments: summary.appointments || [], specialties: summary.specialties || session?.tenant?.specialties || [] },
      };
    } catch (err) {
      // Fallback path, ported verbatim: assemble the same shape from the
      // individual endpoints when the composite summary is unavailable.
      console.warn('[PatientStore] Failed to load portal summary, attempting individual fetch fallback:', err);

      const [me, insuranceList, bundles, receipts, doctors, beds, services] = await Promise.all([
        api.auth.me().catch(() => ({ patient: null, user: null })),
        api.patients.insuranceForPatient(patientId).catch(() => []),
        api.billing.patient.bills(patientId).catch(() => []),
        api.billing.patient.receipts(patientId).catch(() => []),
        api.doctors.list().catch(() => []),
        api.wards.beds().catch(() => []),
        api.billing.services.list().catch(() => []),
      ]);

      const preRequests = (await api.preRequests.list().catch(() => [])).filter((pr) => pr.patient_id === patientId);
      const dischargeSummaries = await Promise.all(
        bundles.map(({ admission }) => api.billing.dischargeSummary.getByAdmission(admission.admission_id).catch(() => null)),
      );

      const doctorsById = indexBy(doctors, 'doctor_id');
      const bedsById = indexBy(beds, 'bed_id');
      const servicesById = indexBy(services, 'service_id');
      // createInsurance appends rather than updating in place, so the newest
      // row wins - same rule the backend controller applies.
      const insurance = insuranceList && insuranceList.length
        ? insuranceList.reduce((latest, ins) => (ins.insurance_id > latest.insurance_id ? ins : latest))
        : null;

      const { bills, documents, billingSections, docIndex } = buildBillsAndDocuments(
        bundles, servicesById, receipts, dischargeSummaries, insurance,
      );

      shaped = {
        patient: buildProfile(
          me.patient || {},
          {
            ...(me.user || {}),
            orgName: session?.orgName || me.tenant?.name,
            hospitalName: session?.tenant?.name || session?.orgName || me.tenant?.name,
          },
          insurance,
        ),
        appointments: buildAppointments(preRequests, doctorsById, []),
        visits: buildVisits(bundles, bedsById, preRequests),
        bills, documents, billingSections, docIndex,
        notifications: buildNotifications(preRequests),
        specialties: session?.tenant?.specialties || [],
        raw: { bundles, preRequests, doctorsById, bedsById, servicesById, insurance, specialties: session?.tenant?.specialties || [] },
      };
    }

    setState(shaped);
  }, [patientId, session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        console.error('[PatientStore] Failed to load patient data:', err);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const addAppointment = useCallback(async (data) => {
    if (!state.patient) return null;
    const payload = {
      patient_id: state.patient.patientId,
      department: data.department,
      visit_type: ['Admit', 'Critical', 'Consultation'].includes(data.type) ? data.type : 'Consultation',
      requested_date: data.date || undefined,
      requested_time: data.time || undefined,
    };
    if (data.doctorId) payload.doctor_id = Number(data.doctorId);
    if (data.note) payload.note = data.note;
    if (Array.isArray(data.documents) && data.documents.length) payload.document_urls = data.documents;

    const result = await api.preRequests.create(payload);
    await refresh();
    return result.pre_request_id;
  }, [state.patient, refresh]);

  const cancelAppointment = useCallback(async (id) => {
    await api.preRequests.update(id, { status: 'REJECTED', reject_reason: 'Cancelled by patient' });
    await refresh();
    return true;
  }, [refresh]);

  const updateProfile = useCallback(async (fields) => {
    if (!state.patient) return false;
    const patch = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.dob !== undefined) patch.dob = fields.dob;
    if (fields.gender !== undefined) patch.gender = fields.gender;
    if (fields.bloodGroup !== undefined) patch.blood_group = fields.bloodGroup;
    if (fields.phone !== undefined) patch.phone = fields.phone;
    if (fields.altPhone !== undefined) patch.alternate_phone = fields.altPhone;
    if (fields.address !== undefined) patch.address = fields.address;

    await api.patients.update(state.patient.patientId, patch);
    await refresh();
    return true;
  }, [state.patient, refresh]);

  const updateInsurance = useCallback(async (fields) => {
    if (!state.patient) return false;
    const existing = state.patient.insurance || {};
    await api.patients.createInsurance({
      patient_id: state.patient.patientId,
      provider_name: fields.provider || 'Self Pay',
      policy_number: fields.policyNumber || 'POL-' + state.patient.uhid,
      member_id: fields.memberId || 'MEM-' + state.patient.patientId,
      coverage_type: fields.coverageType || 'Individual',
      valid_from: fields.validFrom || new Date().toISOString().split('T')[0],
      valid_to: fields.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      coverage_limit: fields.coverage || 0,
      copay_percentage:
        fields.copayPercentage !== undefined
          ? Number(fields.copayPercentage)
          : existing.copayPercentage !== undefined
            ? Number(existing.copayPercentage)
            : 0,
      // Whatever the patient already uploaded survives a save that does not
      // explicitly replace it.
      card_front_url: fields.cardFrontUrl !== undefined ? fields.cardFrontUrl : existing.cardFrontUrl || null,
      card_back_url: fields.cardBackUrl !== undefined ? fields.cardBackUrl : existing.cardBackUrl || null,
    });
    await refresh();
    return true;
  }, [state.patient, refresh]);

  const payBill = useCallback(async (bill, paymentMode) => {
    if (!bill || !bill.ledgerId || bill.status === 'paid') return false;
    await api.billing.payments.create({
      ledger_id: bill.ledgerId,
      amount_paid: bill.youPay,
      payment_mode: paymentMode || 'UPI',
    });
    await refresh();
    return true;
  }, [refresh]);

  const value = useMemo(() => ({
    loaded,
    profile: state.patient,
    bills: state.bills,
    appointments: state.appointments,
    visits: state.visits,
    documents: state.documents,
    billingSections: state.billingSections,
    notifications: state.notifications,
    specialties: state.specialties || session?.tenant?.specialties || [],
    raw: state.raw,
    doctors: state.raw ? Object.values(state.raw.doctorsById) : [],
    upcomingAppointments: state.appointments
      .filter((a) => !['Cancelled', 'Completed'].includes(a.status))
      .sort((l, r) => (l.date || '').localeCompare(r.date || '')),
    totalOutstanding: state.bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + b.youPay, 0),
    getBillingDocumentByRef: (sourceType, sourceId) => state.docIndex[sourceType + ':' + sourceId] || null,
    refresh,
    addAppointment,
    cancelAppointment,
    updateProfile,
    updateInsurance,
    payBill,
  }), [loaded, state, session, refresh, addAppointment, cancelAppointment, updateProfile, updateInsurance, payBill]);

  return <PatientStoreContext.Provider value={value}>{children}</PatientStoreContext.Provider>;
}

