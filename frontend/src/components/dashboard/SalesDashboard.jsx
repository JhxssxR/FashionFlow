import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import {
  peso, HOURLY_SALES, PROMOTIONS, PRODUCTS, YESTERDAY_ROW, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

const todayTotal = HOURLY_SALES.reduce((s, h) => s + h.sales, 0);
const todayTx = HOURLY_SALES.reduce((s, h) => s + h.transactions, 0);
const vsYesterday = Math.round(((todayTotal - YESTERDAY_ROW.revenue) / YESTERDAY_ROW.revenue) * 100);

const SalesDashboard = () => (
  <DashboardLayout role="sales">
    {(page) => {
      if (page === 'pos') {
        return (
          <div className="panel-grid panel-grid-2-1">
            <Panel title="POS terminal" subtitle="Tap a product to add it to the cart">
              <div className="pos-grid">
                {PRODUCTS.map((p) => (
                  <button key={p.id} className="pos-product" onClick={(e) => e.preventDefault()}>
                    <strong>{p.name}</strong>
                    <span>{p.variant}</span>
                    <em>{peso(p.price)}</em>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Cart" subtitle="Scan or tap products to begin">
              <EmptyState title="CART IS EMPTY" note="Add products to start a transaction. Promotions and loyalty rewards apply automatically at checkout." />
              <div className="pos-total">
                <span>TOTAL</span>
                <strong>{peso(0)}</strong>
              </div>
              <button className="mini-btn wide" onClick={(e) => e.preventDefault()}>CHARGE ₱0.00</button>
            </Panel>
          </div>
        );
      }

      if (page === 'customers') {
        return (
          <>
            <Panel title="Loyalty tier distribution" subtitle="Planned CRM segmentation">
              <ResponsiveContainer width="100%" height={60}>
                <BarChart
                  data={[
                    { tier: 'Gold', value: 214 },
                    { tier: 'Silver', value: 486 },
                    { tier: 'Bronze', value: 584 }
                  ]}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="tier" tick={AXIS} tickLine={false} axisLine={false} width={64} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Customer records" subtitle="Update customer details at the counter" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ NEW CUSTOMER</a>}>
              <DataTable
                keyField="email"
                emptyTitle="NO CUSTOMER RECORDS YET"
                emptyNote="Customer profiles — contact details, loyalty status and purchase notes — will appear here once the CRM is connected."
                columns={[
                  { key: 'name', label: 'Customer' },
                  { key: 'email', label: 'Email' },
                  { key: 'tier', label: 'Tier' },
                  { key: 'points', label: 'Points' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }

      if (page === 'promos') {
        return (
          <Panel title="Promotions & loyalty" subtitle="Campaigns applied automatically at the POS">
            <EmptyState title="NO PROMOTION CAMPAIGNS YET" note="Configured promotions and loyalty rewards will appear here, ready to apply at checkout." />
          </Panel>
        );
      }

      if (page === 'summary') {
        return (
          <>
            <div className="stat-grid">
              <StatCard label="TODAY'S SALES" value={peso(todayTotal)} sub={`${vsYesterday >= 0 ? '+' : ''}${vsYesterday}% vs yesterday`} />
              <StatCard label="TRANSACTIONS" value={todayTx} sub="Average basket ₱2,358" tone="purple" />
            </div>
            <Panel title="Daily sales summary" subtitle="End-of-day report for the POS terminal" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>GENERATE SUMMARY →</a>}>
              <EmptyState title="NO SUMMARY YET" note="The end-of-day summary — total sales, payments by method and loyalty issued — is generated when the register closes." />
            </Panel>
          </>
        );
      }

      // overview — Today's Sales
      return (
        <>
          <div className="stat-grid">
            <StatCard label="TODAY'S SALES" value={peso(todayTotal)} sub={`${vsYesterday >= 0 ? '+' : ''}${vsYesterday}% vs yesterday`} />
            <StatCard label="TRANSACTIONS" value={todayTx} sub="Average basket ₱2,358" tone="purple" />
            <StatCard label="LOYALTY POINTS ISSUED" value="740" sub="1 point per ₱100 spent" tone="green" />
            <StatCard label="ACTIVE PROMOTIONS" value={PROMOTIONS.filter((p) => p.status === 'Active').length} sub="Applied automatically at POS" tone="dark" />
          </div>

          <Panel title="Sales by hour — today" subtitle="POS terminal performance, 10 AM to 7 PM">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={HOURLY_SALES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => [peso(v), 'Sales']} />
                <Bar dataKey="sales" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <div className="panel-grid panel-grid-2-1">
            <Panel title="Recent transactions" subtitle="Live from the POS terminal" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>OPEN POS →</a>}>
              <DataTable
                keyField="id"
                emptyTitle="NO TRANSACTIONS YET"
                emptyNote="Completed POS sales will stream here in real time — receipt number, items, payment method and loyalty points."
                columns={[
                  { key: 'id', label: 'Receipt' },
                  { key: 'time', label: 'Time' },
                  { key: 'customer', label: 'Customer' },
                  { key: 'total', label: 'Total' },
                  { key: 'payment', label: 'Payment' }
                ]}
                rows={[]}
              />
            </Panel>

            <div className="panel-stack">
              <Panel title="Loyalty quick actions" subtitle="Top members at the counter today">
                <EmptyState title="NO MEMBERS YET" note="Loyalty members will appear here once customers register." />
              </Panel>

              <Panel title="Promotions to pitch" subtitle="Mention these at the counter">
                <EmptyState title="NO CAMPAIGNS YET" note="Active promotions will be listed here for the counter team." />
              </Panel>
            </div>
          </div>
        </>
      );
    }}
  </DashboardLayout>
);

export default SalesDashboard;
