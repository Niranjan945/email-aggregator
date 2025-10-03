// Fixed App.jsx with Dynamic Email System
import React, { useState, useEffect } from 'react';
import './styles/main.scss';

// Import components
import Landing from './pages/Landingpage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 OneBox Email Aggregator starting...');
    setLoading(true);
    
    try {
      // Check if user is already logged in
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        console.log('✅ Found existing session');
        setUser(JSON.parse(userData));
        setCurrentView('dashboard');
      } else {
        console.log('🏠 No session found, showing landing page');
        setCurrentView('landing');
      }
      
      // Test backend connection
      await testBackendConnection();
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setError('System initialization failed');
      setCurrentView('landing');
    }
    
    setLoading(false);
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection successful:', data.message);
      } else {
        console.warn('⚠️ Backend responded with error:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Backend connection failed (will use demo mode):', error.message);
    }
  };

  const handleLogin = async (credentials) => {
    console.log('🔐 Attempting login...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        console.log('✅ Login successful');
        
        // Store authentication data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        setUser(data.user);
        setCurrentView('dashboard');
        
        return { success: true };
      } else {
        console.error('❌ Login failed:', data.message);
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login network error:', error);
      return { success: false, error: 'Connection failed. Please check your network.' };
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (userData) => {
    console.log('📝 Attempting signup...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        console.log('✅ Signup successful');
        
        // Store authentication data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        setUser(data.user);
        setCurrentView('dashboard');
        
        return { success: true };
      } else {
        console.error('❌ Signup failed:', data.message);
        return { success: false, error: data.message || 'Signup failed' };
      }
    } catch (error) {
      console.error('❌ Signup network error:', error);
      return { success: false, error: 'Connection failed. Please check your network.' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('👋 Logging out...');
    
    // Clear all stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Clear state
    setUser(null);
    setCurrentView('landing');
    
    console.log('✅ Logout complete');
  };

  // Show loading screen
  if (loading || currentView === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Initializing OneBox...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>System Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              initializeApp();
            }}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render current view
  switch (currentView) {
    case 'landing':
      return (
        <div className="app">
          <Landing 
            onLoginClick={() => setCurrentView('login')}
            onSignupClick={() => setCurrentView('signup')}
          />
        </div>
      );
    
    case 'login':
      return (
        <div className="app">
          <Login 
            onLogin={handleLogin}
            onBack={() => setCurrentView('landing')}
            onSignupClick={() => setCurrentView('signup')}
          />
        </div>
      );
    
    case 'signup':
      return (
        <div className="app">
          <Signup 
            onSignup={handleSignup}
            onBack={() => setCurrentView('landing')}
            onLoginClick={() => setCurrentView('login')}
          />
        </div>
      );
    
    case 'dashboard':
      return (
        <div className="app">
          <Dashboard 
            user={user}
            onLogout={handleLogout}
          />
        </div>
      );
    
    default:
      return (
        <div className="app">
          <div className="error-content">
            <h2>Unknown State</h2>
            <p>Application is in an unknown state.</p>
            <button 
              onClick={() => setCurrentView('landing')}
              className="btn btn-primary"
            >
              Go Home
            </button>
          </div>
        </div>
      );
  }
}

export default App;