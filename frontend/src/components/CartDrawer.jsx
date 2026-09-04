import React from 'react';
import { useCart } from '../context/CartContext.jsx';
import { peso, peso2 } from '../utils';

// Slide-over basket. CHECKOUT hands over to the #checkout page.
const CartDrawer = () => {
  const cart = useCart();
  if (!cart.open) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => cart.setOpen(false)} />
      <aside className="cart-drawer" aria-label="Shopping cart">
        <header className="cart-drawer-head">
          <h3>YOUR CART</h3>
          <button className="cart-close" onClick={() => cart.setOpen(false)} aria-label="Close cart">×</button>
        </header>

        {cart.items.length === 0 ? (
          <div className="cart-empty">
            <strong>Your cart is empty</strong>
            <span>Add pieces from the collection to get started.</span>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((l) => (
                <div className="cart-item" key={l.id}>
                  <img src={l.imageUrl} alt={l.name} loading="lazy" />
                  <div className="cart-item-info">
                    <strong>{l.name}</strong>
                    <span>{l.variant}</span>
                    <div className="cart-item-qty">
                      <button onClick={() => cart.setQty(l.id, l.quantity - 1)} aria-label="Decrease">−</button>
                      <span>{l.quantity}</span>
                      <button
                        onClick={() => cart.setQty(l.id, Math.min(l.quantity + 1, l.stock))}
                        aria-label="Increase"
                        disabled={l.quantity >= l.stock}
                      >+</button>
                    </div>
                  </div>
                  <div className="cart-item-side">
                    <strong>{peso(l.price * l.quantity)}</strong>
                    <button className="cart-remove" onClick={() => cart.remove(l.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <footer className="cart-drawer-foot">
              <div className="cart-subtotal">
                <span>SUBTOTAL</span>
                <strong>{peso2(cart.subtotal)}</strong>
              </div>
              <p className="cart-note">Shipping and loyalty points are settled at checkout.</p>
              <button
                className="checkout-btn"
                onClick={() => { cart.setOpen(false); window.location.hash = 'checkout'; }}
              >
                CHECKOUT →
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
