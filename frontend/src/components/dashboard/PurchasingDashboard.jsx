import React from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge } from './DashboardShared';
import {
  peso, PURCHASE_ORDERS, SUPPLIERS, DAILY, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

const SPEND_TREND = DAILY.slice(-14).map((d, i) => ({
  date: d.date,
  spend: Math.round((i % 4 === 0 ? 32000 : 8500) + (i * 420) % 9000)
}));

const poByStatus = ['Pending', 'In Transit', 'Delivered', 'Cancelled'].map((status) => ({
  status,
  value: PURCHASE_ORDERS.filter((p) => p.status === status).length
}));

const PurchasingDashboard = () => {
  const openSpend = PURCHASE_ORDERS.filter((p) => p.status !== 'Cancelled')
    .reduce((s, p) => s + p.amount, 0);
  const pending = PURCHASE_ORDERS.filter((p) => p.status === 'Pending').length;

  return (
    <DashboardLayout role="purchasing">
      <div className="stat-grid">
        <StatCard label="OPEN PO VALUE" value={peso(openSpend)} sub={`${PURCHASE_ORDERS.length - 1} active purchase orders`} />
        <StatCard label="AWAITING APPROVAL" value={pending} sub="Pending supplier confirmation" tone="red" />
        <StatCard label="ACTIVE SUPPLIERS" value={SUPPLIERS.length} sub="Avg on-time rate 92%" tone="purple" />
        <StatCard label="SPEND (14 DAYS)" value={peso(SPEND_TREND.reduce((s, d) => s + d.spend, 0))} sub="Across all suppliers" tone="dark" />
      </div>

      <div className="panel-grid panel-grid-2-1">
        <Panel title="Purchasing spend — last 14 days" subtitle="Outbound to suppliers">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={SPEND_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART_COLORS.purple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => [peso(v), 'Spend']} />
              <Area type="monotone" dataKey="spend" stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#spendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="POs by status" subtitle="Current pipeline">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={poByStatus}
                dataKey="value"
                nameKey="status"
                innerRadius={58}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >
                {poByStatus.map((entry, i) => (
                  <Cell key={entry.status} fill={donutColors[i % donutColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend-list">
            {poByStatus.map((s, i) => (
              <li key={s.status}>
                <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                {s.status} — {s.value}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Purchase orders" subtitle="All purchasing transactions" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ NEW PURCHASE ORDER</a>}>
        <DataTable
          keyField="id"
          columns={[
            { key: 'id', label: 'Reference' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'items', label: 'Items' },
            { key: 'date', label: 'Issued', width: '130px' },
            { key: 'amount', label: 'Amount', render: (r) => <strong>{peso(r.amount)}</strong> },
            { key: 'status', label: 'Status', width: '130px', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          rows={PURCHASE_ORDERS}
        />
      </Panel>

      <Panel title="Supplier directory" subtitle="Coordination contacts and performance">
        <DataTable
          keyField="id"
          columns={[
            { key: 'name', label: 'Supplier' },
            { key: 'contact', label: 'Contact person' },
            { key: 'email', label: 'Email' },
            { key: 'category', label: 'Specialty' },
            { key: 'onTime', label: 'On-time rate', render: (r) => `${r.onTime}%` },
            { key: 'rating', label: 'Rating', render: (r) => `★ ${r.rating}` }
          ]}
          rows={SUPPLIERS}
        />
      </Panel>
    </DashboardLayout>
  );
};

export default PurchasingDashboard;
