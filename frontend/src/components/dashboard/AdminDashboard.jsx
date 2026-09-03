import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge } from './DashboardShared';
import {
  DAILY, peso, sumRange, EMPLOYEES, USERS_BY_ROLE, SYSTEM_LOGS,
  LOW_STOCK, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const AdminDashboard = () => {
  const revenue30 = sumRange('revenue', 30);
  const orders30 = sumRange('orders', 30);
  const visitors30 = sumRange('visitors', 30);
  const totalUsers = USERS_BY_ROLE.reduce((s, r) => s + r.value, 0);

  return (
    <DashboardLayout role="admin">
      <div className="stat-grid">
        <StatCard label="REVENUE (30 DAYS)" value={peso(revenue30)} sub="+12.4% vs previous period" />
        <StatCard label="ORDERS (30 DAYS)" value={orders30.toLocaleString('en-PH')} sub={`${Math.round(orders30 / 30)} per day average`} tone="purple" />
        <StatCard label="SYSTEM USERS" value={totalUsers.toLocaleString('en-PH')} sub={`${EMPLOYEES.length} staff & supplier accounts`} tone="dark" />
        <StatCard label="STORE VISITORS (30 DAYS)" value={visitors30.toLocaleString('en-PH')} sub="Across storefront & POS" tone="plain" />
      </div>

      <div className="panel-grid panel-grid-2-1">
        <Panel title="Revenue — last 30 days" subtitle="All channels: storefront, POS and online orders">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={DAILY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => [peso(v), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.gold} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Users by role" subtitle="Accounts across the ERP & CRM">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={USERS_BY_ROLE}
                dataKey="value"
                nameKey="role"
                innerRadius={62}
                outerRadius={95}
                paddingAngle={2}
                stroke="none"
              >
                {USERS_BY_ROLE.map((entry, i) => (
                  <Cell key={entry.role} fill={donutColors[i % donutColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString('en-PH')} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend-list">
            {USERS_BY_ROLE.map((r, i) => (
              <li key={r.role}>
                <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                {r.role} — {r.value.toLocaleString('en-PH')}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="panel-grid panel-grid-1-1">
        <Panel title="Employees & accounts" subtitle="People with ERP access" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>MANAGE ROLES →</a>}>
          <DataTable
            keyField="email"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
            ]}
            rows={EMPLOYEES}
          />
        </Panel>

        <Panel title="Low stock alerts" subtitle="Flagged to the admin across modules" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>VIEW INVENTORY →</a>}>
          <DataTable
            keyField="id"
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'variant', label: 'Variant' },
              { key: 'stock', label: 'Stock', render: (r) => <strong className="danger-text">{r.stock} left</strong> }
            ]}
            rows={LOW_STOCK.slice(0, 6)}
          />
        </Panel>
      </div>

      <Panel title="System activity logs" subtitle="Every module action, newest first">
        <DataTable
          keyField="time"
          columns={[
            { key: 'time', label: 'When', width: '160px' },
            { key: 'user', label: 'User', width: '240px' },
            { key: 'action', label: 'Action' },
            { key: 'type', label: 'Module', width: '130px', render: (r) => <StatusBadge status={r.type} /> }
          ]}
          rows={SYSTEM_LOGS}
        />
      </Panel>
    </DashboardLayout>
  );
};

export default AdminDashboard;
