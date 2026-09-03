import React from 'react';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import { peso, CUSTOMER_TIER, PRODUCTS } from '../../data/dashboardData';

const CustomerDashboard = () => (
  <DashboardLayout role="customer">
    {(page) => {
      if (page === 'orders') {
        return (
          <Panel title="Purchase history" subtitle="Every order, receipt and points earned" action={<a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>SHOP THE STORE →</a>}>
            <DataTable
              keyField="id"
              emptyTitle="NO PURCHASES YET"
              emptyNote="Your orders will appear here after your first purchase — with receipts, delivery status and points earned."
              columns={[
                { key: 'id', label: 'Order' },
                { key: 'date', label: 'Date' },
                { key: 'items', label: 'Items' },
                { key: 'total', label: 'Total' },
                { key: 'status', label: 'Status' }
              ]}
              rows={[]}
            />
          </Panel>
        );
      }

      if (page === 'loyalty') {
        const tierProgress = Math.round((CUSTOMER_TIER.points / (CUSTOMER_TIER.points + CUSTOMER_TIER.pointsToNext)) * 100);
        return (
          <>
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
            <Panel title="Points history" subtitle="How you earned and redeemed">
              <EmptyState title="NO POINTS HISTORY YET" note="Points earned from purchases and redemptions at checkout will be listed here." />
            </Panel>
          </>
        );
      }

      if (page === 'promos') {
        return (
          <Panel title="My promotions" subtitle="Apply these codes at checkout">
            <EmptyState title="NO PROMOTIONS YET" note="Active promo codes and member-exclusive offers will appear here." />
          </Panel>
        );
      }

      // overview — My Dashboard
      const tierProgress = Math.round((CUSTOMER_TIER.points / (CUSTOMER_TIER.points + CUSTOMER_TIER.pointsToNext)) * 100);
      return (
        <>
          <div className="stat-grid">
            <StatCard label="LOYALTY POINTS" value={CUSTOMER_TIER.points.toLocaleString('en-PH')} sub={`${CUSTOMER_TIER.pointsToNext} more to ${CUSTOMER_TIER.nextTier}`} />
            <StatCard label="TOTAL ORDERS" value="0" sub="No purchases yet" tone="purple" />
            <StatCard label="LIFETIME SPEND" value={peso(0)} sub="Member since March 2026" tone="dark" />
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
              <EmptyState title="NO PROMOTIONS YET" note="Active promo codes and member-exclusive offers will appear here." />
            </Panel>
          </div>

          <Panel title="Purchase history" subtitle="Every order, receipt and points earned">
            <DataTable
              keyField="id"
              emptyTitle="NO PURCHASES YET"
              emptyNote="Your orders will appear here after your first purchase — with receipts, delivery status and points earned."
              columns={[
                { key: 'id', label: 'Order' },
                { key: 'date', label: 'Date' },
                { key: 'items', label: 'Items' },
                { key: 'total', label: 'Total' },
                { key: 'status', label: 'Status' }
              ]}
              rows={[]}
            />
          </Panel>

          <Panel title="Recommended for you" subtitle="Based on your membership" action={<a href="#" className="panel-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>SHOP THE STORE →</a>}>
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
        </>
      );
    }}
  </DashboardLayout>
);

export default CustomerDashboard;
