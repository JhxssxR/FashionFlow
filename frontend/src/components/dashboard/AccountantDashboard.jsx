import React from 'react';
import {
  ComposedChart, Area, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import {
  peso, peso2, REVENUE_VS_EXPENSES, MONTHLY_FINANCE, EXPENSE_BREAKDOWN,
  sumRange, TODAY_ROW, RECEIVABLES, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const AccountantDashboard = () => {
  const profit30 = sumRange('revenue', 30) - sumRange('expenses', 30);
  const margin30 = Math.round((profit30 / sumRange('revenue', 30)) * 100);
  const payables = RECEIVABLES.reduce((s, r) => s + r.amount, 0);

  return (
    <DashboardLayout role="accountant">
      {(page) => {
        if (page === 'receivables') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="PROJECTED PAYABLES" value={peso(payables)} sub="Once purchase orders activate" tone="purple" />
                <StatCard label="TODAY'S CASH POSITION" value={peso(TODAY_ROW.revenue - TODAY_ROW.expenses)} sub="Revenue minus operating costs" tone="green" />
              </div>
              <Panel title="Payables & receivables" subtitle="Open purchase orders awaiting settlement">
                <DataTable
                  keyField="id"
                  emptyTitle="NO PAYABLES YET"
                  emptyNote="Supplier invoices and receivables will be tracked here once purchasing transactions begin."
                  columns={[
                    { key: 'id', label: 'Reference' },
                    { key: 'party', label: 'Party' },
                    { key: 'due', label: 'Due' },
                    { key: 'amount', label: 'Amount' }
                  ]}
                  rows={[]}
                />
              </Panel>
            </>
          );
        }

        if (page === 'reports') {
          return (
            <>
              <Panel title="Monthly revenue vs expenses" subtitle="2026 year to date">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={MONTHLY_FINANCE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v, name) => [peso(v), name]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.gold} radius={[3, 3, 0, 0]} barSize={22} />
                    <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.dark} radius={[3, 3, 0, 0]} barSize={22} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Financial reports" subtitle="VAT summaries, income statements, cash flow">
                <EmptyState title="NO FINANCIAL REPORTS YET" note="Month-end reports will be generated automatically once sales and purchasing data flow through the system." />
              </Panel>
            </>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="REVENUE (30 DAYS)" value={peso(sumRange('revenue', 30))} sub="+9.8% vs previous period" />
              <StatCard label="EXPENSES (30 DAYS)" value={peso(sumRange('expenses', 30))} sub="57% of revenue" tone="red" />
              <StatCard label="NET PROFIT (30 DAYS)" value={peso(profit30)} sub={`${margin30}% net margin`} tone="green" />
              <StatCard label="OPEN PAYABLES" value={peso(payables)} sub="Projection from planned purchase orders" tone="purple" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Revenue vs expenses — last 14 days" subtitle="Daily operating results across all channels">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={REVENUE_VS_EXPENSES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v, name) => [peso(v), name]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.dark} radius={[3, 3, 0, 0]} barSize={12} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.gold} strokeWidth={2} fill={CHART_COLORS.gold} fillOpacity={0.14} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.green} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Expense breakdown — August" subtitle="Projected cost distribution">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={EXPENSE_BREAKDOWN}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {EXPENSE_BREAKDOWN.map((entry, i) => (
                        <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="legend-list">
                  {EXPENSE_BREAKDOWN.map((e, i) => (
                    <li key={e.name}>
                      <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                      {e.name} — {e.value}%
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Payables & receivables" subtitle="Open purchase orders awaiting settlement">
              <EmptyState title="NO PAYABLES YET" note="Supplier invoices and receivables will be tracked here once purchasing transactions begin." />
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default AccountantDashboard;
