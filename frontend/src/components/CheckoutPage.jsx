import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { api, getAuth } from '../api/client';
import { peso, peso2 } from '../utils';

// Storefront checkout. route is the current hash:
//   #checkout                     → order form
//   #checkout/mock-pay/FF-10242   → Development stand-in for PayMongo's page
//   #checkout/success/FF-10242    → payment confirmed
//   #checkout/cancel/FF-10242     → payment abandoned (order stays Pending)
const CheckoutPage = ({ route }) => {
  const segments = route.replace(/^#\/?checkout\/?/, '').split('/').filter(Boolean);
  const view = segments[0] || 'form';
  const orderNumber = segments[1] || '';

  if (view === 'success') return <SuccessView orderNumber={orderNumber} />;
  if (view === 'cancel') return <CancelView orderNumber={orderNumber} />;
  if (view === 'mock-pay') return <MockPayView orderNumber={orderNumber} />;
  return <FormView />;
};

const FormView = () => {
  const cart = useCart();
  const auth = getAuth();
  const [email, setEmail] = useState(auth?.user?.email || '');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/api/checkout', {
        method: 'POST',
        body: {
          email,
          shippingAddress: address,
          items: cart.items.map((l) => ({ productId: l.id, quantity: l.quantity }))
        }
      });
      if (res.mock) {
        // No PayMongo keys configured yet — Development stand-in page.
        window.location.hash = `checkout/mock-pay/${res.orderNumber}`;
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
        <p className="checkout-sub">Pay with GCash, Maya or card via PayMongo. Earn 1 point per ₱100.</p>

        <div className="checkout-summary">
          {cart.items.map((l) => (
            <div className="checkout-line" key={l.id}>
              <span>{l.name} ×{l.quantity}</span>
              <strong>{peso(l.price * l.quantity)}</strong>
            </div>
          ))}
          <div className="checkout-line checkout-total">
            <span>TOTAL</span>
            <strong>{peso2(cart.subtotal)}</strong>
          </div>
        </div>

        <form onSubmit={submit} className="checkout-form">
          <div className="form-group">
            <label htmlFor="co-email">EMAIL</label>
            <input id="co-email" type="email" value={email} placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="co-address">SHIPPING ADDRESS</label>
            <textarea id="co-address" rows={3} value={address} placeholder="House no., street, barangay, city"
              onChange={(e) => setAddress(e.target.value)} required />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="checkout-btn" disabled={busy}>
            {busy ? 'PLACING ORDER…' : `PLACE ORDER — ${peso2(cart.subtotal)}`}
          </button>
        </form>
      </div>
    </section>
  );
};

// Development stand-in for PayMongo's hosted payment page — only returned by
// the API while PayMongo:SecretKey is unset. Confirms through the same
// fulfilment pipeline the real webhook uses.
const MockPayView = ({ orderNumber }) => {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = useRef(false);

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/payments/mock-confirm', { method: 'POST', body: { orderNumber } });
      done.current = true;
      cart.clear();
      window.location.hash = `checkout/success/${orderNumber}`;
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

const SuccessView = ({ orderNumber }) => {
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

  return (
    <section className="checkout-page">
      <div className="checkout-card success">
        <span className="checkout-check">✓</span>
        <h2 className="checkout-title">Payment received.</h2>
        <p className="checkout-sub">
          Order <strong>{orderNumber}</strong> is confirmed — stock is reserved and your loyalty
          points have been added. Track it in your dashboard's purchase history.
        </p>
        <button className="checkout-btn" onClick={() => { window.location.hash = ''; }}>CONTINUE SHOPPING</button>
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
