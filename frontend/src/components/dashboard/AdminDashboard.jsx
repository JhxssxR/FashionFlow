import React, { useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState, StatusBadge, Loading, ErrorNote, Pager, SkeletonCards, StockAlertBanner } from './DashboardShared';
import SavedReportsPanel from './SavedReportsPanel';
import { useApi, api } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate, fmtDateTime, downloadCsv } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.purple, CHART_COLORS.green, '#b9b9b9'];

const LOGS_PAGE_SIZE = 10;
// Overview side-by-side tables page through 8 rows at a time so the two
// panels stay the same height (no stretched white void).
const OVERVIEW_PAGE_SIZE = 8;

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

// Pushes a notification to every active account (or one role) via the
// broadcast API — the admin's megaphone for promos and maintenance notices.
const AnnouncementForm = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api('/api/notifications/broadcast', {
        method: 'POST',
        body: { title, body, role: role || null }
      });
      setMsg(`Announcement sent — delivered to ${res.delivered} account${res.delivered === 1 ? '' : 's'}.`);
      setTitle('');
      setBody('');
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="form-row">
        <input placeholder="Title (e.g. FLASH SALE FRIDAY)" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Send to role">
          <option value="">Everyone (all active accounts)</option>
          {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label} only</option>)}
        </select>
      </div>
      <div className="form-row">
        <input placeholder="Message (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="mini-btn" type="submit" disabled={busy}>{busy ? 'SENDING…' : '📣 SEND ANNOUNCEMENT'}</button>
      </div>
      {err && <ErrorNote message={err} />}
      {msg && <div className="form-ok">{msg}</div>}
    </form>
  );
};

// Delivery tracking: staff move paid or COD orders down the pipeline; the customer's
// bell is notified at every step (see PaymentsController.SetDeliveryStatus).
const getNextDeliveryStep = (order) => {
  if (!order) return null;
  const isCod = order.paymentMethod?.toLowerCase().includes('cash on delivery') || order.paymentMethod?.toLowerCase() === 'cod';
  if (isCod) {
    if (order.status === 'Pending' || order.status === 'Placed' || order.status === 'Confirmed') return 'Shipped';
    if (order.status === 'Shipped') return 'Out for Delivery';
    if (order.status === 'Out for Delivery') return 'Delivered';
    return null;
  }
  if (order.status === 'Paid') return 'Shipped';
  if (order.status === 'Shipped') return 'Out for Delivery';
  if (order.status === 'Out for Delivery') return 'Delivered';
  return null;
};

const OnlineOrders = () => {
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [proof, setProof] = useState(null); // { id, refNo, receiptImage, ... } in the verify modal
  const orders = useApi('/api/orders', [tick]);

  const advance = async (row) => {
    const next = getNextDeliveryStep(row);
    if (!next) return;
    setBusyId(row.id);
    setErr('');
    try {
      await api(`/api/orders/${row.id}/status`, { method: 'PUT', body: { status: next } });
      setTick((t) => t + 1);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId('');
    }
  };

  // Open the receipt modal: ref number + screenshot for this GCash order.
  const viewProof = async (row) => {
    setErr('');
    try {
      const data = await api(`/api/orders/${row.id}/receipt`);
      setProof(data);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  // Staff verdict on submitted GCash proof.
  const verify = async (orderId, approved) => {
    setBusyId(orderId);
    setErr('');
    try {
      await api(`/api/orders/${orderId}/verify-payment`, { method: 'POST', body: { approved } });
      setProof(null);
      setTick((t) => t + 1);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId('');
    }
  };

  const awaitingCount = (orders.data || []).filter((o) => o.status === 'Awaiting Verification').length;

  return (
    <>
      <div className="stat-grid">
        <StatCard label="ONLINE ORDERS" value={num(orders.data?.length)} sub="All storefront orders" />
        <StatCard
          label="AWAITING VERIFICATION"
          value={num(awaitingCount)}
          sub="GCash proofs to check"
          tone="red"
        />
        <StatCard
          label="IN DELIVERY"
          value={num((orders.data || []).filter((o) => o.status === 'Paid' || o.status === 'Shipped' || o.status === 'Out for Delivery' || (o.status === 'Pending' && (o.paymentMethod?.toLowerCase().includes('cash on delivery') || o.paymentMethod?.toLowerCase() === 'cod'))).length)}
          sub="Active orders not yet delivered"
          tone="purple"
        />
      </div>
      <Panel title="Online orders" subtitle="Verify GCash proofs first (Awaiting Verification), then move orders along: Paid/Pending (COD) → Shipped → Out for Delivery → Delivered">
        <ErrorNote message={orders.error || err} />
        {orders.loading && !orders.data ? <Loading /> : (
          <DataTable
            keyField="id"
            emptyTitle="NO ONLINE ORDERS YET"
            emptyNote="Storefront checkouts appear here — POS sales live in the Sales dashboard."
            columns={[
              { key: 'id', label: 'Order' },
              { key: 'date', label: 'Placed', width: 170, render: (r) => fmtDateTime(r.date) },
              { key: 'customer', label: 'Customer' },
              { key: 'items', label: 'Items' },
              { key: 'total', label: 'Total', render: (r) => peso(r.total) },
              { key: 'paymentMethod', label: 'Payment', render: (r) => (<span>{r.paymentMethod}{r.refNo ? <><br /><code>Ref: {r.refNo}</code></> : null}</span>) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'next',
                label: 'Delivery',
                render: (r) => {
                  // GCash proof submitted — inspect the receipt, then decide.
                  if (r.status === 'Awaiting Verification') {
                    return (
                      <div className="verify-btns">
                        <button className="mini-btn" disabled={busyId === r.id} onClick={() => viewProof(r)}>
                          VIEW RECEIPT
                        </button>
                        <button className="mini-btn verify-ok" disabled={busyId === r.id} onClick={() => verify(r.id, true)}>
                          {busyId === r.id ? 'SAVING…' : 'VERIFY ✓'}
                        </button>
                        <button className="mini-btn verify-no" disabled={busyId === r.id} onClick={() => verify(r.id, false)}>
                          REJECT
                        </button>
                      </div>
                    );
                  }
                  const next = getNextDeliveryStep(r);
                  if (next) {
                    const isCodDelivery = next === 'Delivered' && (r.paymentMethod?.toLowerCase().includes('cash on delivery') || r.paymentMethod?.toLowerCase() === 'cod');
                    return (
                      <button
                        className="mini-btn"
                        disabled={busyId === r.id}
                        onClick={() => advance(r)}
                      >
                        {busyId === r.id ? 'SAVING…' : isCodDelivery ? 'MARK DELIVERED & COLLECTED' : `MARK ${next.toUpperCase()}`}
                      </button>
                    );
                  }
                  return r.status === 'Pending' ? 'Awaiting online payment' : (r.status === 'Delivered' ? 'Completed' : '—');
                }
              }
            ]}
            rows={orders.data || []}
          />
        )}
      </Panel>
      {proof && (
        <div className="product-modal-overlay" onClick={() => setProof(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setProof(null)} aria-label="Close">×</button>
            <h3>Payment proof — {proof.id}</h3>
            <p className="receipt-meta">{proof.paymentMethod} · {peso(proof.total)} · {proof.status}</p>
            <p className="receipt-meta">Reference: <code>{proof.refNo || '—'}</code></p>
            {proof.receiptImage ? (
              <img src={proof.receiptImage} alt={`GCash receipt for ${proof.id}`} className="receipt-img" />
            ) : (
              <p className="receipt-meta">No receipt image — verify against the reference number.</p>
            )}
            <div className="verify-btns">
              <button className="mini-btn verify-ok" disabled={busyId === proof.id} onClick={() => verify(proof.id, true)}>
                {busyId === proof.id ? 'SAVING…' : 'VERIFY ✓'}
              </button>
              <button className="mini-btn verify-no" disabled={busyId === proof.id} onClick={() => verify(proof.id, false)}>
                REJECT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const [logsPage, setLogsPage] = useState(1);
  const [overviewUsersPage, setOverviewUsersPage] = useState(1);
  const [overviewStockPage, setOverviewStockPage] = useState(1);

  const usersQ = useApi('/api/users', [usersTick]);
  // 200 = the API's cap; the logs page pages through them 10 at a time.
  const logs = useApi('/api/logs?limit=200', [usersTick]);
  const lowStock = useApi('/api/inventory/low-stock', [usersTick]);

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

  // Overview pagination: clamp the page so it never points past the data.
  const stockRows = lowStock.data?.rows || [];
  const overviewUsersCount = Math.max(1, Math.ceil(userRows.length / OVERVIEW_PAGE_SIZE));
  const overviewUsersSafe = Math.min(overviewUsersPage, overviewUsersCount);
  const overviewStockCount = Math.max(1, Math.ceil(stockRows.length / OVERVIEW_PAGE_SIZE));
  const overviewStockSafe = Math.min(overviewStockPage, overviewStockCount);

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
        if (page === 'orders') {
          return <OnlineOrders />;
        }

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
              <Panel title="Send an announcement" subtitle="Pushes a notification to every account's bell — target one role or everyone">
                <AnnouncementForm />
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
                {sales.loading ? <Loading /> : (
                  <>
                    {revenueChart}
                    <button
                      className="mini-btn"
                      onClick={() => downloadCsv('sales-summary-30days.csv', [
                        { key: 'date', label: 'Date' },
                        { key: 'revenue', label: 'Revenue' },
                        { key: 'orders', label: 'Orders' }
                      ], series)}
                    >
                      DOWNLOAD CSV
                    </button>
                  </>
                )}
              </Panel>

              <SavedReportsPanel role="admin" defaultType="Sales" />
            </>
          );
        }

        if (page === 'logs') {
          const logRows = logs.data || [];
          const logPageCount = Math.max(1, Math.ceil(logRows.length / LOGS_PAGE_SIZE));
          const logPage = Math.min(logsPage, logPageCount);
          return (
            <Panel title="System activity logs" subtitle="Every module action, newest first">
              <ErrorNote message={logs.error} />
              {logs.loading ? <Loading /> : (
                <>
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
                    rows={logRows.slice((logPage - 1) * LOGS_PAGE_SIZE, logPage * LOGS_PAGE_SIZE)}
                  />
                  <Pager
                    page={logPage}
                    pageCount={logPageCount}
                    total={logRows.length}
                    pageSize={LOGS_PAGE_SIZE}
                    onPage={setLogsPage}
                  />
                </>
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
            {sales.loading && !sales.data ? <SkeletonCards count={4} /> : (
            <div className="stat-grid">
              <StatCard label="REVENUE (30 DAYS)" value={peso(totals?.revenue)} sub="Live from the Sales table" />
              <StatCard label="ORDERS (30 DAYS)" value={num(totals?.orders)} sub="Distinct receipts, POS + online" tone="purple" />
              <StatCard label="SYSTEM USERS" value={num(totalUsers)} sub="Staff accounts, customers & suppliers" tone="dark" />
              <StatCard label="LOW STOCK ALERTS" value={num(lowStock.data?.rows?.length)} sub={`Threshold: ${lowStock.data?.threshold ?? '—'} units`} tone="red" />
            </div>
            )}

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
                  <>
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
                      rows={userRows.slice((overviewUsersSafe - 1) * OVERVIEW_PAGE_SIZE, overviewUsersSafe * OVERVIEW_PAGE_SIZE)}
                    />
                    <Pager
                      page={overviewUsersSafe}
                      pageCount={overviewUsersCount}
                      total={userRows.length}
                      pageSize={OVERVIEW_PAGE_SIZE}
                      onPage={setOverviewUsersPage}
                    />
                  </>
                )}
              </Panel>

              <Panel title="Low stock alerts" subtitle="Flagged across modules from live inventory">
                <ErrorNote message={lowStock.error} />
                {lowStock.loading ? <Loading /> : (
                  <>
                  <StockAlertBanner items={lowStock.data?.rows} threshold={lowStock.data?.threshold} />
                  <DataTable
                    keyField="id"
                    emptyTitle="NO STOCK ALERTS"
                    emptyNote="Products at or below the low-stock threshold appear here automatically."
                    columns={[
                      { key: 'name', label: 'Product' },
                      { key: 'variant', label: 'Variant' },
                      { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> }
                    ]}
                    rows={stockRows.slice((overviewStockSafe - 1) * OVERVIEW_PAGE_SIZE, overviewStockSafe * OVERVIEW_PAGE_SIZE)}
                  />
                  <Pager
                    page={overviewStockSafe}
                    pageCount={overviewStockCount}
                    total={stockRows.length}
                    pageSize={OVERVIEW_PAGE_SIZE}
                    onPage={setOverviewStockPage}
                  />
                  </>
                )}
              </Panel>
            </div>

            <Panel
              title="System activity logs"
              subtitle="Every module action, newest first"
              action={<a className="panel-link" href="#dashboard/admin/logs">VIEW ALL →</a>}
            >
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
