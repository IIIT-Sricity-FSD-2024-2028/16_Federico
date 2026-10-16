'use strict';

/**
 * render() in FA/js/app.js painted a "Loading…" card into #app, then either the
 * view or a "Something went wrong" card. Same three states, same copy.
 */
export default function ViewFrame({ loading, error, children }) {
  if (loading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error.message || String(error)}</p>
      </div>
    );
  }

  return children;
}
