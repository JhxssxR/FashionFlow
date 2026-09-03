import React from 'react';

const Hero = () => {
  const goTo = (hash) => {
    window.location.hash = hash;
  };

  return (
    <section className="hero">
      <div className="hero-image reveal-fade">
        <img src="/assets/hero.jpeg" alt="Fashion Model" />
      </div>
      <div className="hero-content">
        <div className="hero-text-content reveal-left">
          <p className="hero-subtitle">NEW ARRIVALS • SPRING COLLECTION</p>
          <h1 className="hero-title">Wear<br/>Bold.<br/>Live<br/>Free.</h1>
          <p className="hero-description">
            Discover a curated collection of pieces that will<br/>
            seamlessly transition from the boardroom to the<br/>
            weekend party.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => goTo('shop')}>SHOP NOW</button>
            <button className="btn btn-secondary" onClick={() => goTo('offers')}>VIEW OFFERS</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
