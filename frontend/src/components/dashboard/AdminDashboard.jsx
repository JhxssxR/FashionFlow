import React, { useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState, StatusBadge, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate, fmtDateTime } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const ROLE_OPTIONS = [
  ['Admin', 'System Administrator'],
  ['InventoryManager', 'Inventory Manager'],
  ['PurchasingOfficer', 'Purchasing Officer'],
  ['SalesStaff', 'Sales Staff'],
  ['Accountant', 'Accountant'],
  ['Supplier', 'Supplier'],
  ['Customer', 'Customer']
];

const InviteForm = ({ onDone }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('InventoryManager');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api('/api/users', { method: 'POST', body: { name, email, role, password, activate: true } });
      setMsg(`Account created for ${email}.`);
      setName('');
      setEmail('');
      setPassword('');
      onDone();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="form-row">
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="form-row">
        <input type="password" placeholder="Temporary password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button className="mini-btn" type="submit" disabled={busy}>{busy ? 'SAVING…' : '+ INVITE USER'}</button>
      </div>
      {err && <ErrorNote message={err} />}
      {msg && <div className="form-ok">{msg}</div>}
    </form>
  );
};

const SettingsPanel = () => {
  const { data, loading, error, reload } = useApi('/api/settings');
  const [edits, setEdits] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const changes = Object.entries(edits)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => ({ key, value: String(value) }));
      await api('/api/settings', { method: 'PUT', body: changes });
      setEdits({});
      setMsg('Settings saved.');
      reload(true);
    } catch (ex) {
      setMsg(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;

  return (
    <>
      <div className="settings-grid">
        {(data || []).map((s) => (
          <div className="settings-row" key={s.key}>
            <label>{s.key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}</label>
            <input
              type="text"
              value={edits[s.key] !== undefined ? edits[s.key] : s.value}
              onChange={(e) => setEdits((prev) => ({ ...prev, [s.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {msg && <div className="form-ok">{msg}</div>}
      <div className="panel-footnote">Settings are stored in the AppSettings table — changes are logged in System Logs.</div>
      <button className="mini-btn" onClick={save} disabled={busy || Object.keys(edits).length === 0}>
        {busy ? 'SAVING…' : 'SAVE CHANGES'}
      </button>
    </>
  );
};

const AdminDashboard = ({ user }) => {
  const sales = useApi('/api/reports/sales-summary?days=30');
  const byRole = useApi('/api/users/by-role');
  const [usersTick, setUsersTick] = useState(0);
  const usersQ = useApi('/api/users', [usersTick]);
  const logs = useApi('/api/logs?limit=30', [usersTick]);
  const lowStock = useApi('/api/inventory/low-stock', [usersTick]);
  const reports = useApi('/api/reports', [usersTick]);

  const series = sales.data?.series || [];
  const totals = sales.data?.totals;
  const totalUsers = (byRole.data || []).reduce((s, r) => s + r.value, 0);
  const bump = () => setUsersTick((t) => t + 1);

  const userRows = (usersQ.data || []).map((u) => ({
    email: u.email,
    name: u.name,
    role: u.roleLabel,
    status: u.status
  }));

  const revenueChart = (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
  );

  return (
    <DashboardLayout role="admin" user={user}>
      {(page) => {
        if (page === 'users') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="ROLES CONFIGURED" value={ROLE_OPTIONS.length} sub="RBAC enforced on every API endpoint" tone="dark" />
                <StatCard label="REGISTERED USERS" value={num(usersQ.data?.length)} sub="Accounts in the Users table" tone="plain" />
              </div>
              <Panel title="Invite a user" subtitle="Creates the account with a BCrypt-hashed password">
                <InviteForm onDone={bump} />
              </Panel>
              <Panel title="Users & roles" subtitle="Every account in the system, across all modules">
                <ErrorNote message={usersQ.error} />
                {usersQ.loading && !usersQ.data ? <Loading /> : (
                  <DataTable
                    keyField="email"
                    emptyTitle="NO USERS YET"
                    emptyNote="Invite team members above — they will appear here immediately."
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'role', label: 'Role' },
                      { key: 'email', label: 'Email' },
                      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                    ]}
                    rows={userRows}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'reports') {
          return (
            <>
              <Panel title="Revenue — last 30 days" subtitle="System-wide reporting across storefront, POS and online orders">
                <ErrorNote message={sales.error} />
                {sales.loading ? <Loading /> : revenueChart}
              </Panel>
              <Panel title="Saved reports" subtitle="Generated and archived reports">
                <ErrorNote message={reports.error} />
                {reports.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO REPORTS GENERATED YET"
                    emptyNote="Sales, inventory and financial reports will be archived here."
                    columns={[
                      { key: 'title', label: 'Title' },
                      { key: 'type', label: 'Type' },
                      { key: 'date', label: 'Generated', render: (r) => fmtDateTime(r.date) },
                      { key: 'generatedBy', label: 'By' }
                    ]}
                    rows={reports.data || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'logs') {
          return (
            <Panel title="System activity logs" subtitle="Every module action, newest first">
              <ErrorNote message={logs.error} />
              {logs.loading ? <Loading /> : (
                <DataTable
                  keyField="id"
                  emptyTitle="NO ACTIVITY LOGGED YET"
                  emptyNote="Sign-ins, sales, stock movements and configuration changes are recorded automatically."
                  columns={[
                    { key: 'time', label: 'Time', width: 180, render: (r) => fmtDateTime(r.time) },
                    { key: 'user', label: 'User' },
                    { key: 'action', label: 'Action' },
                    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type === 'Auth' ? 'Active' : r.type} /> }
                  ]}
                  rows={logs.data || []}
                />
              )}
            </Panel>
          );
        }

        if (page === 'settings') {
          return (
            <Panel title="System settings" subtitle="Store-wide configuration">
              <SettingsPanel />
            </Panel>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="REVENUE (30 DAYS)" value={peso(totals?.revenue)} sub="Live from the Sales table" />
              <StatCard label="ORDERS (30 DAYS)" value={num(totals?.orders)} sub="Distinct receipts, POS + online" tone="purple" />
              <StatCard label="SYSTEM USERS" value={num(totalUsers)} sub="Staff accounts, customers & suppliers" tone="dark" />
              <StatCard label="LOW STOCK ALERTS" value={num(lowStock.data?.rows?.length)} sub={`Threshold: ${lowStock.data?.threshold ?? '—'} units`} tone="red" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Revenue — last 30 days" subtitle="All channels: storefront, POS and online orders">
                <ErrorNote message={sales.error} />
                {sales.loading ? <Loading /> : revenueChart}
              </Panel>

              <Panel title="Users by role" subtitle="Access distribution">
                <ErrorNote message={byRole.error} />
                {byRole.loading ? <Loading /> : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={byRole.data || []}
                          dataKey="value"
                          nameKey="role"
                          innerRadius={62}
                          outerRadius={95}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {(byRole.data || []).map((entry, i) => (
                            <Cell key={entry.role} fill={donutColors[i % donutColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => num(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="legend-list">
                      {(byRole.data || []).map((r, i) => (
                        <li key={r.role}>
                          <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                          {r.role} — {num(r.value)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            </div>

            <div className="panel-grid panel-grid-1-1">
              <Panel title="Employees & accounts" subtitle="People with ERP access">
                <ErrorNote message={usersQ.error} />
                {usersQ.loading && !usersQ.data ? <Loading /> : (
                  <DataTable
                    keyField="email"
                    emptyTitle="NO EMPLOYEE ACCOUNTS YET"
                    emptyNote="Invite team members from the Users & Roles page."
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'role', label: 'Role' },
                      { key: 'email', label: 'Email' },
                      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                    ]}
                    rows={userRows}
                  />
                )}
              </Panel>

              <Panel title="Low stock alerts" subtitle="Flagged across modules from live inventory">
                <ErrorNote message={lowStock.error} />
                {lowStock.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO STOCK ALERTS"
                    emptyNote="Products at or below the low-stock threshold appear here automatically."
                    columns={[
                      { key: 'name', label: 'Product' },
                      { key: 'variant', label: 'Variant' },
                      { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> }
                    ]}
                    rows={lowStock.data?.rows || []}
                  />
                )}
              </Panel>
            </div>

            <Panel title="System activity logs" subtitle="Every module action, newest first">
              <ErrorNote message={logs.error} />
              {logs.loading ? <Loading /> : (
                <DataTable
                  keyField="id"
                  emptyTitle="NO ACTIVITY LOGGED YET"
                  columns={[
                    { key: 'time', label: 'Time', width: 180, render: (r) => fmtDateTime(r.time) },
                    { key: 'user', label: 'User' },
                    { key: 'action', label: 'Action' },
                    { key: 'type', label: 'Type' }
                  ]}
                  rows={(logs.data || []).slice(0, 8)}
                />
              )}
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default AdminDashboard;
