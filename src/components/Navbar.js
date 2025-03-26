import React from 'react';

const Navbar = ({ onToggleDarkMode, darkMode }) => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className="company-name">TurfBook</span>
      </div>
      <div className="navbar-links">
        <a href="#" className="nav-link active">Home</a>
        <a href="#" className="nav-link">Bookings</a>
        <button className="dark-mode-toggle" onClick={onToggleDarkMode}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 