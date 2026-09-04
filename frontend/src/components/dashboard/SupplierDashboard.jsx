import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from './DashboardLayout';
import { StatCard, Panel, DataTable, StatusBadge, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { peso, peso2, num, CHART_COLORS, fmtDate } from '../../utils';

const donutColors = [CHART_COLORS.gold, CHART_COLORS.dark, CHART_COLORS.green, CHART_COLORS.red];

// Next allowed step in the delivery pipeline per current status.
const NEXT_STEP = {
  Pending: { status: 'Confirmed', label: 'ACCEPT ORDER' },
  Confirmed: { status: 'In Transit', label: 'SHIP — IN TRANSIT' },
  'In Transit': { status: 'Delivered', label: 'MARK DELIVERED' }
};

const SupplierDashboard = ({ user }) => {
  const [tick, setTick] = useState(0);
  const orders = useApi('/api/portal/purchase-orders', [tick]);
  const payments = useApi('/api/portal/payments', [tick]);
  const catalog = useApi('/api/portal/catalog', [tick]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);
  const bump = () => setTick((t) => t + 1);

  const rows = orders.data || [];
  const pipeline = ['Pending', 'Confirmed', 'In Transit', 'Delivered'].map((name) => ({
    name,
    value: rows.filter((p) => p.status === name).length
  })).filter((x) => x.value > 0);
  const openCount = rows.filter((p) => p.status === 'Pending' || p.status === 'Confirmed' || p.status === 'In Transit').length;
  const deliveredRecent = rows.filter((p) => p.status === 'Delivered').length;

  const advance = async (row, status) => {
    setBusyId(row.purchaseId);
    setMsg('');
    try {
      const res = await api(`/api/portal/purchase-orders/${row.purchaseId}/status`, {
        method: 'PUT',
        body: { status }
      });
      setMsg(status === 'Delivered'
        ? `${res.id} marked delivered — ${row.quantity} units received into FashionFlow stock.`
        : `${res.id} is now ${res.status}.`);
      bump();
    } catch (ex) {
      setMsg(ex.message);
    } finally {
      setBusyId(null);
    }
  };

  const orderColumns = (withActions) => [
    { key: 'id', label: 'Reference' },
    { key: 'items', label: 'Items', render: (r) => `${r.productName} ×${r.quantity}` },
    { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) },
    { key: 'issuedDate', label: 'Issued', render: (r) => fmtDate(r.issuedDate) },
    { key: 'eta', label: 'ETA', render: (r) => fmtDate(r.eta) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(withActions ? [{
      key: 'actions', label: 'Action', render: (r) => {
        const next = NEXT_STEP[r.status];
        return next
          ? <button className="mini-btn" disabled={busyId === r.purchaseId} onClick={() => advance(r, next.status)}>
              {busyId === r.purchaseId ? 'SAVING…' : next.label}
            </button>
          : <span>—</span>;
      }
    }] : [])
  ];

  return (
    <DashboardLayout role="supplier" user={user}>
      {(page) => {
        if (page === 'orders') {
          return (
            <>
              {msg && <div className="form-ok">{msg}</div>}
              <div className="panel-grid panel-grid-2-1">
                <Panel title="Order pipeline" subtitle="Live status of your purchase orders">
                  {orders.loading ? <Loading /> : (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={pipeline.length ? pipeline : [{ name: 'No orders', value: 1 }]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={95}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {(pipeline.length ? pipeline : [{ name: 'No orders' }]).map((entry, i) => (
                              <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <ul className="legend-list">
                        {pipeline.map((d, i) => (
                          <li key={d.name}>
                            <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                            {d.name} — {d.value}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
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
                <ErrorNote message={orders.error} />
                {orders.loading && !orders.data ? <Loading /> : (
                  <DataTable keyField="purchaseId" emptyTitle="NO PURCHASE ORDERS YET"
                    emptyNote="When FashionFlow issues a purchase order to you, it appears here for acceptance and status updates."
                    columns={orderColumns(true)} rows={rows} />
                )}
              </Panel>
            </>
          );
        }

        if (page === 'catalog') {
          return (
            <Panel title="My products" subtitle="Derived from your real purchase orders — last cost, MOQ and lead time">
              <ErrorNote message={catalog.error} />
              {catalog.loading ? <Loading /> : (
                <DataTable
                  keyField="name"
                  emptyTitle="NO PRODUCTS LISTED YET"
                  emptyNote="Products FashionFlow has ordered from you appear here with terms derived from those orders."
                  columns={[
                    { key: 'name', label: 'Product' },
                    { key: 'variant', label: 'Variants' },
                    { key: 'lastUnitCost', label: 'Last unit cost', render: (r) => peso(r.lastUnitCost) },
                    { key: 'moq', label: 'MOQ' },
                    { key: 'leadTime', label: 'Lead time' }
                  ]}
                  rows={catalog.data || []}
                />
              )}
            </Panel>
          );
        }

        if (page === 'payments') {
          return (
            <>
              <div className="stat-grid">
                <StatCard label="LIFETIME DELIVERED VALUE" value={peso2(payments.data?.lifetimeDelivered)} sub="With FashionFlow" />
                <StatCard label="DELIVERED ORDERS" value={num(payments.data?.rows?.length)} sub="Settled by the Accounting module" tone="purple" />
              </div>
              <Panel title="Payments" subtitle="Settled purchase orders">
                <ErrorNote message={payments.error} />
                {payments.loading ? <Loading /> : (
                  <DataTable
                    keyField="id"
                    emptyTitle="NO PAYMENTS YET"
                    emptyNote="Payments released for your delivered orders appear here."
                    columns={[
                      { key: 'id', label: 'Reference' },
                      { key: 'items', label: 'Items' },
                      { key: 'amount', label: 'Amount', render: (r) => peso(r.amount) },
                      { key: 'deliveredDate', label: 'Delivered', render: (r) => fmtDate(r.deliveredDate) },
                      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                    ]}
                    rows={payments.data?.rows || []}
                  />
                )}
              </Panel>
            </>
          );
        }

        // overview — Portal Overview
        return (
          <>
            {msg && <div className="form-ok">{msg}</div>}
            <div className="stat-grid">
              <StatCard label="OPEN PURCHASE ORDERS" value={num(openCount)} sub="Awaiting your action" />
              <StatCard label="DELIVERIES COMPLETED" value={num(deliveredRecent)} sub="All time" tone="green" />
              <StatCard label="LIFETIME DELIVERED VALUE" value={peso(payments.data?.lifetimeDelivered)} sub="Settled by Accounting" tone="purple" />
              <StatCard label="CATALOG ITEMS" value={num(catalog.data?.length)} sub="Products ordered from you" tone="dark" />
            </div>

            <div className="panel-grid panel-grid-2-1">
              <Panel title="Order pipeline" subtitle="Live status of your purchase orders">
                {orders.loading ? <Loading /> : (
                  <>
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={pipeline.length ? pipeline : [{ name: 'No orders', value: 1 }]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {(pipeline.length ? pipeline : [{ name: 'No orders' }]).map((entry, i) => (
                            <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="legend-list">
                      {pipeline.map((d, i) => (
                        <li key={d.name}>
                          <span className="legend-dot" style={{ background: donutColors[i % donutColors.length] }} />
                          {d.name} — {d.value}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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
              <ErrorNote message={orders.error} />
              {orders.loading && !orders.data ? <Loading /> : (
                <DataTable keyField="purchaseId" emptyTitle="NO PURCHASE ORDERS YET"
                  emptyNote="When FashionFlow issues a purchase order to you, it appears here for acceptance and status updates."
                  columns={orderColumns(true)} rows={rows.slice(0, 8)} />
              )}
            </Panel>
          </>
        );
      }}
    </DashboardLayout>
  );
};

export default SupplierDashboard;
