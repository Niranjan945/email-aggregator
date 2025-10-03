const Imap = require('imap');
const EmailAccount = require('../models/emailAccounts');
const jobQueue = require('./jobQueue');

class RealTimeSyncService {
  constructor() {
    this.activeConnections = new Map(); // Track active IDLE connections
    console.log('🔄 Real-time sync service initialized');
  }

  async startRealTimeSync(accountId) {
    console.log(`🚀 Starting real-time sync for account: ${accountId}`);

    try {
      const account = await EmailAccount.findById(accountId);
      if (!account) {
        throw new Error('EmailAccount not found');
      }

      // Don't start if already syncing
      if (this.activeConnections.has(accountId)) {
        console.log(`⚠️ Real-time sync already active for account: ${accountId}`);
        return { message: 'Already syncing', active: true };
      }

      // Start IDLE connection
      const connection = await this.createIdleConnection(account);
      this.activeConnections.set(accountId, connection);

      return { 
        message: 'Real-time sync started successfully',
        accountId: accountId,
        email: account.email
      };
    } catch (error) {
      console.error(`❌ Failed to start real-time sync: ${error.message}`);
      throw error;
    }
  }

  async createIdleConnection(account) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: account.email,
        password: account.accessToken,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        keepalive: {
          interval: 10000,     // Send NOOP every 10 seconds
          idleInterval: 300000, // IDLE reissue every 5 minutes  
          forceNoop: false
        }
      });

      imap.once('ready', () => {
        console.log(`✅ IDLE connection ready for ${account.email}`);

        imap.openBox('INBOX', true, (err) => {
          if (err) {
            console.error('❌ Failed to open INBOX for IDLE:', err);
            return reject(err);
          }

          console.log(`📬 Watching for new emails: ${account.email}`);

          // Set up IDLE mode for real-time notifications
          imap.on('mail', (numNewMsgs) => {
            console.log(`🔔 ${numNewMsgs} new email(s) detected for ${account.email}`);

            // Queue job to process new emails
            jobQueue.addEmailFetchJob(account._id, 'high')
              .then(() => {
                console.log(`📬 Queued processing for ${numNewMsgs} new emails`);
              })
              .catch(err => {
                console.error('❌ Failed to queue email processing:', err);
              });
          });

          resolve({
            imap: imap,
            accountId: account._id,
            email: account.email,
            status: 'active'
          });
        });
      });

      imap.once('error', (err) => {
        console.error(`❌ IDLE connection error for ${account.email}:`, err.message);
        // Remove from active connections on error
        this.activeConnections.delete(account._id);

        // Try to reconnect after 30 seconds
        setTimeout(() => {
          console.log(`🔄 Attempting to reconnect IDLE for ${account.email}`);
          this.startRealTimeSync(account._id).catch(console.error);
        }, 30000);
      });

      imap.once('end', () => {
        console.log(`🔌 IDLE connection ended for ${account.email}`);
        this.activeConnections.delete(account._id);
      });

      console.log(`🔌 Connecting IDLE for ${account.email}...`);
      imap.connect();
    });
  }

  async stopRealTimeSync(accountId) {
    const connection = this.activeConnections.get(accountId);

    if (!connection) {
      return { message: 'No active sync found', active: false };
    }

    try {
      connection.imap.end();
      this.activeConnections.delete(accountId);

      console.log(`🛑 Stopped real-time sync for account: ${accountId}`);
      return { message: 'Real-time sync stopped', accountId: accountId };
    } catch (error) {
      console.error(`❌ Error stopping real-time sync: ${error.message}`);
      throw error;
    }
  }

  getActiveSyncs() {
    const active = [];
    for (const [accountId, connection] of this.activeConnections) {
      active.push({
        accountId: accountId,
        email: connection.email,
        status: connection.status
      });
    }
    return active;
  }

  async stopAllSyncs() {
    const promises = [];
    for (const accountId of this.activeConnections.keys()) {
      promises.push(this.stopRealTimeSync(accountId));
    }

    await Promise.allSettled(promises);
    console.log('🛑 All real-time syncs stopped');
  }
}

module.exports = new RealTimeSyncService();