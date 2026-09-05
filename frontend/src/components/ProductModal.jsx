import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { parseVariant, peso } from '../utils';

// Size/variant picker shown when a shopper chooses a style. Nothing lands in
// the cart until a size is picked (and in stock) — the ADD TO CART button
// stays a "select a size" hint until then.
const ProductModal = ({ style, onClose }) => {
  const cart = useCart();
  const [selectedId, setSelectedId] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selected = style.variants.find((v) => v.id === selectedId) || null;

  const choose = (id) => {
    setSelectedId(id);
    setQty(1);
  };

  const add = () => {
    if (!selected) return;
    cart.add(selected, qty);
    onClose();
  };

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={style.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="product-modal-close" onClick={onClose} aria-label="Close">&times;</button>

        <div className="product-modal-media">
          <img src={style.imageUrl} alt={style.name} />
        </div>

        <div className="product-modal-body">
          {(style.isNew || style.originalPrice) && (
            <div className="badge-row">
              {style.isNew && <span className="badge new">NEW</span>}
              {style.originalPrice && <span className="badge sale">SALE</span>}
            </div>
          )}

          <h3 className="product-modal-name">{style.name}</h3>
          <p className="product-modal-cat">
            {style.category}{style.color ? ` • ${style.color}` : ''}
          </p>

          <div className="product-price-wrapper">
            <span className="product-price">{peso(selected ? selected.price : style.minPrice)}</span>
            {style.originalPrice && (
              <span className="product-original-price">{peso(style.originalPrice)}</span>
            )}
          </div>

          <p className="product-modal-label">SELECT SIZE</p>
          <div className="size-grid" role="group" aria-label="Size">
            {style.variants.map((v) => {
              const { size } = parseVariant(v.variant);
              const soldOut = v.stock < 1;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`size-btn${selectedId === v.id ? ' selected' : ''}`}
                  disabled={soldOut}
                  aria-pressed={selectedId === v.id}
                  title={soldOut ? 'Sold out' : `${v.stock} in stock`}
                  onClick={() => choose(v.id)}
                >
                  {size}
                </button>
              );
            })}
          </div>

          <div className="product-modal-row">
            <div className="cart-item-qty product-modal-qty" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={!selected || qty <= 1}
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(selected ? selected.stock : 1, q + 1))}
                disabled={!selected || qty >= selected?.stock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button className="add-cart-btn product-modal-add" onClick={add} disabled={!selected}>
              {selected ? 'ADD TO CART →' : 'SELECT A SIZE'}
            </button>
          </div>

          {selected && selected.stock > 0 && selected.stock <= 5 && (
            <p className="product-modal-stock">Only {selected.stock} left in this size — order soon.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
