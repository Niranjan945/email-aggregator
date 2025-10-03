const express = require('express');
const router = express.Router();
const elasticsearchService = require('../services/elasticsearchService');
const Email = require('../models/email');
const EmailAccount = require('../models/emailAccounts');

// Test Elasticsearch connection
router.get('/test', async (req, res) => {
  try {
    const connectionTest = await elasticsearchService.testConnection();

    res.json({
      message: 'Search service test',
      elasticsearch: connectionTest,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Search test failed',
      message: error.message
    });
  }
});

// Initialize search index (create if doesn't exist)
router.post('/initialize', async (req, res) => {
  try {
    console.log('🔧 Initializing search index...');

    // Create email index
    const indexResult = await elasticsearchService.createEmailIndex();

    // Get existing emails from MongoDB to index
    const existingEmails = await Email.find({}).limit(100); // Start with 100 emails

    let indexedCount = 0;
    if (existingEmails.length > 0) {
      console.log(`📚 Indexing ${existingEmails.length} existing emails...`);
      const bulkResult = await elasticsearchService.indexMultipleEmails(existingEmails);
      indexedCount = bulkResult.indexed;
    }

    res.json({
      message: 'Search index initialized successfully',
      index: indexResult,
      emailsIndexed: indexedCount,
      totalEmails: existingEmails.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Search initialization failed:', error);
    res.status(500).json({
      error: 'Search initialization failed',
      message: error.message
    });
  }
});

// Search emails with advanced filtering
router.get('/search', async (req, res) => {
  try {
    const {
      q: query,           // Search query
      from,              // Filter by sender
      category,          // Filter by AI category
      accountId,         // Filter by email account
      dateFrom,          // Date range start (YYYY-MM-DD)
      dateTo,            // Date range end (YYYY-MM-DD)
      size = 10,         // Results per page
      page = 1           // Page number
    } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query using ?q=your-search-terms'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(size);

    const searchOptions = {
      from: from,
      category: category,
      accountId: accountId,
      dateFrom: dateFrom,
      dateTo: dateTo,
      size: parseInt(size),
      from: offset
    };

    console.log(`🔍 Searching for: "${query}" with filters:`, searchOptions);

    const searchResults = await elasticsearchService.searchEmails(query, searchOptions);

    // If Elasticsearch found results, get full email details from MongoDB
    const emailIds = searchResults.results.map(result => result.id);
    const fullEmails = emailIds.length > 0 
      ? await Email.find({ _id: { $in: emailIds } }).select('subject from date category bodyText')
      : [];

    // Combine search results with MongoDB data
    const enhancedResults = searchResults.results.map(result => {
      const fullEmail = fullEmails.find(email => email._id.toString() === result.id);
      return {
        id: result.id,
        score: result.score,
        subject: result.subject,
        from: result.from,
        date: result.date,
        category: result.category,
        highlights: result.highlights,
        preview: fullEmail ? fullEmail.bodyText.substring(0, 200) + '...' : ''
      };
    });

    res.json({
      message: 'Search completed',
      query: query,
      total: searchResults.total,
      page: parseInt(page),
      size: parseInt(size),
      took: searchResults.took,
      results: enhancedResults,
      filters: {
        from: from,
        category: category,
        accountId: accountId,
        dateRange: { from: dateFrom, to: dateTo }
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Search failed:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      query: req.query.q
    });
  }
});

// Get search suggestions/autocomplete
router.get('/suggest', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Please provide at least 2 characters for suggestions'
      });
    }

    const suggestions = await elasticsearchService.getSuggestions(query);

    res.json({
      message: 'Suggestions retrieved',
      query: query,
      suggestions: suggestions.suggestions,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Suggestions failed',
      message: error.message
    });
  }
});

// Index a specific email (for real-time updates)
router.post('/index/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;

    const email = await Email.findById(emailId);
    if (!email) {
      return res.status(404).json({
        error: 'Email not found',
        emailId: emailId
      });
    }

    const indexResult = await elasticsearchService.indexEmail(email);

    res.json({
      message: 'Email indexed successfully',
      emailId: emailId,
      subject: email.subject,
      indexed: indexResult.indexed,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Email indexing failed',
      message: error.message
    });
  }
});

// Bulk index recent emails
router.post('/index/bulk', async (req, res) => {
  try {
    const { limit = 50, accountId } = req.body;

    const query = accountId ? { accountId } : {};
    const recentEmails = await Email.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    if (recentEmails.length === 0) {
      return res.json({
        message: 'No emails to index',
        indexed: 0
      });
    }

    const bulkResult = await elasticsearchService.indexMultipleEmails(recentEmails);

    res.json({
      message: 'Bulk indexing completed',
      total: recentEmails.length,
      indexed: bulkResult.indexed,
      errors: bulkResult.errors.length,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Bulk indexing failed',
      message: error.message
    });
  }
});

// Search analytics - get popular search terms, categories, etc.
router.get('/analytics', async (req, res) => {
  try {
    // Get email statistics from MongoDB
    const totalEmails = await Email.countDocuments();
    const categoryStats = await Email.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const accountStats = await Email.aggregate([
      { $group: { _id: '$accountId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      message: 'Search analytics',
      totalEmails: totalEmails,
      categories: categoryStats,
      accounts: accountStats,
      searchFeatures: {
        fullTextSearch: true,
        categoryFiltering: true,
        dateRangeFiltering: true,
        senderFiltering: true,
        fuzzyMatching: true,
        highlighting: true,
        suggestions: true
      },
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Analytics failed',
      message: error.message
    });
  }
});

module.exports = router;