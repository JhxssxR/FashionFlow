import React, { createContext, useContext, useEffect, useState } from 'react';

// Storefront shopping cart. Persisted in localStorage so a refresh (or a
// round-trip to PayMongo's hosted payment page) keeps the basket.
const CartContext = createContext(null);
const CART_KEY = 'ff_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const line = prev.find((l) => l.id === product.id);
      if (line) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, quantity: Math.min(l.quantity + qty, product.stock) } : l
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          variant: product.variant,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          quantity: Math.min(qty, product.stock)
        }
      ];
    });
    setOpen(true);
  };

  const setQty = (id, quantity) =>
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, quantity } : l))
    );

  const remove = (id) => setItems((prev) => prev.filter((l) => l.id !== id));
  const clear = () => setItems([]);

  const count = items.reduce((s, l) => s + l.quantity, 0);
  const subtotal = items.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, open, setOpen, toggle: () => setOpen((o) => !o), count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
