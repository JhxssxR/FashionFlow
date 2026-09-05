import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { api, getAuth, saveAuth, useApi } from '../api/client';
import { peso, peso2 } from '../utils';

// Storefront checkout. route is the current hash:
//   #checkout                       → order form (requires a signed-in Customer)
//   #checkout/mock-pay/FF-10242     → Development stand-in for PayMongo's page
//   #checkout/mock-pay/FF-10242/gcash → same, showing the chosen method
//   #checkout/success/FF-10242      → payment confirmed (thank-you page)
//   #checkout/success/FF-10242/cod  → thank-you page, cash on delivery
//   #checkout/cancel/FF-10242       → payment abandoned (order stays Pending)
const CheckoutPage = ({ route }) => {
  const segments = route.replace(/^#\/?checkout\/?/, '').split('/').filter(Boolean);
  const view = segments[0] || 'form';
  const orderNumber = segments[1] || '';
  const method = segments[2] || '';

  if (view === 'success') return <SuccessView orderNumber={orderNumber} method={method} />;
  if (view === 'cancel') return <CancelView orderNumber={orderNumber} />;
  if (view === 'mock-pay') return <MockPayView route={route} />;
  return <FormView />;
};

// Checkout requires a customer account: guests get an inline sign-in /
// register panel right here, so the cart is never lost.
const FormView = () => {
  const cart = useCart();
  const [authTick, setAuthTick] = useState(0);
  const auth = getAuth();
  const isCustomer = auth?.user?.role === 'Customer';

  if (!isCustomer) {
    return (
      <section className="checkout-page">
        <div className="checkout-card">
          <span className="login-form-tag">SIGN IN TO CONTINUE</span>
          <h2 className="checkout-title">Your cart is saved.</h2>
          <p className="checkout-sub">
            Sign in or create a free account to place your order — loyalty points
            and purchase history are tied to your account.
          </p>
          <AuthPanel onAuthed={() => setAuthTick((t) => t + 1)} />
        </div>
      </section>
    );
  }

  return <OrderForm key={authTick} />;
};

const AuthPanel = ({ onAuthed }) => {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = mode === 'signin'
        ? await api('/api/auth/login', { method: 'POST', body: { email, password } })
        : await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
      saveAuth({ token: res.token, user: res.user });
      if (res.user.role !== 'Customer') {
        // Staff accounts can't shop — tell them instead of looping back.
        setError('That account is a staff account — sign in with a customer account to check out.');
        setBusy(false);
        return;
      }
      onAuthed();
    } catch (ex) {
      setError(ex.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="checkout-form">
      <div className="auth-tabs">
        <button type="button" className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => setMode('signin')}>SIGN IN</button>
        <button type="button" className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>CREATE ACCOUNT</button>
      </div>
      {mode === 'register' && (
        <div className="form-group">
          <label htmlFor="gate-name">FULL NAME</label>
          <input id="gate-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" required />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="gate-email">EMAIL</label>
        <input id="gate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>
      <div className="form-group">
        <label htmlFor="gate-password">PASSWORD</label>
        <input id="gate-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'} required minLength={6} />
      </div>
      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="checkout-btn" disabled={busy}>
        {busy ? 'PLEASE WAIT…' : mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
      </button>
    </form>
  );
};

// Payment choices offered at checkout. gcash/maya/card go through the
// PayMongo hosted page (filtered to the chosen wallet); cod skips the
// gateway and is paid to the courier.
const paymentOptions = [
  { key: 'gcash', label: 'GCASH', desc: 'Pay with GCash via PayMongo' },
  { key: 'maya', label: 'MAYA', desc: 'Pay with Maya via PayMongo' },
  { key: 'card', label: 'CARD', desc: 'Credit or debit card via PayMongo' },
  { key: 'cod', label: 'CASH ON DELIVERY', desc: 'Pay cash when your order arrives' }
];

const methodLabel = (key) => paymentOptions.find((o) => o.key === key)?.label
  || ({ online: 'ONLINE' }[key] || 'ONLINE');

const OrderForm = () => {
  const cart = useCart();
  const auth = getAuth();
  const products = useApi('/api/products');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [checkingPromo, setCheckingPromo] = useState(false);

  const discount = promo?.discount || 0;

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    setPromoErr('');
    setPromoMsg('');
    try {
      // The customer's tier gates Tier:… promos; pull it lazily (admins and
      // guests don't have a loyalty profile — those just skip the tier match).
      let tier = null;
      try {
        const lo = await api('/api/loyalty/mine');
        tier = lo.tier;
      } catch { /* no loyalty profile */ }
      const cats = cart.items.map((l) => products.data?.find((p) => p.id === l.id)?.category || '');
      const res = await api('/api/promotions/validate', {
        method: 'POST',
        body: { code, subtotal: cart.subtotal, categories: cats, customerTier: tier }
      });
      if (!res.valid) {
        setPromo(null);
        setPromoErr(res.message || 'This code is not valid.');
        return;
      }
      setPromo({ code: code.toUpperCase(), discount: res.discount });
      setPromoMsg(res.message || 'Code applied.');
    } catch (ex) {
      setPromoErr(ex.message);
    } finally {
      setCheckingPromo(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/api/checkout', {
        method: 'POST',
        body: {
          shippingAddress: address,
          paymentMethod: method,
          items: cart.items.map((l) => ({ productId: l.id, quantity: l.quantity })),
          promoCode: promo?.code
        }
      });
      if (res.cod) {
        // Cash on delivery is fulfilled on the spot — straight to the
        // thank-you page.
        window.location.hash = `checkout/success/${res.orderNumber}/cod`;
      } else if (res.mock) {
        // No PayMongo keys configured yet — Development stand-in page.
        // The method segment personalises the stand-in page and the
        // thank-you copy afterwards.
        window.location.hash = `checkout/mock-pay/${res.orderNumber}${method ? `/${method}` : ''}`;
      } else {
        // Real PayMongo hosted checkout.
        window.location.href = res.checkoutUrl;
      }
    } catch (ex) {
      setError(ex.message);
      setBusy(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <section className="checkout-page">
        <div className="checkout-card">
          <h2 className="checkout-title">Your cart is empty</h2>
          <p className="checkout-sub">Browse the collection and add pieces to check out.</p>
          <button className="checkout-btn" onClick={() => { window.location.hash = ''; }}>SHOP THE COLLECTION</button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="checkout-card">
        <span className="login-form-tag">CHECKOUT</span>
        <h2 className="checkout-title">Almost yours.</h2>
        <p className="checkout-sub">
          Ordering as <strong>{auth?.user?.name}</strong> — earn 1 point per ₱100.
        </p>

        <div className="checkout-summary">
          {cart.items.map((l) => (
            <div className="checkout-line" key={l.id}>
              <span>{l.name} ×{l.quantity}</span>
              <strong>{peso(l.price * l.quantity)}</strong>
            </div>
          ))}
          {discount > 0 && (
            <div className="checkout-line">
              <span>Voucher {promo.code}</span>
              <strong>−{peso2(discount)}</strong>
            </div>
          )}
          <div className="checkout-line checkout-total">
            <span>TOTAL</span>
            <strong>{peso2(cart.subtotal - discount)}</strong>
          </div>
        </div>

        <form onSubmit={submit} className="checkout-form">
          <div className="form-group">
            <label htmlFor="co-address">SHIPPING ADDRESS</label>
            <textarea id="co-address" rows={3} value={address} placeholder="House no., street, barangay, city"
              onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="co-promo">PROMO OR VOUCHER CODE</label>
            <div className="form-row">
              <input
                id="co-promo"
                type="text"
                placeholder="e.g. RWD-AB12CD"
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value); setPromoMsg(''); setPromoErr(''); }}
              />
              <button type="button" className="mini-btn" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()}>
                {checkingPromo ? 'CHECKING…' : 'APPLY'}
              </button>
            </div>
            {promoErr && <p className="field-error" role="alert">{promoErr}</p>}
            {promoMsg && <div className="form-ok" role="status">{promoMsg}</div>}
          </div>

          <div className="form-group">
            <label>PAYMENT METHOD</label>
            <div className="pay-options" role="radiogroup" aria-label="Payment method">
              {paymentOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  role="radio"
                  aria-checked={method === opt.key}
                  className={`pay-option${method === opt.key ? ' selected' : ''}`}
                  onClick={() => setMethod(opt.key)}
                >
                  <span className="pay-option-label">{opt.label}</span>
                  <span className="pay-option-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="checkout-btn" disabled={busy || !method}>
            {busy
              ? 'PLACING ORDER…'
              : !method
                ? 'SELECT A PAYMENT METHOD'
                : `PLACE ORDER — ${peso2(cart.subtotal - discount)}`}
          </button>
        </form>
      </div>
    </section>
  );
};

// Development stand-in for PayMongo's hosted payment page — only returned by
// the API while PayMongo:SecretKey is unset. Confirms through the same
// fulfilment pipeline the real webhook uses.
const MockPayView = ({ route }) => {
  const segments = route.replace(/^#\/?checkout\/mock-pay\/?/, '').split('/').filter(Boolean);
  const orderNumber = segments[0] || '';
  const method = segments[1] || '';
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/payments/mock-confirm', { method: 'POST', body: { orderNumber } });
      cart.clear();
      window.location.hash = `checkout/success/${orderNumber}${method ? `/${method}` : ''}`;
    } catch (ex) {
      setError(ex.message);
      setBusy(false);
    }
  };

  return (
    <section className="checkout-page">
      <div className="checkout-card mock-pay">
        <span className="login-form-tag">DEVELOPMENT PAYMENT STAND-IN</span>
        <h2 className="checkout-title">Order {orderNumber}</h2>
        {method && <p className="checkout-method-line">SELECTED METHOD — {methodLabel(method)}</p>}
        <p className="checkout-sub">
          PayMongo keys are not configured yet, so this page plays the hosted
          payment step. Confirming runs the exact fulfilment pipeline the real
          webhook triggers.
        </p>
        {error && <p className="login-error">{error}</p>}
        <button className="checkout-btn" onClick={pay} disabled={busy}>
          {busy ? 'PROCESSING…' : 'SIMULATE PAYMENT ✓'}
        </button>
        <button className="checkout-btn secondary" onClick={() => { window.location.hash = `checkout/cancel/${orderNumber}`; }}>
          CANCEL
        </button>
      </div>
    </section>
  );
};

const SuccessView = ({ orderNumber, method }) => {
  const cart = useCart();
  const cleared = useRef(false);
  useEffect(() => {
    if (!cleared.current) {
      cleared.current = true;
      cart.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void cart;

  const isCod = method === 'cod';
  const firstName = getAuth()?.user?.name?.split(' ')[0];

  return (
    <section className="checkout-page">
      <div className="checkout-card success">
        <span className="checkout-check">✓</span>
        <h2 className="checkout-title">{firstName ? `Thank you, ${firstName}!` : 'Thank you!'}</h2>
        <p className="checkout-sub">
          Order <strong>{orderNumber}</strong> is confirmed
          {method && <> — paid by <strong>{methodLabel(method)}</strong></>}.
        </p>
        <p className="checkout-sub">
          {isCod
            ? 'Please prepare your payment — the courier will collect the cash when your order arrives.'
            : 'Payment received — stock is reserved and your loyalty points have been added.'}{' '}
          Track it in your dashboard's purchase history.
        </p>
        <button className="checkout-btn" onClick={() => { window.location.hash = 'dashboard/customer'; }}>VIEW MY ORDERS</button>
        <button className="checkout-btn secondary" onClick={() => { window.location.hash = ''; }}>CONTINUE SHOPPING</button>
      </div>
    </section>
  );
};

const CancelView = ({ orderNumber }) => (
  <section className="checkout-page">
    <div className="checkout-card">
      <h2 className="checkout-title">Payment cancelled.</h2>
      <p className="checkout-sub">
        Order <strong>{orderNumber}</strong> is still pending — your cart is intact, you can try again any time.
      </p>
      <button className="checkout-btn" onClick={() => { window.location.hash = 'checkout'; }}>BACK TO CHECKOUT</button>
      <button className="checkout-btn secondary" onClick={() => { window.location.hash = ''; }}>KEEP BROWSING</button>
    </div>
  </section>
);

export default CheckoutPage;
