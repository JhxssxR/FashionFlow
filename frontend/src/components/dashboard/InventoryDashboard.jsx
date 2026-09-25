import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge, Loading, ErrorNote, StockAlertBanner } from './DashboardShared';
import SavedReportsPanel from './SavedReportsPanel';
import { useApi, api, getAuth } from '../../api/client';
import { peso, num, CHART_COLORS, fmtDate, fmtDateTime } from '../../utils';

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
  const empty = { name: '', variant: '', price: '', category: 'Outerwear', storefrontCategory: 'Outerwear', stock: '' };
  const [form, setForm] = useState(empty);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    setErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Choose an image file (JPG, PNG, WebP or GIF).');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr('Image must be 5MB or less.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const uploadImage = async (file) => {
    const auth = getAuth();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/products/upload-image', {
      method: 'POST',
      headers: { ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
      body: fd
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Image upload failed (${res.status}).`);
    return data.imageUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setErr('Attach a product photo first.');
      return;
    }
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const imageUrl = await uploadImage(imageFile);
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
          imageUrl,
          isNew: true
        }
      });
      setOk(`${form.name} (${form.variant}) added with its photo.`);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview('');
      onDone();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  // Another colour/size of the same style: keep everything shoppers see as
  // one product (name, categories, price) and blank only the variant fields.
  const addVariant = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setForm((f) => ({ ...f, variant: '', stock: '' }));
    setOk('');
    setErr('');
  };

  const startFresh = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setForm(empty);
    setOk('');
    setErr('');
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
        <input type="file" accept="image/*" onChange={pickImage} aria-label="Product photo" />
        <button className="mini-btn" type="submit" disabled={busy}>{busy ? 'SAVING…' : '+ ADD PRODUCT'}</button>
      </div>
      {imagePreview && (
        <div className="form-row">
          <img src={imagePreview} alt="Product photo preview" style={{ width: 72, height: 88, objectFit: 'cover', borderRadius: 8, border: '1px solid #e7e7e4' }} />
          <span className="panel-subtitle">Photo attached — it uploads when you save.</span>
        </div>
      )}
      {err && <ErrorNote message={err} />}
      {ok && (
        <div className="form-ok" role="status">
          {ok}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="mini-btn" onClick={addVariant}>+ ADD ANOTHER VARIANT</button>
            <button type="button" className="mini-btn" onClick={startFresh}>NEW PRODUCT</button>
          </div>
        </div>
      )}
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
  const onlineOrders = useApi('/api/orders', [tick]);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [orderErr, setOrderErr] = useState('');
  const [adjustMsg, setAdjustMsg] = useState('');
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustErr, setAdjustErr] = useState('');
  const bump = () => setTick((t) => t + 1);

  const advanceOrder = async (row) => {
    const next = getNextDeliveryStep(row);
    if (!next) return;
    setBusyOrderId(row.id);
    setOrderErr('');
    try {
      await api(`/api/orders/${row.id}/status`, { method: 'PUT', body: { status: next } });
      bump();
    } catch (ex) {
      setOrderErr(ex.message);
    } finally {
      setBusyOrderId('');
    }
  };

  const openAdjust = (product) => {
    setAdjustTarget(product);
    setAdjustQty(String(product.stock));
    setAdjustErr('');
  };

  const saveAdjust = async () => {
    if (!adjustTarget || adjustBusy) return;
    const qty = Number(adjustQty);
    if (!Number.isInteger(qty) || qty < 0) {
      setAdjustErr('Enter a whole number, 0 or more.');
      return;
    }
    setAdjustBusy(true);
    setAdjustErr('');
    try {
      await api('/api/inventory/adjust', { method: 'POST', body: { productId: adjustTarget.id, newQuantity: qty } });
      setAdjustMsg(`${adjustTarget.name} set to ${qty} units.`);
      setAdjustTarget(null);
      bump();
    } catch (ex) {
      setAdjustErr(ex.message);
    } finally {
      setAdjustBusy(false);
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
                          <button className="mini-btn" onClick={() => openAdjust(r)}>ADJUST</button>
                        )
                      }
                    ]}
                    rows={products.data || []}
                    pageSize={10}
                  />
                )}
              </Panel>
              {adjustTarget && (
                <div className="product-modal-overlay" onClick={() => !adjustBusy && setAdjustTarget(null)}>
                  <div className="receipt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Adjust stock">
                    <button className="product-modal-close" onClick={() => !adjustBusy && setAdjustTarget(null)} aria-label="Close">×</button>
                    <h3>Adjust stock</h3>
                    <p className="receipt-meta">{adjustTarget.name} — {adjustTarget.variant}</p>
                    <p className="receipt-meta">Currently <strong>{adjustTarget.stock}</strong> units on hand.</p>
                    <form onSubmit={(e) => { e.preventDefault(); saveAdjust(); }} className="inline-form">
                      <div className="form-row">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={adjustQty}
                          onChange={(e) => setAdjustQty(e.target.value)}
                          placeholder="New quantity"
                          autoFocus
                        />
                      </div>
                      {adjustErr && <ErrorNote message={adjustErr} />}
                      <div className="verify-btns">
                        <button type="submit" className="mini-btn verify-ok" disabled={adjustBusy}>
                          {adjustBusy ? 'SAVING…' : 'SAVE'}
                        </button>
                        <button type="button" className="mini-btn" disabled={adjustBusy} onClick={() => setAdjustTarget(null)}>
                          CANCEL
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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
                    pageSize={10}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'orders') {
          const pendingCount = (onlineOrders.data || []).filter((o) => o.status === 'Pending' || o.status === 'Paid').length;
          const inDeliveryCount = (onlineOrders.data || []).filter((o) => o.status === 'Shipped' || o.status === 'Out for Delivery').length;
          return (
            <>
              <div className="stat-grid">
                <StatCard label="AWAITING DISPATCH" value={num(pendingCount)} sub="Orders ready for verification & packing" tone="gold" />
                <StatCard label="IN TRANSIT" value={num(inDeliveryCount)} sub="Shipped / Out for delivery" tone="purple" />
                <StatCard label="TOTAL ORDERS" value={num(onlineOrders.data?.length)} sub="All storefront orders" tone="dark" />
              </div>
              <Panel title="Storefront online orders" subtitle="Verify stock, pack items, and dispatch orders: Paid/Pending → Shipped → Out for Delivery → Delivered">
                <ErrorNote message={onlineOrders.error || orderErr} />
                {onlineOrders.loading && !onlineOrders.data ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO STOREFRONT ORDERS"
                    emptyNote="Customer orders placed online appear here for stock verification and delivery fulfillment."
                    columns={[
                      { key: 'id', label: 'Order' },
                      { key: 'date', label: 'Placed', width: 170, render: (r) => fmtDateTime(r.date) },
                      { key: 'customer', label: 'Customer' },
                      { key: 'items', label: 'Items' },
                      { key: 'total', label: 'Total', render: (r) => peso(r.total) },
                      { key: 'paymentMethod', label: 'Payment' },
                      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                      {
                        key: 'action',
                        label: 'Fulfillment',
                        render: (r) => {
                          const next = getNextDeliveryStep(r);
                          if (next) {
                            const isCodDelivery = next === 'Delivered' && (r.paymentMethod?.toLowerCase().includes('cash on delivery') || r.paymentMethod?.toLowerCase() === 'cod');
                            return (
                              <button
                                className="mini-btn"
                                disabled={busyOrderId === r.id}
                                onClick={() => advanceOrder(r)}
                              >
                                {busyOrderId === r.id ? 'SAVING…' : isCodDelivery ? 'MARK DELIVERED & COLLECTED' : `VERIFY & MARK ${next.toUpperCase()}`}
                              </button>
                            );
                          }
                          return r.status === 'Pending' && !r.paymentMethod?.toLowerCase().includes('cash on delivery')
                            ? 'Awaiting payment'
                            : (r.status === 'Delivered' ? 'Delivered ✓' : '—');
                        }
                      }
                    ]}
                    rows={onlineOrders.data || []}
                    pageSize={10}
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
                    pageSize={10}
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
                <StockAlertBanner
                  items={lowStock.data?.rows}
                  threshold={lowStock.data?.threshold}
                  actionLabel="VIEW DELIVERIES"
                  onAction={() => { window.location.hash = 'dashboard/inventory/deliveries'; }}
                />
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
                    pageSize={10}
                  />
              </Panel>
              <SavedReportsPanel role="inventory" defaultType="Inventory" />
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
                <StockAlertBanner
                  items={lowStock.data?.rows}
                  threshold={lowStock.data?.threshold}
                  actionLabel="VIEW DELIVERIES"
                  onAction={() => { window.location.hash = 'dashboard/inventory/deliveries'; }}
                />
                <DataTable
                  keyField="id"
                  emptyTitle="NO STOCK ALERTS"
                  emptyNote="Products at or below the threshold appear here automatically."
                  columns={[
                      { key: 'name', label: 'Product' },
                      { key: 'stock', label: 'Stock', render: (r) => <strong>{r.stock}</strong> }
                    ]}
                    rows={lowStock.data?.rows || []}
                    pageSize={8}
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
                  pageSize={10}
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
