import React from 'react';
import { getAuth } from '../api/client';

const BannerCTA = () => {
  // Guests land straight on CREATE ACCOUNT; members already have a loyalty
  // profile (created at registration), so they go to their dashboard.
  const joinRewards = () => {
    const auth = getAuth();
    window.location.hash = auth?.user
      ? `dashboard/${auth.user.dashboardKey}`
      : 'login?mode=register';
  };

  return (
    <section className="banner-cta">
      <div className="banner-content reveal-left">
        <p className="banner-subtitle">FASHIONFLOW REWARDS</p>
        <h2 className="banner-title">Earn points.<br/>Unlock exclusives.</h2>
        <p className="banner-description">
          Sign up to our loyalty program to start earning points<br/>
          for rewards, early access to new collections, and<br/>
          exclusive member perks.
        </p>
        <button className="btn btn-primary-gold" onClick={joinRewards}>JOIN NOW</button>
      </div>
      <div className="banner-image reveal-right">
        <img src="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop" alt="Fashion Clothes Rack" loading="lazy" />
      </div>
    </section>
  );
};

export default BannerCTA;
