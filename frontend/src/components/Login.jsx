import React, { useState } from 'react';
import { api, saveAuth } from '../api/client';

// SIGN IN mode for existing accounts (staff + customers, credentials from the
// project docs); CREATE ACCOUNT mode self-registers customer accounts only —
// staff accounts are invited by an administrator.
const Login = ({ onBack }) => {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = mode === 'signin'
        ? await api('/api/auth/login', { method: 'POST', body: { email, password } })
        : await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
      saveAuth({ token: res.token, user: res.user });
      window.location.hash = `dashboard/${res.user.dashboardKey}`;
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left panel with full image and text overlay */}
      <div className="login-left">
        <img src="/assets/login-model.jpg" alt="" aria-hidden="true" className="login-left-img-blur" />
        <img src="/assets/login-model.jpg" alt="FashionFlow model in a yellow streetwear set on an outdoor court" className="login-left-img" />
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
            <span className="login-form-tag">{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
            <h2 className="login-form-title">
              {mode === 'signin' ? 'Welcome back.' : 'Join FashionFlow.'}
            </h2>
            <p className="login-form-subtitle">
              {mode === 'signin'
                ? 'Sign in to access your FashionFlow dashboard.'
                : 'Create a free customer account — earn points on every order.'}
            </p>
          </div>

          <div className="auth-tabs">
            <button type="button" className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => { setMode('signin'); setError(''); }}>
              SIGN IN
            </button>
            <button type="button" className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
              CREATE ACCOUNT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-name">FULL NAME</label>
                <input
                  type="text"
                  id="reg-name"
                  placeholder="Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">EMAIL</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
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
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy ? 'PLEASE WAIT…' : mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
            </button>
          </form>
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
