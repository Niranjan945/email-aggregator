import React from 'react';
import './LoadingSpinner.scss';

const LoadingSpinner = ({ message = "Connecting to server..." }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-ring"></div>
          <div className="logo-inner">
            <span className="logo-text">EB</span>
          </div>
        </div>
        <h2 className="loading-title">Email Aggregator</h2>
        <p className="loading-message">{message}</p>
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;