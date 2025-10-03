// SLACK ROUTES - routes/slack.js
const express = require('express');
const router = express.Router();
const Email = require('../models/email');
const slackService = require('../services/slackService');

// Send Slack notification for specific email
router.post('/notify/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    const email = await Email.findById(emailId);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    
    const result = await slackService.sendNotification(email);
    
    res.json({
      success: result.success,
      message: result.success ? 'Slack notification sent' : 'Slack notification failed',
      details: result
    });
    
  } catch (error) {
    console.error('Slack notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Slack integration
router.get('/test', async (req, res) => {
  try {
    const result = await slackService.testSlackIntegration();
    
    res.json({
      success: result.success,
      message: result.success ? 'Slack integration working' : 'Slack integration failed',
      details: result
    });
    
  } catch (error) {
    console.error('Slack test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send bulk notification
router.post('/bulk-notify', async (req, res) => {
  try {
    const { emailIds } = req.body;
    
    if (!emailIds || !Array.isArray(emailIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'emailIds array is required' 
      });
    }
    
    const emails = await Email.find({ _id: { $in: emailIds } });
    const result = await slackService.sendBulkNotification(emails);
    
    res.json({
      success: result,
      message: result ? 'Bulk notifications sent' : 'Bulk notifications failed',
      emailCount: emails.length
    });
    
  } catch (error) {
    console.error('Bulk Slack notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;