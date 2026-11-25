'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { patients } from '../../api/endpoints/patients.js';
import { auth } from '../../api/endpoints/auth.js';
import { doctors } from '../../api/endpoints/doctors.js';
import { wards } from '../../api/endpoints/wards.js';
import { billing } from '../../api/endpoints/billing.js';
import { preRequests } from '../../api/endpoints/preRequests.js';
import { appointments } from '../../api/endpoints/appointments.js';
import { shapePatientStoreData } from '../../pages/patient/patientStoreShape.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';
import { createPreRequest, updatePreRequest } from './preRequestsSlice.js';
import { createPayment } from './billingSlice.js';

/* ----------------------------- repository CRUD ---------------------------- */
// The backend has no DELETE /patient.

export const fetchPatients = apiThunk('patients/fetchAll', () => patients.list(), 'Failed to load patients');
export const fetchPatient = apiThunk(
  'patients/fetchOne',
  (idOrUhid) => patients.get(idOrUhid),
  'Failed to load patient',
);
export const createPatient = apiThunk(
  'patients/create',
  (payload) => patients.create(payload),
  'Failed to create patient',
);
export const updatePatient = apiThunk(
  'patients/update',
  ({ id, patch }) => patients.update(id, patch),
  'Failed to update patient',
);
export const fetchPortalSummary = apiThunk(
  'patients/fetchPortalSummary',
  (id) => patients.portalSummary(id),
  'Failed to load portal summary',
);
export const fetchAllInsurance = apiThunk(
  'patients/fetchAllInsurance',
  () => patients.insuranceAll(),
  'Failed to load insurance',
);
export const fetchPatientInsurance = apiThunk(
  'patients/fetchPatientInsurance',
  (id) => patients.insuranceForPatient(id),
  'Failed to load insurance',
);
export const createInsurance = apiThunk(
  'patients/createInsurance',
  (payload) => patients.createInsurance(payload),
  'Failed to save insurance',
);

/* ------------------------- patient portal (was PatientStoreContext) ------------------------- */

const EMPTY_PORTAL = {
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

/** Loads the portal summary, falling back to the individual calls exactly as before. */
async function loadPortalData(patientId, session) {
  try {
    const summary = await patients.portalSummary(patientId);
    return shapePatientStoreData(summary, session);
  } catch (err) {
    console.warn('[PatientStore] Portal summary unavailable, falling back to individual calls:', err);

    const [me, insuranceList, bundles, receipts, doctorList, beds, services] = await Promise.all([
      auth.me().catch(() => ({ patient: null, user: null })),
      patients.insuranceForPatient(patientId).catch(() => []),
      billing.patient.bills(patientId).catch(() => []),
      billing.patient.receipts(patientId).catch(() => []),
      doctors.list().catch(() => []),
      wards.beds().catch(() => []),
      billing.services.list().catch(() => []),
    ]);

    const [allPreRequests, apts] = await Promise.all([
      preRequests.list().catch(() => []),
      appointments.list().catch(() => []),
    ]);
    const patientPreRequests = allPreRequests.filter((pr) => pr.patient_id === patientId);
    const patientAppointments = apts.filter((a) => a.patient_id === patientId);
    const patientRecord = me.patient || (await patients.get(patientId).catch(() => null));
    const dischargeSummaries = await Promise.all(
      bundles
        .filter((b) => b && b.admission && b.admission.admission_id)
        .map(({ admission }) =>
          billing.dischargeSummary.getByAdmission(admission.admission_id).catch(() => null),
        ),
    );

    const latestInsurance =
      insuranceList && insuranceList.length
        ? insuranceList.reduce(
            (latest, ins) => (ins && (!latest || ins.insurance_id > latest.insurance_id) ? ins : latest),
            null,
          )
        : null;

    return shapePatientStoreData(
      {
        patient: patientRecord,
        user: me.user,
        insurance: latestInsurance,
        bundles,
        receipts,
        doctors: doctorList,
        beds,
        services,
        preRequests: patientPreRequests,
        dischargeSummaries,
        appointments: patientAppointments,
      },
      session,
    );
  }
}

/** Resolves to the shaped portal state, or null when no patient is signed in. */
export const refreshPatientPortal = apiThunk(
  'patients/refreshPortal',
  async (_arg, { getState }) => {
    const session = getState().auth.session;
    const patientId = session && session.patientId;
    if (!patientId) return null;
    return loadPortalData(patientId, session);
  },
  'Failed to load patient data',
);

export const addPortalAppointment = apiThunk(
  'patients/addPortalAppointment',
  async (data, { getState, dispatch }) => {
    const state = getState();
    const pid = state.patients.portal.data.patient?.patientId || state.auth.session?.patientId;
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

    const result = await dispatch(createPreRequest(payload)).unwrap();
    await dispatch(refreshPatientPortal());
    return result.pre_request_id;
  },
  'Failed to book appointment',
);

export const cancelPortalAppointment = apiThunk(
  'patients/cancelPortalAppointment',
  async (id, { dispatch }) => {
    if (!id) return false;
    await dispatch(
      updatePreRequest({ id: Number(id), patch: { status: 'REJECTED', reject_reason: 'Cancelled by patient' } }),
    ).unwrap();
    await dispatch(refreshPatientPortal());
    return true;
  },
  'Failed to cancel appointment',
);

export const updatePortalProfile = apiThunk(
  'patients/updatePortalProfile',
  async (fields, { getState, dispatch }) => {
    const state = getState();
    const pid = state.patients.portal.data.patient?.patientId || state.auth.session?.patientId;
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

    await dispatch(updatePatient({ id: Number(pid), patch })).unwrap();
    await dispatch(refreshPatientPortal());
    return true;
  },
  'Failed to update profile',
);

export const updatePortalInsurance = apiThunk(
  'patients/updatePortalInsurance',
  async (fields, { getState, dispatch }) => {
    const state = getState();
    const portalPatient = state.patients.portal.data.patient;
    const pid = portalPatient?.patientId || state.auth.session?.patientId;
    if (!pid) return false;
    const existing = portalPatient?.insurance || {};
    const todayIso = new Date().toISOString().split('T')[0];
    const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const cleanCoverage = Math.max(
      0,
      Number(
        String(fields.coverage !== undefined ? fields.coverage : existing.coverage || 0).replace(/[^0-9.]/g, ''),
      ) || 0,
    );
    const rawCopay =
      fields.copayPercentage !== undefined
        ? fields.copayPercentage
        : existing.copayPercentage !== undefined
          ? existing.copayPercentage
          : 0;
    const cleanCopay = Math.min(100, Math.max(0, Number(rawCopay) || 0));

    await dispatch(
      createInsurance({
        patient_id: Number(pid),
        provider_name: fields.provider ? String(fields.provider).trim() : 'Self Pay',
        policy_number: fields.policyNumber ? String(fields.policyNumber).trim() : 'POL-' + (portalPatient?.uhid || pid),
        member_id: fields.memberId ? String(fields.memberId).trim() : 'MEM-' + pid,
        coverage_type: fields.coverageType || 'Individual',
        valid_from: fields.validFrom || todayIso,
        valid_to: fields.validTo || nextYearIso,
        coverage_limit: cleanCoverage,
        copay_percentage: cleanCopay,
        card_front_url:
          fields.cardFrontUrl !== undefined
            ? fields.cardFrontUrl
              ? String(fields.cardFrontUrl).trim()
              : null
            : existing.cardFrontUrl || null,
        card_back_url:
          fields.cardBackUrl !== undefined
            ? fields.cardBackUrl
              ? String(fields.cardBackUrl).trim()
              : null
            : existing.cardBackUrl || null,
      }),
    ).unwrap();
    await dispatch(refreshPatientPortal());
    return true;
  },
  'Failed to update insurance',
);

export const payPortalBill = apiThunk(
  'patients/payPortalBill',
  async ({ bill, paymentMode }, { dispatch }) => {
    if (!bill || !bill.ledgerId || bill.status === 'paid' || Number(bill.youPay || 0) <= 0) return false;
    await dispatch(
      createPayment({
        ledger_id: Number(bill.ledgerId),
        amount_paid: Number(bill.youPay || 0),
        payment_mode: paymentMode || 'UPI',
      }),
    ).unwrap();
    await dispatch(refreshPatientPortal());
    return true;
  },
  'Failed to record payment',
);

/* --------------------------------- slice --------------------------------- */

const patientsSlice = createSlice({
  name: 'patients',
  initialState: {
    items: [],
    current: null,
    insuranceAll: [],
    // Insurance rows per patient id (a failed fetch leaves that patient's key absent).
    patientInsurance: {},
    portalSummary: null,
    portal: { data: EMPTY_PORTAL, loaded: false },
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchPatients, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchPatient, (state, action) => {
      state.current = action.payload || null;
    });
    addReadCases(builder, fetchPortalSummary, (state, action) => {
      state.portalSummary = action.payload || null;
    });
    addReadCases(builder, fetchAllInsurance, (state, action) => {
      state.insuranceAll = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchPatientInsurance, (state, action) => {
      state.patientInsurance[action.meta.arg] = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createPatient, (state, action) => {
      upsertByKey(state.items, 'patient_id', action.payload);
    });
    addWriteCases(builder, updatePatient, (state, action) => {
      upsertByKey(state.items, 'patient_id', action.payload);
    });
    addWriteCases(builder, createInsurance, (state, action) => {
      upsertByKey(state.insuranceAll, 'insurance_id', action.payload);
    });

    // Portal refresh: `loaded` flips true once the first attempt settles, even
    // when it failed - the old provider set it after try/catch either way.
    builder
      .addCase(refreshPatientPortal.fulfilled, (state, action) => {
        if (action.payload) state.portal.data = action.payload;
        state.portal.loaded = true;
      })
      .addCase(refreshPatientPortal.rejected, (state) => {
        state.portal.loaded = true;
      });
    addWriteCases(builder, addPortalAppointment);
    addWriteCases(builder, cancelPortalAppointment);
    addWriteCases(builder, updatePortalProfile);
    addWriteCases(builder, updatePortalInsurance);
    addWriteCases(builder, payPortalBill);
  },
});

export const selectPatients = (state) => state.patients.items;
export const selectPortal = (state) => state.patients.portal;

export default patientsSlice.reducer;
