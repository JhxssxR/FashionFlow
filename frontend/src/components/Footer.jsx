import React from 'react';

const shopLinks = ['New Arrivals', 'Dresses', 'Outerwear', 'Bottoms', 'Sale'];
const companyLinks = ['About', 'Careers', 'Press', 'Sustainability'];
const supportLinks = ['FAQ', 'Shipping & Returns', 'Size Guide', 'Contact'];

const socials = [
  {
    name: 'Instagram',
    href: '#instagram',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    name: 'Facebook',
    href: '#facebook',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2.1 0-3.5 1.3-3.5 3.6V11H8.5v3h2.4v7h2.6z" />
      </svg>
    )
  },
  {
    name: 'TikTok',
    href: '#tiktok',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M16.6 3c.4 2 1.7 3.3 3.9 3.5v2.8c-1.5 0-2.8-.4-3.9-1.2v5.6c0 3.6-2.4 5.8-5.5 5.8-2.9 0-5.1-2.1-5.1-5 0-3.1 2.7-5.2 5.8-4.9v2.9c-1.5-.3-2.9.5-2.9 2 0 1.2 1 2.1 2.2 2.1 1.4 0 2.5-1 2.5-2.9V3h3z" />
      </svg>
    )
  },
  {
    name: 'X',
    href: '#x',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.8 4h2.7l-6 6.8L21.5 20h-5.6l-4.3-5.6L6.6 20H3.9l6.4-7.3L3.5 4h5.7l3.9 5.1L17.8 4zm-1 14.4h1.5L8.4 5.5H6.8l10 12.9z" />
      </svg>
    )
  }
];

const Footer = () => {
  return (
    <footer className="footer reveal">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/assets/no background logo.png" alt="FashionFlow Logo" className="footer-logo-img" />
            <p className="footer-tagline">
              Elevating everyday style with pieces that move with you — curated collections, delivered across the Philippines.
            </p>
            <div className="footer-socials">
              {socials.map((social) => (
                <a key={social.name} href={social.href} aria-label={social.name}>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            {shopLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a>
            ))}
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            {companyLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a>
            ))}
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            {supportLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a>
            ))}
          </div>
        </div>

        <div className="footer-newsletter">
          <div className="footer-newsletter-copy">
            <h4>Stay in the loop</h4>
            <p>New drops, exclusive offers, and members-only perks — straight to your inbox.</p>
          </div>
          <form className="footer-signup" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" aria-label="Email address" />
            <button type="submit">SUBSCRIBE</button>
          </form>
        </div>

        <div className="footer-bottom">
          <span className="copyright">© 2026 FashionFlow. All rights reserved.</span>
          <span className="footer-payments">Cash on Delivery · GCash · Maya · BPI · BDO</span>
          <div className="footer-legal">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
