'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import {
  shapePatientStoreData,
} from './patientStoreShape.js';
import { getUpcomingAppointments } from './patientDashboardUtils.js';
import { PatientStoreContext } from './usePatientStore.js';

const EMPTY = {
  patient: null,
  appointments: [],
  visits: [],
  bills: [],
  documents: [],
  patientDocuments: { all: [], discharge: [], uploaded: [], admissions: [], appointments: [], insurance: [] },
  billingSections: { receipts: [], discharge: [], eod: [] },
  notifications: [],
  docIndex: {},
  raw: null,
};

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
      shaped = shapePatientStoreData(summary, session);
    } catch (err) {
      console.warn('[PatientStore] Portal summary unavailable, falling back to individual calls:', err);

      const [me, insuranceList, bundles, receipts, doctors, beds, services] = await Promise.all([
        api.auth.me().catch(() => ({ patient: null, user: null })),
        api.patients.insuranceForPatient(patientId).catch(() => []),
        api.billing.patient.bills(patientId).catch(() => []),
        api.billing.patient.receipts(patientId).catch(() => []),
        api.doctors.list().catch(() => []),
        api.wards.beds().catch(() => []),
        api.billing.services.list().catch(() => []),
      ]);

      const [preRequests, apts] = await Promise.all([
        api.preRequests.list().catch(() => []),
        api.appointments.list().catch(() => []),
      ]);
      const patientPreRequests = preRequests.filter((pr) => pr.patient_id === patientId);
      const patientAppointments = apts.filter((a) => a.patient_id === patientId);
      const patientRecord = me.patient || (await api.patients.get(patientId).catch(() => null));
      const dischargeSummaries = await Promise.all(
        bundles
          .filter((b) => b && b.admission && b.admission.admission_id)
          .map(({ admission }) =>
            api.billing.dischargeSummary.getByAdmission(admission.admission_id).catch(() => null),
          ),
      );

      const latestInsurance =
        insuranceList && insuranceList.length
          ? insuranceList.reduce((latest, ins) => (ins && (!latest || ins.insurance_id > latest.insurance_id) ? ins : latest), null)
          : null;

      shaped = shapePatientStoreData(
        {
          patient: patientRecord,
          user: me.user,
          insurance: latestInsurance,
          bundles,
          receipts,
          doctors,
          beds,
          services,
          preRequests: patientPreRequests,
          dischargeSummaries,
          appointments: patientAppointments,
        },
        session,
      );
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
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const addAppointment = useCallback(
    async (data) => {
      const pid = state.patient?.patientId || session?.patientId;
      if (!pid) return null;
      const cleanNote = String(data.note || '').trim();
      const payload = {
        patient_id: Number(pid),
        doctor_id: data.doctorId ? Number(data.doctorId) : null,
        department: String(data.department || 'General Medicine').trim(),
        visit_type: ['Admit', 'Critical', 'Consultation'].includes(data.type) ? data.type : 'Consultation',
        requested_date: data.date ? String(data.date).trim() : undefined,
        requested_time: data.time ? String(data.time).trim() : undefined,
        note: cleanNote.length > 0 ? cleanNote : null,
        document_urls: Array.isArray(data.documents) ? data.documents.filter(Boolean) : [],
      };

      const result = await api.preRequests.create(payload);
      await refresh();
      return result.pre_request_id;
    },
    [state.patient, session, refresh],
  );

  const cancelAppointment = useCallback(
    async (id) => {
      if (!id) return false;
      await api.preRequests.update(Number(id), { status: 'REJECTED', reject_reason: 'Cancelled by patient' });
      await refresh();
      return true;
    },
    [refresh],
  );

  const updateProfile = useCallback(
    async (fields) => {
      const pid = state.patient?.patientId || session?.patientId;
      if (!pid) return false;
      const keyMap = {
        name: 'name',
        dob: 'dob',
        gender: 'gender',
        bloodGroup: 'blood_group',
        email: 'email',
        phone: 'phone',
        altPhone: 'alternate_phone',
        address: 'address',
      };
      const patch = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && keyMap[k]) {
          patch[keyMap[k]] = typeof v === 'string' && v.trim() === '' ? null : v;
        }
      }
      if (!patch.name && (fields.firstName || fields.lastName)) {
        patch.name = [fields.firstName, fields.lastName].filter(Boolean).join(' ');
      }

      await api.patients.update(Number(pid), patch);
      await refresh();
      return true;
    },
    [state.patient, session, refresh],
  );

  const updateInsurance = useCallback(
    async (fields) => {
      const pid = state.patient?.patientId || session?.patientId;
      if (!pid) return false;
      const existing = state.patient?.insurance || {};
      const todayIso = new Date().toISOString().split('T')[0];
      const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cleanCoverage = Math.max(
        0,
        Number(String(fields.coverage !== undefined ? fields.coverage : existing.coverage || 0).replace(/[^0-9.]/g, '')) || 0,
      );
      const rawCopay =
        fields.copayPercentage !== undefined
          ? fields.copayPercentage
          : existing.copayPercentage !== undefined
            ? existing.copayPercentage
            : 0;
      const cleanCopay = Math.min(100, Math.max(0, Number(rawCopay) || 0));

      await api.patients.createInsurance({
        patient_id: Number(pid),
        provider_name: fields.provider ? String(fields.provider).trim() : 'Self Pay',
        policy_number: fields.policyNumber ? String(fields.policyNumber).trim() : 'POL-' + (state.patient?.uhid || pid),
        member_id: fields.memberId ? String(fields.memberId).trim() : 'MEM-' + pid,
        coverage_type: fields.coverageType || 'Individual',
        valid_from: fields.validFrom || todayIso,
        valid_to: fields.validTo || nextYearIso,
        coverage_limit: cleanCoverage,
        copay_percentage: cleanCopay,
        card_front_url: fields.cardFrontUrl !== undefined ? (fields.cardFrontUrl ? String(fields.cardFrontUrl).trim() : null) : existing.cardFrontUrl || null,
        card_back_url: fields.cardBackUrl !== undefined ? (fields.cardBackUrl ? String(fields.cardBackUrl).trim() : null) : existing.cardBackUrl || null,
      });
      await refresh();
      return true;
    },
    [state.patient, session, refresh],
  );

  const payBill = useCallback(
    async (bill, paymentMode) => {
      if (!bill || !bill.ledgerId || bill.status === 'paid' || Number(bill.youPay || 0) <= 0) return false;
      await api.billing.payments.create({
        ledger_id: Number(bill.ledgerId),
        amount_paid: Number(bill.youPay || 0),
        payment_mode: paymentMode || 'UPI',
      });
      await refresh();
      return true;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      loaded,
      profile: state.patient,
      bills: state.bills,
      appointments: state.appointments,
      visits: state.visits,
      documents: state.documents,
      patientDocuments: state.patientDocuments || EMPTY.patientDocuments,
      billingSections: state.billingSections,
      notifications: state.notifications,
      specialties: state.specialties || session?.tenant?.specialties || [],
      raw: state.raw,
      doctors: state.raw ? Object.values(state.raw.doctorsById || {}) : [],
      upcomingAppointments: getUpcomingAppointments(state.appointments || []),
      totalOutstanding: (state.bills || [])
        .filter((b) => b.status !== 'paid')
        .reduce((sum, b) => sum + (Number(b?.youPay) || 0), 0),
      getBillingDocumentByRef: (sourceType, sourceId) =>
        (state.docIndex && state.docIndex[sourceType + ':' + sourceId]) || null,
      refresh,
      addAppointment,
      cancelAppointment,
      updateProfile,
      updateInsurance,
      payBill,
    }),
    [loaded, state, session, refresh, addAppointment, cancelAppointment, updateProfile, updateInsurance, payBill],
  );

  return <PatientStoreContext.Provider value={value}>{children}</PatientStoreContext.Provider>;
}
