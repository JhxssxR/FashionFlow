import React from 'react';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge } from './DashboardShared';
import {
  peso, CUSTOMER_ORDERS, CUSTOMER_PROMOS, CUSTOMER_TIER, PRODUCTS
} from '../../data/dashboardData';

const CustomerDashboard = () => {
  const lifetimeSpend = CUSTOMER_ORDERS.reduce((s, o) => s + o.total, 0);
  const tierProgress = Math.round((CUSTOMER_TIER.points / (CUSTOMER_TIER.points + CUSTOMER_TIER.pointsToNext)) * 100);

  return (
    <DashboardLayout role="customer">
      <div className="stat-grid">
        <StatCard label="LOYALTY POINTS" value={CUSTOMER_TIER.points.toLocaleString('en-PH')} sub={`${CUSTOMER_TIER.pointsToNext} more to ${CUSTOMER_TIER.nextTier}`} />
        <StatCard label="TOTAL ORDERS" value={CUSTOMER_ORDERS.length} sub="All delivered on time" tone="purple" />
        <StatCard label="LIFETIME SPEND" value={peso(lifetimeSpend)} sub="Member since March 2026" tone="dark" />
        <StatCard label="TIER" value={CUSTOMER_TIER.name} sub="Free shipping + early drops" tone="green" />
      </div>

      <div className="panel-grid panel-grid-1-1">
        <Panel title="Loyalty program" subtitle="Earn 1 point for every ₱100 — redeem at checkout">
          <div className="loyalty-card">
            <div className="loyalty-top">
              <div>
                <span className="loyalty-tier">{CUSTOMER_TIER.name} Member</span>
                <strong className="loyalty-points">{CUSTOMER_TIER.points.toLocaleString('en-PH')} pts</strong>
              </div>
              <span className="loyalty-brand">FASHIONFLOW REWARDS</span>
            </div>
            <div className="loyalty-bar">
              <span style={{ width: `${tierProgress}%` }} />
            </div>
            <div className="loyalty-meta">
              <span>{tierProgress}% to {CUSTOMER_TIER.nextTier}</span>
              <span>{CUSTOMER_TIER.pointsToNext} points to go</span>
            </div>
            <ul className="perk-list">
              {CUSTOMER_TIER.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <button className="mini-btn wide" onClick={(e) => e.preventDefault()}>REDEEM POINTS</button>
          </div>
        </Panel>

        <Panel title="Active promotions for you" subtitle="Apply these codes at checkout">
          <ul className="promo-list">
            {CUSTOMER_PROMOS.map((p) => (
              <li key={p.code}>
                <strong className="promo-code">{p.code}</strong>
                <span>{p.description} — {p.validity}</span>
              </li>
            ))}
            <li>
              <strong className="promo-code">GOLDFREE</strong>
              <span>Your Gold perk: free shipping on every order</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Purchase history" subtitle="Every order, receipt and points earned">
        <DataTable
          keyField="id"
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date', width: '130px' },
            { key: 'items', label: 'Items' },
            { key: 'total', label: 'Total', render: (r) => <strong>{peso(r.total)}</strong> },
            { key: 'points', label: 'Points earned', width: '130px', render: (r) => `+${r.points}` },
            { key: 'status', label: 'Status', width: '120px', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          rows={CUSTOMER_ORDERS}
        />
      </Panel>

      <Panel title="Recommended for you" subtitle="Based on your Gold history" action={<a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>SHOP THE STORE →</a>}>
        <div className="reco-grid">
          {PRODUCTS.slice(0, 4).map((p) => (
            <a key={p.id} href="#" className="reco-card" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
              <strong>{p.name}</strong>
              <span>{p.variant}</span>
              <em>{peso(p.price)}</em>
            </a>
          ))}
        </div>
      </Panel>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
