// REAL GMAIL EMAIL SERVICE - services/emailService.js
const Imap = require('imap');
const { simpleParser } = require('mailparser');

class EmailService {
  constructor() {
    this.imapConfig = {
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      connTimeout: 60000,
      authTimeout: 5000,
      keepalive: {
        interval: 10000,
        idleInterval: 300000,
        forceNoop: true
      }
    };
  }

  async fetchGmailEmails(userEmail, limit = 10) {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to Gmail IMAP...');
      
      const imap = new Imap(this.imapConfig);
      let emails = [];
      let processed = 0;
      let totalToProcess = 0;

      imap.once('ready', () => {
        console.log('✅ IMAP connection ready');
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error('❌ Error opening inbox:', err);
            return reject(err);
          }

          console.log(`📬 Inbox opened. Total messages: ${box.messages.total}`);
          
          if (box.messages.total === 0) {
            imap.end();
            return resolve([]);
          }

          // Fetch the most recent emails
          const start = Math.max(1, box.messages.total - limit + 1);
          const end = box.messages.total;
          
          console.log(`📧 Fetching messages ${start} to ${end}`);
          
          const fetch = imap.seq.fetch(`${start}:${end}`, {
            bodies: '',
            struct: true
          });

          totalToProcess = end - start + 1;

          fetch.on('message', (msg, seqno) => {
            console.log(`📨 Processing message ${seqno}`);
            
            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error('❌ Parse error:', err);
                  processed++;
                  return;
                }

                const emailData = {
                  messageId: parsed.messageId || `<generated-${Date.now()}-${seqno}@gmail.com>`,
                  from: parsed.from?.text || 'Unknown Sender',
                  to: parsed.to?.text || userEmail,
                  subject: parsed.subject || 'No Subject',
                  date: parsed.date || new Date(),
                  bodyText: parsed.text || '',
                  bodyHtml: parsed.html || ''
                };

                emails.push(emailData);
                processed++;

                console.log(`✅ Parsed: "${emailData.subject}" from ${emailData.from}`);

                // Check if all messages processed
                if (processed >= totalToProcess) {
                  console.log(`🎉 All ${processed} messages processed`);
                  imap.end();
                  
                  // Sort by date (newest first)
                  emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                  resolve(emails);
                }
              });
            });

            msg.once('attributes', (attrs) => {
              console.log(`📋 Message ${seqno} attributes: ${JSON.stringify(attrs, null, 2)}`);
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ Fetch error:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log('📭 Fetch completed');
          });
        });
      });

      imap.once('error', (err) => {
        console.error('❌ IMAP connection error:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('🔌 IMAP connection ended');
      });

      // Set timeout for the operation
      const timeout = setTimeout(() => {
        console.log('⏰ IMAP operation timeout');
        imap.destroy();
        reject(new Error('IMAP operation timeout'));
      }, 30000);

      imap.connect();

      // Clear timeout when done
      imap.once('end', () => clearTimeout(timeout));
      imap.once('error', () => clearTimeout(timeout));
    });
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Gmail IMAP connection...');
      const emails = await this.fetchGmailEmails(process.env.GMAIL_USER, 1);
      console.log('✅ Gmail connection test successful');
      return { success: true, emailCount: emails.length };
    } catch (error) {
      console.error('❌ Gmail connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();