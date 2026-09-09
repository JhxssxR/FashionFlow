import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getAuth } from '../api/client';

// "2026-09-06T09:12:00" → "just now" / "4m" / "3h" / "2d" / "Sep 4"
function timeAgo(value) {
  const then = new Date(value).getTime();
  if (isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d`;
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Notification bell shared by every dashboard topbar and the storefront
// header (signed-in users only). variant: 'dash' | 'store' — 'store' picks
// up the header's plain icon-btn look instead of the dashboard's boxed one.
const NotificationBell = ({ variant = 'dash' }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const data = await api('/api/notifications?take=15');
      setItems(data?.items || []);
      setUnread(data?.unread || 0);
    } catch {
      // The bell is best-effort — never block the page on it.
    }
  }, []);

  const signedIn = Boolean(getAuth()?.token);

  // Poll the unread badge; the full list loads on open and after actions.
  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    loadList();
    const tick = async () => {
      try {
        const d = await api('/api/notifications/unread-count');
        if (alive) setUnread(d?.unread || 0);
      } catch { /* ignore — retried next tick */ }
    };
    const timer = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [signedIn, loadList]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!signedIn) return null;

  const getTargetLink = (n) => {
    const auth = getAuth();
    const role = auth?.user?.dashboardKey || (auth?.user?.role === 'Customer' ? 'customer' : 'admin');
    const type = (n.type || '').toLowerCase();
    const title = (n.title || '').toLowerCase();
    const body = (n.body || '').toLowerCase();

    // Check if notification already has an explicit sub-route (e.g. dashboard/admin/orders)
    if (n.link) {
      const clean = n.link.replace(/^#\/?/, '');
      const segments = clean.split(/[/?#]/).filter(Boolean);
      // If it has at least 3 parts e.g. dashboard/admin/orders, use it directly
      if (segments.length >= 3) return clean;
    }

    // Resolve based on notification subject & current user's role
    if (type === 'order' || title.includes('order') || body.includes('order') || title.includes('po ') || title.includes('purchase order')) {
      if (role === 'admin') return 'dashboard/admin/orders';
      if (role === 'inventory') return 'dashboard/inventory/orders';
      if (role === 'customer') return 'dashboard/customer/orders';
      if (role === 'sales') return 'dashboard/sales/overview';
      if (role === 'purchasing') return 'dashboard/purchasing/orders';
      if (role === 'supplier') return 'dashboard/supplier/orders';
      if (role === 'accountant') return 'dashboard/accountant/receivables';
    }

    if (type === 'inventory' || title.includes('stock') || body.includes('stock') || title.includes('delivery')) {
      if (role === 'inventory') {
        if (title.includes('delivery') || title.includes('received')) return 'dashboard/inventory/deliveries';
        return 'dashboard/inventory/products';
      }
      if (role === 'purchasing') return 'dashboard/purchasing/orders';
      if (role === 'admin') return 'dashboard/admin/overview';
    }

    if (type === 'loyalty' || title.includes('point') || title.includes('reward') || title.includes('tier') || title.includes('voucher') || title.includes('promo')) {
      if (role === 'customer') {
        if (title.includes('reward')) return 'dashboard/customer/rewards';
        if (title.includes('promo')) return 'dashboard/customer/promos';
        return 'dashboard/customer/loyalty';
      }
    }

    if (type === 'account' || title.includes('payable') || title.includes('receivable') || title.includes('finance')) {
      if (role === 'accountant') return 'dashboard/accountant/receivables';
      if (role === 'supplier') return 'dashboard/supplier/payments';
    }

    if (type === 'report' || title.includes('report') || title.includes('audit')) {
      if (role === 'admin') return 'dashboard/admin/reports';
      if (role === 'accountant') return 'dashboard/accountant/reports';
      if (role === 'inventory') return 'dashboard/inventory/reports';
      if (role === 'purchasing') return 'dashboard/purchasing/reports';
    }

    if (type === 'system' && (title.includes('user') || title.includes('staff') || title.includes('invited') || title.includes('role'))) {
      if (role === 'admin') return 'dashboard/admin/users';
    }

    if (n.link) return n.link.replace(/^#\/?/, '');
    return `dashboard/${role}`;
  };

  const markRead = async (n) => {
    setOpen(false);
    if (!n.isRead) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      try { await api('/api/notifications/read', { method: 'PUT', body: { ids: [n.id] } }); } catch { /* best-effort */ }
    }
    const target = getTargetLink(n);
    if (target) {
      window.location.hash = target;
    }
  };

  const markAll = async () => {
    setUnread(0);
    setItems((list) => list.map((i) => ({ ...i, isRead: true })));
    try { await api('/api/notifications/read-all', { method: 'PUT' }); } catch { /* best-effort */ }
  };

  return (
    <div className={`notif-wrap${variant === 'store' ? ' notif-store' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={variant === 'store' ? 'icon-btn notif-btn' : 'dash-notif-btn'}
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) loadList(); // fresh list every time it opens
            return next;
          });
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={variant === 'store' ? 20 : 18} height={variant === 'store' ? 20 : 18}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-head">
            <span>NOTIFICATIONS</span>
            {unread > 0 && (
              <button type="button" onClick={markAll}>MARK ALL READ</button>
            )}
          </div>
          <ul className="notif-list">
            {items.length === 0 && (
              <li className="notif-empty">No notifications yet — you&rsquo;re all caught up.</li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`notif-item${n.isRead ? '' : ' unread'}`}
                onClick={() => markRead(n)}
              >
                <div className="notif-item-top">
                  <span className="notif-chip">{n.type}</span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </div>
                <strong className="notif-title">{n.title}</strong>
                {n.body && <p className="notif-body">{n.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
