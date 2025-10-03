import React from 'react';

const Landing = ({ onLoginClick, onSignupClick }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: '700' }}>
        OneBox Email Aggregator
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '600px' }}>
        Smart email management with AI-powered categorization. 
        Aggregate emails from multiple accounts and manage them intelligently.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={onLoginClick}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Login
        </button>
        <button 
          onClick={onSignupClick}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            backgroundColor: 'transparent',
            color: 'white',
            border: '2px solid white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Landing;
