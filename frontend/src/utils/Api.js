// Final API utilities for your sophisticated backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper functions
const getAuthToken = () => localStorage.getItem('authToken');

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, config);

    // Handle different response types
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: 'No JSON response' };
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`✅ API Success: ${endpoint}`, data);
    return { success: true, data: data.data || data, meta: data.meta };
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    return { 
      success: false, 
      error: error.message,
      isNetworkError: error.name === 'TypeError' && error.message.includes('fetch')
    };
  }
};

// Authentication API
export const authAPI = {
  register: async (userData) => {
    return await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  login: async (credentials) => {
    return await apiRequest('/api/auth/login', {
      method: 'POST', 
      body: JSON.stringify(credentials)
    });
  },

  verifyToken: async () => {
    return await apiRequest('/api/auth/verify');
  },

  logout: async () => {
    return await apiRequest('/api/auth/logout', { method: 'POST' });
  }
};

// Email API - Enhanced for your IMAP + AI backend
export const emailAPI = {
  // Fetch emails with AI categorization
  fetchEmails: async (accountId = 'default', options = {}) => {
    const { limit = 50, category, syncNew = false } = options;
    return await apiRequest('/api/emails/fetch', {
      method: 'POST',
      body: JSON.stringify({ 
        accountId, 
        limit, 
        category,
        syncNew,
        includeMetadata: true
      })
    });
  },

  // Get email accounts configured
  getAccounts: async () => {
    return await apiRequest('/api/emails/accounts');
  },

  // Add new email account (IMAP configuration)
  addAccount: async (accountConfig) => {
    return await apiRequest('/api/emails/accounts', {
      method: 'POST',
      body: JSON.stringify(accountConfig)
    });
  },

  // Sync specific account
  syncAccount: async (accountId, options = {}) => {
    return await apiRequest('/api/emails/sync', {
      method: 'POST',
      body: JSON.stringify({ 
        accountId, 
        fullSync: options.fullSync || false,
        backgroundJob: options.background || true
      })
    });
  },

  // Trigger AI categorization
  categorizeEmails: async (options = {}) => {
    return await apiRequest('/api/emails/categorize', {
      method: 'POST',
      body: JSON.stringify({
        accountId: options.accountId || 'all',
        recategorize: options.recategorize || false,
        useAI: options.useAI !== false // Default to true
      })
    });
  },

  // Get categorization stats
  getCategorizationStats: async () => {
    return await apiRequest('/api/emails/stats/categories');
  }
};

// Enhanced Search API for Elasticsearch
export const searchAPI = {
  // Advanced search with Elasticsearch
  searchEmails: async (query, options = {}) => {
    const params = new URLSearchParams({
      q: query,
      limit: options.limit || 20,
      offset: options.offset || 0,
      ...(options.category && { category: options.category }),
      ...(options.dateFrom && { dateFrom: options.dateFrom }),
      ...(options.dateTo && { dateTo: options.dateTo }),
      ...(options.sender && { sender: options.sender }),
      ...(options.fuzzy && { fuzzy: options.fuzzy })
    });

    return await apiRequest(`/api/search/search?${params}`);
  },

  // Initialize Elasticsearch index
  initializeSearch: async (options = {}) => {
    return await apiRequest('/api/search/initialize', {
      method: 'POST',
      body: JSON.stringify({
        reindex: options.reindex || false,
        backgroundJob: options.background !== false
      })
    });
  },

  // Rebuild search index
  rebuildIndex: async () => {
    return await apiRequest('/api/search/rebuild', {
      method: 'POST',
      body: JSON.stringify({ backgroundJob: true })
    });
  },

  // Get search suggestions
  getSuggestions: async (partial) => {
    return await apiRequest(`/api/search/suggestions?q=${encodeURIComponent(partial)}`);
  },

  // Get search analytics
  getSearchAnalytics: async () => {
    return await apiRequest('/api/search/analytics');
  }
};

// Enhanced Slack API
export const slackAPI = {
  // Test Slack webhook connection
  testSlack: async () => {
    return await apiRequest('/api/slack/test');
  },

  // Send email notification to Slack
  notifyEmail: async (emailId, options = {}) => {
    return await apiRequest(`/api/slack/notify/${emailId}`, {
      method: 'POST',
      body: JSON.stringify({
        force: options.force || false,
        template: options.template || 'default',
        channel: options.channel
      })
    });
  },

  // Configure Slack settings
  configure: async (config) => {
    return await apiRequest('/api/slack/configure', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  // Get Slack configuration
  getConfig: async () => {
    return await apiRequest('/api/slack/config');
  },

  // Get notification history
  getNotificationHistory: async (limit = 50) => {
    return await apiRequest(`/api/slack/history?limit=${limit}`);
  }
};

// Dashboard API for analytics and stats
export const dashboardAPI = {
  // Get comprehensive dashboard statistics
  getStats: async (timeRange = '7d') => {
    return await apiRequest(`/api/dashboard/stats?range=${timeRange}`);
  },

  // Get recent activity
  getActivity: async (limit = 10) => {
    return await apiRequest(`/api/dashboard/activity?limit=${limit}`);
  },

  // Get email volume analytics
  getEmailVolume: async (timeRange = '7d', groupBy = 'day') => {
    return await apiRequest(`/api/dashboard/volume?range=${timeRange}&groupBy=${groupBy}`);
  },

  // Get categorization analytics
  getCategoryAnalytics: async () => {
    return await apiRequest('/api/dashboard/categories');
  }
};

// Job Queue API for background tasks
export const jobAPI = {
  // Get job status
  getJobStatus: async (jobId) => {
    return await apiRequest(`/api/jobs/${jobId}/status`);
  },

  // Get active jobs
  getActiveJobs: async () => {
    return await apiRequest('/api/jobs/active');
  },

  // Cancel job
  cancelJob: async (jobId) => {
    return await apiRequest(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
  }
};

// Utility functions
export const utils = {
  saveAuthData: (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('authTimestamp', Date.now().toString());
    console.log('✅ Auth data saved');
  },

  getAuthData: () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    const timestamp = localStorage.getItem('authTimestamp');

    return {
      token,
      user: userData ? JSON.parse(userData) : null,
      timestamp: timestamp ? parseInt(timestamp) : null
    };
  },

  clearAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData'); 
    localStorage.removeItem('authTimestamp');
    console.log('✅ Auth data cleared');
  },

  isAuthenticated: () => {
    const { token, timestamp } = utils.getAuthData();
    if (!token || !timestamp) return false;

    // Check if token is less than 24 hours old
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return tokenAge < maxAge;
  },

  // Format date for API calls
  formatDate: (date) => {
    return new Date(date).toISOString();
  },

  // Generate demo emails if backend is not available
  generateDemoEmails: () => [
    {
      id: 'demo-1',
      subject: 'New Lead: Interested in Email Automation Solution',
      from: 'john.smith@techcorp.com',
      to: 'sales@yourcompany.com',
      date: new Date(Date.now() - 1000 * 60 * 30),
      category: 'Interested',
      aiConfidence: 0.92,
      content: 'Hi there, I came across your email automation solution and I am very interested in learning more about how it can help streamline our email workflows. Could we schedule a demo call this week?',
      preview: 'Hi there, I came across your email automation solution and I am very interested...',
      isRead: false,
      isImportant: true,
      tags: ['lead', 'demo-request'],
      sentiment: 'positive'
    },
    {
      id: 'demo-2', 
      subject: 'Meeting Confirmed: Tomorrow 3:00 PM - Email Integration Discussion',
      from: 'sarah.wilson@enterprise.com',
      to: 'meetings@yourcompany.com',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2),
      category: 'Meeting Booked',
      aiConfidence: 0.98,
      content: 'This email confirms our meeting scheduled for tomorrow at 3:00 PM to discuss the email aggregation project requirements and implementation timeline.',
      preview: 'This email confirms our meeting scheduled for tomorrow at 3:00 PM...',
      isRead: false,
      isImportant: true,
      tags: ['meeting', 'confirmed'],
      sentiment: 'neutral'
    },
    {
      id: 'demo-3',
      subject: 'Re: Demo Follow-up - Decision Update',
      from: 'mike.brown@startup.io',
      to: 'sales@yourcompany.com', 
      date: new Date(Date.now() - 1000 * 60 * 60 * 4),
      category: 'Not Interested',
      aiConfidence: 0.87,
      content: 'Thank you for the comprehensive demo last week. After internal discussions, we have decided to go with a different solution that better fits our current needs.',
      preview: 'Thank you for the comprehensive demo last week. After internal discussions...',
      isRead: true,
      isImportant: false,
      tags: ['follow-up', 'decision'],
      sentiment: 'negative'
    },
    {
      id: 'demo-4',
      subject: 'Urgent: Pricing Information Needed for Q4 Budget',
      from: 'budget@bigcorp.com',
      to: 'sales@yourcompany.com',
      date: new Date(Date.now() - 1000 * 60 * 60 * 6),
      category: 'Interested',
      aiConfidence: 0.89,
      content: 'We are finalizing our Q4 budget and need detailed pricing information for your email aggregation platform. Can you send this over by Friday?',
      preview: 'We are finalizing our Q4 budget and need detailed pricing information...',
      isRead: true,
      isImportant: true,
      tags: ['pricing', 'urgent'],
      sentiment: 'neutral'
    },
    {
      id: 'demo-5',
      subject: '🎉 CONGRATULATIONS! You have won $1,000,000 in our lottery!',
      from: 'winner@fake-lottery.com',
      to: 'victim@yourcompany.com',
      date: new Date(Date.now() - 1000 * 60 * 60 * 8),
      category: 'Spam',
      aiConfidence: 0.99,
      content: 'You are our lucky winner! Click here immediately to claim your prize money before it expires! Act now - limited time offer!',
      preview: 'You are our lucky winner! Click here immediately to claim your prize...',
      isRead: true,
      isImportant: false,
      tags: ['spam', 'phishing'],
      sentiment: 'negative'
    }
  ]
};

// Export all APIs
export {
  authAPI,
  emailAPI,
  searchAPI, 
  slackAPI,
  dashboardAPI,
  jobAPI,
  utils
};

// Default export for backward compatibility
export default {
  authAPI,
  emailAPI,
  searchAPI,
  slackAPI,
  dashboardAPI,
  jobAPI,
  utils
};