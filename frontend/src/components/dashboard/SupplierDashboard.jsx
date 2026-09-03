import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, EmptyState } from './DashboardShared';
import { peso2, CHART_COLORS } from '../../data/dashboardData';

const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

const deliveryMix = [
  { name: 'Delivered', value: 4 },
  { name: 'In Transit', value: 1 },
  { name: 'Pending', value: 1 }
];

const SupplierDashboard = () => (
  <DashboardLayout role="supplier">
    {(page) => {
      if (page === 'orders') {
        return (
          <>
            <div className="panel-grid panel-grid-2-1">
              <Panel title="Order pipeline" subtitle="Planned distribution once purchasing begins">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={deliveryMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={95}
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
              <Panel title="How the portal works" subtitle="Your side of every purchase order">
                <ol className="steps-list">
                  <li>Receive the purchase order issued by the Purchasing Officer.</li>
                  <li>Accept it and prepare the items for delivery.</li>
                  <li>Update the delivery status — In Transit, then Delivered.</li>
                  <li>Payment is settled by the Accounting module.</li>
                </ol>
              </Panel>
            </div>
            <Panel title="Purchase orders for your company" subtitle="Accept, prepare and update delivery status">
              <DataTable
                keyField="id"
                emptyTitle="NO PURCHASE ORDERS YET"
                emptyNote="When FashionFlow issues a purchase order to you, it will appear here for acceptance and status updates."
                columns={[
                  { key: 'id', label: 'Reference' },
                  { key: 'items', label: 'Items' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }

      if (page === 'catalog') {
        return (
          <Panel title="My products" subtitle="Catalog offered to FashionFlow" action={<a href="#" className="panel-link" onClick={(e) => e.preventDefault()}>+ ADD PRODUCT</a>}>
            <DataTable
              keyField="name"
              emptyTitle="NO PRODUCTS LISTED YET"
              emptyNote="List the products you supply — variants, unit cost, minimum order quantity and lead time."
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'variant', label: 'Variants' },
                { key: 'unitCost', label: 'Unit cost' },
                { key: 'moq', label: 'MOQ' },
                { key: 'leadTime', label: 'Lead time' }
              ]}
              rows={[]}
            />
          </Panel>
        );
      }

      if (page === 'payments') {
        return (
          <>
            <div className="stat-grid">
              <StatCard label="LIFETIME DELIVERED VALUE" value={peso2(0)} sub="With FashionFlow" />
              <StatCard label="ON-TIME RATE" value="96%" sub="2 points above network average" tone="purple" />
            </div>
            <Panel title="Payments" subtitle="Settled purchase orders">
              <DataTable
                keyField="id"
                emptyTitle="NO PAYMENTS YET"
                emptyNote="Payments released by the Accounting module for your delivered orders will appear here."
                columns={[
                  { key: 'id', label: 'Reference' },
                  { key: 'items', label: 'Items' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' }
                ]}
                rows={[]}
              />
            </Panel>
          </>
        );
      }

      // overview — Portal Overview
      return (
        <>
          <div className="stat-grid">
            <StatCard label="OPEN PURCHASE ORDERS" value="0" sub="No orders issued yet" />
            <StatCard label="DELIVERIES COMPLETED" value="0" sub="Last 60 days" tone="green" />
            <StatCard label="ON-TIME RATE" value="96%" sub="2 points above network average" tone="purple" />
            <StatCard label="CATALOG ITEMS" value="0" sub="Products listed for supply" tone="dark" />
          </div>

          <div className="panel-grid panel-grid-2-1">
            <Panel title="Order pipeline" subtitle="Planned distribution once purchasing begins">
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

            <Panel title="How the portal works" subtitle="Your side of every purchase order">
              <ol className="steps-list">
                <li>Receive the purchase order issued by the Purchasing Officer.</li>
                <li>Accept it and prepare the items for delivery.</li>
                <li>Update the delivery status — In Transit, then Delivered.</li>
                <li>Payment is settled by the Accounting module.</li>
              </ol>
            </Panel>
          </div>

          <Panel title="Purchase orders for your company" subtitle="Accept, prepare and update delivery status">
            <DataTable
              keyField="id"
              emptyTitle="NO PURCHASE ORDERS YET"
              emptyNote="When FashionFlow issues a purchase order to you, it will appear here for acceptance and status updates."
              columns={[
                { key: 'id', label: 'Reference' },
                { key: 'items', label: 'Items' },
                { key: 'amount', label: 'Amount' },
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

export default SupplierDashboard;
