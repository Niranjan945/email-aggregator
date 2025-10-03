import React from 'react';
import './Navbar.scss';

const Navbar = ({ isAuthenticated, user, onAuthClick, onLogout, onHomeClick }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={onHomeClick}>
        <span className="brand-icon">📧</span>
        <span className="brand-text">OneBox</span>
      </div>
      
      <div className="navbar-menu">
        {isAuthenticated ? (
          <div className="navbar-user">
            <span className="user-greeting">
              Welcome, {user?.name || user?.email}
            </span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="navbar-auth">
            <button className="auth-btn" onClick={onAuthClick}>
              Login
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
