// EMAIL ROUTES - routes/emails.js
const express = require('express');
const router = express.Router();
const Email = require('../models/email');
const emailService = require('../services/emailService');

// Get emails list
router.get('/list', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;
    
    const emails = await Email.find({ userId })
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      emails,
      count: emails.length
    });
    
  } catch (error) {
    console.error('List emails error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch new emails
router.post('/fetch', async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    // This will be handled by socket.io in real-time
    // But we can still provide a response
    const emailCount = await Email.countDocuments({ userId: userEmail });
    
    res.json({
      success: true,
      message: 'Email fetch initiated',
      count: emailCount
    });
    
  } catch (error) {
    console.error('Fetch emails error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email statistics
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const total = await Email.countDocuments({ userId });
    const unread = await Email.countDocuments({ userId, isRead: false });
    const starred = await Email.countDocuments({ userId, isStarred: true });
    
    const categories = await Email.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const categoryStats = {};
    categories.forEach(cat => {
      categoryStats[cat._id] = cat.count;
    });
    
    res.json({
      success: true,
      stats: {
        total,
        unread,
        starred,
        categories: categoryStats
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update email (mark as read, star, etc.)
router.patch('/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const updates = req.body;
    
    const email = await Email.findByIdAndUpdate(emailId, updates, { new: true });
    
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    
    res.json({
      success: true,
      email
    });
    
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;