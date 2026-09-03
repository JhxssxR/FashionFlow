import React from 'react';
import { statusTone } from '../../data/dashboardData';

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

export function DataTable({ columns, rows, keyField }) {
  return (
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
  );
}
