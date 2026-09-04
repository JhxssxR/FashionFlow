import React from 'react';
import AdminDashboard from './AdminDashboard';
import InventoryDashboard from './InventoryDashboard';
import PurchasingDashboard from './PurchasingDashboard';
import SalesDashboard from './SalesDashboard';
import CustomerDashboard from './CustomerDashboard';
import AccountantDashboard from './AccountantDashboard';
import SupplierDashboard from './SupplierDashboard';

const DASHBOARDS = {
  admin: AdminDashboard,
  inventory: InventoryDashboard,
  purchasing: PurchasingDashboard,
  sales: SalesDashboard,
  customer: CustomerDashboard,
  accountant: AccountantDashboard,
  supplier: SupplierDashboard
};

const DashboardRouter = ({ role, user }) => {
  const Dashboard = DASHBOARDS[role] || AdminDashboard;
  return <Dashboard user={user} />;
};

export default DashboardRouter;
