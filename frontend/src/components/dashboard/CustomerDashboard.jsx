import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, num, fmtDate } from '../../utils';

const LoyaltyCard = ({ loyalty, onChanged }) => {
  if (!loyalty) return null;
  const tierProgress = loyalty.pointsToNext > 0
    ? Math.min(100, Math.round((loyalty.points / (loyalty.points + loyalty.pointsToNext)) * 100))
    : 100;

  return (
    <div className="loyalty-card">
      <div className="loyalty-top">
        <div>
          <span className="loyalty-tier">{loyalty.tier} Member</span>
          <strong className="loyalty-points">{num(loyalty.points)} pts</strong>
        </div>
        <span className="loyalty-brand">FASHIONFLOW REWARDS</span>
      </div>
      <div className="loyalty-bar">
        <span style={{ width: `${tierProgress}%` }} />
      </div>
      <div className="loyalty-meta">
        <span>{tierProgress}% to {loyalty.nextTier}</span>
        <span>{num(loyalty.pointsToNext)} points to go</span>
      </div>
      <ul className="perk-list">
        {(loyalty.perks || []).map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
    </div>
  );
};

// Spendable rewards — redeeming deducts the points and issues a single-use
// voucher code (RWD-…) that applies at online checkout.
const RewardsStore = ({ loyalty, onChanged }) => {
  const rewards = useApi('/api/loyalty/rewards');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [voucher, setVoucher] = useState(null);
  const points = loyalty?.points ?? 0;

  const redeem = async (r) => {
    setBusy(r.id);
    setErr('');
    setVoucher(null);
    try {
      const res = await api('/api/loyalty/redeem', { method: 'POST', body: { rewardId: r.id } });
      setVoucher({ code: res.code, title: res.title, validTo: res.validTo });
      onChanged();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <Panel title="Rewards store" subtitle={`Turn your points into vouchers — you have ${num(points)} points`}>
      <ErrorNote message={rewards.error || err} />
      {voucher && (
        <div className="voucher-ok" role="status">
          <strong>{voucher.title} — unlocked!</strong>
          <span>
            Voucher code <code>{voucher.code}</code>, valid until {fmtDate(voucher.validTo)}.
            Apply it in the promo field at checkout.
          </span>
        </div>
      )}
      {rewards.loading && rewards.data === null ? <Loading /> : (
        <div className="reward-grid">
          {(rewards.data || []).map((r) => (
            <div className="reward-card" key={r.id}>
              <strong>{r.title}</strong>
              <span>{r.blurb}</span>
              <div className="reward-foot">
                <em>{num(r.cost)} pts</em>
                <button
                  className="mini-btn"
                  disabled={busy === r.id || points < r.cost}
                  onClick={() => redeem(r)}
                >
                  {busy === r.id ? 'REDEEMING…' : points < r.cost ? `${num(r.cost - points)} PTS SHORT` : 'REDEEM'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

const CustomerDashboard = ({ user }) => {
  const [tick, setTick] = useState(0);
  const loyalty = useApi('/api/loyalty/mine', [tick]);
  const orders = useApi('/api/sales/mine', [tick]);
  const onlineOrders = useApi('/api/orders/mine', [tick]);
  const promos = useApi('/api/promotions/active', [tick]);
  const products = useApi('/api/products');
  const bump = () => setTick((t) => t + 1);

  // Unified purchase history: POS/online receipts (Sales) + web orders
  // (Orders, which fulfil into Sales once paid).
  const orderRows = [
    ...(orders.data || []).map((o) => ({ ...o, dateLabel: fmtDate(o.date), source: 'receipt' })),
    ...(onlineOrders.data || []).map((o) => ({
      ...o,
      dateLabel: fmtDate(o.date),
      status: o.status === 'Paid' ? 'Delivered' : o.status,
      source: 'online'
    }))
  ].sort((a, b) => (a.dateLabel < b.dateLabel ? 1 : -1));
  const lifetime = orderRows
    .filter((r) => r.status === 'Delivered')
    .reduce((s, r) => s + r.total, 0);

  const loyaltyPanel = (
    <Panel title="Loyalty program" subtitle="Earn 1 point for every ₱100 — redeem at checkout">
      <ErrorNote message={loyalty.error} />
      {loyalty.loading && !loyalty.data ? <Loading /> : <LoyaltyCard loyalty={loyalty.data} onChanged={bump} />}
    </Panel>
  );

  const ordersPanel = (compact = false) => (
    <Panel title="Purchase history" subtitle="Every order, receipt and points earned" action={
      <a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>SHOP THE STORE →</a>
    }>
      <ErrorNote message={orders.error} />
      {orders.loading && !orders.data ? <Loading /> : (
        <DataTable
          keyField="id"
          emptyTitle="NO PURCHASES YET"
          emptyNote="Your orders appear here after your first purchase — with receipts, delivery status and points earned."
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'dateLabel', label: 'Date' },
            { key: 'items', label: 'Items' },
            { key: 'total', label: 'Total', render: (r) => peso(r.total) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ...(compact ? [] : [{ key: 'points', label: 'Points', render: (r) => (r.points > 0 ? `+${r.points}` : '—') }])
          ]}
          rows={orderRows}
        />
      )}
    </Panel>
  );

  const promosPanel = (title) => (
    <Panel title={title} subtitle="Apply these codes at checkout">
      <ErrorNote message={promos.error} />
      {promos.loading ? <Loading /> : (
        <DataTable
          keyField="code"
          emptyTitle="NO PROMOTIONS YET"
          emptyNote="Active promo codes and member-exclusive offers appear here."
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'description', label: 'Offer' },
            { key: 'validTo', label: 'Valid until', render: (r) => fmtDate(r.validTo) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          rows={(promos.data || []).filter((p) => !p.appliesTo.startsWith('Tier:') || p.appliesTo === `Tier:${loyalty.data?.tier}`)}
        />
      )}
    </Panel>
  );

  return (
    <DashboardLayout role="customer" user={user}>
      {(page) => {
        if (page === 'orders') return ordersPanel();

        if (page === 'loyalty') {
          return (
            <>
              {loyaltyPanel}
              <Panel title="Points history" subtitle="How you earned and redeemed">
                <ErrorNote message={loyalty.error} />
                {loyalty.loading ? <Loading /> : (
                  <DataTable
                    keyField="date"
                    emptyTitle="NO POINTS HISTORY YET"
                    emptyNote="Points earned from purchases and redemptions at checkout are listed here."
                    columns={[
                      { key: 'date', label: 'When', width: 180, render: (r) => new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) },
                      { key: 'note', label: 'Activity' },
                      { key: 'earned', label: 'Earned', render: (r) => (r.earned > 0 ? `+${r.earned}` : '—') },
                      { key: 'redeemed', label: 'Redeemed', render: (r) => (r.redeemed > 0 ? `−${r.redeemed}` : '—') }
                    ]}
                    rows={loyalty.data?.ledger || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'rewards') {
          return (
            <>
              {loyaltyPanel}
              <RewardsStore loyalty={loyalty.data} onChanged={bump} />
            </>
          );
        }

        if (page === 'promos') return promosPanel('My promotions');

        // overview — My Dashboard
        return (
          <>
            <div className="stat-grid">
              <StatCard label="LOYALTY POINTS" value={num(loyalty.data?.points)} sub={`${num(loyalty.data?.pointsToNext)} more to ${loyalty.data?.nextTier || '—'}`} />
              <StatCard label="TOTAL ORDERS" value={num(orderRows.length)} sub="Receipts + online orders" tone="purple" />
              <StatCard label="LIFETIME SPEND" value={peso(lifetime)} sub="Across POS and online orders" tone="dark" />
              <StatCard label="TIER" value={loyalty.data?.tier || '—'} sub="Free shipping + early drops" tone="green" />
            </div>

            <div className="panel-grid panel-grid-1-1">
              {loyaltyPanel}
              {promosPanel('Active promotions for you')}
            </div>

            {ordersPanel(true)}

            <Panel title="Recommended for you" subtitle="From the live catalog" action={
              <a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>SHOP THE STORE →</a>
            }>
              <div className="reco-grid">
                {(products.data || []).slice(0, 4).map((p) => (
                  <a key={p.id} href="#" className="reco-card" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
                    <strong>{p.name}</strong>
                    <span>{p.variant}</span>
                    <em>{peso(p.price)}</em>
                  </a>
                ))}
              </div>
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default CustomerDashboard;
