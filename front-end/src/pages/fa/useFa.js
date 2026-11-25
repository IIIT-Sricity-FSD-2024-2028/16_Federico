'use strict';

import { useCallback, useMemo } from 'react';
import { useSession } from '../../auth/useSession.js';
import { toast } from '../../components/feedback/feedback.js';
import { useAppDispatch, useAppSelector } from '../../store/hooks.js';
import {
  bumpFaVersion,
  clearFaFormError,
  selectFa,
  setFaCurrentAdmission,
  setFaFormError,
} from '../../store/slices/billingSlice.js';
import { useHashNavigate } from './useHashRoute.js';

/** The ids a view actually renders an inline error slot for. */
const FORM_ERROR_IDS = ['discharge-payment-error'];

/**
 * What FA/js/app.js kept on `window`, now read from state.billing.fa (the FA
 * portal's slice of billingSlice): the current admission id (its only
 * cross-view state), a `version` counter that stands in for `window.render()`
 * - views that depend on it reload when it is bumped - and the inline form
 * errors. `navigate` and the admission id carried in the URL hash come from the
 * router; `dispatch` is exposed so the action module can dispatch thunks.
 */
export function useFa() {
  const dispatch = useAppDispatch();
  const fa = useAppSelector(selectFa);
  const { tenant } = useSession();
  const { param, navigate } = useHashNavigate();

  // parseHashRoute() wrote window.currentAdmissionId whenever the hash carried
  // a third segment; the same rule applies here, without the global.
  const admissionId = param || fa.currentAdmissionId;

  const setCurrentAdmissionId = useCallback((id) => dispatch(setFaCurrentAdmission(id)), [dispatch]);
  const reload = useCallback(() => dispatch(bumpFaVersion()), [dispatch]);
  const showFormError = useCallback(
    (id, message) => {
      if (!FORM_ERROR_IDS.includes(id)) {
        toast(message, 'error');
        return;
      }
      dispatch(setFaFormError({ id, message }));
    },
    [dispatch],
  );
  const clearFormError = useCallback((id) => dispatch(clearFaFormError(id)), [dispatch]);

  return useMemo(
    () => ({
      dispatch,
      currentAdmissionId: admissionId,
      setCurrentAdmissionId,
      navigate,
      reload,
      version: fa.version,
      formErrors: fa.formErrors,
      showFormError,
      clearFormError,
      hospitalName: tenant?.organization_name || 'Hospital',
    }),
    [dispatch, admissionId, setCurrentAdmissionId, navigate, reload, fa.version, fa.formErrors, showFormError, clearFormError, tenant],
  );
}
