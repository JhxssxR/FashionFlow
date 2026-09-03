import React from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import {
  DAILY, peso, sumRange, USERS_BY_ROLE, ROLE_CREDENTIALS, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const EMPTY = 'No registered users yet — accounts will appear here once the C# database is connected.';

const AdminDashboard = () => {
  const revenue30 = sumRange('revenue', 30);
  const orders30 = sumRange('orders', 30);
  const visitors30 = sumRange('visitors', 30);
  const totalUsers = USERS_BY_ROLE.reduce((s, r) => s + r.value, 0);

  return (
    <DashboardLayout role="admin">
      {(page) => {
        if (page === 'users') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="ROLES CONFIGURED" value={ROLE_CREDENTIALS.length} sub="Admin, Inventory, Purchasing, POS, Customer, Finance, Supplier" tone="dark" />
                <StatCard label="REGISTERED USERS" value="0" sub="Waiting for the database" tone="plain" />
              </div>
              <Panel title="Users & roles" subtitle="Every account in the system, across all modules" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ INVITE USER</a>}>
                <DataTable
                  keyField="email"
                  emptyTitle="NO USERS YET"
                  emptyNote={EMPTY}
                  columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'role', label: 'Role' },
                    { key: 'email', label: 'Email' },
                    { key: 'status', label: 'Status' }
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
              <Panel title="Revenue — last 30 days" subtitle="System-wide reporting across storefront, POS and online orders">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={DAILY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={6} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v) => [peso(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.gold} strokeWidth={2} fill="url(#revGradR)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Saved reports" subtitle="Generated and archived reports">
                <EmptyState title="NO REPORTS GENERATED YET" note="Sales, inventory and financial reports will be archived here once transactions flow through the system." />
              </Panel>
            </>
          );
        }

        if (page === 'logs') {
          return (
            <Panel title="System activity logs" subtitle="Every module action, newest first">
              <EmptyState title="NO ACTIVITY LOGGED YET" note="Sign-ins, sales, stock movements and configuration changes will be recorded here as the system is used." />
            </Panel>
          );
        }

        if (page === 'settings') {
          return (
            <Panel title="System settings" subtitle="Store-wide configuration" action={<button className="mini-btn" onClick={(e) => e.preventDefault()}>SAVE CHANGES</button>}>
              <div className="settings-grid">
                <div className="settings-row">
                  <label>STORE NAME</label>
                  <input type="text" defaultValue="FashionFlow" readOnly />
                </div>
                <div className="settings-row">
                  <label>CURRENCY</label>
                  <input type="text" defaultValue="Philippine Peso (₱) — PHP" readOnly />
                </div>
                <div className="settings-row">
                  <label>LOYALTY EARN RATE</label>
                  <input type="text" defaultValue="1 point per ₱100 spent" readOnly />
                </div>
                <div className="settings-row">
                  <label>LOW-STOCK THRESHOLD</label>
                  <input type="text" defaultValue="12 units" readOnly />
                </div>
                <div className="settings-row">
                  <label>VAT RATE</label>
                  <input type="text" defaultValue="12% (inclusive)" readOnly />
                </div>
              </div>
              <div className="panel-footnote">Settings become editable once the backend configuration service is connected.</div>
            </Panel>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="REVENUE (30 DAYS)" value={peso(revenue30)} sub="+12.4% vs previous period" />
              <StatCard label="ORDERS (30 DAYS)" value={orders30.toLocaleString('en-PH')} sub={`${Math.round(orders30 / 30)} per day average`} tone="purple" />
              <StatCard label="SYSTEM USERS" value={totalUsers.toLocaleString('en-PH')} sub="Projection once modules are live" tone="dark" />
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

              <Panel title="Users by role" subtitle="Planned access distribution">
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
                  emptyTitle="NO EMPLOYEE ACCOUNTS YET"
                  emptyNote={EMPTY}
                  columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'role', label: 'Role' },
                    { key: 'email', label: 'Email' },
                    { key: 'status', label: 'Status' }
                  ]}
                  rows={[]}
                />
              </Panel>

              <Panel title="Low stock alerts" subtitle="Flagged to the admin across modules" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>VIEW INVENTORY →</a>}>
                <EmptyState title="NO STOCK ALERTS YET" note="Products that fall below the low-stock threshold will be flagged here automatically." />
              </Panel>
            </div>

            <Panel title="System activity logs" subtitle="Every module action, newest first">
              <EmptyState title="NO ACTIVITY LOGGED YET" note="Sign-ins, sales, stock movements and configuration changes will be recorded here as the system is used." />
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default AdminDashboard;
