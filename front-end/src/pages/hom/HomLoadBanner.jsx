'use strict';

import Button from '../../components/ui/Button.jsx';

/**
 * Shared error & initial-load status banner for HOM screens so failed loads
 * never silently render empty tables/zeros, while background 15s polling does
 * not flash a loading placeholder over already-loaded content.
 */
export default function HomLoadBanner({
  error,
  loading,
  loaded,
  onRetry,
  loadingText = 'Loading...',
  errorFallback = 'Failed to load data.',
}) {
  return (
    <>
      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 'var(--radius-base, 8px)',
            border: '1px solid var(--error)',
            background: 'var(--error-bg, #fef2f2)',
            color: 'var(--error)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{error.message || errorFallback}</span>
          {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}
        </div>
      ) : null}

      {!loaded && loading ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24 }}>
          {loadingText}
        </div>
      ) : null}
    </>
  );
}
