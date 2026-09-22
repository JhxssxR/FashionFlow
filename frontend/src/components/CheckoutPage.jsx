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
  if (view === 'gcash-pay') return <GcashPayView orderNumber={orderNumber} />;
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
  // Optional delivery address — also editable at checkout every order.
  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zip, setZip] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
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
        <>
          <div className="form-group">
            <label htmlFor="gate-name">FULL NAME</label>
            <input id="gate-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" required />
          </div>
          <div className="form-group">
            <label htmlFor="gate-address">STREET ADDRESS <span className="optional-tag">(OPTIONAL)</span></label>
            <input id="gate-address" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House no., street, subdivision" />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="gate-barangay">BARANGAY</label>
              <input id="gate-barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)} placeholder="Barangay" />
            </div>
            <div className="form-group">
              <label htmlFor="gate-city">CITY</label>
              <input id="gate-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / Municipality" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="gate-province">PROVINCE</label>
              <input id="gate-province" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Province" />
            </div>
            <div className="form-group">
              <label htmlFor="gate-zip">ZIP CODE</label>
              <input id="gate-zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="e.g. 8000" />
            </div>
          </div>
        </>
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

// Payment choices offered at checkout (store policy: GCash + COD only).
// gcash shows the store QR for manual payment + proof submit; cod skips
// the gateway and is paid to the courier.
const paymentOptions = [
  { key: 'gcash', label: 'GCASH', desc: 'Scan the store QR to pay' },
  { key: 'cod', label: 'CASH ON DELIVERY', desc: 'Pay cash when your order arrives' }
];

const methodLabel = (key) => paymentOptions.find((o) => o.key === key)?.label
  || ({ online: 'ONLINE' }[key] || 'ONLINE');

// GCash QR payment: scan the store QR, pay the exact total in the GCash
// app, then leave the reference number + receipt below. Staff verify in
// Online Orders; the order ships once verified.
const GcashPayView = ({ orderNumber }) => {
  const order = useApi(`/api/orders/${orderNumber}`);
  const [refNo, setRefNo] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [receiptName, setReceiptName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setErr('');
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setErr('Receipt image is too large — 2MB max.');
      return;
    }
    const rd = new FileReader();
    rd.onload = () => { setReceipt(rd.result); setReceiptName(f.name); };
    rd.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (refNo.trim().length < 4) {
      setErr('Enter the GCash reference number from your payment.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await api(`/api/orders/${orderNumber}/payment-proof`, {
        method: 'POST',
        body: { refNo: refNo.trim(), receiptImage: receipt }
      });
      setDone(true);
      order.reload(true);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (order.loading && !order.data) {
    return (
      <section className="checkout-page">
        <div className="checkout-card"><p className="checkout-sub">LOADING YOUR ORDER…</p></div>
      </section>
    );
  }
  if (order.error || !order.data) {
    return (
      <section className="checkout-page">
        <div className="checkout-card">
          <h2 className="checkout-title">Order not found</h2>
          <p className="checkout-sub">{order.error || 'This order does not exist.'}</p>
          <button className="checkout-btn" onClick={() => { window.location.hash = ''; }}>BACK TO STORE</button>
        </div>
      </section>
    );
  }

  const o = order.data;
  if (o.status === 'Paid' || o.status === 'Shipped' || o.status === 'Out for Delivery' || o.status === 'Delivered') {
    return (
      <section className="checkout-page">
        <div className="checkout-card">
          <span className="login-form-tag">PAYMENT VERIFIED</span>
          <h2 className="checkout-title">You're all set.</h2>
          <p className="checkout-sub">Order {o.id} is {o.status.toLowerCase()} — track it in Purchase History.</p>
          <button className="checkout-btn" onClick={() => { window.location.hash = 'dashboard/customer/orders'; }}>TRACK ORDER →</button>
        </div>
      </section>
    );
  }

  if (done || o.status === 'Awaiting Verification') {
    return (
      <section className="checkout-page">
        <div className="checkout-card">
          <span className="login-form-tag">PROOF RECEIVED</span>
          <h2 className="checkout-title">Waiting for verification.</h2>
          <p className="checkout-sub">
            Order {o.id}{o.refNo ? ` · ref ${o.refNo}` : ''} is with our team now.
            You'll be notified once payment is verified — no need to pay again.
          </p>
          <button className="checkout-btn" onClick={() => { window.location.hash = 'dashboard/customer/orders'; }}>PURCHASE HISTORY →</button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="checkout-card">
        <span className="login-form-tag">PAY WITH GCASH</span>
        <h2 className="checkout-title">{peso2(o.total)}</h2>
        <p className="checkout-sub">Order {o.id} · {o.items}</p>
        <div className="qr-wrap">
          <img src={o.qr?.imageUrl || '/assets/payments/gcash.png'} alt="Store GCash QR code" className="qr-img" />
          <div className="qr-meta">
            <strong>{o.qr?.accountName || 'FashionFlow'}</strong>
            <span>{o.qr?.accountNumber || ''}</span>
          </div>
        </div>
        <ol className="qr-steps">
          <li>Scan the QR in your GCash app and pay exactly <strong>{peso2(o.total)}</strong>.</li>
          <li>Copy the reference number from your GCash receipt.</li>
          <li>Leave it below — our team verifies and ships your order.</li>
        </ol>
        <form onSubmit={submit} className="checkout-form">
          <div className="form-group">
            <label htmlFor="qr-ref">GCASH REFERENCE NUMBER</label>
            <input
              id="qr-ref"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="e.g. 1234567890123"
              required
              minLength={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="qr-receipt">RECEIPT SCREENSHOT (OPTIONAL, 2MB MAX)</label>
            <input id="qr-receipt" type="file" accept="image/*" onChange={onFile} />
            {receiptName && <p className="field-hint">Attached: {receiptName}</p>}
          </div>
          {err && <p className="login-error" role="alert">{err}</p>}
          <button type="submit" className="checkout-btn" disabled={busy}>
            {busy ? 'SUBMITTING…' : 'SUBMIT PAYMENT →'}
          </button>
        </form>
      </div>
    </section>
  );
};

const OrderForm = () => {
  const cart = useCart();
  const auth = getAuth();
  const products = useApi('/api/products');
  // Prefill from the saved signup address (still editable per order).
  // Fetched live so even older sessions get it — never overwrites typing.
  const me = useApi('/api/auth/me');
  const [address, setAddress] = useState(() => auth?.user?.address?.combined || '');
  const [addressFromProfile, setAddressFromProfile] = useState(false);
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefilled.current && !address && me.data?.address?.combined) {
      prefilled.current = true;
      setAddress(me.data.address.combined);
      setAddressFromProfile(true);
    }
  }, [me.data, address]);
  const [method, setMethod] = useState('gcash');
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
      } else if (res.qrPay) {
        // GCash QR flow: scan the store QR, pay in-app, submit proof.
        window.location.hash = `checkout/gcash-pay/${res.orderNumber}`;
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
              onChange={(e) => { setAddress(e.target.value); setAddressFromProfile(false); }} required />
            {addressFromProfile && (
              <p className="field-hint">Loaded from your saved address — edit freely.</p>
            )}
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
          Order <strong>{orderNumber}</strong> is {isCod ? 'placed' : 'confirmed'}
          {method && <> — {isCod ? <strong>Cash on Delivery</strong> : <>paid by <strong>{methodLabel(method)}</strong></>}</>}.
        </p>
        <p className="checkout-sub">
          {isCod
            ? 'Stock is reserved. Please prepare your payment — the courier will collect the cash upon delivery, and payment will be marked received once delivered.'
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
