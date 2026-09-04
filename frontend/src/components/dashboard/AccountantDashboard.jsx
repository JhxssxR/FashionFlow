import React from 'react';
import {
  ComposedChart, Area, Bar, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, Loading, ErrorNote } from './DashboardShared';
import { useApi } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const AccountantDashboard = ({ user }) => {
  const finance = useApi('/api/reports/financial-summary');

  const d = finance.data || {};
  const daily14 = d.daily14 || [];
  const revenue30d = daily14.length ? daily14.reduce((s, x) => s + x.revenue, 0) : 0;
  const expenses30d = daily14.length ? daily14.reduce((s, x) => s + x.expenses, 0) : 0;
  const profit30 = revenue30d - expenses30d;
  const margin30 = revenue30d ? Math.round((profit30 / revenue30d) * 100) : 0;

  const composedChart = (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={daily14} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={(v) => peso(v)} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.dark} radius={[3, 3, 0, 0]} barSize={12} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.gold} strokeWidth={2} fill={CHART_COLORS.gold} fillOpacity={0.14} />
        <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.green} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const monthlyChart = (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={d.monthly || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={(v) => peso(v)} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.gold} radius={[3, 3, 0, 0]} barSize={22} />
        <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.dark} radius={[3, 3, 0, 0]} barSize={22} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <DashboardLayout role="accountant" user={user}>
      {(page) => {
        if (page === 'receivables') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="OPEN PAYABLES" value={peso(d.payablesTotal)} sub="Undelivered purchase orders" tone="purple" />
                <StatCard label="TODAY'S CASH POSITION" value={peso(d.todayCash)} sub="Revenue minus purchasing spend today" tone="green" />
              </div>
              <Panel title="Payables & receivables" subtitle="Open purchase orders awaiting settlement">
                <ErrorNote message={finance.error} />
                {finance.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO PAYABLES YET"
                    emptyNote="Supplier invoices appear here while their purchase orders are in the pipeline."
                    columns={[
                      { key: 'id', label: 'Reference' },
                      { key: 'party', label: 'Party' },
                      { key: 'due', label: 'Due', render: (r) => (r.due === '—' ? '—' : fmtDate(r.due)) },
                      { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) }
                    ]}
                    rows={d.payables || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'reports') {
          return (
            <>
              <Panel title="Monthly revenue vs expenses" subtitle="Live: Sales revenue vs purchase orders issued, year to date">
                <ErrorNote message={finance.error} />
                {finance.loading ? <Loading /> : monthlyChart}
              </Panel>
              <Panel title="Where the money goes" subtitle="Purchasing spend by supplier specialty, year to date">
                {finance.loading ? <Loading /> : (
                  <>
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={d.expenseBreakdown || []}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {(d.expenseBreakdown || []).map((entry, i) => (
                            <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="legend-list">
                      {(d.expenseBreakdown || []).map((e, i) => (
                        <li key={e.name}>
                          <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                          {e.name} — {e.value}%
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            </>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="REVENUE (14 DAYS)" value={peso(revenue30d)} sub="Live from the Sales table" />
              <StatCard label="EXPENSES (14 DAYS)" value={peso(expenses30d)} sub="Purchase orders issued" tone="red" />
              <StatCard label="NET PROFIT (14 DAYS)" value={peso(profit30)} sub={`${margin30}% net margin`} tone="green" />
              <StatCard label="OPEN PAYABLES" value={peso(d.payablesTotal)} sub="Undelivered purchase orders" tone="purple" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Revenue vs expenses — last 14 days" subtitle="Daily operating results across all channels">
                <ErrorNote message={finance.error} />
                {finance.loading ? <Loading /> : composedChart}
              </Panel>

              <Panel title="Purchasing spend mix" subtitle="By supplier specialty, year to date">
                {finance.loading ? <Loading /> : (
                  <>
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={d.expenseBreakdown || []}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {(d.expenseBreakdown || []).map((entry, i) => (
                            <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="legend-list">
                      {(d.expenseBreakdown || []).map((e, i) => (
                        <li key={e.name}>
                          <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                          {e.name} — {e.value}%
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            </div>

            <Panel title="Payables & receivables" subtitle="Open purchase orders awaiting settlement">
              <DataTable
                keyField="id"
                emptyTitle="NO PAYABLES YET"
                emptyNote="Supplier invoices appear here while their purchase orders are in the pipeline."
                columns={[
                  { key: 'id', label: 'Reference' },
                  { key: 'party', label: 'Party' },
                  { key: 'due', label: 'Due', render: (r) => (r.due === '—' ? '—' : fmtDate(r.due)) },
                  { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) }
                ]}
                rows={(d.payables || []).slice(0, 6)}
              />
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default AccountantDashboard;
