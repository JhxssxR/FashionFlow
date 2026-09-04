import React from 'react';
import { clearAuth } from '../../api/client';
import { initialsOf } from '../../utils';

// Sidebar navigation per role, mapped from the project documentation's
// role-based access list and the 11 subsystem modules.
const ROLE_CONFIG = {
  admin: {
    label: 'System Administrator',
    roleTag: 'ADMIN',
    pages: [
      { id: 'overview', label: 'Overview' },
      { id: 'users', label: 'Users & Roles' },
      { id: 'reports', label: 'Reports' },
      { id: 'logs', label: 'System Logs' },
      { id: 'settings', label: 'System Settings' }
    ],
    activePage: 'overview'
  },
  inventory: {
    label: 'Inventory Manager',
    roleTag: 'INVENTORY',
    pages: [
      { id: 'overview', label: 'Stock Overview' },
      { id: 'products', label: 'Products & Variants' },
      { id: 'movements', label: 'Stock Movements' },
      { id: 'deliveries', label: 'Supplier Deliveries' },
      { id: 'reports', label: 'Inventory Reports' }
    ],
    activePage: 'overview'
  },
  purchasing: {
    label: 'Purchasing Officer',
    roleTag: 'PURCHASING',
    pages: [
      { id: 'overview', label: 'Overview' },
      { id: 'orders', label: 'Purchase Orders' },
      { id: 'suppliers', label: 'Supplier Management' },
      { id: 'tracking', label: 'Transaction Tracking' }
    ],
    activePage: 'overview'
  },
  sales: {
    label: 'Sales Staff — POS',
    roleTag: 'POS',
    pages: [
      { id: 'overview', label: 'Today\u2019s Sales' },
      { id: 'pos', label: 'POS Terminal' },
      { id: 'customers', label: 'Customer Records' },
      { id: 'promos', label: 'Promotions & Loyalty' },
      { id: 'summary', label: 'Daily Summary' }
    ],
    activePage: 'overview'
  },
  customer: {
    label: 'Customer Account',
    roleTag: 'CUSTOMER',
    pages: [
      { id: 'overview', label: 'My Dashboard' },
      { id: 'orders', label: 'Purchase History' },
      { id: 'loyalty', label: 'Loyalty Points' },
      { id: 'promos', label: 'My Promotions' }
    ],
    activePage: 'overview'
  },
  accountant: {
    label: 'Accountant',
    roleTag: 'FINANCE',
    pages: [
      { id: 'overview', label: 'Financial Overview' },
      { id: 'receivables', label: 'Payables & Receivables' },
      { id: 'reports', label: 'Financial Reports' }
    ],
    activePage: 'overview'
  },
  supplier: {
    label: 'Supplier Portal',
    roleTag: 'SUPPLIER',
    pages: [
      { id: 'overview', label: 'Portal Overview' },
      { id: 'orders', label: 'Purchase Orders' },
      { id: 'catalog', label: 'My Products' },
      { id: 'payments', label: 'Payments' }
    ],
    activePage: 'overview'
  }
};

const DashboardLayout = ({ role, user, children }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const [activePage, setActivePage] = React.useState(config.activePage);
  const currentPage = config.pages.find((p) => p.id === activePage) || config.pages[0];

  const goStore = (e) => {
    e.preventDefault();
    window.location.hash = '';
  };

  const logout = (e) => {
    e.preventDefault();
    clearAuth();
    window.location.hash = 'login';
  };

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <a href="#" className="dash-brand" onClick={goStore}>
          <img src="/assets/no background logo.png" alt="FashionFlow" />
        </a>

        <nav className="dash-nav">
          <span className="dash-nav-title">{config.roleTag} MENU</span>
          {config.pages.map((page) => (
            <a
              key={page.id}
              href="#"
              onClick={(e) => { e.preventDefault(); setActivePage(page.id); }}
              className={`dash-nav-item${page.id === activePage ? ' active' : ''}`}
            >
              {page.label}
            </a>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-user">
            <span className="dash-avatar">{user?.initials || initialsOf(user?.name || '')}</span>
            <div className="dash-user-meta">
              <strong>{user?.name}</strong>
              <span>{config.label}</span>
            </div>
          </div>
          <a href="#" className="dash-back-link" onClick={logout}>
            SIGN OUT
          </a>
          <a href="#" className="dash-back-link" onClick={goStore}>
            &larr; BACK TO STORE
          </a>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <a href="#" className="dash-mobile-brand" onClick={goStore}>
            <img src="/assets/no background logo.png" alt="FashionFlow" />
          </a>
          <div>
            <h1 className="dash-page-title">{currentPage.label}</h1>
            <p className="dash-page-date">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="dash-topbar-right">
            <span className="dash-role-chip">{config.roleTag}</span>
            <span className="dash-avatar">{user?.initials || initialsOf(user?.name || '')}</span>
          </div>
        </header>
        <main className="dash-content">{children(activePage)}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
