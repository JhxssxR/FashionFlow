import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import {
  peso, PRODUCTS, INVENTORY_MOVEMENTS, STOCK_BY_CATEGORY, WAREHOUSES,
  PURCHASE_ORDERS, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };

const totalUnits = PRODUCTS.reduce((s, p) => s + p.stock, 0);
const stockValue = PRODUCTS.reduce((s, p) => s + p.stock * p.price, 0);

const InventoryDashboard = () => (
  <DashboardLayout role="inventory">
    {(page) => {
      if (page === 'products') {
        return (
          <>
            <div className="stat-grid">
              <StatCard label="PRODUCT RECORDS" value={PRODUCTS.length} sub="Ready to migrate into the Products table" />
              <StatCard label="CATEGORIES" value={new Set(PRODUCTS.map((p) => p.category)).size} sub="Outerwear, Dresses, Bottoms, Shirts, Tops" tone="purple" />
              <StatCard label="VARIANTS TO ENCODE" value={PRODUCTS.length} sub="One size/variant per product initially" tone="dark" />
            </div>
            <Panel title="Products & variants" subtitle="Product catalog with size/variant management" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ ADD PRODUCT</a>}>
              <DataTable
                keyField="id"
                emptyTitle="NO PRODUCTS ENCODED YET"
                emptyNote="The catalog above is ready for migration — products, variants and prices will appear here from the Products table."
                columns={[
                  { key: 'name', label: 'Product' },
                  { key: 'variant', label: 'Variant' },
                  { key: 'price', label: 'Price' },
                  { key: 'stock', label: 'Stock' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }

      if (page === 'movements') {
        return (
          <>
            <Panel title="Stock movements — last 14 days" subtitle="Units received vs units sold">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={INVENTORY_MOVEMENTS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inGradM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="outGradM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.red} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_COLORS.red} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="stockIn" name="Stock in" stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#inGradM)" />
                  <Area type="monotone" dataKey="stockOut" name="Stock out" stroke={CHART_COLORS.red} strokeWidth={2} fill="url(#outGradM)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Movement log" subtitle="Every stock in/out transaction">
              <EmptyState title="NO MOVEMENTS YET" note="Receiving deliveries and processing sales will record stock movements here." />
            </Panel>
          </>
        );
      }

      if (page === 'deliveries') {
        return (
          <>
            <div className="stat-grid">
              <StatCard label="EXPECTED DELIVERIES" value={PURCHASE_ORDERS.filter((p) => p.status === 'In Transit' || p.status === 'Pending').length} sub="From active purchase orders" />
              <StatCard label="STORAGE LOCATIONS" value={WAREHOUSES.length} sub="Main QC · BGC · Cebu" tone="purple" />
            </div>
            <Panel title="Incoming supplier deliveries" subtitle="Purchase orders expected at the warehouse">
              <DataTable
                keyField="id"
                emptyTitle="NO DELIVERIES YET"
                emptyNote="Once purchase orders are confirmed, expected deliveries and their ETAs will appear here."
                columns={[
                  { key: 'id', label: 'PO Reference' },
                  { key: 'supplier', label: 'Supplier' },
                  { key: 'items', label: 'Items' },
                  { key: 'eta', label: 'ETA' },
                  { key: 'status', label: 'Status' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }

      if (page === 'reports') {
        return (
          <>
            <div className="stat-grid">
              <StatCard label="UNITS ON HAND" value={totalUnits} sub="Across the planned catalog" />
              <StatCard label="STOCK VALUE" value={peso(stockValue)} sub="At retail pricing" tone="green" />
            </div>
            <Panel title="Inventory reports" subtitle="Stock summaries and valuations">
              <EmptyState title="NO INVENTORY REPORTS YET" note="Stock summaries and valuation reports will be generated automatically once inventory transactions begin." />
            </Panel>
          </>
        );
      }

      // overview
      return (
        <>
          <div className="stat-grid">
            <StatCard label="ACTIVE SKUS" value={PRODUCTS.length} sub="Across 5 categories" />
            <StatCard label="UNITS ON HAND" value={totalUnits} sub={`${WAREHOUSES.length} storage locations`} tone="purple" />
            <StatCard label="STOCK VALUE" value={peso(stockValue)} sub="At retail pricing" tone="green" />
            <StatCard label="LOW STOCK ALERTS" value={PRODUCTS.filter((p) => p.stock <= 12).length} sub="Projection from the seeded catalog" tone="red" />
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
              <EmptyState title="NO STOCK ALERTS YET" note="Products that fall below the low-stock threshold will be flagged here automatically." />
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
              emptyTitle="NO DELIVERIES YET"
              emptyNote="Once purchase orders are confirmed, expected deliveries and their ETAs will appear here."
              columns={[
                { key: 'id', label: 'PO Reference' },
                { key: 'supplier', label: 'Supplier' },
                { key: 'items', label: 'Items' },
                { key: 'eta', label: 'ETA' },
                { key: 'status', label: 'Status' }
              ]}
              rows={[]}
            />
          </Panel>
        </>
      );
    }}
  </DashboardLayout>
);

export default InventoryDashboard;
