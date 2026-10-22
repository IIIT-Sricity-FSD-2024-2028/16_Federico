'use strict';

import { useState } from 'react';

/**
 * Password input with a show/hide eye toggle (.eye-btn).
 * When `bare` is true, renders only the <input> and <button> for custom wrappers.
 */
export default function EyeField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  bare = false,
}) {
  const [visible, setVisible] = useState(false);

  const controls = (
    <>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="eye-btn"
        type="button"
        aria-label="Toggle password visibility"
        data-target={id}
        onClick={() => setVisible((v) => !v)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </>
  );

  if (bare) return controls;

  return (
    <div className="form-group">
      {label ? <label htmlFor={id}>{label}</label> : null}
      <div className="input-eye">{controls}</div>
    </div>
  );
}
