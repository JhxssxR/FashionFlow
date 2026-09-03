import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge } from './DashboardShared';
import {
  peso, peso2, SUPPLIER_INCOMING_POS, SUPPLIER_DELIVERY_HISTORY,
  SUPPLIER_CATALOG, CHART_COLORS
} from '../../data/dashboardData';

const AXIS = { stroke: '#9a9a9a', fontSize: 11 };
const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

const SupplierDashboard = () => {
  const deliveredCount = SUPPLIER_DELIVERY_HISTORY.length;
  const deliveredValue = SUPPLIER_DELIVERY_HISTORY.reduce((s, d) => s + d.amount, 0);
  const incomingValue = SUPPLIER_INCOMING_POS.reduce((s, p) => s + p.amount, 0);

  const deliveryMix = [
    { name: 'Delivered', value: deliveredCount },
    { name: 'In Transit', value: SUPPLIER_INCOMING_POS.filter((p) => p.status === 'In Transit').length },
    { name: 'Pending', value: SUPPLIER_INCOMING_POS.filter((p) => p.status === 'Pending').length }
  ].filter((d) => d.value > 0);

  return (
    <DashboardLayout role="supplier">
      <div className="stat-grid">
        <StatCard label="OPEN PURCHASE ORDERS" value={SUPPLIER_INCOMING_POS.length} sub={peso(incomingValue) + ' total value'} />
        <StatCard label="DELIVERIES COMPLETED" value={deliveredCount} sub="Last 60 days" tone="green" />
        <StatCard label="LIFETIME DELIVERED VALUE" value={peso(deliveredValue)} sub="With FashionFlow" tone="dark" />
        <StatCard label="ON-TIME RATE" value="96%" sub="2 points above network average" tone="purple" />
      </div>

      <div className="panel-grid panel-grid-2-1">
        <Panel title="Purchase orders for Denim Republic PH" subtitle="Accept, prepare and update delivery status" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>RESPOND TO ALL →</a>}>
          <DataTable
            keyField="id"
            columns={[
              { key: 'id', label: 'Reference' },
              { key: 'items', label: 'Items' },
              { key: 'date', label: 'Issued', width: '130px' },
              { key: 'amount', label: 'Amount', render: (r) => <strong>{peso2(r.amount)}</strong> },
              { key: 'status', label: 'Status', width: '130px', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'action', label: '', width: '130px', render: (r) =>
                  r.status === 'Pending' ? <button className="mini-btn" onClick={(e) => e.preventDefault()}>ACCEPT</button> : null
              }
            ]}
            rows={SUPPLIER_INCOMING_POS}
          />
        </Panel>

        <Panel title="Order pipeline" subtitle="Where your POs stand">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={deliveryMix}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >
                {deliveryMix.map((entry, i) => (
                  <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend-list">
            {deliveryMix.map((d, i) => (
              <li key={d.name}>
                <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                {d.name} — {d.value}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="panel-grid panel-grid-1-1">
        <Panel title="My supplied products" subtitle="Catalog offered to FashionFlow">
          <DataTable
            keyField="name"
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'variant', label: 'Variants' },
              { key: 'unitCost', label: 'Unit cost', render: (r) => peso2(r.unitCost) },
              { key: 'moq', label: 'MOQ', render: (r) => `${r.moq} units` },
              { key: 'leadTime', label: 'Lead time' }
            ]}
            rows={SUPPLIER_CATALOG}
          />
        </Panel>

        <Panel title="Delivery history" subtitle="Completed orders" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>UPDATE STATUS →</a>}>
          <DataTable
            keyField="id"
            columns={[
              { key: 'id', label: 'Reference' },
              { key: 'items', label: 'Items' },
              { key: 'delivered', label: 'Delivered', width: '140px' },
              { key: 'amount', label: 'Amount', render: (r) => <strong>{peso2(r.amount)}</strong> },
              { key: 'status', label: 'Status', width: '120px', render: (r) => <StatusBadge status={r.status} /> }
            ]}
            rows={SUPPLIER_DELIVERY_HISTORY}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default SupplierDashboard;
