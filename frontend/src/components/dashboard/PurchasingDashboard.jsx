import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import {
  peso, PURCHASE_ORDERS, SUPPLIERS, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

const SPEND_TREND = DAILY_SPEND();
function DAILY_SPEND() {
  // Deterministic 14-day spend projection
  const out = [];
  for (let i = 13; i >= 0; i--) {
    out.push({ date: `D-${i}`, spend: (i % 4 === 0 ? 32000 : 8500) + ((13 - i) * 420) % 9000 });
  }
  return out;
}

const poByStatus = ['Pending', 'In Transit', 'Delivered', 'Cancelled'].map((status) => ({
  status,
  value: PURCHASE_ORDERS.filter((p) => p.status === status).length
}));

const onTimeData = SUPPLIERS.map((s) => ({ name: s.name, onTime: s.onTime }));

const PurchasingDashboard = () => {
  const openSpend = PURCHASE_ORDERS.filter((p) => p.status !== 'Cancelled')
    .reduce((s, p) => s + p.amount, 0);
  const pending = PURCHASE_ORDERS.filter((p) => p.status === 'Pending').length;

  return (
    <DashboardLayout role="purchasing">
      {(page) => {
        if (page === 'orders') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="OPEN PO VALUE" value={peso(openSpend)} sub="Projected from planned orders" />
                <StatCard label="AWAITING APPROVAL" value={pending} sub="Pending supplier confirmation" tone="red" />
              </div>
              <Panel title="Purchasing spend — last 14 days" subtitle="Outbound to suppliers">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={SPEND_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGradO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART_COLORS.purple} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v) => [peso(v), 'Spend']} />
                    <Area type="monotone" dataKey="spend" stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#spendGradO)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Purchase orders" subtitle="All purchasing transactions" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ NEW PURCHASE ORDER</a>}>
                <DataTable
                  keyField="id"
                  emptyTitle="NO PURCHASE ORDERS YET"
                  emptyNote="Create a purchase order to coordinate stock replenishment with your suppliers."
                  columns={[
                    { key: 'id', label: 'Reference' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'items', label: 'Items' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'status', label: 'Status' }
                  ]}
                  rows={[]}
                />
              </Panel>
            </>
          );
        }

        if (page === 'suppliers') {
          return (
            <>
              <Panel title="Supplier on-time delivery rate" subtitle="Performance across the supplier network">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={onTimeData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={150} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="onTime" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Supplier directory" subtitle="Coordination contacts and performance" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ ADD SUPPLIER</a>}>
                <DataTable
                  keyField="id"
                  emptyTitle="NO SUPPLIERS ONBOARDED YET"
                  emptyNote="Supplier contacts, specialties and performance ratings will appear here once onboarded."
                  columns={[
                    { key: 'name', label: 'Supplier' },
                    { key: 'contact', label: 'Contact person' },
                    { key: 'email', label: 'Email' },
                    { key: 'category', label: 'Specialty' }
                  ]}
                  rows={[]}
                />
              </Panel>
            </>
          );
        }

        if (page === 'tracking') {
          return (
            <>
              <div className="panel-grid panel-grid-2-1">
                <Panel title="POs by status" subtitle="Current pipeline">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={poByStatus}
                        dataKey="value"
                        nameKey="status"
                        innerRadius={62}
                        outerRadius={95}
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
                <Panel title="Transaction tracking" subtitle="Follow every purchasing stage">
                  <EmptyState title="NO TRANSACTIONS TO TRACK YET" note="Purchase order progress — issued, confirmed, in transit, delivered — will appear here." />
                </Panel>
              </div>
            </>
          );
        }

        // overview
        return (
          <>
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
                emptyTitle="NO PURCHASE ORDERS YET"
                emptyNote="Create a purchase order to coordinate stock replenishment with your suppliers."
                columns={[
                  { key: 'id', label: 'Reference' },
                  { key: 'supplier', label: 'Supplier' },
                  { key: 'items', label: 'Items' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' }
                ]}
                rows={[]}
              />
            </Panel>

            <Panel title="Supplier directory" subtitle="Coordination contacts and performance">
              <DataTable
                keyField="id"
                emptyTitle="NO SUPPLIERS ONBOARDED YET"
                emptyNote="Supplier contacts, specialties and performance ratings will appear here once onboarded."
                columns={[
                  { key: 'name', label: 'Supplier' },
                  { key: 'contact', label: 'Contact person' },
                  { key: 'email', label: 'Email' },
                  { key: 'category', label: 'Specialty' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default PurchasingDashboard;
