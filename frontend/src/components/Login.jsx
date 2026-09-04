import React, { useState } from 'react';
import { api, saveAuth } from '../api/client';

// Demo accounts from the project documentation — chips prefill the email;
// the password is typed (credentials are verified by the API, never trusted
// client-side).
const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@fashionflow.com' },
  { label: 'Inventory Manager', email: 'inventman@fashionflow.com' },
  { label: 'Purchasing Officer', email: 'purchase@fashionflow.com' },
  { label: 'Sales Staff', email: 'sales@fashionflow.com' },
  { label: 'Customer', email: 'customer@fashionflow.com' },
  { label: 'Accountant', email: 'accountan@fashionflow.com' },
  { label: 'Supplier', email: 'supplier@fashionflow.com' }
];

const Login = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      saveAuth({ token: res.token, user: res.user });
      window.location.hash = `dashboard/${res.user.dashboardKey}`;
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const prefill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('');
    setError('');
  };

  return (
    <div className="login-container">
      {/* Left panel with full image and text overlay */}
      <div className="login-left">
        <img src="/assets/login-editorial.jpg" alt="" aria-hidden="true" className="login-left-img-blur" />
        <img src="/assets/login-editorial.jpg" alt="Flat lay of clothing inventory — trousers, tee, watch and sneakers" className="login-left-img" />
        <div className="login-left-overlay">
          <div className="login-left-content">
            <span className="login-left-tag">ERP &amp; CRM — CLOTHING BUSINESS</span>
            <h1 className="login-left-heading">
              Built for<br />Fashion.<br />Designed<br />for Scale.
            </h1>
            <p className="login-left-desc">
              Every module your clothing business needs —<br />
              inventory, purchasing, sales, and more — unified<br />
              in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel with form */}
      <div className="login-right">
        {/* Top Navigation Bar */}
        <div className="login-nav">
          <div className="login-nav-left">
            <img src="/assets/no background logo.png" alt="FashionFlow" className="login-nav-logo" />
          </div>
          <div className="login-nav-right">
            <button className="back-store-btn" onClick={onBack}>
              &larr; BACK TO STORE
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="login-form-wrapper">
          {/* Centered Brand Logo */}
          <div className="login-center-logo">
            <img src="/assets/no background logo.png" alt="FashionFlow" className="login-brand-img" />
          </div>

          <div className="login-form-header">
            <span className="login-form-tag">SIGN IN</span>
            <h2 className="login-form-title">Welcome back.</h2>
            <p className="login-form-subtitle">Sign in to access your FashionFlow dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">EMAIL</label>
              <input
                type="email"
                id="email"
                placeholder="you@fashionflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">PASSWORD</label>
                <span className="forgot-link">FORGOT PASSWORD?</span>
              </div>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy ? 'SIGNING IN…' : 'SIGN IN →'}
            </button>
          </form>

          <div className="login-divider">
            <span>DEMO ACCOUNTS</span>
          </div>

          <div className="login-demo-chips">
            {DEMO_ACCOUNTS.map((cred) => (
              <button key={cred.email} type="button" className="login-chip" onClick={() => prefill(cred.email)}>
                {cred.label}
              </button>
            ))}
          </div>

          <button className="login-guest-btn" onClick={onBack}>
            BROWSE AS CUSTOMER
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <span>&copy; 2026 FashionFlow &middot; ERP &amp; CRM</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
