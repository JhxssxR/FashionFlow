import React, { useState } from 'react';
import { api, saveAuth } from '../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SIGN IN mode for existing accounts (staff + customers, credentials from the
// project docs); CREATE ACCOUNT mode self-registers customer accounts only —
// staff accounts are invited by an administrator.
const Login = ({ onBack }) => {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const clearFieldError = (field) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const validate = () => {
    const errs = {};
    if (mode === 'register' && name.trim().length < 2) {
      errs.name = 'Please enter your full name.';
    }
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!EMAIL_RE.test(email.trim())) {
      errs.email = "That doesn't look like a valid email address.";
    }
    if (!password) {
      errs.password = mode === 'signin'
        ? 'Please enter your password.'
        : 'Please choose a password of at least 6 characters.';
    } else if (mode === 'register' && password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.values(errs).some(Boolean)) {
      setFieldErrors(errs);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = mode === 'signin'
        ? await api('/api/auth/login', { method: 'POST', body: { email, password } })
        : await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
      saveAuth({ token: res.token, user: res.user });
      window.location.hash = `dashboard/${res.user.dashboardKey}`;
    } catch (err) {
      setError(
        err.status === 429
          ? 'Too many attempts — please wait a minute and try again.'
          : err.message || 'Something went wrong. Please try again.'
      );
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
            <button type="button" className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => { setMode('signin'); setError(''); setFieldErrors({}); }}>
              SIGN IN
            </button>
            <button type="button" className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); setFieldErrors({}); }}>
              CREATE ACCOUNT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-name">FULL NAME</label>
                <input
                  type="text"
                  id="reg-name"
                  placeholder="Juan Dela Cruz"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearFieldError('name'); setError(''); }}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  className={fieldErrors.name ? 'input-error' : undefined}
                />
                {fieldErrors.name && <p className="field-error" role="alert">{fieldErrors.name}</p>}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">EMAIL</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); setError(''); }}
                aria-invalid={fieldErrors.email ? true : undefined}
                className={fieldErrors.email ? 'input-error' : undefined}
              />
              {fieldErrors.email && <p className="field-error" role="alert">{fieldErrors.email}</p>}
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
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); setError(''); }}
                aria-invalid={fieldErrors.password ? true : undefined}
                className={fieldErrors.password ? 'input-error' : undefined}
              />
              {fieldErrors.password && <p className="field-error" role="alert">{fieldErrors.password}</p>}
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

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
