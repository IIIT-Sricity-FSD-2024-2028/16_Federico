'use strict';

import { useFa } from './FaContext.jsx';

/**
 * FA/js/app.js#renderPatientPicker. The option labels are load-bearing - they
 * carry the visit tag and the ledger state - so they are reproduced exactly,
 * including the `[EOD Sent]` special case and the `[NO LEDGER]` fallback.
 *
 * The legacy <select> had an inline onchange that wrote window.currentAdmissionId
 * and called window.render(); here it sets the context value.
 */
export default function PatientPicker({ rows, currentAdmissionId }) {
  const { setCurrentAdmissionId } = useFa();
  if (!rows || !rows.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        padding: '12px 18px',
        background: 'var(--color-surface, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <label
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--color-muted-fg)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Switch Patient / Ledger:
      </label>
      <select
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg, #fdf8fd)',
          color: 'var(--color-fg)',
        }}
        value={currentAdmissionId ?? ''}
        onChange={(e) => setCurrentAdmissionId(Number(e.target.value))}
      >
        {rows.map((r) => {
          const visitTag =
            r.admission.visit_type === 'OPD'
              ? '[OPD Consultation]'
              : r.bed && r.bed.bed_number
                ? '[Bed ' + r.bed.bed_number + ']'
                : '[Inpatient]';
          const st = r.ledger
            ? r.ledger.status === 'DISPATCHED'
              ? '[EOD Sent]'
              : '[' + r.ledger.status + ']'
            : '[NO LEDGER]';
          return (
            <option key={r.admission.admission_id} value={r.admission.admission_id}>
              {(r.patient.name || 'Patient') + ' (' + (r.patient.uhid || '-') + ') — ' + visitTag + ' ' + st}
            </option>
          );
        })}
      </select>
    </div>
  );
}
