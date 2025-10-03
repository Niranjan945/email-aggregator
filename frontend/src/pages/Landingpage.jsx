// Landing Page Component
import React from 'react';

const Landing = ({ onGetStarted, onLoginClick, onSignupClick }) => {
  return (
    <div className="landing">
      <div className="landing-container">
        <header className="landing-header">
          <div className="logo">
            <h1>OneBox</h1>
          </div>
          <div className="auth-buttons">
            <button className="btn-login" onClick={onLoginClick}>
              Login
            </button>
            <button className="btn-signup" onClick={onSignupClick}>
              Sign Up
            </button>
          </div>
        </header>

        <main className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Smart Email Management <span className="highlight">Made Simple</span>
            </h1>
            <p className="hero-subtitle">
              Aggregate emails from multiple accounts with AI-powered categorization. 
              Find what matters, when it matters.
            </p>
            <button className="cta-button" onClick={onGetStarted || onSignupClick}>
              Get Started Free
            </button>
          </div>
          
          <div className="hero-image">
            <div className="email-preview">
              <div className="email-header">
                <div className="email-dot green"></div>
                <div className="email-dot blue"></div>
                <div className="email-dot black"></div>
              </div>
              <div className="email-content">
                <div className="email-line long"></div>
                <div className="email-line medium"></div>
                <div className="email-line short"></div>
                <div className="email-line medium"></div>
              </div>
            </div>
          </div>
        </main>

        <section className="features">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon green">
                <span>📧</span>
              </div>
              <h3>Smart Aggregation</h3>
              <p>Connect multiple email accounts and manage them all in one place</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon blue">
                <span>🤖</span>
              </div>
              <h3>AI Categorization</h3>
              <p>Automatically categorize emails by importance and context</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon black">
                <span>🔍</span>
              </div>
              <h3>Powerful Search</h3>
              <p>Find any email instantly with advanced search capabilities</p>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <p>&copy; 2025 OneBox Email Aggregator. Made with ❤️ for better email management.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;