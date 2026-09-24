import React, { useState } from 'react';
import { api, saveAuth } from '../api/client';
import { signInWithGoogle, isFirebaseConfigured } from '../api/firebase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SIGN IN mode for existing accounts (staff + customers, credentials from the
// project docs); CREATE ACCOUNT mode self-registers customer accounts only —
// staff accounts are invited by an administrator.
const Login = ({ onBack }) => {
  // Deep link support: #login?mode=register opens straight on CREATE ACCOUNT
  // (the JOIN NOW banner in the storefront rewards section uses it).
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return params.get('mode') === 'register' ? 'register' : 'signin';
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Optional delivery address — also editable at checkout every order.
  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zip, setZip] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
        : await api('/api/auth/register', {
          method: 'POST',
          body: {
            name, email, password,
            address: street.trim(),
            barangay: barangay.trim(),
            city: city.trim(),
            province: province.trim(),
            zipCode: zip.trim()
          }
        });
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

  // Google sign-in (Firebase Auth): the Firebase ID token is verified by
  // the backend, which signs in or auto-registers a customer account.
  const handleGoogle = async () => {
    setGoogleBusy(true);
    setError('');
    try {
      const idToken = await signInWithGoogle();
      const res = await api('/api/auth/google', { method: 'POST', body: { idToken } });
      saveAuth({ token: res.token, user: res.user });
      window.location.hash = `dashboard/${res.user.dashboardKey}`;
    } catch (err) {
      setError(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled.'
          : err.status === 429
            ? 'Too many attempts — please wait a minute and try again.'
            : err.message || 'Google sign-in failed. Please try again.'
      );
      setGoogleBusy(false);
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
              <>
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
                <div className="form-group">
                  <label htmlFor="reg-address">STREET ADDRESS <span className="optional-tag">(OPTIONAL)</span></label>
                  <input
                    type="text"
                    id="reg-address"
                    placeholder="House no., street, subdivision"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="reg-barangay">BARANGAY</label>
                    <input
                      type="text"
                      id="reg-barangay"
                      placeholder="Barangay"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-city">CITY</label>
                    <input
                      type="text"
                      id="reg-city"
                      placeholder="City / Municipality"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="reg-province">PROVINCE</label>
                    <input
                      type="text"
                      id="reg-province"
                      placeholder="Province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-zip">ZIP CODE</label>
                    <input
                      type="text"
                      id="reg-zip"
                      placeholder="e.g. 8000"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                    />
                  </div>
                </div>
              </>
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

          <div className="login-divider">OR</div>

          {isFirebaseConfigured ? (
            <button type="button" className="google-btn" onClick={handleGoogle} disabled={googleBusy || busy}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.4 24 12 24z" />
                <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z" />
                <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.7 1.1 15.2 0 12 0 7.4 0 3.5 2.6 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z" />
              </svg>
              {googleBusy ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}
            </button>
          ) : (
            <p className="field-hint" style={{ textAlign: 'center' }}>
              Google sign-in needs your Firebase web config — see src/api/firebase.js.
            </p>
          )}
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
