const express = require('express');
const router = express.Router();
const slackService = require('../services/slackService');
const Email = require('../models/email');
const EmailAccount = require('../models/emailAccounts');

// Test Slack connection and send test notification
router.get('/test', async (req, res) => {
  try {
    const connectionTest = await slackService.testConnection();

    res.json({
      message: 'Slack service test completed',
      slack: connectionTest,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Slack test failed',
      message: error.message
    });
  }
});

// Send notification for specific email by ID
router.post('/email/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { force = false } = req.body; // Force notification even if not "Interested"

    const email = await Email.findById(emailId);
    if (!email) {
      return res.status(404).json({
        error: 'Email not found',
        emailId: emailId
      });
    }

    // Check if email is worth notifying about
    if (!force && !['Interested', 'Meeting Booked'].includes(email.category)) {
      return res.status(400).json({
        error: 'Email category not suitable for notification',
        category: email.category,
        hint: 'Use ?force=true to send anyway'
      });
    }

    const result = await slackService.notifyImportantEmail(email);

    res.json({
      message: 'Slack notification processed',
      email: {
        id: email._id,
        subject: email.subject,
        category: email.category
      },
      notification: result,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Email notification failed',
      message: error.message
    });
  }
});

// Send notifications for recent important emails
router.post('/recent', async (req, res) => {
  try {
    const { 
      category = 'Interested',  // Filter by category
      limit = 5,               // Number of recent emails
      accountId,               // Optional: filter by account
      hours = 24               // Look back this many hours
    } = req.body;

    // Build query for recent important emails
    const query = { category: category };

    if (accountId) {
      query.accountId = accountId;
    }

    // Get emails from last N hours
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    query.date = { $gte: cutoffTime };

    const recentEmails = await Email.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    if (recentEmails.length === 0) {
      return res.json({
        message: 'No recent emails found for notification',
        category: category,
        timeframe: `${hours} hours`,
        count: 0
      });
    }

    const notificationResult = await slackService.notifyMultipleEmails(recentEmails);

    res.json({
      message: 'Bulk notification completed',
      category: category,
      timeframe: `${hours} hours`,
      emailsFound: recentEmails.length,
      notificationsSent: notificationResult.sent,
      details: notificationResult,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Bulk notification failed', 
      message: error.message
    });
  }
});

// Send custom Slack message
router.post('/custom', async (req, res) => {
  try {
    const { text, title, details = {} } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Message text required',
        example: { text: 'Your custom message here' }
      });
    }

    let blocks = null;

    // If details provided, create structured message
    if (title || Object.keys(details).length > 0) {
      blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title || '📧 Email System Notification'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: text
          }
        }
      ];

      // Add details fields if provided
      if (Object.keys(details).length > 0) {
        const fields = Object.entries(details).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:*\n${value}`
        }));

        blocks.push({
          type: 'section',
          fields: fields
        });
      }

      blocks.push({
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Sent at ${new Date().toLocaleString()} | Email Aggregation System`
        }]
      });
    }

    const result = await slackService.sendCustomMessage(text, blocks);

    res.json({
      message: 'Custom Slack message sent',
      sent: result.sent,
      result: result,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Custom message failed',
      message: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get email stats for notification-worthy categories
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const categoryStats = await Email.aggregate([
      { 
        $match: { 
          date: { $gte: cutoffDate },
          category: { $in: ['Interested', 'Meeting Booked', 'Out of Office'] }
        }
      },
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          latestDate: { $max: '$date' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalNotificationWorthy = categoryStats.reduce((sum, cat) => sum + cat.count, 0);

    res.json({
      message: 'Notification statistics',
      timeframe: `${days} days`,
      totalNotificationWorthy: totalNotificationWorthy,
      byCategory: categoryStats,
      slackConfigured: slackService.enabled,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Stats retrieval failed',
      message: error.message
    });
  }
});

// Auto-notify webhook (for integration with email fetching)
router.post('/auto-notify', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Emails array required',
        example: { emails: [{ subject: '', category: '', from: '' }] }
      });
    }

    // Filter to only notification-worthy emails
    const importantEmails = emails.filter(email => 
      ['Interested', 'Meeting Booked'].includes(email.category)
    );

    if (importantEmails.length === 0) {
      return res.json({
        message: 'No important emails to notify about',
        totalEmails: emails.length,
        notificationsSent: 0
      });
    }

    const result = await slackService.notifyMultipleEmails(importantEmails);

    res.json({
      message: 'Auto-notification completed',
      totalEmails: emails.length,
      importantEmails: importantEmails.length,
      notificationsSent: result.sent,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Auto-notification failed',
      message: error.message
    });
  }
});

module.exports = router;