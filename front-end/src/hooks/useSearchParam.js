'use strict';

import { useSearchParams } from 'react-router-dom';

/**
 * Reads one query parameter. Covers ?org= (login, signup), ?uhid= (HOM patient
 * flow and billing) and ?patient_id= / ?doctor_id= (PRE appointment).
 */
export function useSearchParam(name) {
  const [params] = useSearchParams();
  return params.get(name);
}

