import React from 'react';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-image">
        <img src="/assets/hero.jpeg" alt="Fashion Model" />
      </div>
      <div className="hero-content">
        <div className="hero-text-content">
          <p className="hero-subtitle">NEW ARRIVALS • SPRING COLLECTION</p>
          <h1 className="hero-title">Wear<br/>Bold.<br/>Live<br/>Free.</h1>
          <p className="hero-description">
            Discover a curated collection of pieces that will<br/>
            seamlessly transition from the boardroom to the<br/>
            weekend party.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">SHOP NOW</button>
            <button className="btn btn-secondary">VIEW OFFERS</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
