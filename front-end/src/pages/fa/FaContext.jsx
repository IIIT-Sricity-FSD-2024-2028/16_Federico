'use strict';

import { createContext, useContext } from 'react';

/**
 * What FA/js/app.js kept on `window`: the current admission id (its only
 * cross-view state), the hash navigator, and `window.render()` - which the
 * action module called after every write to rebuild the whole view. Here
 * `reload` bumps a counter the views depend on, which has the same effect.
 */
export const FaContext = createContext(null);

export function useFa() {
  const ctx = useContext(FaContext);
  if (!ctx) throw new Error('useFa must be used inside <FaLayout>');
  return ctx;
}

