// ENHANCED EMAIL ROUTES - routes/emailroutes.js
const express = require('express');
const router = express.Router();
const Email = require('../models/email');
const { authenticateToken } = require('../middlewares/auth');

// Middleware to extract user info from token
const extractUserFromToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ');
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret');
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch (error) {
      console.warn('Token decode warning:', error.message);
    }
  }
  next();
};

// Get emails list - Enhanced
router.get('/list', extractUserFromToken, async (req, res) => {
  try {
    const { userId, limit = 50, category, search } = req.query;
    const userIdentifier = userId || req.userEmail || req.userId;

    if (!userIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'User identification required'
      });
    }

    let query = { userId: userIdentifier };
    
    // Filter by category if provided
    if (category && category !== 'inbox') {
      if (category === 'starred') {
        query.isStarred = true;
      } else if (category === 'important') {
        query.category = 'Important';
      } else {
        query.category = category;
      }
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { bodyText: { $regex: search, $options: 'i' } }
      ];
    }

    const emails = await Email.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    // Get email statistics
    const totalCount = await Email.countDocuments({ userId: userIdentifier });
    const unreadCount = await Email.countDocuments({ userId: userIdentifier, isRead: false });
    const starredCount = await Email.countDocuments({ userId: userIdentifier, isStarred: true });

    res.json({
      success: true,
      emails,
      count: emails.length,
      stats: {
        total: totalCount,
        unread: unreadCount,
        starred: starredCount
      }
    });

    console.log(`📧 Listed ${emails.length} emails for user: ${userIdentifier}`);

  } catch (error) {
    console.error('List emails error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch emails' 
    });
  }
});

// Fetch new emails from email service
router.post('/fetch', extractUserFromToken, async (req, res) => {
  try {
    const { accountId = 'default', limit = 20, syncNew = true } = req.body;
    const userIdentifier = req.userEmail || req.userId || 'demo@example.com';

    console.log(`📬 Fetching emails for user: ${userIdentifier}`);

    // Try to use the email service
    let newEmails = [];
    try {
      const emailService = require('../services/emailService');
      
      // Test if email service is configured
      const testResult = await emailService.testConnection();
      
      if (testResult.success) {
        // Fetch emails from Gmail
        const fetchedEmails = await emailService.fetchGmailEmails(userIdentifier, limit);
        
        // Process each email
        for (const emailData of fetchedEmails) {
          // Check if email already exists
          const existingEmail = await Email.findOne({ 
            messageId: emailData.messageId,
            userId: userIdentifier 
          });
          
          if (existingEmail) continue;
          
          // Use AI service to categorize
          let category = 'Interested';
          let aiConfidence = 0.8;
          
          try {
            const aiService = require('../services/aiservice');
            category = await aiService.categorizeEmail(emailData.subject, emailData.bodyText);
            aiConfidence = aiService.calculateConfidence(emailData, category);
          } catch (aiError) {
            console.warn('AI service not available, using fallback categorization');
            category = fallbackCategorization(emailData);
          }
          
          // Save email to database
          const email = new Email({
            ...emailData,
            userId: userIdentifier,
            category,
            aiConfidence,
            isRead: false,
            isStarred: false
          });
          
          await email.save();
          newEmails.push(email);
          
          console.log(`✅ Saved new email: "${emailData.subject}" → ${category}`);
        }
        
      } else {
        throw new Error('Email service not configured');
      }
      
    } catch (serviceError) {
      console.warn('Email service error, creating demo emails:', serviceError.message);
      
      // Create some demo emails if service fails
      const demoEmails = generateDemoEmails(userIdentifier);
      
      for (const demoEmail of demoEmails) {
        const existingEmail = await Email.findOne({ 
          messageId: demoEmail.messageId,
          userId: userIdentifier 
        });
        
        if (!existingEmail) {
          const email = new Email(demoEmail);
          await email.save();
          newEmails.push(email);
        }
      }
    }

    res.json({
      success: true,
      message: `Fetched ${newEmails.length} new emails`,
      newEmails: newEmails.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Fetch emails error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch emails: ' + error.message 
    });
  }
});

// Update email (mark as read, star, etc.)
router.patch('/:emailId', extractUserFromToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const updates = req.body;
    const userIdentifier = req.userEmail || req.userId;

    // Find and update email
    const email = await Email.findOneAndUpdate(
      { 
        _id: emailId, 
        userId: userIdentifier 
      },
      updates,
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ 
        success: false, 
        error: 'Email not found or access denied' 
      });
    }

    res.json({
      success: true,
      email,
      message: 'Email updated successfully'
    });

    console.log(`✅ Updated email ${emailId}:`, updates);

  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update email' 
    });
  }
});

// Delete email
router.delete('/:emailId', extractUserFromToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const userIdentifier = req.userEmail || req.userId;

    const email = await Email.findOneAndDelete({
      _id: emailId,
      userId: userIdentifier
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Email deleted successfully'
    });

    console.log(`🗑️ Deleted email ${emailId}`);

  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete email' 
    });
  }
});

// Get email statistics
router.get('/stats', extractUserFromToken, async (req, res) => {
  try {
    const userIdentifier = req.userEmail || req.userId || req.query.userId;

    if (!userIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'User identification required'
      });
    }

    const total = await Email.countDocuments({ userId: userIdentifier });
    const unread = await Email.countDocuments({ userId: userIdentifier, isRead: false });
    const starred = await Email.countDocuments({ userId: userIdentifier, isStarred: true });

    // Category breakdown
    const categories = await Email.aggregate([
      { $match: { userId: userIdentifier } },
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get email statistics' 
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Email routes are working',
    timestamp: new Date()
  });
});

// Helper function for fallback categorization
function fallbackCategorization(emailData) {
  const subject = (emailData.subject || '').toLowerCase();
  const body = (emailData.bodyText || '').toLowerCase();
  const from = (emailData.from || '').toLowerCase();

  if (subject.includes('meeting') || subject.includes('schedule') || body.includes('calendar')) {
    return 'Meeting Booked';
  }
  if (subject.includes('interested') || body.includes('interested')) {
    return 'Interested';
  }
  if (subject.includes('not interested') || body.includes('not interested')) {
    return 'Not Interested';
  }
  if (subject.includes('out of office') || body.includes('out of office')) {
    return 'Out of Office';
  }
  if (from.includes('noreply') || subject.includes('spam')) {
    return 'Spam';
  }
  
  return 'Interested'; // Default
}

// Generate demo emails
function generateDemoEmails(userIdentifier) {
  const now = Date.now();
  
  return [
    {
      messageId: `demo-${now}-1`,
      userId: userIdentifier,
      from: 'sarah.johnson@techcorp.com',
      to: userIdentifier,
      subject: 'Partnership Opportunity - Email Automation Solution',
      bodyText: 'Hi! I came across your email solution and I\'m very interested in exploring a potential partnership. Could we schedule a call this week?',
      date: new Date(now - 30 * 60 * 1000),
      category: 'Interested',
      aiConfidence: 0.92,
      isRead: false,
      isStarred: false
    },
    {
      messageId: `demo-${now}-2`,
      userId: userIdentifier,
      from: 'calendar@company.com',
      to: userIdentifier,
      subject: 'Meeting Confirmed: Product Demo Tomorrow 3:00 PM',
      bodyText: 'Your meeting has been confirmed for tomorrow at 3:00 PM EST. Meeting link: https://meet.example.com/demo-123',
      date: new Date(now - 2 * 60 * 60 * 1000),
      category: 'Meeting Booked',
      aiConfidence: 0.98,
      isRead: false,
      isStarred: true
    },
    {
      messageId: `demo-${now}-3`,
      userId: userIdentifier,
      from: 'mike.brown@startup.io',
      to: userIdentifier,
      subject: 'Re: Demo Follow-up - Going with Different Solution',
      bodyText: 'Thank you for the demo. After internal discussions, we have decided to go with a different solution.',
      date: new Date(now - 4 * 60 * 60 * 1000),
      category: 'Not Interested',
      aiConfidence: 0.87,
      isRead: true,
      isStarred: false
    }
  ];
}

module.exports = router;
