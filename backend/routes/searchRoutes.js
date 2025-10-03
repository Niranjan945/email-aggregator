// SEARCH ROUTES - routes/search.js
const express = require('express');
const router = express.Router();
const Email = require('../models/email');

// Search emails
router.get('/', async (req, res) => {
  try {
    const { q, userId, limit = 20 } = req.query;
    
    if (!q || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query and userId are required' 
      });
    }
    
    const searchQuery = {
      userId,
      $or: [
        { subject: { $regex: q, $options: 'i' } },
        { from: { $regex: q, $options: 'i' } },
        { bodyText: { $regex: q, $options: 'i' } }
      ]
    };
    
    const emails = await Email.find(searchQuery)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      results: emails,
      total: emails.length,
      query: q
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advanced search with filters
router.post('/advanced', async (req, res) => {
  try {
    const { userId, query, category, dateFrom, dateTo, isRead, isStarred } = req.body;
    
    let searchQuery = { userId };
    
    // Text search
    if (query) {
      searchQuery.$or = [
        { subject: { $regex: query, $options: 'i' } },
        { from: { $regex: query, $options: 'i' } },
        { bodyText: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category) {
      searchQuery.category = category;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      searchQuery.date = {};
      if (dateFrom) searchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.date.$lte = new Date(dateTo);
    }
    
    // Read status filter
    if (typeof isRead === 'boolean') {
      searchQuery.isRead = isRead;
    }
    
    // Starred filter
    if (typeof isStarred === 'boolean') {
      searchQuery.isStarred = isStarred;
    }
    
    const emails = await Email.find(searchQuery)
      .sort({ date: -1 })
      .limit(50);
    
    res.json({
      success: true,
      results: emails,
      total: emails.length,
      filters: { query, category, dateFrom, dateTo, isRead, isStarred }
    });
    
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;