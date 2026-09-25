import React from 'react';
import { clearAuth } from '../../api/client';
import { clearCartStorage } from '../../context/cartEvents.js';
import { initialsOf } from '../../utils';
import NotificationBell from '../NotificationBell.jsx';

// Sidebar navigation per role, mapped from the project documentation's
// role-based access list and the 11 subsystem modules.
const ROLE_CONFIG = {
  admin: {
    label: 'System Administrator',
    roleTag: 'ADMIN',
    pages: [
      { id: 'overview', label: 'Overview' },
      { id: 'orders', label: 'Online Orders' },
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
      { id: 'orders', label: 'Storefront Orders' },
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
      { id: 'tracking', label: 'Transaction Tracking' },
      { id: 'reports', label: 'Purchasing Reports' }
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
      { id: 'rewards', label: 'Rewards Store' },
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

const getActivePageFromHash = (config, role) => {
  const hash = window.location.hash || '';
  const prefix = `#dashboard/${role}/`;
  let pageId = null;
  if (hash.startsWith(prefix)) {
    pageId = hash.slice(prefix.length).split(/[/?#]/)[0];
  } else {
    const match = hash.match(/[?&]tab=([^&#]+)/);
    if (match) pageId = match[1];
  }
  if (pageId && config.pages.some((p) => p.id === pageId)) {
    return pageId;
  }
  return config.activePage;
};

const DashboardLayout = ({ role, user, children }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const [activePage, setActivePage] = React.useState(() => getActivePageFromHash(config, role));
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    const handleHash = () => {
      const target = getActivePageFromHash(config, role);
      setActivePage(target);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [config, role]);

  // Lock background scroll while the mobile sidebar is open — the page
  // behind must not move, only the sidebar nav itself scrolls.
  React.useEffect(() => {
    if (!navOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [navOpen]);

  const currentPage = config.pages.find((p) => p.id === activePage) || config.pages[0];

  const setPage = (pageId) => {
    window.location.hash = `dashboard/${role}/${pageId}`;
    setActivePage(pageId);
  };

  const goStore = (e) => {
    e.preventDefault();
    window.location.hash = '';
  };

  const logout = (e) => {
    e.preventDefault();
    clearAuth();
    clearCartStorage();
    window.location.hash = 'login';
  };

  return (
    <div className={`dash-shell${navOpen ? ' nav-open' : ''}`}>
      {navOpen && <div className="dash-backdrop" onClick={() => setNavOpen(false)} />}
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
              onClick={(e) => { e.preventDefault(); setPage(page.id); setNavOpen(false); }}
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
          <a href="#" className="dash-back-link dash-signout" onClick={logout}>
            SIGN OUT
          </a>
          <a href="#" className="dash-back-link" onClick={goStore}>
            &larr; BACK TO STORE
          </a>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="dash-menu-btn"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
            )}
          </button>
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
            <NotificationBell variant="dash" />
            <span className="dash-role-chip">{config.roleTag}</span>
            <span className="dash-avatar">{user?.initials || initialsOf(user?.name || '')}</span>
          </div>
        </header>
        <main className="dash-content">{children(activePage, setActivePage)}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
