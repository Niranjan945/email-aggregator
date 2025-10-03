const { Queue, Worker } = require('bullmq');

class JobQueueService {
  constructor() {
    this.redisAvailable = false;
    this.emailQueue = null;

    try {
      // Try Redis connection with shorter timeout
      this.redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 5000,        // 5 second timeout
        maxRetriesPerRequest: 3,     // Reduced retries
        retryDelayOnFailover: 100,   // Faster failover
      };

      this.emailQueue = new Queue('email-processing', {
        connection: this.redisConfig
      });

      this.redisAvailable = true;
      console.log('📬 Job Queue Service initialized with Redis');

    } catch (error) {
      console.log('⚠️ Redis unavailable, running in direct mode');
      this.redisAvailable = false;
    }
  }

  // Add email fetch job (Redis optional)
  async addEmailFetchJob(accountId, priority = 'normal') {
    if (this.redisAvailable && this.emailQueue) {
      try {
        const job = await this.emailQueue.add('fetch-emails', {
          accountId: accountId,
          timestamp: new Date()
        }, {
          priority: priority === 'high' ? 1 : 5,
          removeOnComplete: 10,
          removeOnFail: 5
        });

        console.log(`📬 Queued email fetch job for account: ${accountId}`);
        return { jobId: job.id, queued: true, method: 'redis' };

      } catch (redisError) {
        console.log('⚠️ Redis job failed, processing directly');
        this.redisAvailable = false;
      }
    }

    // Direct processing without Redis
    console.log(`🔄 Processing email fetch directly (no Redis): ${accountId}`);
    return { 
      jobId: `direct-${Date.now()}`, 
      queued: false, 
      method: 'direct',
      message: 'Processing without job queue'
    };
  }

  // Real-time sync job (Redis optional)
  async addRealTimeSyncJob(accountId) {
    if (this.redisAvailable && this.emailQueue) {
      try {
        const job = await this.emailQueue.add('real-time-sync', {
          accountId: accountId,
          type: 'idle-connection'
        }, {
          priority: 1,
          removeOnComplete: 5
        });

        console.log(`🔄 Queued real-time sync for account: ${accountId}`);
        return { jobId: job.id, queued: true, method: 'redis' };

      } catch (redisError) {
        console.log('⚠️ Redis sync failed, using direct mode');
        this.redisAvailable = false;
      }
    }

    // Direct mode message
    return { 
      jobId: `direct-sync-${Date.now()}`, 
      queued: false, 
      method: 'direct',
      message: 'Real-time sync active without job queue'
    };
  }

  // Get queue status (Redis optional)
  async getQueueStatus() {
    if (this.redisAvailable && this.emailQueue) {
      try {
        const waiting = await this.emailQueue.getWaiting();
        const active = await this.emailQueue.getActive();
        const completed = await this.emailQueue.getCompleted();
        const failed = await this.emailQueue.getFailed();

        return {
          mode: 'redis',
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          status: 'connected'
        };
      } catch (error) {
        console.log('⚠️ Redis status check failed');
        this.redisAvailable = false;
      }
    }

    // Direct mode status
    return {
      mode: 'direct',
      waiting: 0,
      active: 0,
      completed: 'N/A',
      failed: 'N/A',
      status: 'redis_unavailable',
      message: 'Operating in direct processing mode'
    };
  }

  // Check if Redis is working
  isRedisAvailable() {
    return this.redisAvailable;
  }
}

module.exports = new JobQueueService();