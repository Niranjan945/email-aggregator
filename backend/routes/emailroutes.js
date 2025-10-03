const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const jobQueue = require('../services/jobQueue');
const realTimeSync = require('../services/realTimeSync');
const EmailAccount = require('../models/emailAccounts');
const Email = require('../models/email');

// Existing endpoints
router.get('/test', async (req, res) => {
  try {
    const accountCount = await EmailAccount.countDocuments();
    const emailCount = await Email.countDocuments();

    res.json({
      message: 'Email service working',
      accounts: accountCount,
      emails: emailCount,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

router.post('/fetch', async (req, res) => {
  try {
    const { accountId, limit = 5 } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId required'
      });
    }

    console.log(`🚀 Starting fetch for account: ${accountId}`);
    const startTime = Date.now();

    const emails = await emailService.fetchLatestEmails(accountId, limit);
    const duration = Date.now() - startTime;

    console.log(`✅ Fetch completed in ${duration}ms`);

    res.json({
      message: 'Fetch completed',
      count: emails.length,
      duration: `${duration}ms`,
      emails: emails.map(email => ({
        id: email._id,
        subject: email.subject,
        from: email.from,
        category: email.category,
        date: email.date
      }))
    });

  } catch (error) {
    console.error('❌ Fetch error:', error);

    res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
      type: error.message.includes('timeout') ? 'timeout' : 
            error.message.includes('ECONNRESET') ? 'connection' : 'unknown'
    });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { accountId, limit = 10 } = req.query;

    const query = accountId ? { accountId } : {};

    const emails = await Email.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .select('subject from date category');

    res.json({
      count: emails.length,
      emails: emails
    });

  } catch (error) {
    res.status(500).json({
      error: 'List failed',
      message: error.message
    });
  }
});

router.get('/account/:id', async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }

    const emailCount = await Email.countDocuments({ accountId: account._id });

    res.json({
      account: {
        id: account._id,
        email: account.email,
        lastSync: account.lastSync
      },
      emailCount: emailCount
    });

  } catch (error) {
    res.status(500).json({
      error: 'Account fetch failed',
      message: error.message
    });
  }
});

// NEW: Job Queue endpoints
router.post('/queue/fetch', async (req, res) => {
  try {
    const { accountId, priority = 'normal' } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId required'
      });
    }

    const job = await jobQueue.addEmailFetchJob(accountId, priority);

    res.json({
      message: 'Email fetch job queued successfully',
      jobId: job.id,
      accountId: accountId,
      priority: priority,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to queue job',
      message: error.message
    });
  }
});

router.get('/queue/status', async (req, res) => {
  try {
    const status = await jobQueue.getQueueStatus();

    res.json({
      message: 'Queue status retrieved',
      status: status,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue status',
      message: error.message
    });
  }
});

// NEW: Real-time sync endpoints
router.post('/sync/start', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId required'
      });
    }

    const result = await realTimeSync.startRealTimeSync(accountId);

    res.json({
      message: 'Real-time sync started',
      result: result,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start real-time sync',
      message: error.message
    });
  }
});

router.post('/sync/stop', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId required'
      });
    }

    const result = await realTimeSync.stopRealTimeSync(accountId);

    res.json({
      message: 'Real-time sync stopped',
      result: result,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to stop real-time sync',
      message: error.message
    });
  }
});

router.get('/sync/status', async (req, res) => {
  try {
    const activeSyncs = realTimeSync.getActiveSyncs();

    res.json({
      message: 'Sync status retrieved',
      activeSyncs: activeSyncs,
      count: activeSyncs.length,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

module.exports = router;