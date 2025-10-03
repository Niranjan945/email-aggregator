import React from 'react';
import './Loadingspinner.scss';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
