import React from 'react';
import { statusTone } from '../../utils';

export function StatCard({ label, value, sub, tone = 'gold' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
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

export function DataTable({ columns, rows, keyField, emptyTitle, emptyNote }) {
  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} note={emptyNote} />;
  }
  return (
    // .table-scroll lets wide tables swipe sideways on phones instead of
    // stretching the whole dashboard page.
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
          {rows.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

// Shown while an API call is in flight; keeps panel layout stable.
export function Loading({ label = 'LOADING…' }) {
  return <div className="table-empty"><span className="table-empty-note">{label}</span></div>;
}

// Inline error banner for failed API calls (Error Handling criterion).
export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="api-error">{message}</div>;
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
