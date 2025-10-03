// Enhanced Email Service with Dynamic Fetching
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const EmailAccount = require('../models/emailAccounts');
const Email = require('../models/email');
const aiService = require('./aiservice');
const slackService = require('./slackService');

class EmailService {
  constructor() {
    this.fetchInProgress = false;
    this.lastFetchTime = null;
  }

  createImapConfig(account) {
    return {
      user: account.email,
      password: account.accessToken,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 20000,
      authTimeout: 15000,
      keepalive: true
    };
  }

  async fetchLatestEmails(accountId = 'default', limit = 10) {
    if (this.fetchInProgress) {
      console.log('⏭️ Email fetch already in progress, skipping...');
      return [];
    }

    this.fetchInProgress = true;
    console.log(`🚀 Starting email fetch for account: ${accountId}, limit: ${limit}`);

    try {
      // Get email account - handle both ObjectId and string
      let account;
      if (accountId === 'default') {
        account = await EmailAccount.findOne({ isActive: true });
      } else {
        account = await EmailAccount.findById(accountId).catch(() => null);
        if (!account) {
          account = await EmailAccount.findOne({ email: accountId });
        }
      }

      if (!account) {
        console.log('⚠️ No email account found, creating default...');
        account = await this.createDefaultAccount();
      }

      console.log(`📧 Using account: ${account.email}`);

      // Perform email fetch with retry logic
      const emails = await this.performFetchWithRetry(account, limit);
      
      // Update last sync time
      account.lastSync = new Date();
      await account.save();

      this.lastFetchTime = new Date();
      console.log(`✅ Email fetch completed: ${emails.length} emails processed`);

      return emails;

    } catch (error) {
      console.error('❌ Email fetch failed:', error);
      throw error;
    } finally {
      this.fetchInProgress = false;
    }
  }

  async performFetchWithRetry(account, limit, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Attempt ${attempt}/${maxRetries} for ${account.email}`);
        const emails = await this.performFetch(account, limit);
        console.log(`✅ Success on attempt ${attempt}: ${emails.length} emails`);
        return emails;
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async performFetch(account, limit) {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(account));
      const fetched = [];
      let isResolved = false;

      // Timeout protection
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.error('⏰ IMAP operation timeout');
          imap.destroy();
          reject(new Error('Operation timeout'));
        }
      }, 30000);

      const cleanResolve = (result) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve(result);
        }
      };

      const cleanReject = (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      };

      imap.once('ready', () => {
        console.log('✅ IMAP connection ready');
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) return cleanReject(err);

          const total = box.messages.total;
          console.log(`📊 Total messages in mailbox: ${total}`);

          if (total === 0) {
            try { imap.end(); } catch (e) { /* ignore */ }
            return cleanResolve([]);
          }

          // Fetch most recent emails
          const start = Math.max(1, total - limit + 1);
          const end = total;
          console.log(`🔍 Fetching messages ${start} to ${end} (most recent)`);

          const fetcher = imap.seq.fetch(`${start}:${end}`, {
            bodies: '',
            struct: true,
            envelope: true
          });

          let processed = 0;
          const expectedCount = end - start + 1;

          fetcher.on('message', (msg, seqno) => {
            console.log(`📬 Processing message ${seqno}/${total}`);

            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                const emailDate = parsed.date ? new Date(parsed.date) : new Date();

                console.log(`✉️ Parsed: "${parsed.subject || 'No Subject'}" from ${parsed.from?.text || 'Unknown'}`);

                const emailData = {
                  messageId: parsed.messageId || `<generated-${Date.now()}-${seqno}@onebox.com>`,
                  threadId: parsed.inReplyTo || parsed.references?.[0] || null,
                  from: parsed.from?.text || 'Unknown Sender',
                  to: parsed.to ? parsed.to.text : account.email,
                  cc: parsed.cc ? parsed.cc.text : '',
                  bcc: parsed.bcc ? parsed.bcc.text : '',
                  subject: parsed.subject || 'No Subject',
                  date: emailDate,
                  bodyText: parsed.text || '',
                  bodyHtml: parsed.html || '',
                  hasAttachments: (parsed.attachments && parsed.attachments.length > 0),
                  accountId: account._id,
                  folder: 'INBOX',
                  isRead: false
                };

                fetched.push(emailData);

              } catch (parseErr) {
                console.error(`❌ Parse error for message ${seqno}:`, parseErr.message);
              }

              processed++;
              if (processed >= expectedCount) {
                console.log(`🔄 Processing ${fetched.length} emails...`);
                
                // Sort by date (newest first)
                fetched.sort((a, b) => new Date(b.date) - new Date(a.date));

                this.saveEmails(fetched)
                  .then((saved) => {
                    try { imap.end(); } catch (e) { /* ignore */ }
                    cleanResolve(saved);
                  })
                  .catch((saveErr) => {
                    console.error('❌ Save error:', saveErr.message);
                    try { imap.end(); } catch (e) { /* ignore */ }
                    cleanReject(saveErr);
                  });
              }
            });
          });

          fetcher.on('error', (fetchErr) => {
            console.error('❌ Fetch error:', fetchErr.message);
            try { imap.end(); } catch (e) { /* ignore */ }
            cleanReject(fetchErr);
          });
        });
      });

      imap.once('error', (err) => {
        if (!isResolved) {
          console.error('❌ IMAP error:', err.message);
          cleanReject(err);
        } else {
          console.log('ℹ️ Connection cleanup expected after successful operation');
        }
      });

      imap.once('end', () => {
        console.log('🔌 IMAP connection closed');
      });

      console.log('🔗 Connecting to IMAP...');
      imap.connect();
    });
  }

  async saveEmails(fetchedEmails) {
    const saved = [];
    const newEmails = [];

    console.log(`💾 Saving ${fetchedEmails.length} emails...`);

    for (const emailData of fetchedEmails) {
      try {
        // Check if email already exists
        const existing = await Email.findOne({ messageId: emailData.messageId });
        
        if (existing) {
          console.log(`⏭️ Email exists: "${emailData.subject}" (${emailData.date.toLocaleString()})`);
          saved.push(existing);
          continue;
        }

        // AI categorization
        console.log(`🤖 AI categorizing: "${emailData.subject}"`);
        const category = await aiService.categorizeEmail(emailData.subject, emailData.bodyText);
        emailData.category = category;
        emailData.aiConfidence = this.generateConfidence(emailData, category);

        // Save to database
        const emailDoc = new Email(emailData);
        await emailDoc.save();
        
        saved.push(emailDoc);
        newEmails.push(emailDoc);
        
        console.log(`✅ Saved: "${emailData.subject}" → ${category} (${new Date(emailData.date).toLocaleString()})`);

      } catch (saveErr) {
        console.error(`❌ Save failed for "${emailData.subject}":`, saveErr.message);
      }
    }

    console.log(`✅ Successfully saved ${saved.length}/${fetchedEmails.length} emails`);

    // Send Slack notifications for new important emails
    if (newEmails.length > 0) {
      await this.sendSlackNotifications(newEmails);
    }

    return saved;
  }

  generateConfidence(emailData, category) {
    let confidence = 0.6; // Base confidence

    // Increase confidence based on content quality
    if (emailData.subject && emailData.subject.length > 10) confidence += 0.1;
    if (emailData.bodyText && emailData.bodyText.length > 50) confidence += 0.1;
    if (emailData.from && !emailData.from.includes('noreply')) confidence += 0.1;

    // Category-specific confidence
    const subject = emailData.subject?.toLowerCase() || '';
    const body = emailData.bodyText?.toLowerCase() || '';

    if (category === 'Meeting Booked' && (subject.includes('meeting') || body.includes('calendar'))) {
      confidence += 0.15;
    } else if (category === 'Interested' && (body.includes('interested') || body.includes('discuss'))) {
      confidence += 0.15;
    } else if (category === 'Spam' && (subject.includes('offer') || emailData.from.includes('noreply'))) {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  async sendSlackNotifications(emails) {
    try {
      const importantEmails = emails.filter(email => 
        ['Interested', 'Meeting Booked'].includes(email.category)
      );

      if (importantEmails.length === 0) {
        console.log('📢 No important emails for Slack notification');
        return;
      }

      console.log(`📢 Sending Slack notifications for ${importantEmails.length} important emails`);

      for (const email of importantEmails) {
        try {
          const result = await slackService.notifyImportantEmail(email);
          
          if (result.sent) {
            console.log(`✅ Slack sent: "${email.subject}"`);
          } else {
            console.log(`⚠️ Slack failed: "${email.subject}" - ${result.reason}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Slack notification error for "${email.subject}":`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Slack notification process failed:', error.message);
      // Don't fail email saving if Slack fails
    }
  }

  async createDefaultAccount() {
    try {
      console.log('🔧 Creating default email account...');
      
      const account = new EmailAccount({
        email: process.env.GMAIL_USER,
        provider: 'gmail',
        accessToken: process.env.GMAIL_APP_PASSWORD,
        refreshToken: '',
        tokenExpiry: null,
        lastSync: null,
        isActive: true,
        userId: 'default-user-123'
      });

      await account.save();
      console.log(`✅ Default account created: ${account.email}`);
      return account;

    } catch (error) {
      console.error('❌ Failed to create default account:', error);
      throw error;
    }
  }

  // Get email statistics
  async getEmailStats() {
    try {
      const stats = await Email.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);

      const total = await Email.countDocuments();
      const unread = await Email.countDocuments({ isRead: false });
      const starred = await Email.countDocuments({ isStarred: true });

      return {
        total,
        unread,
        starred,
        categories: stats.reduce((acc, stat) => {
          acc[stat._id || 'Uncategorized'] = stat.count;
          return acc;
        }, {})
      };

    } catch (error) {
      console.error('❌ Stats calculation failed:', error);
      return { total: 0, unread: 0, starred: 0, categories: {} };
    }
  }

  // Check if service is healthy
  async healthCheck() {
    try {
      const accountCount = await EmailAccount.countDocuments();
      const emailCount = await Email.countDocuments();
      
      return {
        status: 'healthy',
        accounts: accountCount,
        emails: emailCount,
        lastFetch: this.lastFetchTime,
        fetchInProgress: this.fetchInProgress
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();