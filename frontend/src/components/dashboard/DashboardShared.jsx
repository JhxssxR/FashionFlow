import React from 'react';
import { statusTone } from '../../utils';

export function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card" style={{ borderTop: '1px solid #e7e7e4' }}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h3 className="panel-title">{title}</h3>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="panel-action">{action}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${statusTone(status)}`}>{status}</span>;
}

export function DataTable({ columns, rows, keyField, emptyTitle, emptyNote, pageSize }) {
  const [page, setPage] = React.useState(1);
  const list = rows || [];
  if (list.length === 0) {
    return <EmptyState title={emptyTitle} note={emptyNote} />;
  }
  // Opt-in client-side pagination: pass pageSize={10} and long tables page
  // through the shared Pager (hidden automatically on a single page).
  const pageCount = pageSize ? Math.max(1, Math.ceil(list.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount);
  const shown = pageSize ? list.slice((safePage - 1) * pageSize, safePage * pageSize) : list;
  return (
    <>
    {/* .table-scroll lets wide tables swipe sideways on phones instead of
        stretching the whole dashboard page. */}
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {pageSize ? (
      <Pager page={safePage} pageCount={pageCount} total={list.length} pageSize={pageSize} onPage={setPage} />
    ) : null}
    </>
  );
}

export function EmptyState({ title = 'NO RECORDS YET', note }) {
  return (
    <div className="table-empty">
      <strong className="table-empty-title">{title}</strong>
      <span className="table-empty-note">
        {note || 'No records found.'}
      </span>
    </div>
  );
}

// Shown while an API call is in flight — shimmer blocks instead of plain
// text so panels keep their shape (perceived speed).
export function Loading({ label = 'LOADING…', lines = 3 }) {
  const widths = [92, 78, 86, 64];
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <span key={i} className="sk-line" style={{ width: `${widths[i % widths.length]}%` }} />
      ))}
    </div>
  );
}

// Shimmer placeholders shaped like stat cards (for stat-grid overviews).
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="stat-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sk-card">
          <span className="sk-line" style={{ width: '55%' }} />
          <span className="sk-line sk-big" style={{ width: '80%' }} />
          <span className="sk-line" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

// Circular progress ring (SVG) — loyalty tier progress, gamified.
export function ProgressRing({ pct = 0, size = 112, children }) {
  const p = Math.max(0, Math.min(100, pct));
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={10} />
        <circle
          className="ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={10}
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

// Days-left chip for promo expiry ("ENDS IN 2D" urgency).
export function CountdownChip({ validTo }) {
  if (!validTo) return null;
  const end = new Date(validTo);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const days = Math.round((endDay - now) / 86400000);
  if (days < 0) return <span className="countdown-chip expired">EXPIRED</span>;
  if (days === 0) return <span className="countdown-chip urgent">ENDS TODAY</span>;
  if (days === 1) return <span className="countdown-chip urgent">ENDS TOMORROW</span>;
  if (days <= 7) return <span className="countdown-chip urgent">ENDS IN {days}D</span>;
  return <span className="countdown-chip">ENDS IN {days}D</span>;
}

// Urgency banners for low stock — OUT / CRITICAL / LOW with one-tap action.
export function StockAlertBanner({ items, threshold = 12, actionLabel, onAction }) {
  if (!items || items.length === 0) return null;
  const half = Math.max(1, Math.floor(threshold / 2));
  return (
    <div className="stock-banners" role="alert">
      {items.slice(0, 3).map((p) => {
        const sev = p.stock <= 0 ? 'out' : p.stock <= half ? 'critical' : 'low';
        const label = sev === 'out' ? 'OUT OF STOCK' : sev === 'critical' ? 'CRITICAL' : 'LOW STOCK';
        return (
          <div key={p.id} className={`stock-banner ${sev}`}>
            <div className="stock-banner-info">
              <strong>{p.name}</strong>
              <span>{p.variant} · {p.stock} left</span>
            </div>
            <span className={`stock-sev ${sev}`}>{label}</span>
            {onAction && (
              <button type="button" className="mini-btn" onClick={() => onAction(p)}>
                {actionLabel || 'RESTOCK'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Inline error banner for failed API calls (Error Handling criterion).
export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="api-error">{message}</div>;
}

// Start/end date picker row for report charts. `resetLabel` names the
// default window (e.g. "LAST 14 DAYS"). Pair with useReportRange
// (./useReportRange.js) for state + the API query string.
export function DateRangePicker({ from, to, today, onFrom, onTo, onReset, resetLabel = 'RESET' }) {
  return (
    <div className="inline-form" style={{ marginBottom: 12 }}>
      <div className="form-row">
        <input type="date" value={from} max={to || today} onChange={(e) => onFrom(e.target.value)} aria-label="Start date" />
        <input type="date" value={to} min={from} max={today} onChange={(e) => onTo(e.target.value)} aria-label="End date" />
        <button type="button" className="mini-btn" onClick={onReset}>{resetLabel}</button>
      </div>
    </div>
  );
}

// Client-side pagination footer: ← PREV / PAGE x OF y / NEXT →.
// Renders nothing for a single page. `total`/`pageSize` add an
// entries count when provided.
export function Pager({ page, pageCount, onPage, total, pageSize }) {
  if (pageCount <= 1) return null;
  return (
    <div className="pager">
      <button
        type="button"
        className="pager-btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← PREV
      </button>
      <span className="pager-status">
        PAGE {page} OF {pageCount}
        {total !== undefined && pageSize !== undefined
          ? ` · ${total} ENTRIES · ${pageSize} PER PAGE`
          : ''}
      </span>
      <button
        type="button"
        className="pager-btn"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        NEXT →
      </button>
    </div>
  );
}
