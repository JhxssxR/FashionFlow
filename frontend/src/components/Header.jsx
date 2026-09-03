import React from 'react';

const Header = ({ onLoginClick }) => {
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
          <img src="/assets/no background logo.png" alt="FashionFlow Logo" className="logo-img" style={{ height: '60px', width: 'auto' }} />
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
          <button className="icon-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
          <button className="icon-btn" aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </button>
          <button className="login-link-btn" onClick={onLoginClick}>SIGN IN</button>
        </div>
      </header>
    </>
  );
};

export default Header;
