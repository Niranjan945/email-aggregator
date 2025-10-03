import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox,
  Search,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  Filter,
  Refresh,
  Settings,
  User,
  Bell,
  Zap,
  Mail,
  Clock,
  Check,
  AlertCircle,
  WifiOff,
  Wifi
} from 'lucide-react';
import './Dashboard.scss';

const Dashboard = ({ user, socket, connectionStatus, onLogout }) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [emailStats, setEmailStats] = useState({
    inbox: 0,
    starred: 0,
    important: 0,
    spam: 0,
    categories: {}
  });
  const [notifications, setNotifications] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const categories = [
    { id: 'inbox', name: 'Inbox', icon: Inbox, color: 'blue' },
    { id: 'starred', name: 'Starred', icon: Star, color: 'yellow' },
    { id: 'important', name: 'Important', icon: Zap, color: 'red' },
    { id: 'archive', name: 'Archive', icon: Archive, color: 'gray' },
    { id: 'spam', name: 'Spam', icon: AlertCircle, color: 'orange' }
  ];

  const aiCategories = [
    { id: 'Interested', name: 'Interested', color: 'green' },
    { id: 'Meeting Booked', name: 'Meeting Booked', color: 'blue' },
    { id: 'Not Interested', name: 'Not Interested', color: 'red' },
    { id: 'Out of Office', name: 'Out of Office', color: 'yellow' },
    { id: 'Spam', name: 'Spam', color: 'orange' }
  ];

  useEffect(() => {
    initializeDashboard();
    setupSocketListeners();
    return () => {
      if (socket) {
        socket.off('new-email');
        socket.off('email-error');
      }
    };
  }, [socket]);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await fetchEmails(true);
      setupAutoRefresh();
    } catch (err) {
      console.error('Dashboard initialization failed:', err);
      showNotification('Failed to initialize dashboard', 'error');
    }
    setLoading(false);
  };

  const setupSocketListeners = () => {
    if (!socket) return;
    socket.on('new-email', (emailData) => {
      setEmails(prev => [emailData, ...prev]);
      updateEmailStats([emailData, ...emails]);
      showNotification(`New ${emailData.category} email from ${emailData.from}`, 'info');
    });
    socket.on('email-error', (error) => {
      showNotification(error.message, 'error');
    });
  };

  const setupAutoRefresh = () => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected') fetchEmails(false);
    }, 60000);
    return () => clearInterval(interval);
  };

  const fetchEmails = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/emails/list?userId=${user.email}&limit=100`,
        { headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        const processed = data.emails.map(email => ({
          ...email,
          id: email._id || email.id,
          date: new Date(email.date),
          isRead: email.isRead || false,
          isStarred: email.isStarred || false,
          category: email.category || 'Interested'
        }));
        setEmails(processed);
        updateEmailStats(processed);
        setLastFetchTime(new Date());
        if (!showLoader) showNotification('Emails refreshed successfully', 'success');
      } else throw new Error(data.error || 'Failed to fetch emails');
    } catch (err) {
      console.error('Email fetch error:', err);
      showNotification('Failed to fetch emails', 'error');
      if (emails.length === 0) loadDemoEmails();
    }
    if (showLoader) setLoading(false);
    else setRefreshing(false);
  }, [user, emails.length]);

  const loadDemoEmails = () => {
    const now = Date.now();
    const demo = [
      {
        id: 'demo-1', messageId: 'demo-1',
        from: 'sarah.johnson@techcorp.com',
        to: user?.email || 'user@example.com',
        subject: 'Exciting Partnership Opportunity',
        bodyText: 'Hi! Interested in exploring partnership...',
        date: new Date(now - 30 * 60 * 1000),
        category: 'Interested', aiConfidence: 0.92, isRead: false, isStarred: false
      },
      {
        id: 'demo-2', messageId: 'demo-2',
        from: 'calendar@company.com',
        to: user?.email || 'user@example.com',
        subject: 'Meeting Confirmed: Demo Tomorrow',
        bodyText: 'Your meeting is confirmed...',
        date: new Date(now - 2 * 60 * 60 * 1000),
        category: 'Meeting Booked', aiConfidence: 0.98, isRead: false, isStarred: true
      },
      {
        id: 'demo-3', messageId: 'demo-3',
        from: 'mike.brown@startup.io',
        to: user?.email || 'user@example.com',
        subject: 'Re: Demo Follow-up - Decision Update',
        bodyText: 'Thank you for demo; we chose another solution.',
        date: new Date(now - 4 * 60 * 60 * 1000),
        category: 'Not Interested', aiConfidence: 0.87, isRead: true, isStarred: false
      }
    ];
    setEmails(demo);
    updateEmailStats(demo);
    showNotification('Loading demo emails (Backend offline)', 'warning');
  };

  const updateEmailStats = (list) => {
    const stats = {
      inbox: list.length,
      starred: list.filter(e => e.isStarred).length,
      important: list.filter(e => e.category === 'Important').length,
      spam: list.filter(e => e.category === 'Spam').length,
      categories: {}
    };
    aiCategories.forEach(cat => {
      stats.categories[cat.id] = list.filter(e => e.category === cat.id).length;
    });
    setEmailStats(stats);
  };

  const filteredEmails = useMemo(() => {
    let filtered = emails;
    if (selectedCategory !== 'inbox') {
      if (selectedCategory === 'starred') filtered = filtered.filter(e => e.isStarred);
      else if (selectedCategory === 'important') filtered = filtered.filter(e => e.category === 'Important');
      else if (selectedCategory === 'spam') filtered = filtered.filter(e => e.category === 'Spam');
      else filtered = filtered.filter(e => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.bodyText.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => b.date - a.date);
  }, [emails, selectedCategory, searchQuery]);

  const handleEmailAction = async (emailId, action) => {
    try {
      const res = await fetch(`http://localhost:5000/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [action]: action === 'markRead' ? true : true })
      });
      if (res.ok) {
        setEmails(prev => prev.map(e =>
          e.id === emailId
            ? { ...e, [action === 'markRead' ? 'isRead' : 'isStarred']: true }
            : e
        ));
        showNotification('Email updated successfully', 'success');
      }
    } catch {
      showNotification('Failed to update email', 'error');
    }
  };

  const showNotification = (msg, type = 'info') => {
    const note = { id: Date.now(), message: msg, type, timestamp: new Date() };
    setNotifications(prev => [note, ...prev.slice(0,4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== note.id));
    }, 5000);
  };

  const handleRefresh = () => {
    if (socket) socket.emit('manual-refresh', user);
    fetchEmails(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <Mail className="logo-icon" /><span className="logo-text">OneBox</span>
          </div>
          <div className="search-bar">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="header-right">
          <div className="connection-status">
            {connectionStatus === 'connected' ? (
              <Wifi className="status-icon connected" title="Connected"/>
            ) : (
              <WifiOff className="status-icon disconnected" title="Disconnected"/>
            )}
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing} title="Refresh">
            <Refresh className={`refresh-icon ${refreshing ? 'spinning' : ''}`}/>
          </button>
          <div className="notifications-container">
            <button onClick={() => setShowNotifications(!showNotifications)} className="notifications-btn">
              <Bell className="bell-icon"/>
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            </button>
            {showNotifications && (
              <div className="notifications-dropdown">
                <h4>Notifications</h4>
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.type}`}>
                      <span className="notification-message">{n.message}</span>
                      <span className="notification-time">{n.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : <p className="no-notifications">No notifications</p>}
              </div>
            )}
          </div>
          <div className="user-menu">
            <button onClick={() => setShowSettings(!showSettings)} className="user-btn">
              <User className="user-icon"/><span className="user-name">{user?.name || 'User'}</span>
            </button>
            {showSettings && (
              <div className="user-dropdown">
                <div className="user-info"><strong>{user?.name}</strong><span>{user?.email}</span></div>
                <button className="dropdown-item"><Settings className="item-icon"/>Settings</button>
                <button className="dropdown-item" onClick={onLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="dashboard-main">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-section">
            <h3>Mailboxes</h3>
            <nav className="sidebar-nav">
              {categories.map(cat => {
                const Icon = cat.icon;
                const cnt = cat.id === 'inbox' ? emailStats.inbox :
                            cat.id === 'starred' ? emailStats.starred :
                            cat.id === 'important' ? emailStats.important :
                            cat.id === 'spam' ? emailStats.spam : 0;
                return (
                  <button
                    key={cat.id}
                    className={`nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <Icon className={`nav-icon ${cat.color}`}/>
                    <span className="nav-text">{cat.name}</span>
                    {cnt > 0 && <span className="nav-count">{cnt}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="sidebar-section">
            <h3>AI Categories</h3>
            <nav className="sidebar-nav">
              {aiCategories.map(cat => {
                const cnt = emailStats.categories[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    className={`nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className={`category-dot ${cat.color}`}></span>
                    <span className="nav-text">{cat.name}</span>
                    {cnt > 0 && <span className="nav-count">{cnt}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="sidebar-stats">
            <div className="stat-item">
              <Clock className="stat-icon"/>
              <div className="stat-content">
                <span className="stat-label">Last sync</span>
                <span className="stat-value">
                  {lastFetchTime ? lastFetchTime.toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </aside>
        <div className="email-list-container">
          <div className="email-list-header">
            <h2 className="list-title">
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              <span className="email-count">({filteredEmails.length})</span>
            </h2>
            <div className="list-actions">
              <button className="list-action-btn" title="Filter"><Filter className="action-icon"/></button>
              <button className="list-action-btn" title="More"><MoreHorizontal className="action-icon"/></button>
            </div>
          </div>
          <div className="email-list">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <span>Loading emails...</span>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="empty-state">
                <Mail className="empty-icon"/>
                <h3>No emails found</h3>
                <p>{searchQuery ? `No results for "${searchQuery}"` : `No emails in ${selectedCategory}`}</p>
              </div>
            ) : filteredEmails.map(email => (
              <div
                key={email.id}
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${!email.isRead ? 'unread' : ''}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="email-item-content">
                  <div className="email-header">
                    <div className="email-from">{email.from}</div>
                    <div className="email-time">{email.date.toLocaleTimeString()}</div>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-preview">{email.bodyText?.substring(0, 100)}...</div>
                  <div className="email-meta">
                    <span className={`category-tag ${email.category.toLowerCase().replace(' ', '-')}`}>
                      {email.category}
                    </span>
                    {email.aiConfidence && <span className="ai-confidence">🤖 {Math.round(email.aiConfidence*100)}%</span>}
                    {email.isStarred && <Star className="star-icon filled"/>}
                  </div>
                </div>
                <div className="email-actions">
                  <button className="action-btn" onClick={e => { e.stopPropagation(); handleEmailAction(email.id,'star'); }} title="Star">
                    <Star className={email.isStarred?'star-icon filled':'star-icon'}/>
                  </button>
                  <button className="action-btn" onClick={e => { e.stopPropagation(); handleEmailAction(email.id,'markRead'); }} title="Mark as read">
                    <Check className="check-icon"/>
                  </button>
                  <button className="action-btn" title="Archive">
                    <Archive className="archive-icon"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {selectedEmail && (
          <div className="email-detail">
            <div className="email-detail-header">
              <button className="detail-action-btn primary" title="Reply"><Reply className="action-icon"/>Reply</button>
              <button className="detail-action-btn" title="Forward"><Forward className="action-icon"/>Forward</button>
              <button className="detail-action-btn danger" title="Delete"><Trash2 className="action-icon"/>Delete</button>
            </div>
            <div className="email-detail-content">
              <h2 className="email-detail-subject">{selectedEmail.subject}</h2>
              <div className="email-detail-info">
                <div><strong>From:</strong> {selectedEmail.from}</div>
                <div><strong>Date:</strong> {selectedEmail.date.toLocaleString()}</div>
                <div><strong>Category:</strong> <span className={`category-tag ${selectedEmail.category.toLowerCase().replace(' ','-')}`}>{selectedEmail.category}</span></div>
              </div>
              <div className="email-detail-body">
                {selectedEmail.bodyText
                  ? <pre className="email-text">{selectedEmail.bodyText}</pre>
                  : <p className="no-content">No content available</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
