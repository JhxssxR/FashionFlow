import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge } from './DashboardShared';
import {
  peso, PRODUCTS, INVENTORY_MOVEMENTS, STOCK_BY_CATEGORY, WAREHOUSES,
  LOW_STOCK, OUT_OF_SOON, PURCHASE_ORDERS, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

const totalUnits = PRODUCTS.reduce((s, p) => s + p.stock, 0);
const stockValue = PRODUCTS.reduce((s, p) => s + p.stock * p.price, 0);

const InventoryDashboard = () => (
  <DashboardLayout role="inventory">
    <div className="stat-grid">
      <StatCard label="ACTIVE SKUS" value={PRODUCTS.length} sub="Across 5 categories" />
      <StatCard label="UNITS ON HAND" value={totalUnits} sub={`${WAREHOUSES.length} storage locations`} tone="purple" />
      <StatCard label="STOCK VALUE" value={peso(stockValue)} sub="At retail pricing" tone="green" />
      <StatCard label="LOW STOCK ALERTS" value={LOW_STOCK.length} sub={`${OUT_OF_SOON.length} items at critical level`} tone="red" />
    </div>

    <div className="panel-grid panel-grid-2-1">
      <Panel title="Stock movements — last 14 days" subtitle="Units received vs units sold">
        <ResponsiveContainer width="100%" height={270}>
          <AreaChart data={INVENTORY_MOVEMENTS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
      </Panel>

      <Panel title="Stock by category" subtitle="Units on hand per category">
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={STOCK_BY_CATEGORY} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="category" tick={AXIS} tickLine={false} axisLine={false} width={76} />
            <Tooltip />
            <Bar dataKey="stock" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>

    <div className="panel-grid panel-grid-1-1">
      <Panel title="Critical stock alerts" subtitle="Reorder before these run out" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>CREATE PO →</a>}>
        <DataTable
          keyField="id"
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'variant', label: 'Variant' },
            { key: 'price', label: 'Price', render: (r) => peso(r.price) },
            { key: 'stock', label: 'Stock', render: (r) => <strong className={r.stock <= 5 ? 'danger-text' : 'warn-text'}>{r.stock} left</strong> }
          ]}
          rows={OUT_OF_SOON}
        />
      </Panel>

      <Panel title="Storage locations" subtitle="Warehouse utilisation">
        <div className="util-list">
          {WAREHOUSES.map((w) => (
            <div key={w.name} className="util-row">
              <div className="util-head">
                <strong>{w.name}</strong>
                <span>{w.skus} SKUs · {w.utilisation}%</span>
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
      <DataTable
        keyField="id"
        columns={[
          { key: 'id', label: 'PO Reference' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'items', label: 'Items' },
          { key: 'eta', label: 'ETA', width: '110px' },
          { key: 'status', label: 'Status', width: '130px', render: (r) => <StatusBadge status={r.status} /> }
        ]}
        rows={PURCHASE_ORDERS.filter((p) => p.status === 'In Transit' || p.status === 'Pending')}
      />
    </Panel>
  </DashboardLayout>
);

export default InventoryDashboard;
