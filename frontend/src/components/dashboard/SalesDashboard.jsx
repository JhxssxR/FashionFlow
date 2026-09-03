import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable } from './DashboardShared';
import {
  peso, peso2, HOURLY_SALES, RECENT_TRANSACTIONS, PROMOTIONS,
  TODAY_ROW, YESTERDAY_ROW, CRM_CUSTOMERS, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

const todayTotal = HOURLY_SALES.reduce((s, h) => s + h.sales, 0);
const todayTx = HOURLY_SALES.reduce((s, h) => s + h.transactions, 0);
const vsYesterday = Math.round(((todayTotal - YESTERDAY_ROW.revenue) / YESTERDAY_ROW.revenue) * 100);

const SalesDashboard = () => (
  <DashboardLayout role="sales">
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
          columns={[
            { key: 'id', label: 'Receipt' },
            { key: 'time', label: 'Time', width: '90px' },
            { key: 'customer', label: 'Customer' },
            { key: 'items', label: 'Items', width: '70px' },
            { key: 'total', label: 'Total', render: (r) => <strong>{peso2(r.total)}</strong> },
            { key: 'payment', label: 'Payment', width: '90px' },
            { key: 'loyalty', label: 'Points', width: '80px' }
          ]}
          rows={RECENT_TRANSACTIONS}
        />
      </Panel>

      <div className="panel-stack">
        <Panel title="Loyalty quick actions" subtitle="Top members at the counter today">
          <div className="mini-list">
            {CRM_CUSTOMERS.slice(0, 4).map((c) => (
              <div key={c.id} className="mini-row">
                <span className="dash-avatar">{c.name.split(' ').map((n) => n[0]).join('')}</span>
                <div className="mini-meta">
                  <strong>{c.name}</strong>
                  <span>{c.points.toLocaleString('en-PH')} points · {c.tier}</span>
                </div>
                <button className="mini-btn" onClick={(e) => e.preventDefault()}>REDEEM</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Promotions to pitch" subtitle="Mention these at the counter">
          <ul className="promo-list">
            {PROMOTIONS.filter((p) => p.status === 'Active' || p.status === 'Scheduled').map((p) => (
              <li key={p.code}>
                <strong className="promo-code">{p.code}</strong>
                <span>{p.description}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  </DashboardLayout>
);

export default SalesDashboard;
