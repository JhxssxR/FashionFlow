import React from 'react';

const BannerCTA = () => {
  return (
    <section className="banner-cta">
      <div className="banner-content">
        <p className="banner-subtitle">FASHIONFLOW REWARDS</p>
        <h2 className="banner-title">Earn points.<br/>Unlock exclusives.</h2>
        <p className="banner-description">
          Sign up to our loyalty program to start earning points<br/>
          for rewards, early access to new collections, and<br/>
          exclusive member perks.
        </p>
        <button className="btn btn-primary-gold">JOIN NOW</button>
      </div>
      <div className="banner-image">
        <img src="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop" alt="Fashion Clothes Rack" />
      </div>
    </section>
  );
};

export default BannerCTA;
