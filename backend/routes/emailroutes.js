const express = require('express');
const router = express.Router();
const Email = require('../models/email');
const emailService = require('../services/emailService');
const aiService = require('../services/aiservice');
const slackService = require('../services/slackService');

const extractUserFromToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret');
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      console.log(`🔑 Authenticated user: ${req.userEmail}`);
    } catch (error) {
      console.warn('Token decode error:', error.message);
    }
  }
  next();
};

// DEBUG ROUTE - Check database
router.get('/debug', async (req, res) => {
  try {
    const totalEmails = await Email.countDocuments({});
    const recentEmails = await Email.find({})
      .sort({ date: -1 })
      .limit(10)
      .select('userId subject from date category');
    
    const userEmails = await Email.find({ userId: '23r01a05cu@cmrithyderabad.edu.in' })
      .sort({ date: -1 })
      .limit(5)
      .select('subject from date category');
    
    console.log(`🔍 Debug: ${totalEmails} total emails, ${userEmails.length} for target user`);
    
    res.json({
      success: true,
      totalEmails,
      userEmailsCount: userEmails.length,
      recentEmails: recentEmails.map(e => ({
        userId: e.userId,
        subject: e.subject,
        from: e.from,
        date: e.date,
        category: e.category
      })),
      userEmails: userEmails.map(e => ({
        subject: e.subject,
        from: e.from,
        date: e.date,
        category: e.category
      }))
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// FETCH EMAILS - Main functionality
router.post('/fetch', extractUserFromToken, async (req, res) => {
  try {
    const { userEmail, limit = 10 } = req.body;
    const userIdentifier = userEmail || req.userEmail || '23r01a05cu@cmrithyderabad.edu.in';
    
    console.log(`📬 Starting email fetch for: ${userIdentifier}`);
    
    let newEmails = [];
    let processedEmails = [];
    
    try {
      // Fetch from Gmail
      const fetchedEmails = await emailService.fetchGmailEmails(userIdentifier, limit);
      console.log(`📨 Gmail returned ${fetchedEmails.length} emails`);
      
      for (const emailData of fetchedEmails) {
        try {
          // Check for duplicates
          const existing = await Email.findOne({ messageId: emailData.messageId });
          if (existing) {
            console.log(`⏭️ Skipping existing: ${emailData.subject}`);
            continue;
          }
          
          // AI Categorization
          let category = 'Interested';
          let aiConfidence = 0.8;
          
          try {
            category = await aiService.categorizeEmail(emailData.subject, emailData.bodyText);
            aiConfidence = aiService.calculateConfidence(emailData, category);
            console.log(`🤖 AI: "${emailData.subject}" → ${category} (${Math.round(aiConfidence * 100)}%)`);
          } catch (aiError) {
            console.warn(`⚠️ AI failed, using fallback: ${aiError.message}`);
            category = aiService.fallbackCategorization(emailData.subject, emailData.bodyText);
          }
          
          // Save to Database
          const email = new Email({
            messageId: emailData.messageId,
            userId: userIdentifier,
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            bodyText: emailData.bodyText || '',
            date: emailData.date,
            category,
            aiConfidence,
            isRead: false,
            isStarred: false,
            slackNotified: false
          });
          
          const saved = await email.save();
          newEmails.push(saved);
          console.log(`✅ Saved: "${emailData.subject}" (ID: ${saved._id})`);
          
          // Slack Notification
          if (['Interested', 'Meeting Booked'].includes(category)) {
            try {
              const slackResult = await slackService.sendNotification(saved);
              if (slackResult.success) {
                saved.slackNotified = true;
                await saved.save();
                console.log(`📢 Slack sent for: ${emailData.subject}`);
              }
            } catch (slackError) {
              console.warn(`⚠️ Slack failed: ${slackError.message}`);
            }
          }
          
          processedEmails.push({
            subject: emailData.subject,
            from: emailData.from,
            category,
            aiConfidence: Math.round(aiConfidence * 100),
            slackNotified: saved.slackNotified
          });
          
        } catch (emailError) {
          console.error(`❌ Error processing "${emailData.subject}":`, emailError.message);
        }
      }
      
    } catch (serviceError) {
      console.error('❌ Gmail service error:', serviceError.message);
      return res.status(500).json({
        success: false,
        error: 'Gmail fetch failed: ' + serviceError.message
      });
    }
    
    const totalSaved = await Email.countDocuments({ userId: userIdentifier });
    console.log(`💾 Total emails for user: ${totalSaved}`);
    
    res.json({
      success: true,
      message: `Successfully processed ${newEmails.length} new emails`,
      newEmailsCount: newEmails.length,
      totalEmailsStored: totalSaved,
      processedEmails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Email fetch failed: ' + error.message
    });
  }
});

// LIST EMAILS - Show latest unread first
router.get('/list', extractUserFromToken, async (req, res) => {
  try {
    const { userId, limit = 20, showAll } = req.query;
    const userIdentifier = userId || req.userEmail || '23r01a05cu@cmrithyderabad.edu.in';
    
    console.log(`📧 Listing emails for: ${userIdentifier}`);
    
    // Default: Show latest unread emails first, then recent read ones
    let query = { userId: userIdentifier };
    
    // If showAll=true, include read emails too
    if (!showAll) {
      // Priority: unread first
    }
    
    const emails = await Email.find(query)
      .sort({ isRead: 1, date: -1 }) // Unread first, then by date desc
      .limit(parseInt(limit));
    
    const stats = {
      total: await Email.countDocuments({ userId: userIdentifier }),
      unread: await Email.countDocuments({ userId: userIdentifier, isRead: false }),
      starred: await Email.countDocuments({ userId: userIdentifier, isStarred: true })
    };
    
    console.log(`📧 Found ${emails.length} emails (${stats.unread} unread)`);
    
    res.json({
      success: true,
      emails: emails.map(e => ({
        _id: e._id,
        messageId: e.messageId,
        from: e.from,
        subject: e.subject,
        bodyText: e.bodyText.substring(0, 200) + (e.bodyText.length > 200 ? '...' : ''),
        date: e.date,
        category: e.category,
        aiConfidence: Math.round(e.aiConfidence * 100),
        isRead: e.isRead,
        isStarred: e.isStarred,
        slackNotified: e.slackNotified
      })),
      count: emails.length,
      stats
    });
  } catch (error) {
    console.error('❌ List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list emails: ' + error.message
    });
  }
});

// EMAIL STATS
router.get('/stats', extractUserFromToken, async (req, res) => {
  try {
    const userIdentifier = req.userEmail || req.query.userId || '23r01a05cu@cmrithyderabad.edu.in';
    
    const total = await Email.countDocuments({ userId: userIdentifier });
    const unread = await Email.countDocuments({ userId: userIdentifier, isRead: false });
    const starred = await Email.countDocuments({ userId: userIdentifier, isStarred: true });
    
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
        categories: categoryStats,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats: ' + error.message
    });
  }
});

// UPDATE EMAIL
router.patch('/:emailId', extractUserFromToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const updates = req.body;
    const userIdentifier = req.userEmail || '23r01a05cu@cmrithyderabad.edu.in';
    
    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId: userIdentifier },
      updates,
      { new: true }
    );
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    console.log(`✅ Updated email: ${email.subject}`);
    
    res.json({
      success: true,
      email: {
        _id: email._id,
        subject: email.subject,
        isRead: email.isRead,
        isStarred: email.isStarred
      },
      message: 'Email updated successfully'
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email: ' + error.message
    });
  }
});

module.exports = router;
