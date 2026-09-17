import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { getAuth, clearAuth } from '../api/client';
import NotificationBell from './NotificationBell.jsx';

const Header = ({ onLoginClick }) => {
  const cart = useCart();
  // Read fresh on every render (cheap localStorage read) so the header
  // reflects sign-ins that happened elsewhere, e.g. the checkout gate.
  const auth = getAuth();
  const [, setAuthTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  // Header renders inside App (which re-renders on every hashchange), so
  // reading the hash here highlights the current category on mobile.
  const currentHash = window.location.hash.toLowerCase();

  // Search rides the same hash-routing as the category links:
  // #search/<term> → NewArrivals filters style names and shows all matches.
  const submitSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearchOpen(false);
    setQuery('');
    setNavOpen(false);
    window.location.hash = `search/${encodeURIComponent(term)}`;
  };

  const openCart = () => {
    setNavOpen(false);
    cart.setOpen(true);
  };

  const signOut = () => {
    clearAuth();
    setAuthTick((t) => t + 1); // re-render now; no hashchange fires if already on ''
    if (window.location.hash) window.location.hash = '';
  };

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="top-banner">
        <div className="top-banner-track">
          <div className="top-banner-content">
            <span>FREE SHIPPING ₱3,000+</span>
            <span>·</span>
            <span>NEW ARRIVALS EVERY FRIDAY</span>
            <span>·</span>
            <span>FREE RETURNS</span>
            <span>·</span>
            <span>LOYALTY POINTS ON EVERY PURCHASE</span>
            <span>·</span>
            <span>USE CODE FF200 FOR ₱200 OFF</span>
            <span>·</span>
          </div>
          <div className="top-banner-content" aria-hidden="true">
            <span>FREE SHIPPING ₱3,000+</span>
            <span>·</span>
            <span>NEW ARRIVALS EVERY FRIDAY</span>
            <span>·</span>
            <span>FREE RETURNS</span>
            <span>·</span>
            <span>LOYALTY POINTS ON EVERY PURCHASE</span>
            <span>·</span>
            <span>USE CODE FF200 FOR ₱200 OFF</span>
            <span>·</span>
          </div>
        </div>
      </div>
      <header className="header">
        <button
          type="button"
          className="menu-btn"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          )}
        </button>
        <div className="header-logo">
          {/* this app sets scrollRestoration=manual, so the browser never
              performs the native "#" jump — scroll to the hero ourselves
              (instant: smooth scrolling no-ops in the embedded browser pane) */}
          <a
            href="#"
            className="logo-link"
            aria-label="FashionFlow — back to top"
            onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}
          >
            <img src="/assets/no background logo.png" alt="FashionFlow Logo" className="logo-img" />
          </a>
        </div>
        <nav className="header-nav">
          <ul>
            <li><a href="#women" className="active">WOMEN</a></li>
            <li><a href="#men">MEN</a></li>
            <li><a href="#outerwear">OUTERWEAR</a></li>
            <li><a href="#sale">SALE</a></li>
          </ul>
        </nav>
        {/* Mobile-only category menu (toggled by the hamburger; the desktop
            nav stays in the header row). Clicking a link both navigates and
            closes the menu — the category-jump lands on the section title. */}
        <nav className={`mobile-nav${navOpen ? ' open' : ''}`}>
          {[['#women', 'WOMEN'], ['#men', 'MEN'], ['#outerwear', 'OUTERWEAR'], ['#sale', 'SALE']].map(([href, label]) => (
            <a key={href} href={href} className={currentHash === href ? 'active' : ''} onClick={() => setNavOpen(false)}>
              {label}
            </a>
          ))}
          {/* Search / cart / account live inside the hamburger on mobile —
              the header row keeps only the hamburger + logo. */}
          <div className="mobile-nav-actions">
            <form className="mobile-nav-search" onSubmit={submitSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH PIECES…"
                aria-label="Search products"
              />
            </form>
            <div className="mobile-nav-iconrow">
              {auth && <NotificationBell variant="store" />}
              <button type="button" className="mobile-nav-btn" onClick={openCart}>
                CART{cart.count > 0 ? ` (${cart.count})` : ''}
              </button>
            </div>
            {auth ? (
              <>
                <button
                  type="button"
                  className="mobile-nav-btn"
                  onClick={() => { setNavOpen(false); window.location.hash = `dashboard/${auth.user.dashboardKey}`; }}
                >
                  MY DASHBOARD
                </button>
                <button
                  type="button"
                  className="mobile-nav-btn"
                  onClick={() => { setNavOpen(false); signOut(); }}
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <button
                type="button"
                className="mobile-nav-btn"
                onClick={() => { setNavOpen(false); onLoginClick(); }}
              >
                SIGN IN
              </button>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {searchOpen && (
            <form className="header-search" onSubmit={submitSearch}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setSearchOpen(false), setQuery(''))}
                placeholder="SEARCH PIECES…"
                aria-label="Search products"
              />
            </form>
          )}
          <button
            className="icon-btn"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            onClick={() => { setSearchOpen((o) => !o); setQuery(''); }}
          >
            {searchOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            )}
          </button>
          <button className="icon-btn cart-btn" aria-label="Cart" onClick={() => cart.setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
          </button>
          {auth && <NotificationBell variant="store" />}
          {auth ? (
            <div className="account-menu" ref={menuRef}>
              <button
                className="login-link-btn account-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                HI, {auth.user.name.split(' ')[0].toUpperCase()}
                <svg className={`account-caret${menuOpen ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {menuOpen && (
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-head">
                    <strong>{auth.user.name}</strong>
                    <span>{auth.user.roleLabel}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); window.location.hash = `dashboard/${auth.user.dashboardKey}`; }}
                  >
                    MY DASHBOARD
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-dropdown-signout"
                    onClick={() => { setMenuOpen(false); signOut(); }}
                  >
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-link-btn" onClick={onLoginClick}>SIGN IN</button>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
