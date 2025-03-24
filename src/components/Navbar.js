import React from 'react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className="company-name">Billiance</span>
      </div>
      <div className="navbar-links">
        <a href="/" className="nav-link active">Home</a>
        <a href="/about" className="nav-link">About</a>
        <a href="/contact" className="nav-link">Contact</a>
      </div>
    </nav>
  );
};

export default Navbar; 