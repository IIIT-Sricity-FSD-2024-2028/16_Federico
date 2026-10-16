'use strict';

/** Ported from HOM/ui-template.js#Input. */
export default function Input({ type = 'text', className = '', ...rest }) {
  return <input type={type} className={['input', className].filter(Boolean).join(' ')} {...rest} />;
}

