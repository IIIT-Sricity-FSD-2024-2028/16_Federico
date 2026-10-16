'use strict';

/**
 * Ported from shared/department-options.js#populateDepartmentSelect.
 *
 * Options are the distinct, trimmed, non-empty `specialization` values across
 * the doctor list, sorted with localeCompare - same derivation as before. The
 * placeholder stays disabled+selected.
 */
export default function DepartmentSelect({
  departments,
  doctors,
  value,
  onChange,
  placeholder = 'Select department',
  id,
  className = '',
  style,
}) {
  const rawList =
    departments && departments.length > 0
      ? departments
      : (doctors || []).map((d) => (d.specialization || d.department || '').trim());

  const options = Array.from(
    new Set((rawList || []).map((s) => String(s || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <select
      id={id}
      className={className}
      style={style}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </select>
  );
}

