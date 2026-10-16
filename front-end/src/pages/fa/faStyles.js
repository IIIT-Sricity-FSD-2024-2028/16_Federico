'use strict';

/**
 * FA/js/app.js wrote every rule as an inline `style="…"` attribute inside its
 * template strings. The repeated ones are collected here so the views stay
 * readable; the values are copied character for character.
 */

export const th = {
  padding: '14px 20px',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};

export const thWide = { ...th, padding: '16px 24px' };
export const thCenter = { ...th, textAlign: 'center' };

export const td = { padding: '16px 20px' };
export const tdWide = { padding: '16px 24px' };

export const tdMuted = {
  padding: '16px 20px',
  color: 'var(--text-muted)',
  fontSize: '13px',
  fontWeight: 500,
};

export const theadStyle = {
  background: 'var(--color-muted-bg)',
  borderBottom: '1px solid var(--color-border)',
};

export const tableStyle = { width: '100%', textAlign: 'left', borderCollapse: 'collapse' };

export const cardFlush = { padding: 0, overflow: 'hidden' };

export const panelHeader = {
  padding: '20px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
};

export const panelHeaderSplit = {
  ...panelHeader,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const panelTitle = {
  margin: 0,
  fontSize: '16px',
  color: 'var(--color-fg)',
  fontWeight: 700,
};

export const pageTitle = { marginBottom: '24px', color: 'var(--color-fg)', fontWeight: 700 };

export const smallBtn = { padding: '8px 16px', fontSize: '12px' };
export const smallerBtn = { padding: '6px 16px', fontSize: '12px' };
export const tinyBtn = { padding: '6px 14px', fontSize: '12px' };

export const emptyCell = { textAlign: 'center', padding: '30px', color: 'var(--text-muted)' };

