import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../api/client';
import ProductModal from './ProductModal.jsx';
import { peso, fmtDate, parseVariant, sizeSort, swatchStyle } from '../utils';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null);
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

    // Header search uses #search/<term> with the original casing intact —
    // the lowercase variant is only for the category anchors.
    const isSearchHash = (hash) => hash.toLowerCase().startsWith('#search/');
    const shouldHandle = (hash) => Boolean(
      hashCategories[hash] || sectionScrollTargets[hash] || isSearchHash(hash)
    );

    const applyHash = () => {
      const raw = window.location.hash;
      const hash = raw.toLowerCase();
      if (isSearchHash(raw)) {
        const term = decodeURIComponent(raw.slice('#search/'.length)).trim();
        setSearchTerm(term);
        setActiveCategory('All');
        setShowAll(true);
      } else {
        const category = hashCategories[hash];
        if (category) {
          setSearchTerm('');
          setActiveCategory(category);
          setShowAll(true);
        }
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
  // observer, so mark them visible here. The offer tags mount after the
  // promotions fetch resolves — same treatment, or they stay invisible.
  useEffect(() => {
    requestAnimationFrame(() => {
      sectionRef.current
        ?.querySelectorAll('.product-card.reveal:not(.is-visible), .filter-tag.reveal:not(.is-visible)')
        .forEach((el) => el.classList.add('is-visible'));
    });
  }, [activeCategory, showAll, searchTerm, products.data, offersQ.data]);

  const allProducts = useMemo(() => products.data || [], [products.data]);

  // One product row = one size/colour combo; the storefront sells styles, so
  // rows sharing a name collapse into a single card whose picker (the product
  // modal) lists every colour — each with its own photo — and every size.
  const styles = useMemo(() => {
    const map = new Map();
    for (const p of allProducts) {
      const { color } = parseVariant(p.variant);
      let s = map.get(p.name);
      if (!s) {
        map.set(p.name, {
          name: p.name,
          category: p.category,
          storefrontCategory: p.storefrontCategory,
          isNew: false,
          originalPrice: null,
          minPrice: p.price,
          totalStock: 0,
          colors: []
        });
        s = map.get(p.name);
      }
      let c = s.colors.find((x) => x.color === color);
      if (!c) {
        c = { color, image: p.imageUrl, variants: [] };
        s.colors.push(c);
      }
      c.variants.push(p);
      s.isNew = s.isNew || p.isNew;
      s.originalPrice = s.originalPrice || p.originalPrice;
      s.minPrice = Math.min(s.minPrice, p.price);
      s.totalStock += p.stock;
    }
    return [...map.values()].map((s) => ({
      ...s,
      colors: s.colors.map((c) => ({
        ...c,
        variants: [...c.variants].sort((a, b) => sizeSort(parseVariant(a.variant).size, parseVariant(b.variant).size))
      }))
    }));
  }, [allProducts]);

  const filteredStyles = styles.filter((style) => {
    if (searchTerm && !style.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Sale') return Boolean(style.originalPrice);
    return style.storefrontCategory === activeCategory;
  });

  const visibleStyles = showAll ? filteredStyles : styles.slice(0, newArrivalsCount);

  const selectCategory = (category) => {
    setSearchTerm('');
    setActiveCategory(category);
    setShowAll(true);
  };

  const collapse = (e) => {
    e.preventDefault();
    setShowAll(false);
    setActiveCategory('All');
    setSearchTerm('');
    window.location.hash = '';
  };

  const sectionTitle = searchTerm
    ? `RESULTS FOR "${searchTerm.toUpperCase()}"`
    : showAll
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
      {showAll && searchTerm && filteredStyles.length === 0 && !products.loading && (
        <p className="storefront-loading">
          NO PIECES MATCHED "{searchTerm.toUpperCase()}" — TRY ANOTHER SEARCH OR BROWSE THE CATEGORIES.
        </p>
      )}

      <div className="product-grid">
        {visibleStyles.map((style, index) => (
          <div key={style.name} className="product-card reveal" style={{ transitionDelay: `${(index % 4) * 0.12}s` }}>
            <div
              className="product-image-container"
              role="button"
              tabIndex={0}
              aria-label={`View colours and sizes for ${style.name}`}
              onClick={() => setModal({ style })}
              onKeyDown={(e) => e.key === 'Enter' && setModal({ style })}
            >
              {(style.isNew || style.originalPrice) && (
                <div className="badge-row">
                  {style.isNew && <span className="badge new">NEW</span>}
                  {style.originalPrice && <span className="badge sale">SALE</span>}
                  {style.totalStock <= 5 && <span className="badge low">LOW STOCK</span>}
                </div>
              )}
              <img src={style.colors[0].image} alt={style.name} loading="lazy" />
            </div>
            <div className="product-info">
              <h3 className="product-name">{style.name}</h3>
              <p className="product-category">
                {style.category} • {style.colors.length > 1 ? `${style.colors.length} colours` : style.colors[0].color}
              </p>
              {style.colors.length > 1 && (
                <div className="color-dots">
                  {style.colors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className="color-dot"
                      style={swatchStyle(c.color)}
                      title={c.color}
                      aria-label={`Open ${style.name} in ${c.color}`}
                      onClick={(e) => { e.stopPropagation(); setModal({ style, color: c.color }); }}
                    />
                  ))}
                </div>
              )}
              <div className="product-price-wrapper">
                <span className="product-price">{peso(style.minPrice)}</span>
                {style.originalPrice && <span className="product-original-price">{peso(style.originalPrice)}</span>}
              </div>
              <button
                className="add-cart-btn"
                onClick={() => setModal({ style })}
                disabled={style.totalStock < 1}
              >
                {style.totalStock < 1 ? 'OUT OF STOCK' : 'ADD TO CART'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ProductModal
          style={modal.style}
          initialColor={modal.color}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
};

export default NewArrivals;
