import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './styles/main.scss';
import Landing from './pages/Landingpage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/Loadingspinner';

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    initializeApp();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const initializeApp = async () => {
    console.log('🚀 OneBox Email Aggregator starting...');
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        await initializeSocket(parsedUser);
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }

      await testBackendConnection();
    } catch (err) {
      console.error('❌ App initialization failed:', err);
      setError('System initialization failed. Please refresh the page.');
    }

    setLoading(false);
  };

  const initializeSocket = async (userData) => {
    try {
      const socketConnection = io('http://localhost:5000', {
        auth: { token: localStorage.getItem('authToken') }
      });

      socketConnection.on('connect', () => {
        console.log('✅ Socket connected');
        setConnectionStatus('connected');
        socketConnection.emit('user-login', userData);
      });

      socketConnection.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        setConnectionStatus('disconnected');
      });

      socketConnection.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err);
        setConnectionStatus('error');
      });

      setSocket(socketConnection);
    } catch (err) {
      console.error('❌ Socket initialization failed:', err);
    }
  };

  const testBackendConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Backend connection successful');
        setConnectionStatus('connected');
      } else {
        throw new Error(`Backend responded with ${response.status}`);
      }
    } catch (err) {
      console.warn('⚠️ Backend connection failed:', err.message);
      setConnectionStatus('error');
    }
  };

  const handleLogin = async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        setUser(data.user);
        await initializeSocket(data.user);
        setCurrentView('dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        setUser(data.user);
        await initializeSocket(data.user);
        setCurrentView('dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
    setConnectionStatus('disconnected');
    setCurrentView('landing');
    console.log('✅ Logout complete');
  };

  if (loading || currentView === 'loading') {
    return (
      <div className="app-loading">
        <LoadingSpinner message="Initializing OneBox Email Aggregator..." />
        <div className="connection-status">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span className="status-text">
            {connectionStatus === 'connected'
              ? 'Connected'
              : connectionStatus === 'connecting'
              ? 'Connecting...'
              : connectionStatus === 'error'
              ? 'Connection Error'
              : 'Disconnected'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <h2>System Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'landing':
      return (
        <Landing
          onLoginClick={() => setCurrentView('login')}
          onSignupClick={() => setCurrentView('signup')}
        />
      );
    case 'login':
      return (
        <Login
          onLogin={handleLogin}
          onBack={() => setCurrentView('landing')}
          onSignupClick={() => setCurrentView('signup')}
          loading={loading}
        />
      );
    case 'signup':
      return (
        <Signup
          onSignup={handleSignup}
          onBack={() => setCurrentView('landing')}
          onLoginClick={() => setCurrentView('login')}
          loading={loading}
        />
      );
    case 'dashboard':
      return (
        <Dashboard
          user={user}
          socket={socket}
          connectionStatus={connectionStatus}
          onLogout={handleLogout}
        />
      );
    default:
      return (
        <div className="app-error">
          <div className="error-container">
            <h2>Unknown State</h2>
            <p>Application is in an unknown state.</p>
            <button onClick={() => setCurrentView('landing')}>Go to Home</button>
          </div>
        </div>
      );
  }
}

export default App;
