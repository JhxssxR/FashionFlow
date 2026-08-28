import React from 'react';

const products = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
    title: 'Linen Blazer',
    category: 'Outerwear • Brown',
    price: '$ 129',
    badge: null
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop',
    title: 'Midi Wrap Dress',
    category: 'Dresses • Blue',
    price: '$ 159',
    originalPrice: '$ 189',
    badge: 'NEW'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1550614000-4b95d466f288?q=80&w=600&auto=format&fit=crop',
    title: 'Wide Leg Trousers',
    category: 'Bottoms • Multi',
    price: '$ 89',
    originalPrice: '$ 119',
    badge: 'SALE'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1516826957135-700ede19c6ce?q=80&w=600&auto=format&fit=crop',
    title: 'Faux Leather Jacket',
    category: 'Outerwear • Brown',
    price: '$ 199',
    badge: null
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?q=80&w=600&auto=format&fit=crop',
    title: 'Silk Slip Dress',
    category: 'Dresses • Floral',
    price: '$ 149',
    originalPrice: '$ 189',
    badge: 'SALE'
  }
];
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

  return (
    <section className="new-arrivals">
      <div className="filters-bar">
        <div className="filters-header">
          <span className="filters-title">CURRENT OFFERS</span>
          <span className="filters-clear">{offers.length} active</span>
        </div>
        <div className="active-filters">
          {offers.map((offer) => (
            <div className="filter-tag" key={offer.code}>
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

      <div className="section-header">
        <h2 className="section-title">New Arrivals</h2>
        <a href="#all" className="view-all">View All →</a>
      </div>
      
      <div className="product-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image-container">
              {product.badge && <span className={`badge ${product.badge.toLowerCase()}`}>{product.badge}</span>}
              <img src={product.image} alt={product.title} />
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.title}</h3>
              <p className="product-category">{product.category}</p>
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
