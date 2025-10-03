import React from 'react';

const Navbar = ({ isAuthenticated, user, onAuthClick, onLogout, onHomeClick }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={onHomeClick}>
          <span className="logo">OneBox</span>
        </div>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <div className="navbar-user">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <button className="btn btn-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onAuthClick}>
              Get Started
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;