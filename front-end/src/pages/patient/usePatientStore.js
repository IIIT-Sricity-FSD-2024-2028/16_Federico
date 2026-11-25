'use strict';

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks.js';
import { selectSession } from '../../store/slices/authSlice.js';
import {
  addPortalAppointment,
  cancelPortalAppointment,
  payPortalBill,
  refreshPatientPortal,
  selectPortal,
  updatePortalInsurance,
  updatePortalProfile,
} from '../../store/slices/patientsSlice.js';
import { getUpcomingAppointments } from './patientDashboardUtils.js';

const EMPTY_PATIENT_DOCUMENTS = {
  all: [],
  discharge: [],
  uploaded: [],
  admissions: [],
  appointments: [],
  insurance: [],
};

/**
 * The patient portal store (was PatientStoreContext): a thin adapter over
 * state.patients.portal. Reads are selectors; every operation dispatches a
 * patientsSlice thunk, which calls the existing API modules and only then
 * updates Redux. Each operation rejects (throws via unwrap) on failure, as the
 * old context functions did.
 */
export function usePatientStore() {
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSession);
  const { data: state, loaded } = useAppSelector(selectPortal);

  const refresh = useCallback(() => dispatch(refreshPatientPortal()).unwrap(), [dispatch]);
  const addAppointment = useCallback((data) => dispatch(addPortalAppointment(data)).unwrap(), [dispatch]);
  const cancelAppointment = useCallback((id) => dispatch(cancelPortalAppointment(id)).unwrap(), [dispatch]);
  const updateProfile = useCallback((fields) => dispatch(updatePortalProfile(fields)).unwrap(), [dispatch]);
  const updateInsurance = useCallback((fields) => dispatch(updatePortalInsurance(fields)).unwrap(), [dispatch]);
  const payBill = useCallback(
    (bill, paymentMode) => dispatch(payPortalBill({ bill, paymentMode })).unwrap(),
    [dispatch],
  );

  return useMemo(
    () => ({
      loaded,
      profile: state.patient,
      bills: state.bills,
      appointments: state.appointments,
      visits: state.visits,
      documents: state.documents,
      patientDocuments: state.patientDocuments || EMPTY_PATIENT_DOCUMENTS,
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
}
