'use strict';

/**
 * Ported from HOM/ui-template.js#Badge.
 *
 * Emits BOTH class families on purpose: `.badge`/`.badge-<variant>` from each
 * portal's own stylesheet and `.md-chip`/`.md-chip-<variant>` from
 * shared/material-components.css. Dropping either breaks one of them.
 */
export default function Badge({ children, variant = 'neutral', className = '' }) {
  const classes = ['badge', 'badge-' + variant, 'md-chip', 'md-chip-' + variant, className]
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{children}</span>;
}

