'use strict';

import Modal from '../../components/layout/Modal.jsx';

/**
 * The PRE popup shell, powered by the shared Modal component.
 */
export default function PrePopup({ className, id, onClose, children }) {
  return (
    <Modal open onClose={onClose} className={className}>
      <div id={id} style={{ display: 'contents' }}>
        {children}
      </div>
    </Modal>
  );
}

/** Shared doctor <option> list, ranked by department match then availability. */
export function DoctorOptions({ doctors, department, sortFn }) {
  const sorted = sortFn(doctors, department);
  if (sorted.length === 0) return <option value="">No doctors available</option>;
  return (
    <>
      <option value="">Select doctor</option>
      {sorted.map((d) => (
        <option key={d.doctor_id} value={d.doctor_id}>
          {d.name} - {d.specialization}
        </option>
      ))}
    </>
  );
}

