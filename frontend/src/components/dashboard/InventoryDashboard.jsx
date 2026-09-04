import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate, fmtDateTime } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

const movementSeries = (data) => (
  <ResponsiveContainer width="100%" height={270}>
    <AreaChart data={data || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.4} />
          <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.red} stopOpacity={0.4} />
          <stop offset="100%" stopColor={CHART_COLORS.red} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
      <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} />
      <Tooltip />
      <Area type="monotone" dataKey="stockIn" name="Stock in" stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#inGrad)" />
      <Area type="monotone" dataKey="stockOut" name="Stock out" stroke={CHART_COLORS.red} strokeWidth={2} fill="url(#outGrad)" />
    </AreaChart>
  </ResponsiveContainer>
);

const AddProductForm = ({ onDone }) => {
  const empty = { name: '', variant: '', price: '', category: 'Outerwear', storefrontCategory: 'Outerwear', stock: '', imageUrl: '' };
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/api/products', {
        method: 'POST',
        body: {
          name: form.name,
          variant: form.variant,
          price: Number(form.price),
          originalPrice: null,
          stock: Number(form.stock),
          category: form.category,
          storefrontCategory: form.storefrontCategory,
          imageUrl: form.imageUrl,
          isNew: true
        }
      });
      setForm(empty);
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
        <input placeholder="Product name" value={form.name} onChange={set('name')} required />
        <input placeholder="Variant (e.g. Medium / Brown)" value={form.variant} onChange={set('variant')} required />
        <input type="number" min="1" step="0.01" placeholder="Price ₱" value={form.price} onChange={set('price')} required />
        <input type="number" min="0" placeholder="Opening stock" value={form.stock} onChange={set('stock')} required />
      </div>
      <div className="form-row">
        <select value={form.category} onChange={set('category')}>
          {['Outerwear', 'Dresses', 'Bottoms', 'Shirts', 'Tops'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={form.storefrontCategory} onChange={set('storefrontCategory')}>
          {['Women', 'Men', 'Outerwear'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Image URL (verify it loads)" value={form.imageUrl} onChange={set('imageUrl')} required />
        <button className="mini-btn" type="submit" disabled={busy}>{busy ? 'SAVING…' : '+ ADD PRODUCT'}</button>
      </div>
      {err && <ErrorNote message={err} />}
    </form>
  );
};

const InventoryDashboard = ({ user }) => {
  const [tick, setTick] = useState(0);
  const products = useApi('/api/products', [tick]);
  const summary = useApi('/api/inventory/summary', [tick]);
  const series = useApi('/api/inventory/movement-series?days=14', [tick]);
  const movements = useApi('/api/inventory/movements?limit=40', [tick]);
  const deliveries = useApi('/api/purchase-orders', [tick]);
  const lowStock = useApi('/api/inventory/low-stock', [tick]);
  const [adjustMsg, setAdjustMsg] = useState('');
  const bump = () => setTick((t) => t + 1);

  const adjust = async (product) => {
    const input = window.prompt(`New on-hand quantity for “${product.name}” (currently ${product.stock}):`, product.stock);
    if (input === null) return;
    try {
      await api('/api/inventory/adjust', { method: 'POST', body: { productId: product.id, newQuantity: Number(input) } });
      setAdjustMsg(`${product.name} set to ${input} units.`);
      bump();
    } catch (ex) {
      setAdjustMsg(ex.message);
    }
  };

  const incoming = (deliveries.data || []).filter((p) => p.status === 'In Transit' || p.status === 'Pending');
  const deliveredRows = (deliveries.data || []).filter((p) => p.status === 'Delivered').slice(0, 8);

  return (
    <DashboardLayout role="inventory" user={user}>
      {(page) => {
        if (page === 'products') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="PRODUCT RECORDS" value={num(products.data?.length)} sub="Live from the Products table" />
                <StatCard label="CATEGORIES" value={new Set((products.data || []).map((p) => p.category)).size} sub="Outerwear, Dresses, Bottoms, Shirts, Tops" tone="purple" />
                <StatCard label="ACTIVE VARIANTS" value={num((products.data || []).filter((p) => p.isActive !== false).length)} sub="One size/variant per product initially" tone="dark" />
              </div>
              <Panel title="Add a product" subtitle="Creates the catalog record and its warehouse stock row">
                <AddProductForm onDone={bump} />
              </Panel>
              <Panel title="Products & variants" subtitle="Product catalog with size/variant management">
                {adjustMsg && <div className="form-ok">{adjustMsg}</div>}
                <ErrorNote message={products.error} />
                {products.loading && !products.data ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO PRODUCTS ENCODED YET"
                    emptyNote="Add your first product above."
                    columns={[
                      { key: 'name', label: 'Product' },
                      { key: 'variant', label: 'Variant' },
                      { key: 'price', label: 'Price', render: (r) => peso(r.price) },
                      { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> },
                      {
                        key: 'actions', label: '', render: (r) => (
                          <button className="mini-btn" onClick={() => adjust(r)}>ADJUST</button>
                        )
                      }
                    ]}
                    rows={products.data || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'movements') {
          return (
            <>
              <Panel title="Stock movements — last 14 days" subtitle="Units received vs units sold">
                <ErrorNote message={series.error} />
                {series.loading ? <Loading /> : movementSeries(series.data)}
              </Panel>
              <Panel title="Movement log" subtitle="Every stock in/out transaction">
                <ErrorNote message={movements.error} />
                {movements.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO MOVEMENTS YET"
                    emptyNote="Receiving deliveries and processing sales record stock movements automatically."
                    columns={[
                      { key: 'date', label: 'When', width: 180, render: (r) => fmtDateTime(r.date) },
                      { key: 'product', label: 'Product' },
                      { key: 'direction', label: 'Direction' },
                      { key: 'quantity', label: 'Units' },
                      { key: 'reference', label: 'Reference' }
                    ]}
                    rows={movements.data || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'deliveries') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="EXPECTED DELIVERIES" value={num(incoming.length)} sub="From active purchase orders" />
                <StatCard label="DELIVERED (RECENT)" value={num(deliveredRows.length)} sub="Received into stock automatically" tone="purple" />
              </div>
              <Panel title="Incoming supplier deliveries" subtitle="Purchase orders expected at the warehouse">
                <ErrorNote message={deliveries.error} />
                {deliveries.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO DELIVERIES YET"
                    emptyNote="Once purchase orders are issued, expected deliveries and their ETAs appear here."
                    columns={[
                      { key: 'id', label: 'PO Reference' },
                      { key: 'supplier', label: 'Supplier' },
                      { key: 'items', label: 'Items', render: (r) => `${r.productName} ×${r.quantity}` },
                      { key: 'eta', label: 'ETA', render: (r) => fmtDate(r.eta) },
                      { key: 'status', label: 'Status' }
                    ]}
                    rows={incoming}
                  />
                )}
              </Panel>
              <Panel title="Recently received" subtitle="Delivered purchase orders now in stock">
                <DataTable
                  keyField="id"
                  emptyTitle="NOTHING RECEIVED YET"
                  emptyNote="Delivered purchase orders land here with their receiving date."
                  columns={[
                    { key: 'id', label: 'PO Reference' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'items', label: 'Items', render: (r) => `${r.productName} ×${r.quantity}` },
                    { key: 'deliveredDate', label: 'Received', render: (r) => fmtDate(r.deliveredDate) },
                    { key: 'status', label: 'Status' }
                  ]}
                  rows={deliveredRows}
                />
              </Panel>
            </>
          );
        }

        if (page === 'reports') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="UNITS ON HAND" value={num(summary.data?.totalUnits)} sub="Live warehouse count" />
                <StatCard label="STOCK VALUE" value={peso(summary.data?.stockValue)} sub="At retail pricing" tone="green" />
              </div>
              <Panel title="Stock by category" subtitle="Units on hand per category">
                <ErrorNote message={summary.error} />
                {summary.loading ? <Loading /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={summary.data?.byCategory || []} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="category" tick={AXIS} tickLine={false} axisLine={false} width={76} />
                      <Tooltip />
                      <Bar dataKey="stock" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title="Critical stock alerts" subtitle="Reorder before these run out">
                <DataTable
                  keyField="id"
                  emptyTitle="NO STOCK ALERTS"
                  emptyNote="Products at or below the threshold appear here automatically."
                  columns={[
                    { key: 'name', label: 'Product' },
                    { key: 'variant', label: 'Variant' },
                    { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> }
                  ]}
                  rows={lowStock.data?.rows || []}
                />
              </Panel>
            </>
          );
        }

        // overview
        return (
          <>
            <div className="stat-grid">
              <StatCard label="ACTIVE SKUS" value={num(summary.data?.activeSkus)} sub="Live from the catalog" />
              <StatCard label="UNITS ON HAND" value={num(summary.data?.totalUnits)} sub={`${summary.data?.warehouses?.length ?? 0} storage location(s)`} tone="purple" />
              <StatCard label="STOCK VALUE" value={peso(summary.data?.stockValue)} sub="At retail pricing" tone="green" />
              <StatCard label="LOW STOCK ALERTS" value={num(summary.data?.lowStockCount)} sub="Auto-flagged from live counts" tone="red" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Stock movements — last 14 days" subtitle="Units received vs units sold">
                <ErrorNote message={series.error} />
                {series.loading ? <Loading /> : movementSeries(series.data)}
              </Panel>

              <Panel title="Stock by category" subtitle="Units on hand per category">
                <ErrorNote message={summary.error} />
                {summary.loading ? <Loading /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={summary.data?.byCategory || []} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="category" tick={AXIS} tickLine={false} axisLine={false} width={76} />
                      <Tooltip />
                      <Bar dataKey="stock" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </div>

            <div className="panel-grid panel-grid-1-1">
              <Panel title="Critical stock alerts" subtitle="Reorder before these run out">
                <DataTable
                  keyField="id"
                  emptyTitle="NO STOCK ALERTS"
                  emptyNote="Products at or below the threshold appear here automatically."
                  columns={[
                    { key: 'name', label: 'Product' },
                    { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> }
                  ]}
                  rows={lowStock.data?.rows || []}
                />
              </Panel>

              <Panel title="Storage locations" subtitle="Warehouse utilisation">
                <div className="util-list">
                  {(summary.data?.warehouses || []).map((w) => (
                    <div key={w.name} className="util-row">
                      <div className="util-head">
                        <strong>{w.name}</strong>
                        <span>{w.skus} SKUs · {w.units} units · {w.utilisation}%</span>
                      </div>
                      <div className="util-bar">
                        <span style={{ width: `${w.utilisation}%`, background: w.utilisation > 75 ? CHART_COLORS.gold : CHART_COLORS.dark }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Incoming supplier deliveries" subtitle="Purchase orders expected at the warehouse">
              <ErrorNote message={deliveries.error} />
              {deliveries.loading ? <Loading /> : (
                <DataTable
                  keyField="id"
                  emptyTitle="NO DELIVERIES YET"
                  emptyNote="Once purchase orders are issued, expected deliveries and their ETAs appear here."
                  columns={[
                    { key: 'id', label: 'PO Reference' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'items', label: 'Items', render: (r) => `${r.productName} ×${r.quantity}` },
                    { key: 'eta', label: 'ETA', render: (r) => fmtDate(r.eta) },
                    { key: 'status', label: 'Status' }
                  ]}
                  rows={incoming}
                />
              )}
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default InventoryDashboard;
