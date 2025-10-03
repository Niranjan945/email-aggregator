const { Worker } = require('bullmq');
const emailService = require('../services/emailService');
const EmailAccount = require('../models/emailAccounts');

class EmailProcessor {
  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    };

    this.setupWorker();
  }

  setupWorker() {
    this.worker = new Worker('email-processing', async (job) => {
      const { data } = job;

      try {
        console.log(`🔄 Processing job: ${job.name} for account: ${data.accountId}`);

        if (job.name === 'fetch-emails') {
          return await this.processFetchEmails(data);
        } else if (job.name === 'real-time-sync') {
          return await this.processRealTimeSync(data);
        } else {
          throw new Error(`Unknown job type: ${job.name}`);
        }
      } catch (error) {
        console.error(`❌ Job failed: ${job.name}`, error.message);
        throw error; // This will mark the job as failed
      }
    }, {
      connection: this.redisConfig,
      concurrency: 2 // Process 2 jobs at once max
    });

    this.worker.on('completed', (job, result) => {
      console.log(`✅ Job completed: ${job.name} - ${result.message}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job failed: ${job.name} - ${err.message}`);
    });

    console.log('👷 Email processing worker started');
  }

  async processFetchEmails(data) {
    const { accountId } = data;

    try {
      // Use existing email service to fetch emails
      const emails = await emailService.fetchLatestEmails(accountId, 10);

      return {
        message: `Fetched ${emails.length} emails successfully`,
        emailCount: emails.length,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Email fetch failed: ${error.message}`);
    }
  }

  async processRealTimeSync(data) {
    const { accountId } = data;

    try {
      // For now, just do a regular fetch - we'll add IDLE later
      const emails = await emailService.fetchLatestEmails(accountId, 5);

      console.log(`🔄 Real-time sync processed ${emails.length} new emails`);

      return {
        message: `Real-time sync completed`,
        emailCount: emails.length,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Real-time sync failed: ${error.message}`);
    }
  }

  // Graceful shutdown
  async close() {
    await this.worker.close();
    console.log('👷 Email processor worker stopped');
  }
}

module.exports = new EmailProcessor();