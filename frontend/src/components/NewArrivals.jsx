import React, { useEffect, useRef, useState } from 'react';
import { useApi } from '../api/client';
import { peso, fmtDate } from '../utils';

// Categories mirror the header nav (WOMEN / MEN / OUTERWEAR / SALE).
// A product counts as SALE whenever it has an originalPrice.
// Data comes live from the Products and Promotions tables.
const categories = ['All', 'Women', 'Men', 'Outerwear', 'Sale'];
const newArrivalsCount = 8;

// Header nav anchors (WOMEN / MEN / OUTERWEAR / SALE) drive this section.
const hashCategories = {
  '#women': 'Women',
  '#men': 'Men',
  '#outerwear': 'Outerwear',
  '#sale': 'Sale',
  '#all': 'All'
};

// Hero buttons: scroll only, leaving the current filter state alone.
const sectionScrollTargets = {
  '#shop': 'section',
  '#offers': 'offers'
};

const NewArrivals = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef(null);

  const products = useApi('/api/products');
  const offersQ = useApi('/api/promotions/active');
  const offers = (offersQ.data || []).slice(0, 3).map((p) => ({
    code: p.code,
    description: p.description,
    validity: `Until ${fmtDate(p.validTo)}`
  }));

  const copyToClipboard = (code, e) => {
    navigator.clipboard.writeText(code).then(() => {
      const originalText = e.target.innerText;
      e.target.innerText = 'COPIED';
      e.target.style.backgroundColor = '#000';
      e.target.style.color = '#fff';
      setTimeout(() => {
        e.target.innerText = originalText;
        e.target.style.backgroundColor = '';
        e.target.style.color = '';
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  useEffect(() => {
    // Both targets land on the section top: it has no top padding, so the
    // offers bar sits exactly at the viewport top. Smooth scrolling to the
    // bar element itself silently no-ops in some webviews.
    const scrollForHash = (hash, instant = false) => {
      sectionRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
    };

    const shouldHandle = (hash) => Boolean(hashCategories[hash] || sectionScrollTargets[hash]);

    const applyHash = () => {
      const hash = window.location.hash.toLowerCase();
      const category = hashCategories[hash];
      if (category) {
        setActiveCategory(category);
        setShowAll(true);
      }
      if (!shouldHandle(hash)) return;
      setTimeout(() => scrollForHash(hash), 80);
      // While images are still loading, a layout shift can cancel the
      // smooth scroll, so settle again once the page has fully loaded.
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => setTimeout(() => scrollForHash(hash, true), 150), { once: true });
      }
    };

    applyHash();

    // On a page load that already carries a section hash, the browser's
    // scroll restoration can override the first scroll, so settle it again
    // once the page has fully loaded.
    if (shouldHandle(window.location.hash.toLowerCase())) {
      const hash = window.location.hash.toLowerCase();
      if (document.readyState === 'complete') {
        setTimeout(() => scrollForHash(hash, true), 500);
      } else {
        window.addEventListener('load', () => setTimeout(() => scrollForHash(hash, true), 300), { once: true });
      }
    }

    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Cards mounted after a filter change never pass through App's scroll
  // observer, so mark them visible here.
  useEffect(() => {
    requestAnimationFrame(() => {
      sectionRef.current
        ?.querySelectorAll('.product-card.reveal:not(.is-visible)')
        .forEach((el) => el.classList.add('is-visible'));
    });
  }, [activeCategory, showAll, products.data]);

  const allProducts = products.data || [];
  const filteredProducts = allProducts.filter((product) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Sale') return Boolean(product.originalPrice);
    return product.storefrontCategory === activeCategory;
  });

  const visibleProducts = showAll ? filteredProducts : allProducts.slice(0, newArrivalsCount);

  const selectCategory = (category) => {
    setActiveCategory(category);
    setShowAll(true);
  };

  const collapse = (e) => {
    e.preventDefault();
    setShowAll(false);
    setActiveCategory('All');
    window.location.hash = '';
  };

  const sectionTitle = showAll
    ? (activeCategory === 'All' ? 'All Products' : activeCategory)
    : 'New Arrivals';

  return (
    <section className="new-arrivals" ref={sectionRef}>
      <div className="filters-bar reveal">
        <div className="filters-header">
          <span className="filters-title">CURRENT OFFERS</span>
          <span className="filters-clear">{offers.length} active</span>
        </div>
        <div className="active-filters">
          {offers.map((offer, index) => (
            <div className="filter-tag reveal" key={offer.code} style={{ transitionDelay: `${index * 0.1}s` }}>
              <div className="filter-tag-title">{offer.code}</div>
              <div className="filter-tag-desc">{offer.description}</div>
              <div className="filter-tag-sub">{offer.validity}</div>
              <button className="copy-btn" onClick={(e) => copyToClipboard(offer.code, e)}>
                COPY CODE
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="section-header reveal">
        <h2 className="section-title">{sectionTitle}</h2>
        {showAll ? (
          <a href="#" className="view-all" onClick={collapse}>Show Less ↑</a>
        ) : (
          <a href="#all" className="view-all">View All →</a>
        )}
      </div>

      <div className="product-tabs reveal">
        {categories.map((category) => (
          <button
            key={category}
            className={`product-tab${showAll && activeCategory === category ? ' active' : ''}`}
            onClick={() => selectCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {products.loading && allProducts.length === 0 && (
        <p className="storefront-loading">LOADING THE COLLECTION…</p>
      )}
      {products.error && (
        <p className="storefront-loading">The catalog is unavailable right now — please refresh in a moment.</p>
      )}

      <div className="product-grid">
        {visibleProducts.map((product, index) => (
          <div key={product.id} className="product-card reveal" style={{ transitionDelay: `${(index % 4) * 0.12}s` }}>
            <div className="product-image-container">
              {(product.isNew || product.originalPrice) && (
                <div className="badge-row">
                  {product.isNew && <span className="badge new">NEW</span>}
                  {product.originalPrice && <span className="badge sale">SALE</span>}
                  {product.stock <= 5 && <span className="badge low">LOW STOCK</span>}
                </div>
              )}
              <img src={product.imageUrl} alt={product.name} loading="lazy" />
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-category">{product.category} • {product.variant}</p>
              <div className="product-price-wrapper">
                <span className="product-price">{peso(product.price)}</span>
                {product.originalPrice && <span className="product-original-price">{peso(product.originalPrice)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NewArrivals;
