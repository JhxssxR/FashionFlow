import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, peso2, num, CHART_COLORS, fmtTime, fmtDate } from '../../utils';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

// ---------- POS terminal ----------
const PosTerminal = ({ products, customers, onCharged }) => {
  const [cart, setCart] = useState([]); // [{ productId, name, variant, price, quantity }]
  const [customerId, setCustomerId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const customer = (customers || []).find((c) => String(c.id) === customerId);
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const addToCart = (p) => {
    setResult(null);
    setErr('');
    setCart((prev) => {
      const line = prev.find((l) => l.productId === p.id);
      if (line) {
        if (line.quantity + 1 > p.stock) {
          setErr(`Only ${p.stock} units of ${p.name} in stock.`);
          return prev;
        }
        return prev.map((l) => l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      if (p.stock < 1) {
        setErr(`${p.name} is out of stock.`);
        return prev;
      }
      return [...prev, { productId: p.id, name: p.name, variant: p.variant, price: p.price, quantity: 1 }];
    });
  };

  const setQty = (productId, qty) => {
    setCart((prev) => qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => l.productId === productId ? { ...l, quantity: qty } : l));
  };

  const charge = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    setErr('');
    try {
      const res = await api('/api/sales', {
        method: 'POST',
        body: {
          customerId: customerId ? Number(customerId) : null,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          paymentMethod: payment,
          promoCode: promoCode.trim() || null
        }
      });
      setResult(res);
      setCart([]);
      setPromoCode('');
      onCharged?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-grid panel-grid-2-1">
      <Panel title="POS terminal" subtitle="Tap a product to add it to the cart">
        <div className="pos-grid">
          {(products || []).map((p) => (
            <button key={p.id} className="pos-product" onClick={() => addToCart(p)} disabled={p.stock < 1}>
              <strong>{p.name}</strong>
              <span>{p.variant} · {p.stock} left</span>
              <em>{peso(p.price)}</em>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Cart" subtitle={customer ? `Serving ${customer.name} (${customer.tier})` : 'Walk-in customer'}>
        {result ? (
          <div className="pos-receipt">
            <strong className="pos-receipt-title">SALE COMPLETED</strong>
            <span>Receipt {result.receipt}</span>
            {result.discount > 0 && <span>Promo discount — {peso2(result.discount)}</span>}
            <span>Total charged — {peso2(result.total)}</span>
            {result.pointsEarned > 0 && <span>{result.customer?.name} earned {result.pointsEarned} pts ({result.customer?.tier})</span>}
            <button className="mini-btn wide" onClick={() => setResult(null)}>NEW SALE</button>
          </div>
        ) : (
          <>
            {cart.length === 0 && (
              <div className="table-empty">
                <strong className="table-empty-title">CART IS EMPTY</strong>
                <span className="table-empty-note">Add products to start a transaction. Promotions and loyalty rewards apply automatically at checkout.</span>
              </div>
            )}
            {cart.map((l) => (
              <div className="cart-line" key={l.productId}>
                <div className="cart-line-info">
                  <strong>{l.name}</strong>
                  <span>{peso(l.price)} each</span>
                </div>
                <div className="cart-line-qty">
                  <button onClick={() => setQty(l.productId, l.quantity - 1)}>−</button>
                  <span>{l.quantity}</span>
                  <button onClick={() => setQty(l.productId, l.quantity + 1)}>+</button>
                </div>
                <strong>{peso(l.price * l.quantity)}</strong>
              </div>
            ))}
            <div className="pos-controls">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.tier} ({num(c.points)} pts)</option>
                ))}
              </select>
              <div className="pos-controls-row">
                <input
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                />
                <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                  {['Cash', 'Card', 'GCash', 'Maya'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {err && <ErrorNote message={err} />}
            <div className="pos-total">
              <span>TOTAL</span>
              <strong>{peso2(subtotal)}</strong>
            </div>
            <button className="mini-btn wide" onClick={charge} disabled={busy || cart.length === 0}>
              {busy ? 'PROCESSING…' : `CHARGE ${peso2(subtotal)}`}
            </button>
          </>
        )}
      </Panel>
    </div>
  );
};

// ---------- main dashboard ----------
const SalesDashboard = ({ user }) => {
  const today = useApi('/api/sales/today');
  const recent = useApi('/api/sales/recent?count=10');
  const promos = useApi('/api/promotions');
  const products = useApi('/api/products');
  const [customerTick, setCustomerTick] = useState(0);
  const customersQ = useApi('/api/customers', [customerTick]);

  const data = today.data;
  const tierCounts = useMemo(() => {
    const tiers = { Gold: 0, Silver: 0, Bronze: 0, Platinum: 0 };
    (customersQ.data || []).forEach((c) => { tiers[c.tier] = (tiers[c.tier] || 0) + 1; });
    return Object.entries(tiers).filter(([, v]) => v > 0).map(([tier, value]) => ({ tier, value }));
  }, [customersQ.data]);

  const topMembers = (customersQ.data || []).slice(0, 5);
  const activePromos = (promos.data || []).filter((p) => p.status === 'Active');

  const addCustomer = async (e) => {
    e.preventDefault();
    const name = window.prompt('New customer full name:');
    if (!name) return;
    const email = window.prompt('New customer email:');
    if (!email) return;
    try {
      await api('/api/customers', { method: 'POST', body: { name, email } });
      setCustomerTick((t) => t + 1);
    } catch (ex) {
      window.alert(ex.message);
    }
  };

  const recentRows = (recent.data || []).map((r) => ({
    id: r.id,
    time: fmtTime(r.time),
    customer: r.customer,
    items: r.items,
    total: peso(r.total),
    payment: r.payment,
    loyalty: r.loyalty > 0 ? `+${r.loyalty}` : '—'
  }));

  return (
    <DashboardLayout role="sales" user={user}>
      {(page) => {
        if (page === 'pos') {
          return <PosTerminal products={products.data} customers={customersQ.data} onCharged={() => products.reload(true)} />;
        }

        if (page === 'customers') {
          return (
            <>
              <Panel title="Loyalty tier distribution" subtitle="Live CRM segmentation">
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={tierCounts} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="tier" tick={AXIS} tickLine={false} axisLine={false} width={64} />
                    <Tooltip />
                    <Bar dataKey="value" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel
                title="Customer records"
                subtitle="Update customer details at the counter"
                action={<a href="#" className="panel-link" onClick={addCustomer}>+ NEW CUSTOMER</a>}
              >
                <ErrorNote message={customersQ.error} />
                {customersQ.loading && !customersQ.data ? <Loading /> : (
                  <DataTable
                    keyField="email"
                    emptyTitle="NO CUSTOMER RECORDS YET"
                    emptyNote="Register a customer with the button above — loyalty points accrue automatically."
                    columns={[
                      { key: 'name', label: 'Customer' },
                      { key: 'email', label: 'Email' },
                      { key: 'tier', label: 'Tier', render: (r) => <StatusBadge status={r.tier === 'Gold' || r.tier === 'Platinum' ? 'Delivered' : 'Pending'} /> },
                      { key: 'points', label: 'Points', render: (r) => num(r.points) },
                      { key: 'orders', label: 'Orders' },
                      { key: 'spent', label: 'Lifetime spend', render: (r) => peso(r.spent) }
                    ]}
                    rows={customersQ.data || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'promos') {
          return (
            <Panel title="Promotions & loyalty" subtitle="Campaigns applied automatically at the POS">
              <ErrorNote message={promos.error} />
              {promos.loading ? <Loading /> : (
                <DataTable
                  keyField="code"
                  emptyTitle="NO PROMOTION CAMPAIGNS YET"
                  emptyNote="Configured promotions appear here, ready to apply at checkout."
                  columns={[
                    { key: 'code', label: 'Code' },
                    { key: 'description', label: 'Deal' },
                    { key: 'appliesTo', label: 'Applies to' },
                    { key: 'validTo', label: 'Valid until', render: (r) => fmtDate(r.validTo) },
                    { key: 'uses', label: 'Uses' },
                    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                  ]}
                  rows={promos.data || []}
                />
              )}
            </Panel>
          );
        }

        if (page === 'summary') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="TODAY'S SALES" value={peso(data?.total)} sub={`${data?.vsYesterdayPct >= 0 ? '+' : ''}${data?.vsYesterdayPct ?? '—'}% vs yesterday`} />
                <StatCard label="TRANSACTIONS" value={num(data?.transactions)} sub={`Average basket ${peso(data?.avgBasket)}`} tone="purple" />
                <StatCard label="ITEMS SOLD" value={num(data?.itemsSold)} sub="Units across all receipts" tone="dark" />
                <StatCard label="PAYMENT MIX" value={(data?.byPayment || [])[0]?.method || '—'} sub={`${peso((data?.byPayment || [])[0]?.amount)} top method today`} tone="green" />
              </div>
              <Panel title="Payments by method — today" subtitle="End-of-day breakdown for the register">
                {today.loading ? <Loading /> : (
                  <DataTable
                    keyField="method"
                    emptyTitle="NO PAYMENTS TODAY"
                    emptyNote="The register summary fills in as sales are charged."
                    columns={[
                      { key: 'method', label: 'Method' },
                      { key: 'count', label: 'Transactions' },
                      { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) }
                    ]}
                    rows={data?.byPayment || []}
                  />
                )}
              </Panel>
              <Panel title="Sales by hour — today" subtitle="POS terminal performance">
                {today.loading ? <Loading /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={data?.byHour || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip formatter={(v) => [peso(v), 'Sales']} />
                      <Bar dataKey="sales" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </>
          );
        }

        // overview — Today's Sales
        return (
          <>
            <div className="stat-grid">
              <StatCard label="TODAY'S SALES" value={peso(data?.total)} sub={`${data?.vsYesterdayPct >= 0 ? '+' : ''}${data?.vsYesterdayPct ?? '—'}% vs yesterday`} />
              <StatCard label="TRANSACTIONS" value={num(data?.transactions)} sub={`Average basket ${peso(data?.avgBasket)}`} tone="purple" />
              <StatCard label="LOYALTY POINTS ISSUED" value={num(data?.loyaltyIssued)} sub="1 point per ₱100 spent" tone="green" />
              <StatCard label="ACTIVE PROMOTIONS" value={num(activePromos.length)} sub="Applied automatically at POS" tone="dark" />
            </div>

            <Panel title="Sales by hour — today" subtitle="POS terminal performance, live from the Sales table">
              {today.loading ? <Loading /> : (
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={data?.byHour || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v) => [peso(v), 'Sales']} />
                    <Bar dataKey="sales" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Recent transactions" subtitle="Live from the POS terminal" action={<a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = 'dashboard/sales'; }}>OPEN POS →</a>}>
                <ErrorNote message={recent.error} />
                {recent.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO TRANSACTIONS YET"
                    emptyNote="Completed POS sales stream here in real time — receipt number, items, payment method and loyalty points."
                    columns={[
                      { key: 'id', label: 'Receipt' },
                      { key: 'time', label: 'Time' },
                      { key: 'customer', label: 'Customer' },
                      { key: 'items', label: 'Items' },
                      { key: 'total', label: 'Total' },
                      { key: 'payment', label: 'Payment' },
                      { key: 'loyalty', label: 'Loyalty' }
                    ]}
                    rows={recentRows}
                  />
                )}
              </Panel>

              <div className="panel-stack">
                <Panel title="Loyalty quick actions" subtitle="Top members at the counter today">
                  <DataTable
                    keyField="email"
                    emptyTitle="NO MEMBERS YET"
                    emptyNote="Loyalty members appear here once customers register."
                    columns={[
                      { key: 'name', label: 'Member' },
                      { key: 'tier', label: 'Tier' },
                      { key: 'points', label: 'Points', render: (r) => num(r.points) }
                    ]}
                    rows={topMembers}
                  />
                </Panel>

                <Panel title="Promotions to pitch" subtitle="Mention these at the counter">
                  <DataTable
                    keyField="code"
                    emptyTitle="NO CAMPAIGNS YET"
                    emptyNote="Active promotions are listed here for the counter team."
                    columns={[
                      { key: 'code', label: 'Code' },
                      { key: 'description', label: 'Deal' }
                    ]}
                    rows={activePromos}
                  />
                </Panel>
              </div>
            </div>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default SalesDashboard;
