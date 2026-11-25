'use strict';

import { sanitizeEmailName } from '../../lib/emailIdentity.js';

/**
 * Email field for unified-login accounts: the person types only the name
 * part; the role tag and domain are fixed and shown as a suffix, so the
 * address can't break the name.<tag>@<domain> convention.
 *
 *   [ rekha        ].pre@citygen.com
 */
export default function TaggedEmailInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  tag,
  domain,
  placeholder,
  required = true,
  sanitize = true,
  maxLength,
  enterKeyHint,
  ariaInvalid,
  ariaDescribedBy,
  className,
  inputRef,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        required={required}
        placeholder={placeholder || 'e.g. rekha'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={maxLength}
        enterKeyHint={enterKeyHint}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={className}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(sanitize ? sanitizeEmailName(raw) : raw.toLowerCase());
        }}
        onBlur={onBlur}
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
