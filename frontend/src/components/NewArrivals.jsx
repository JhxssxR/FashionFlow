import React, { useEffect, useRef, useState } from 'react';

// Categories mirror the header nav (WOMEN / MEN / OUTERWEAR / SALE).
// A product counts as SALE whenever it has an originalPrice.
// isNew marks the rotating "New Arrivals" storefront selection.
const products = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
    title: 'Linen Blazer',
    subcategory: 'Outerwear • Brown',
    category: 'Outerwear',
    price: '₱7,480',
    originalPrice: null,
    isNew: true
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop',
    title: 'Midi Wrap Dress',
    subcategory: 'Dresses • Blue',
    category: 'Women',
    price: '₱9,220',
    originalPrice: '₱10,960',
    isNew: true
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?q=80&w=600&auto=format&fit=crop',
    title: 'Wide Leg Trousers',
    subcategory: 'Bottoms • Multi',
    category: 'Women',
    price: '₱5,160',
    originalPrice: '₱6,900',
    isNew: true
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=600&auto=format&fit=crop',
    title: 'Faux Leather Jacket',
    subcategory: 'Outerwear • Brown',
    category: 'Outerwear',
    price: '₱11,540',
    originalPrice: null,
    isNew: true
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?q=80&w=600&auto=format&fit=crop',
    title: 'Silk Slip Dress',
    subcategory: 'Dresses • Floral',
    category: 'Women',
    price: '₱8,640',
    originalPrice: '₱10,960',
    isNew: true
  },
  {
    id: 6,
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
    title: 'Floral Wrap Maxi Dress',
    subcategory: 'Dresses • Ivory',
    category: 'Women',
    price: '₱9,480',
    originalPrice: null,
    isNew: true
  },
  {
    id: 7,
    image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=600&auto=format&fit=crop',
    title: 'Tulle Midi Dress',
    subcategory: 'Dresses • Blush',
    category: 'Women',
    price: '₱10,980',
    originalPrice: null,
    isNew: true
  },
  {
    id: 8,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop',
    title: 'Chambray Shirt',
    subcategory: 'Shirts • Indigo',
    category: 'Men',
    price: '₱4,980',
    originalPrice: '₱6,480',
    isNew: true
  },
  {
    id: 9,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop',
    title: 'Essential Crew Tee',
    subcategory: 'Tops • White',
    category: 'Men',
    price: '₱2,490',
    originalPrice: null
  },
  {
    id: 10,
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
    title: 'Straight Denim',
    subcategory: 'Bottoms • Indigo',
    category: 'Men',
    price: '₱5,980',
    originalPrice: null
  },
  {
    id: 11,
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=600&auto=format&fit=crop',
    title: 'Sherpa Denim Jacket',
    subcategory: 'Outerwear • Indigo',
    category: 'Outerwear',
    price: '₱10,480',
    originalPrice: '₱12,980'
  },
  {
    id: 12,
    image: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?q=80&w=600&auto=format&fit=crop',
    title: 'Quilted Bomber Jacket',
    subcategory: 'Outerwear • Black',
    category: 'Outerwear',
    price: '₱9,980',
    originalPrice: null
  }
];

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

const offers = [
  {
    code: 'SCHOOL15',
    description: '15% off all bottoms',
    validity: 'Until Aug 31'
  },
  {
    code: 'FF200',
    description: '₱200 off orders ₱2,000+',
    validity: 'Until Sep 15'
  },
  {
    code: 'CLEAR30',
    description: '30% off clearance',
    validity: 'Until Aug 20'
  }
];

const NewArrivals = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef(null);

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
  }, [activeCategory, showAll]);

  const filteredProducts = products.filter((product) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Sale') return Boolean(product.originalPrice);
    return product.category === activeCategory;
  });

  const visibleProducts = showAll ? filteredProducts : products.slice(0, newArrivalsCount);

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

      <div className="product-grid">
        {visibleProducts.map((product, index) => (
          <div key={product.id} className="product-card reveal" style={{ transitionDelay: `${(index % 4) * 0.12}s` }}>
            <div className="product-image-container">
              {(product.isNew || product.originalPrice) && (
                <div className="badge-row">
                  {product.isNew && <span className="badge new">NEW</span>}
                  {product.originalPrice && <span className="badge sale">SALE</span>}
                </div>
              )}
              <img src={product.image} alt={product.title} loading="lazy" />
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.title}</h3>
              <p className="product-category">{product.subcategory}</p>
              <div className="product-price-wrapper">
                <span className="product-price">{product.price}</span>
                {product.originalPrice && <span className="product-original-price">{product.originalPrice}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NewArrivals;
