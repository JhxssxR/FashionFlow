import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

const NewPOForm = ({ suppliers, products, onDone }) => {
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [eta, setEta] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const pickProduct = (id) => {
    setProductId(id);
    const p = (products || []).find((x) => String(x.id) === id);
    if (p) setUnitCost(Math.round(p.price * 0.65)); // suggested wholesale cost
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await api('/api/purchase-orders', {
        method: 'POST',
        body: {
          supplierId: Number(supplierId),
          productId: Number(productId),
          quantity: Number(quantity),
          unitCost: Number(unitCost),
          eta: eta || null
        }
      });
      setOk(`${res.id} created — ₱${Number(res.amount).toLocaleString('en-PH')}`);
      setQuantity('');
      setUnitCost('');
      setEta('');
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
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
          <option value="">Supplier…</option>
          {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={productId} onChange={(e) => pickProduct(e.target.value)} required>
          <option value="">Product…</option>
          {(products || []).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.variant}</option>)}
        </select>
        <input type="number" min="1" placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        <input type="number" min="1" placeholder="Unit cost ₱" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required />
        <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
        <button className="mini-btn" type="submit" disabled={busy}>{busy ? 'SAVING…' : '+ NEW PURCHASE ORDER'}</button>
      </div>
      {err && <ErrorNote message={err} />}
      {ok && <div className="form-ok">{ok}</div>}
    </form>
  );
};

const PurchasingDashboard = ({ user }) => {
  const [tick, setTick] = useState(0);
  const pos = useApi('/api/purchase-orders', [tick]);
  const suppliers = useApi('/api/suppliers', [tick]);
  const products = useApi('/api/products', []);
  const spend = useApi('/api/reports/purchasing-summary?days=14', [tick]);
  const bump = () => setTick((t) => t + 1);

  const rows = pos.data || [];
  const openSpend = rows.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + p.amount, 0);
  const pending = rows.filter((p) => p.status === 'Pending').length;
  const poByStatus = ['Pending', 'In Transit', 'Delivered', 'Cancelled'].map((status) => ({
    status,
    value: rows.filter((p) => p.status === status).length
  }));
  const onTimeData = (suppliers.data || []).map((s) => ({ name: s.name, onTime: s.onTime }));
  const avgOnTime = (suppliers.data || []).length
    ? Math.round((suppliers.data || []).reduce((s, x) => s + x.onTime, 0) / suppliers.data.length)
    : 0;

  const spendChart = (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={spend.data?.series || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
  );

  const poTable = (rowsToShow) => (
    <DataTable
      keyField="id"
      emptyTitle="NO PURCHASE ORDERS YET"
      emptyNote="Create a purchase order above to coordinate stock replenishment with your suppliers."
      columns={[
        { key: 'id', label: 'Reference' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'items', label: 'Items', render: (r) => `${r.productName} ×${r.quantity}` },
        { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) },
        { key: 'issuedDate', label: 'Issued', render: (r) => fmtDate(r.issuedDate) },
        { key: 'status', label: 'Status' }
      ]}
      rows={rowsToShow}
    />
  );

  return (
    <DashboardLayout role="purchasing" user={user}>
      {(page) => {
        if (page === 'orders') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="OPEN PO VALUE" value={peso(openSpend)} sub={`${rows.filter((p) => p.status !== 'Cancelled' && p.status !== 'Delivered').length} active orders`} />
                <StatCard label="AWAITING APPROVAL" value={num(pending)} sub="Pending supplier confirmation" tone="red" />
              </div>
              <Panel title="Issue a purchase order" subtitle="Unit cost is suggested at 65% of retail — edit freely">
                <NewPOForm suppliers={suppliers.data} products={products.data} onDone={bump} />
              </Panel>
              <Panel title="Purchasing spend — last 14 days" subtitle="Outbound to suppliers, from issued POs">
                <ErrorNote message={spend.error} />
                {spend.loading ? <Loading /> : spendChart}
              </Panel>
              <Panel title="Purchase orders" subtitle="All purchasing transactions">
                <ErrorNote message={pos.error} />
                {pos.loading && !pos.data ? <Loading /> : poTable(rows)}
              </Panel>
            </>
          );
        }

        if (page === 'suppliers') {
          return (
            <>
              <Panel title="Supplier on-time delivery rate" subtitle="Performance across the supplier network">
                <ErrorNote message={suppliers.error} />
                {suppliers.loading ? <Loading /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={onTimeData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={150} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="onTime" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title="Supplier directory" subtitle="Coordination contacts and performance">
                <ErrorNote message={suppliers.error} />
                {suppliers.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO SUPPLIERS ONBOARDED YET"
                    emptyNote="Supplier contacts, specialties and performance ratings appear here once onboarded."
                    columns={[
                      { key: 'name', label: 'Supplier' },
                      { key: 'contact', label: 'Contact person' },
                      { key: 'email', label: 'Email' },
                      { key: 'category', label: 'Specialty' },
                      { key: 'rating', label: 'Rating', render: (r) => `★ ${r.rating}` }
                    ]}
                    rows={suppliers.data || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'tracking') {
          const tracking = rows.slice(0, 12);
          return (
            <>
              <div className="panel-grid panel-grid-2-1">
                <Panel title="POs by status" subtitle="Current pipeline">
                  <ErrorNote message={pos.error} />
                  {pos.loading ? <Loading /> : (
                    <>
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
                    </>
                  )}
                </Panel>
                <Panel title="Transaction tracking" subtitle="Follow every purchasing stage">
                  <DataTable
                    keyField="id"
                    emptyTitle="NO TRANSACTIONS TO TRACK YET"
                    emptyNote="Purchase order progress — issued, confirmed, in transit, delivered — appears here."
                    columns={[
                      { key: 'id', label: 'Reference' },
                      { key: 'status', label: 'Stage' }
                    ]}
                    rows={tracking.map((r) => ({ id: r.id, status: r.status }))}
                  />
                </Panel>
              </div>
            </>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="OPEN PO VALUE" value={peso(openSpend)} sub={`${rows.length} purchase orders on file`} />
              <StatCard label="AWAITING APPROVAL" value={num(pending)} sub="Pending supplier confirmation" tone="red" />
              <StatCard label="ACTIVE SUPPLIERS" value={num(suppliers.data?.length)} sub={`Avg on-time rate ${avgOnTime}%`} tone="purple" />
              <StatCard label="SPEND (14 DAYS)" value={peso(spend.data?.total)} sub="From issued purchase orders" tone="dark" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Purchasing spend — last 14 days" subtitle="Outbound to suppliers">
                <ErrorNote message={spend.error} />
                {spend.loading ? <Loading /> : spendChart}
              </Panel>

              <Panel title="POs by status" subtitle="Current pipeline">
                {pos.loading ? <Loading /> : (
                  <>
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
                  </>
                )}
              </Panel>
            </div>

            <Panel title="Issue a purchase order" subtitle="Creates a Pending order the supplier sees in their portal">
              <NewPOForm suppliers={suppliers.data} products={products.data} onDone={bump} />
            </Panel>

            <Panel title="Purchase orders" subtitle="All purchasing transactions">
              <ErrorNote message={pos.error} />
              {pos.loading && !pos.data ? <Loading /> : poTable(rows.slice(0, 10))}
            </Panel>

            <Panel title="Supplier directory" subtitle="Coordination contacts and performance">
              <ErrorNote message={suppliers.error} />
              {suppliers.loading ? <Loading /> : (
                <DataTable
                  keyField="id"
                  emptyTitle="NO SUPPLIERS ONBOARDED YET"
                  emptyNote="Supplier contacts, specialties and performance ratings appear here once onboarded."
                  columns={[
                    { key: 'name', label: 'Supplier' },
                    { key: 'contact', label: 'Contact person' },
                    { key: 'email', label: 'Email' },
                    { key: 'category', label: 'Specialty' }
                  ]}
                  rows={suppliers.data || []}
                />
              )}
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default PurchasingDashboard;
