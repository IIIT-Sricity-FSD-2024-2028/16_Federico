'use strict';

import { sanitizeEmailName } from '../../lib/emailIdentity.js';

/**
 * Email field for unified-login accounts: the person types only the name
 * part; the role tag and domain are fixed and shown as a suffix, so the
 * address can't break the name.<tag>@<domain> convention.
 *
 *   [ rekha        ].pre@citygen.com
 */
export default function TaggedEmailInput({ id, value, onChange, tag, domain, placeholder, required = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <input
        id={id}
        required={required}
        placeholder={placeholder || 'e.g. rekha'}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(sanitizeEmailName(e.target.value))}
        style={{ flex: 1, minWidth: 0 }}
      />
      <span
        style={{
          alignSelf: 'center',
          whiteSpace: 'nowrap',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--md-on-surface-variant, #49454F)',
        }}
      >
        .{tag}@{domain || 'yourhospital.com'}
      </span>
    </div>
  );
}
