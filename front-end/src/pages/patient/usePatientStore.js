'use strict';

import { createContext, useContext } from 'react';

/**
 * The patient store context and its hook, kept apart from
 * <PatientStoreProvider> (PatientStoreContext.jsx) so that file only exports
 * components, as React Fast Refresh requires.
 */
export const PatientStoreContext = createContext(null);

export function usePatientStore() {
  const ctx = useContext(PatientStoreContext);
  if (!ctx) throw new Error('usePatientStore must be used inside <PatientLayout>');
  return ctx;
}
