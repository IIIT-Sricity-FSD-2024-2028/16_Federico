'use strict';

import { useEffect } from 'react';

/**
 * renderLedger / renderEodBilling / renderDischarge each opened with
 *
 *     if (!window.currentAdmissionId && rows.length)
 *         window.currentAdmissionId = rows[0].admission.admission_id;
 *
 * so the first view to load picked a default and every sibling view inherited
 * it. Same rule here: fall back to the first row for this render, and write the
 * choice back so the other views see it too.
 */
export function useSelectedRow(ctx, rows) {
  const selectedId = ctx.currentAdmissionId ?? rows?.[0]?.admission.admission_id ?? null;

  useEffect(() => {
    if (ctx.currentAdmissionId == null && selectedId != null) {
      ctx.setCurrentAdmissionId(selectedId);
    }
  }, [ctx, selectedId]);

  const row = rows ? rows.find((r) => r.admission.admission_id === selectedId) : null;
  return { selectedId, row };
}

