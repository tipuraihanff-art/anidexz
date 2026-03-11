export function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.out ? ' out' : ''}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export function ProgressBar({ width, visible }) {
  if (!visible) return null;
  return (
    <div
      className="pbar"
      style={{ width: width + '%', opacity: width === 100 ? 0 : 1 }}
    />
  );
}

export function Spinner() {
  return (
    <div className="spin">
      <span /><span /><span />
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="empty">
      <div style={{ marginBottom: 12 }}>
        <svg width="22" height="22" fill="none" stroke="var(--dim)" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="16" r=".5" fill="var(--dim)"/>
        </svg>
      </div>
      <h3>{title}</h3>
      <p dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}

export function CardSkeleton({ count = 12 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-skel" />
      ))}
    </>
  );
}

export function Loader() {
  return (
    <div className="loader">
      <div className="ld-logo"><b>ani</b>dexz</div>
      <div className="ld-track"><div className="ld-fill" /></div>
    </div>
  );
}
