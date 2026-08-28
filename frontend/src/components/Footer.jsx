import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-left">
        <img src="/assets/new logo.jpg" alt="FashionFlow Logo" className="footer-logo-img" style={{ height: '60px', width: 'auto' }} />
      </div>
      <div className="footer-links">
        <a href="#about">ABOUT</a>
        <a href="#faq">FAQ</a>
        <a href="#returns">RETURNS</a>
        <a href="#contact">CONTACT</a>
        <a href="#careers">CAREERS</a>
      </div>
      <div className="footer-right">
        <span className="copyright">© 2026 FashionFlow</span>
      </div>
    </footer>
  );
};

export default Footer;
