import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { getAuth, clearAuth } from '../api/client';

const Header = ({ onLoginClick }) => {
  const cart = useCart();
  // Read fresh on every render (cheap localStorage read) so the header
  // reflects sign-ins that happened elsewhere, e.g. the checkout gate.
  const auth = getAuth();
  const [, setAuthTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Search rides the same hash-routing as the category links:
  // #search/<term> → NewArrivals filters style names and shows all matches.
  const submitSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearchOpen(false);
    setQuery('');
    window.location.hash = `search/${encodeURIComponent(term)}`;
  };

  const signOut = () => {
    clearAuth();
    setAuthTick((t) => t + 1); // re-render now; no hashchange fires if already on ''
    if (window.location.hash) window.location.hash = '';
  };

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
            <img src="/assets/no background logo.png" alt="FashionFlow Logo" className="logo-img" style={{ height: '60px', width: 'auto' }} />
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
          {auth ? (
            <>
              <button
                className="login-link-btn account-btn"
                onClick={() => { window.location.hash = `dashboard/${auth.user.dashboardKey}`; }}
                title="Open my dashboard"
              >
                HI, {auth.user.name.split(' ')[0].toUpperCase()}
              </button>
              <button className="login-link-btn signout-btn" onClick={signOut}>SIGN OUT</button>
            </>
          ) : (
            <button className="login-link-btn" onClick={onLoginClick}>SIGN IN</button>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
